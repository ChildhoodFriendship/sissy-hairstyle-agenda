import { isAppointmentSlotAtCapacity } from './domain-utils';
import type { Appointment } from './models';

export interface DailyWorkSchedule {
  date: string;
  employeeId: string | null;
  /** Half-hour intervals on this date: 0 starts at 00:00, 47 at 23:30. */
  slots: number[];
}

/** Default daily schedule: appointment starts every 30 minutes from 08:30 to 19:30. */
export const DEFAULT_WORK_SLOTS = Array.from({ length: 23 }, (_value, index) => index + 17);

function workSlotsForPerson(schedules: DailyWorkSchedule[], date: string, employeeId: string | null): Set<number> {
  const matchingSchedules = schedules.filter((row) => row.date === date && row.employeeId === employeeId);
  const slots = new Set<number>(matchingSchedules.length ? [] : DEFAULT_WORK_SLOTS);
  for (const row of matchingSchedules) {
    for (const slot of row.slots) {
      if (Number.isInteger(slot) && slot >= 0 && slot < 48) slots.add(slot);
    }
  }
  return slots;
}

export function canScheduleAppointment(
  schedules: DailyWorkSchedule[],
  date: string,
  employeeId: string | null,
  time: string,
  durationMinutes: number,
): boolean {
  const startSlot = startTimeSlot(time);
  if (startSlot === null || !Number.isInteger(durationMinutes) || durationMinutes < 30 ||
    durationMinutes > 720 || durationMinutes % 30 !== 0 || startSlot + durationMinutes / 30 > 48) return false;
  const workSlots = workSlotsForPerson(schedules, date, employeeId);
  return Array.from({ length: durationMinutes / 30 }, (_value, index) => workSlots.has(startSlot + index)).every(Boolean);
}

function startTimeSlot(time: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 2 + minute / 30;
}

export function freeTimesForPerson(
  schedules: DailyWorkSchedule[],
  appointments: Appointment[],
  date: string,
  employeeId: string | null,
  excludeId?: string,
): string[] {
  return [...workSlotsForPerson(schedules, date, employeeId)]
    .sort((a, b) => a - b)
    .map((slot) => `${String(Math.floor(slot / 2)).padStart(2, '0')}:${slot % 2 === 0 ? '00' : '30'}`)
    .filter((time) => !isAppointmentSlotAtCapacity(appointments, { date, time, employeeId, excludeId }));
}
