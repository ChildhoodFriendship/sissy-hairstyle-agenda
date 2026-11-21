import { findAppointmentConflict } from './domain-utils';
import type { Appointment } from './models';

export interface DailyWorkSchedule {
  date: string;
  employeeId: string | null;
  /** Half-hour intervals on this date: 0 starts at 00:00, 47 at 23:30. */
  slots: number[];
}

/** Default daily schedule: appointment starts every 30 minutes from 08:30 to 19:30. */
export const DEFAULT_WORK_SLOTS = Array.from({ length: 23 }, (_value, index) => index + 17);

export function freeTimesForPerson(
  schedules: DailyWorkSchedule[],
  appointments: Appointment[],
  date: string,
  employeeId: string | null,
  excludeId?: string,
): string[] {
  const matchingSchedules = schedules.filter((row) => row.date === date && row.employeeId === employeeId);
  const slots = new Set<number>(matchingSchedules.length ? [] : DEFAULT_WORK_SLOTS);
  for (const row of schedules) {
    if (row.date !== date || row.employeeId !== employeeId) continue;
    for (const slot of row.slots) {
      if (Number.isInteger(slot) && slot >= 0 && slot < 48) slots.add(slot);
    }
  }

  return [...slots]
    .sort((a, b) => a - b)
    .map((slot) => `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 === 0 ? '00' : '30'}`)
    .filter((time) => !findAppointmentConflict(appointments, { date, time, employeeId, excludeId }));
}
