import type { Appointment, MessagePlaceholders } from './models';

export interface PhoneNormalizationResult {
  e164: string | null;
  error: string | null;
}

export function phoneForDisplay(phone: string): string {
  return phone.replace(/^(?:\+39|0039)[\s().-]*/, '');
}

export function normalizePhoneNumber(input: string, defaultCountryCode: string): PhoneNormalizationResult {
  const normalizedCountryCode = defaultCountryCode.replace(/[^\d]/g, '');
  if (!/^[1-9]\d{0,2}$/.test(normalizedCountryCode)) {
    return { e164: null, error: 'Prefisso internazionale non valido.' };
  }

  let digits = input.trim().replace(/[\s().-]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  const isInternational = digits.startsWith('+');
  if (!/^\+?\d+$/.test(digits)) {
    return { e164: null, error: 'Inserisci un numero di telefono valido.' };
  }

  const nationalDigits = digits.replace(/^\+/, '');
  if (normalizedCountryCode === '39' && isInternational && !nationalDigits.startsWith('39')) {
    return { e164: null, error: 'Inserisci un numero italiano senza prefisso internazionale.' };
  }
  const internationalDigits = isInternational ? nationalDigits : `${normalizedCountryCode}${nationalDigits}`;
  if (!/^[1-9]\d{7,14}$/.test(internationalDigits)) {
    return { e164: null, error: 'Il numero deve contenere da 8 a 15 cifre in formato internazionale.' };
  }

  return { e164: `+${internationalDigits}`, error: null };
}

export function renderMessageTemplate(template: string, values: MessagePlaceholders): string {
  return template.replace(/\{(nome|data|ora|servizio|salone)\}/g, (_match, key: keyof MessagePlaceholders) =>
    values[key],
  );
}

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
export const MAX_APPOINTMENT_DURATION_MINUTES = 720;

export interface AppointmentSlot {
  date: string;
  time: string;
  durationMinutes?: number;
  excludeId?: string;
  employeeId?: string | null;
  employeeName?: string;
}

export function appointmentDurationFromTimes(startTime: string, endTime: string): number | null {
  const start = appointmentTimeMinutes(startTime);
  const displayedEnd = appointmentTimeMinutes(endTime);
  if (start === null || displayedEnd === null) return null;
  const end = endTime === '00:00' && start > 0 ? 24 * 60 : displayedEnd;
  const duration = end - start;
  return isValidAppointmentDuration(duration) ? duration : null;
}

export function appointmentDurationMinutes(value: number | undefined): number {
  return isValidAppointmentDuration(value) ? value : DEFAULT_APPOINTMENT_DURATION_MINUTES;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const start = appointmentTimeMinutes(time);
  if (start === null || !isValidAppointmentDuration(minutes) || start + minutes > 24 * 60) return '';
  const end = start + minutes;
  return end === 24 * 60 ? '00:00' : formatAppointmentTime(end);
}

export function formatAppointmentTimeRange(appointment: Pick<Appointment, 'time' | 'durationMinutes'>): string {
  const endTime = addMinutesToTime(appointment.time, appointmentDurationMinutes(appointment.durationMinutes));
  const displayedEnd = endTime === '00:00' && appointment.time !== '00:00' ? '24:00' : endTime;
  return `${appointment.time}–${displayedEnd}`;
}

export function isAppointmentSlotAtCapacity(appointments: Appointment[], slot: AppointmentSlot): boolean {
  return appointments.filter((item) =>
    item.status === 'confirmed' &&
    item.id !== slot.excludeId &&
    item.date === slot.date &&
    item.time === slot.time,
  ).length >= 3;
}

export function findAppointmentOverlaps(appointments: Appointment[], slot: AppointmentSlot): Appointment[] {
  const requestedStart = appointmentTimeMinutes(slot.time);
  const requestedDuration = slot.durationMinutes === undefined
    ? DEFAULT_APPOINTMENT_DURATION_MINUTES
    : slot.durationMinutes;
  if (requestedStart === null || !isValidAppointmentDuration(requestedDuration) ||
    requestedStart + requestedDuration > 24 * 60) return [];

  const requestedAssignee = assigneeKey(slot.employeeId, slot.employeeName, slot.excludeId ?? 'new');
  return appointments.filter((item) => {
    if (item.status !== 'confirmed' || item.id === slot.excludeId || item.date !== slot.date) return false;
    if (assigneeKey(item.employeeId, item.employeeName, item.id) !== requestedAssignee) return false;
    const existingStart = appointmentTimeMinutes(item.time);
    if (existingStart === null) return false;
    const existingDuration = appointmentDurationMinutes(item.durationMinutes);
    return existingStart < requestedStart + requestedDuration &&
      requestedStart < existingStart + existingDuration;
  }).sort((a, b) => a.time.localeCompare(b.time));
}

function isValidAppointmentDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= DEFAULT_APPOINTMENT_DURATION_MINUTES &&
    value <= MAX_APPOINTMENT_DURATION_MINUTES && value % DEFAULT_APPOINTMENT_DURATION_MINUTES === 0;
}

function appointmentTimeMinutes(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function formatAppointmentTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function assigneeKey(employeeId: string | null | undefined, employeeName: string | undefined, appointmentId: string): string {
  if (employeeId) return `employee:${employeeId}`;
  if (employeeName && employeeName !== 'Admin') return `legacy:${appointmentId}`;
  return 'admin';
}
