import type { Appointment, MessagePlaceholders } from './models';

export interface PhoneNormalizationResult {
  e164: string | null;
  error: string | null;
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

export interface AppointmentSlot {
  date: string;
  time: string;
  excludeId?: string;
  employeeId?: string | null;
  employeeName?: string;
}

export function findAppointmentConflict(appointments: Appointment[], slot: AppointmentSlot): boolean {
  const sameSlot = appointments.filter((item) =>
    item.status === 'confirmed' &&
    item.id !== slot.excludeId &&
    item.date === slot.date &&
    item.time === slot.time,
  );
  const requestedAssignee = assigneeKey(slot.employeeId, slot.employeeName, slot.excludeId ?? 'new');
  return sameSlot.length >= 3 || sameSlot.some((item) =>
    assigneeKey(item.employeeId, item.employeeName, item.id) === requestedAssignee,
  );
}

function assigneeKey(employeeId: string | null | undefined, employeeName: string | undefined, appointmentId: string): string {
  if (employeeId) return `employee:${employeeId}`;
  if (employeeName && employeeName !== 'Admin') return `legacy:${appointmentId}`;
  return 'admin';
}

export function getDueReminders(appointments: Appointment[], today: string): Appointment[] {
  const dueDate = nextIsoDate(today);
  if (!dueDate) return [];
  return appointments.filter(
    (item) => item.status === 'confirmed' && item.reminderConsent && item.date === dueDate,
  );
}

function nextIsoDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
