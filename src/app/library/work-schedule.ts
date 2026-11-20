import { findAppointmentConflict } from './domain-utils';
import type { Appointment } from './models';

export interface DailyWorkSchedule {
  date: string;
  employeeId: string | null;
  /** Half-hour intervals on this date: 0 starts at 00:00, 47 at 23:30. */
  slots: number[];
}

export function freeTimesForPerson(
  schedules: DailyWorkSchedule[],
  appointments: Appointment[],
  date: string,
  employeeId: string | null,
  excludeId?: string,
): string[] {
  const slots = new Set<number>();
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
