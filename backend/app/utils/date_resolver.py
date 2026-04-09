import re
from datetime import datetime, timedelta
from typing import Optional


class DateResolver:
    """Resolver for relative and absolute dates in Russian and English."""

    # Russian weekday names (including different grammatical cases)
    RUSSIAN_WEEKDAYS = {
        # Monday - понедельник
        "понедельник": 0,
        "понедельника": 0,
        "понедельнику": 0,
        # Tuesday - вторник
        "вторник": 1,
        "вторника": 1,
        "вторнику": 1,
        # Wednesday - среда
        "среда": 2,
        "среду": 2,
        "среды": 2,
        "среде": 2,
        # Thursday - четверг
        "четверг": 3,
        "четверга": 3,
        "четвергу": 3,
        # Friday - пятница
        "пятница": 4,
        "пятницу": 4,
        "пятницы": 4,
        "пятнице": 4,
        # Saturday - суббота
        "суббота": 5,
        "субботу": 5,
        "субботы": 5,
        "субботе": 5,
        # Sunday - воскресенье
        "воскресенье": 6,
        "воскресения": 6,
        "воскресенью": 6,
    }

    # English weekday names
    ENGLISH_WEEKDAYS = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
        "mon": 0,
        "tue": 1,
        "wed": 2,
        "thu": 3,
        "fri": 4,
        "sat": 5,
        "sun": 6,
    }

    @classmethod
    def resolve_relative_date(
        cls, text: str, current_date: Optional[datetime] = None
    ) -> Optional[datetime]:
        """
        Resolve relative date from text.

        Args:
            text: Text containing relative date (e.g., "tomorrow", "next monday")
            current_date: Current date for reference (default: now)

        Returns:
            Resolved datetime or None if not found
        """
        if current_date is None:
            current_date = datetime.now()

        text_lower = text.lower().strip()

        # First try ISO date parsing
        iso_date = cls.parse_iso_date(text)
        if iso_date:
            return iso_date

        # Try to resolve relative day
        result = cls._resolve_day(text_lower, current_date)
        if result:
            time_result = cls._extract_time(text_lower)
            if time_result:
                result = result.replace(
                    hour=time_result[0], minute=time_result[1], second=0, microsecond=0
                )
            return result

        # Try to resolve weekday
        result = cls._resolve_weekday(text_lower, current_date)
        if result:
            time_result = cls._extract_time(text_lower)
            if time_result:
                result = result.replace(
                    hour=time_result[0], minute=time_result[1], second=0, microsecond=0
                )
            return result

        # Try to resolve relative period (in X days/weeks, next week)
        result = cls._resolve_period(text_lower, current_date)
        if result:
            time_result = cls._extract_time(text_lower)
            if time_result:
                result = result.replace(
                    hour=time_result[0], minute=time_result[1], second=0, microsecond=0
                )
            return result

        return None

    @classmethod
    def _resolve_day(cls, text: str, current_date: datetime) -> Optional[datetime]:
        """Resolve relative day references."""
        # Today
        if "сегодня" in text or "today" in text:
            return current_date.replace(hour=0, minute=0, second=0, microsecond=0)

        # Tomorrow
        if "завтра" in text or "tomorrow" in text:
            return (current_date + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

        # Day after tomorrow
        if "послезавтра" in text or "day after tomorrow" in text or "day after" in text:
            return (current_date + timedelta(days=2)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

        # Next week (start of next week)
        if "next week" in text or "следующую неделю" in text:
            days_until_monday = (7 - current_date.weekday()) % 7
            if days_until_monday == 0:
                days_until_monday = 7
            return (current_date + timedelta(days=days_until_monday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

        # This week / end of week
        if "this week" in text or "эту неделю" in text:
            days_until_friday = (4 - current_date.weekday()) % 7
            return (current_date + timedelta(days=days_until_friday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

        # End of month
        if "end of month" in text or "конец месяца" in text or "end of the month" in text:
            next_month = current_date.replace(day=28) + timedelta(days=4)
            last_day = next_month - timedelta(days=next_month.day)
            return last_day.replace(hour=0, minute=0, second=0, microsecond=0)

        return None

    @classmethod
    def _resolve_weekday(cls, text: str, current_date: datetime) -> Optional[datetime]:
        """Resolve weekday references."""
        # Check Russian weekdays
        for day_name, day_num in cls.RUSSIAN_WEEKDAYS.items():
            if day_name in text:
                return cls._get_next_weekday(current_date, day_num, text)

        # Check English weekdays
        for day_name, day_num in cls.ENGLISH_WEEKDAYS.items():
            if day_name in text:
                return cls._get_next_weekday(current_date, day_num, text)

        return None

    @classmethod
    def _get_next_weekday(cls, current_date: datetime, target_weekday: int, text: str = "") -> datetime:
        """Get the next occurrence of a weekday."""
        current_weekday = current_date.weekday()

        # Check if "next" is in text (means skip this week's occurrence)
        is_next_week = "next" in text.lower() or "следующ" in text.lower()

        days_ahead = target_weekday - current_weekday

        if is_next_week:
            days_ahead += 7
        elif days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7

        return (current_date + timedelta(days=days_ahead)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

    @classmethod
    def _resolve_period(cls, text: str, current_date: datetime) -> Optional[datetime]:
        """Resolve relative period (in X days/weeks)."""
        # English: in X days/weeks/months
        en_pattern = r"in\s+(\d+)\s+(day|days|week|weeks|month|months)"
        match = re.search(en_pattern, text)
        if match:
            amount = int(match.group(1))
            unit = match.group(2)

            if unit in ["day", "days"]:
                return current_date + timedelta(days=amount)
            elif unit in ["week", "weeks"]:
                return current_date + timedelta(weeks=amount)
            elif unit in ["month", "months"]:
                return current_date + timedelta(days=amount * 30)

        # Russian: через X дней/недель
        ru_pattern = r"через\s+(\d+)?\s*(день|дня|дней|неделю|недели|недель|месяц|месяца|месяцев)"
        match = re.search(ru_pattern, text)
        if match:
            amount = int(match.group(1)) if match.group(1) else 1
            unit = match.group(2)

            if unit in ["день", "дня", "дней"]:
                return current_date + timedelta(days=amount)
            elif unit in ["неделю", "недели", "недель"]:
                return current_date + timedelta(weeks=amount)
            elif unit in ["месяц", "месяца", "месяцев"]:
                return current_date + timedelta(days=amount * 30)

        # English: X days/weeks from now
        en_from_now = r"(\d+)\s+(day|days|week|weeks|month|months)\s+from\s+now"
        match = re.search(en_from_now, text)
        if match:
            amount = int(match.group(1))
            unit = match.group(2)

            if unit in ["day", "days"]:
                return current_date + timedelta(days=amount)
            elif unit in ["week", "weeks"]:
                return current_date + timedelta(weeks=amount)
            elif unit in ["month", "months"]:
                return current_date + timedelta(days=amount * 30)

        return None

    @classmethod
    def _extract_time(cls, text: str) -> Optional[tuple[int, int]]:
        """Extract time from text (hours, minutes)."""
        # Pattern: "at 10am", "at 10:30", "by 5pm", "10 am", "15:00"
        patterns = [
            r"(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)",  # 10am, 10:30pm
            r"at\s+(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?",  # at 10, at 10:30am
            r"by\s+(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?",  # by 10, by 10:30pm
            r"(\d{1,2})[:\.](\d{2})",  # 10:30, 15:00
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                period = match.group(3) if len(match.groups()) >= 3 and match.group(3) else None

                # Adjust hour for PM
                if period and period.lower() == "pm" and hour < 12:
                    hour += 12
                elif period and period.lower() == "am" and hour == 12:
                    hour = 0

                # Validate
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    return (hour, minute)

        # Russian time patterns
        ru_pattern = r"(\d{1,2})[:\.]?(\d{2})?\s*(утра|вечера)"
        match = re.search(ru_pattern, text)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2)) if match.group(2) else 0
            period = match.group(3)

            if period == "вечера" and hour < 12:
                hour += 12
            elif period == "утра" and hour == 12:
                hour = 0

            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return (hour, minute)

        return None

    @classmethod
    def parse_iso_date(cls, date_str: str) -> Optional[datetime]:
        """Parse ISO date string."""
        try:
            # Try full datetime with timezone
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            try:
                # Try date and time without timezone
                return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                try:
                    # Try date only
                    return datetime.strptime(date_str, "%Y-%m-%d")
                except ValueError:
                    return None