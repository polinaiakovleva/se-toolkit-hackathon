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

        return f"""[Request ID: {request_id}]

You are a task extraction assistant. Extract tasks from the given text ONLY.

CURRENT DATE AND TIME:
- Today: {today_str} ({today_weekday})
- Current time: {current_time}
- Tomorrow: {tomorrow_str} ({tomorrow_weekday})
- This Saturday (this week): {this_saturday}
- Next Saturday (next week): {next_saturday}

CRITICAL RULES:
1. LANGUAGE PRESERVATION - The title MUST be written in the EXACT SAME LANGUAGE as the input. If input is Russian, title MUST be Russian. If input is English, title MUST be English. DO NOT translate, DO NOT change language, DO NOT mix languages.
2. Title: Extract ONLY the task action, NOT the date/time. Keep it SHORT (2-5 words). Remove ALL date/time words like "tomorrow", "завтра", "at 5pm", "в 17:00" from title.
3. Deadline: Extract date/time separately and convert to ISO format. ALWAYS set deadline if any time reference is mentioned.
4. Tags: Extract categories as simple words (lowercase, no # symbol).
5. ONLY extract tasks from the input text below. Do NOT include any other tasks.

DEADLINE CONVERSION:
- "today" / "сегодня" → {today_str}T00:00:00
- "tomorrow" / "завтра" → {tomorrow_str}T00:00:00
- "tomorrow at 5pm" / "завтра в 17:00" → {tomorrow_str}T17:00:00
- "Saturday" / "суббота" → {this_saturday}T00:00:00
- "next Saturday" / "следующая суббота" → {next_saturday}T00:00:00

EXAMPLES:
Input: "Купить продукты завтра в 5 вечера"
Output: {{"tasks": [{{"title": "Купить продукты", "description": null, "priority": "medium", "deadline": "{tomorrow_str}T17:00:00", "tags": []}}]}}

Input: "Submit report by Friday at 3pm #work"
Output: {{"tasks": [{{"title": "Submit report", "description": null, "priority": "medium", "deadline": "2026-04-11T15:00:00", "tags": ["work"]}}]}}

Input: "buy groceries tomorrow at 5pm"
Output: {{"tasks": [{{"title": "Buy groceries", "description": null, "priority": "medium", "deadline": "{tomorrow_str}T17:00:00", "tags": []}}]}}

Input: "Call mom tomorrow and submit report by Friday"
Output: {{"tasks": [{{"title": "Call mom", "description": null, "priority": "medium", "deadline": "{tomorrow_str}T00:00:00", "tags": []}}, {{"title": "Submit report", "description": null, "priority": "medium", "deadline": "2026-04-11T00:00:00", "tags": []}}]}}

Output format (JSON only, no markdown, no explanation):
{{"tasks": [{{"title": "...", "description": null, "priority": "medium", "deadline": "YYYY-MM-DDTHH:MM:SS", "tags": ["..."]}}]}}

Input text to process: "{text}"

Return ONLY valid JSON:"""

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