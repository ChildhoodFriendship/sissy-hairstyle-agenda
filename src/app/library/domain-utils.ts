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
