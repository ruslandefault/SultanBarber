"""Pure slot-availability algorithm.

This module has NO database or FastAPI dependencies so it can be unit-tested in
isolation. Callers load working hours + busy intervals from the DB and pass them
in. All datetimes are timezone-aware; the caller is responsible for producing
them in the salon timezone.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

DEFAULT_GRANULARITY_MIN = 15


@dataclass(frozen=True)
class Interval:
    """A half-open busy interval [start, end)."""

    start: datetime
    end: datetime

    def overlaps(self, other_start: datetime, other_end: datetime) -> bool:
        return self.start < other_end and other_start < self.end


@dataclass(frozen=True)
class WorkWindow:
    """A master's working window for a given weekday."""

    start: time | None
    end: time | None
    is_day_off: bool = False


def _combine(day: date, t: time, tz: ZoneInfo) -> datetime:
    return datetime.combine(day, t, tzinfo=tz)


def compute_free_slots(
    *,
    day: date,
    window: WorkWindow,
    busy: list[Interval],
    total_duration_min: int,
    tz: ZoneInfo,
    granularity_min: int = DEFAULT_GRANULARITY_MIN,
    now: datetime | None = None,
) -> list[datetime]:
    """Return the list of valid start datetimes (tz-aware) for a single master.

    A slot at time ``s`` is valid when:
      * it is not the master's day off,
      * ``[s, s + total_duration]`` fits fully inside the working window,
      * it overlaps no busy interval,
      * (if ``now`` is given) it is not in the past.

    Slots are generated on a ``granularity_min`` grid anchored at the window start.
    """
    if total_duration_min <= 0:
        raise ValueError("total_duration_min must be positive")
    if window.is_day_off or window.start is None or window.end is None:
        return []

    work_start = _combine(day, window.start, tz)
    work_end = _combine(day, window.end, tz)
    if work_end <= work_start:
        return []

    total = timedelta(minutes=total_duration_min)
    step = timedelta(minutes=granularity_min)

    slots: list[datetime] = []
    candidate = work_start
    while candidate + total <= work_end:
        slot_end = candidate + total
        if now is not None and candidate < now:
            candidate += step
            continue
        if not any(b.overlaps(candidate, slot_end) for b in busy):
            slots.append(candidate)
        candidate += step
    return slots


@dataclass(frozen=True)
class MasterAvailability:
    master_id: int
    window: WorkWindow
    busy: list[Interval]


@dataclass(frozen=True)
class SlotOption:
    """A start time and which masters are free for it."""

    start_at: datetime
    master_ids: list[int]


def compute_any_master_slots(
    *,
    day: date,
    masters: list[MasterAvailability],
    total_duration_min: int,
    tz: ZoneInfo,
    granularity_min: int = DEFAULT_GRANULARITY_MIN,
    now: datetime | None = None,
) -> list[SlotOption]:
    """Union of free slots across masters (used for master_id='any').

    Each returned option lists every master free at that start time. The caller
    is expected to have pre-filtered ``masters`` to those that perform ALL of the
    requested services.
    """
    by_start: dict[datetime, list[int]] = {}
    for m in masters:
        for s in compute_free_slots(
            day=day,
            window=m.window,
            busy=m.busy,
            total_duration_min=total_duration_min,
            tz=tz,
            granularity_min=granularity_min,
            now=now,
        ):
            by_start.setdefault(s, []).append(m.master_id)

    return [
        SlotOption(start_at=start, master_ids=sorted(ids))
        for start, ids in sorted(by_start.items())
    ]
