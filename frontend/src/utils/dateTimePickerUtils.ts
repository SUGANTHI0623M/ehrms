import dayjs, { Dayjs } from 'dayjs';

/**
 * Use with Ant Design DatePicker to allow only current or future dates.
 * Disables all dates before today.
 */
export function disabledDatePast(current: Dayjs | null): boolean {
    return !!current && current < dayjs().startOf('day');
}

/**
 * Use with Ant Design DatePicker showTime to disable past time when the selected date is today.
 * When the selected date is in the future, all times are allowed.
 * When the selected date is today, hours/minutes/seconds before now are disabled.
 */
export function disabledTimePastWhenToday(date: Dayjs | null): {
    disabledHours?: () => number[];
    disabledMinutes?: (selectedHour: number) => number[];
    disabledSeconds?: (selectedHour: number, selectedMinute: number) => number[];
} {
    const now = dayjs();
    if (!date || !date.isSame(now, 'day')) return {};
    return {
        disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
        disabledMinutes: (selectedHour: number) => {
            if (selectedHour !== now.hour()) return [];
            return Array.from({ length: now.minute() }, (_, i) => i);
        },
        disabledSeconds: (selectedHour: number, selectedMinute: number) => {
            if (selectedHour !== now.hour() || selectedMinute !== now.minute()) return [];
            return Array.from({ length: now.second() + 1 }, (_, i) => i);
        }
    };
}
