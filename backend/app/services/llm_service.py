import json
import logging
import uuid
from typing import List, Optional
import httpx
from datetime import datetime, timedelta

from app.config import get_settings
from app.schemas.task import ParsedTask
from app.models.task import Priority
from app.utils.date_resolver import DateResolver

settings = get_settings()
logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with Ollama LLM."""

    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.timeout = settings.llm_timeout

    async def _call_ollama(self, prompt: str, json_mode: bool = True) -> str:
        """Make a request to Ollama API using chat endpoint for better isolation.

        Args:
            prompt: The prompt to send to the model
            json_mode: If True, force JSON response format. If False, allow text response.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False,
                }
                if json_mode:
                    payload["format"] = "json"

                logger.info(f"Sending request to Ollama (json_mode={json_mode})")
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                content = data.get("message", {}).get("content", "")
                logger.info(f"Ollama response length: {len(content)}")
                return content
        except httpx.ConnectError:
            raise ConnectionError(f"Cannot connect to Ollama at {self.base_url}. Make sure Ollama is running.")
        except httpx.TimeoutException:
            raise TimeoutError(f"Ollama request timed out after {self.timeout} seconds. The model may be loading.")
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Ollama returned error {e.response.status_code}: {e.response.text}")

    def _build_parse_prompt(self, text: str, current_date: datetime) -> str:
        """Build prompt for parsing tasks from text."""
        today_str = current_date.strftime("%Y-%m-%d")
        today_weekday = current_date.strftime("%A")
        tomorrow_str = (current_date + timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow_weekday = (current_date + timedelta(days=1)).strftime("%A")
        current_time = current_date.strftime("%H:%M")

        # Calculate this coming Saturday
        days_until_saturday = (5 - current_date.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        this_saturday = (current_date + timedelta(days=days_until_saturday)).strftime("%Y-%m-%d")

        # Next week's Saturday (after this Saturday)
        next_saturday = (current_date + timedelta(days=days_until_saturday + 7)).strftime("%Y-%m-%d")

        # Add unique request ID to prevent any caching
        request_id = str(uuid.uuid4())[:8]

        return f"""Extract tasks from text. Today: {today_str}. Tomorrow: {tomorrow_str}.
Keep title in same language as input. Remove date/time from title. Convert relative dates to ISO format (YYYY-MM-DDTHH:MM:SS).
Priority: low/medium/high/critical. Extract tags (lowercase, no #).

Input: "{text}"
Return JSON: {{"tasks":[{{"title":"...","description":null,"priority":"medium","deadline":"YYYY-MM-DDTHH:MM:SS","tags":[]}}]}}"""

    async def parse_tasks(
        self, text: str, current_date: Optional[datetime] = None
    ) -> List[ParsedTask]:
        """
        Parse tasks from natural language text.

        Args:
            text: Natural language text containing tasks
            current_date: Current date for reference (default: now)

        Returns:
            List of parsed tasks
        """
        if current_date is None:
            current_date = datetime.now()

        prompt = self._build_parse_prompt(text, current_date)

        try:
            response = await self._call_ollama(prompt)
            response = response.strip()

            # Try to extract JSON from response
            # Sometimes LLM adds extra text before/after JSON
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                response = response[json_start:json_end]

            data = json.loads(response)
            tasks_data = data.get("tasks", [])

            # If no tasks found but we have text, create a default task
            if not tasks_data and text.strip():
                tasks_data = [{
                    "title": text.strip()[:100],
                    "description": text.strip() if len(text) > 100 else None,
                    "priority": "medium",
                    "tags": []
                }]

            tasks = []
            for task_data in tasks_data:
                # Resolve deadline if it's a relative reference
                deadline = None
                if task_data.get("deadline"):
                    parsed_date = DateResolver.parse_iso_date(task_data["deadline"])
                    if parsed_date:
                        deadline = parsed_date
                    else:
                        deadline = DateResolver.resolve_relative_date(
                            task_data["deadline"], current_date
                        )

                # Normalize priority
                priority = task_data.get("priority", "medium").lower()
                if priority not in ["low", "medium", "high", "critical"]:
                    priority = "medium"

                # Ensure title exists
                title = task_data.get("title", "")
                if not title:
                    title = text.strip()[:100]

                tasks.append(
                    ParsedTask(
                        title=title,
                        description=task_data.get("description"),
                        priority=Priority(priority),
                        deadline=deadline.isoformat() if deadline else None,
                        tags=task_data.get("tags", []),
                    )
                )

            return tasks

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            # Fallback: create a single task from the text
            return [
                ParsedTask(
                    title=text[:100],
                    description=text if len(text) > 100 else None,
                    priority=Priority.MEDIUM,
                    tags=[],
                )
            ]
        except (ConnectionError, TimeoutError, RuntimeError) as e:
            logger.error(f"LLM service error: {e}")
            # Re-raise to let the API layer handle it
            raise
        except Exception as e:
            logger.error(f"Error parsing tasks: {e}")
            # Fallback: create a single task from the text
            return [
                ParsedTask(
                    title=text[:100],
                    description=text if len(text) > 100 else None,
                    priority=Priority.MEDIUM,
                    tags=[],
                )
            ]

    async def generate_briefing(
        self, tasks: List[dict], current_date: Optional[datetime] = None
    ) -> str:
        """
        Generate a daily briefing from tasks.

        Args:
            tasks: List of task dictionaries
            current_date: Current date for reference

        Returns:
            Briefing text
        """
        if current_date is None:
            current_date = datetime.now()

        # Format tasks for prompt
        tasks_text = "\n".join(
            [
                f"- {t.get('title', 'Untitled')} (priority: {t.get('priority', 'medium')}, "
                f"deadline: {t.get('deadline', 'none')}, status: {t.get('status', 'pending')})"
                for t in tasks
            ]
        )

        prompt = f"""Analyze the task list and create a brief daily summary.

Current date: {current_date.strftime("%Y-%m-%d %H:%M")}

Tasks:
{tasks_text}

Create a brief summary:
1. Urgent deadlines (tasks due today/tomorrow)
2. Task statistics (total count, by priority)
3. Recommendations (what to prioritize)

Be concise and practical."""

        try:
            result = await self._call_ollama(prompt, json_mode=False)
            logger.info(f"Briefing result: {result[:200]}...")
            return result
        except Exception as e:
            logger.error(f"Error generating briefing: {e}")
            return f"Error generating briefing: {str(e)}"