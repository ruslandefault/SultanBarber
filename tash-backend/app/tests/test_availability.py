"""Unit tests for the pure slot-availability algorithm (no DB required)."""

from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.services.availability import (
    Interval,
    MasterAvailability,
    WorkWindow,
    compute_any_master_slots,
    compute_free_slots,
)

TZ = ZoneInfo("Asia/Tashkent")
DAY = date(2026, 7, 20)  # a Monday


def at(h: int, m: int = 0) -> datetime:
    return datetime(DAY.year, DAY.month, DAY.day, h, m, tzinfo=TZ)


def test_day_off_returns_no_slots():
    window = WorkWindow(start=time(9, 0), end=time(18, 0), is_day_off=True)
    slots = compute_free_slots(
        day=DAY, window=window, busy=[], total_duration_min=30, tz=TZ
    )
    assert slots == []


def test_basic_grid_no_busy():
    window = WorkWindow(start=time(9, 0), end=time(10, 0))
    slots = compute_free_slots(
        day=DAY, window=window, busy=[], total_duration_min=30, tz=TZ
    )
    # 09:00..10:00 window, 30-min service, 15-min grid -> 09:00, 09:15, 09:30
    assert slots == [at(9, 0), at(9, 15), at(9, 30)]


def test_service_longer_than_remaining_window():
    window = WorkWindow(start=time(9, 0), end=time(9, 30))
    # 45-min service cannot fit anywhere in a 30-min window
    slots = compute_free_slots(
        day=DAY, window=window, busy=[], total_duration_min=45, tz=TZ
    )
    assert slots == []


def test_fully_booked():
    window = WorkWindow(start=time(9, 0), end=time(10, 0))
    busy = [Interval(at(9, 0), at(10, 0))]
    slots = compute_free_slots(
        day=DAY, window=window, busy=busy, total_duration_min=30, tz=TZ
    )
    assert slots == []


def test_exact_back_to_back_slots():
    # 09:00-18:00 window; existing 10:00-11:00 booking; 60-min service.
    window = WorkWindow(start=time(10, 0), end=time(13, 0))
    busy = [Interval(at(11, 0), at(12, 0))]
    slots = compute_free_slots(
        day=DAY, window=window, busy=busy, total_duration_min=60, tz=TZ
    )
    # Valid 60-min starts that avoid [11:00,12:00): 10:00 (ends 11:00, back-to-back OK)
    # and 12:00 (starts exactly when busy ends). 10:15..10:45 overlap; 11:xx overlap.
    assert at(10, 0) in slots
    assert at(12, 0) in slots
    assert at(10, 15) not in slots
    assert at(11, 0) not in slots
    assert at(11, 45) not in slots


def test_past_slots_filtered_by_now():
    window = WorkWindow(start=time(9, 0), end=time(11, 0))
    now = at(9, 40)
    slots = compute_free_slots(
        day=DAY, window=window, busy=[], total_duration_min=30, tz=TZ, now=now
    )
    # Only slots at or after 09:40 remain (grid: 09:45, 10:00, 10:15, 10:30)
    assert all(s >= now for s in slots)
    assert at(9, 0) not in slots
    assert at(9, 45) in slots


def test_any_master_union_and_membership():
    window_a = WorkWindow(start=time(9, 0), end=time(10, 0))
    window_b = WorkWindow(start=time(9, 0), end=time(10, 0))
    # master 1 busy 09:00-09:30, master 2 free all window
    m1 = MasterAvailability(
        master_id=1, window=window_a, busy=[Interval(at(9, 0), at(9, 30))]
    )
    m2 = MasterAvailability(master_id=2, window=window_b, busy=[])
    options = compute_any_master_slots(
        day=DAY, masters=[m1, m2], total_duration_min=30, tz=TZ
    )
    by_start = {o.start_at: o.master_ids for o in options}
    # 09:00: only master 2 free
    assert by_start[at(9, 0)] == [2]
    # 09:30: both masters free
    assert by_start[at(9, 30)] == [1, 2]
    # options are sorted by start time
    starts = [o.start_at for o in options]
    assert starts == sorted(starts)


def test_dst_free_tashkent_has_no_gaps():
    # Asia/Tashkent has no DST; a full-day window yields a clean grid.
    window = WorkWindow(start=time(9, 0), end=time(9, 45))
    slots = compute_free_slots(
        day=DAY, window=window, busy=[], total_duration_min=15, tz=TZ
    )
    assert slots == [at(9, 0), at(9, 15), at(9, 30)]
