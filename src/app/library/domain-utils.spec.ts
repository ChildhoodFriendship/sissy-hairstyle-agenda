import { describe, expect, it } from 'vitest';
import {
  appointmentDurationFromTimes,
  findAppointmentOverlaps,
  formatAppointmentTimeRange,
  isAppointmentSlotAtCapacity,
  normalizePhoneNumber,
  phoneForDisplay,
  renderMessageTemplate,
} from './domain-utils';
import type { Appointment } from './models';

const appointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'a-1',
  clientId: 'c-1',
  clientName: 'Ada Rossi',
  phone: '+393331234567',
  date: '2026-11-06',
  time: '10:30',
  service: 'Taglio',
  notes: '',
  status: 'confirmed',
  reminderConsent: true,
  createdAt: '2026-11-05T10:00:00.000Z',
  ...overrides,
});

describe('normalizePhoneNumber', () => {
  it('normalizes an Italian national number using the supplied default country code', () => {
    expect(normalizePhoneNumber('333 123 4567', '+39')).toEqual({
      e164: '+393331234567',
      error: null,
    });
  });

  it('accepts the Italian country code when explicitly entered', () => {
    expect(normalizePhoneNumber('0039 333 1234567', '+39').e164).toBe('+393331234567');
  });

  it('rejects a foreign prefix instead of saving it as an Italian contact', () => {
    expect(normalizePhoneNumber('+30 333 1234567', '+39').e164).toBeNull();
    expect(normalizePhoneNumber('0030 333 1234567', '+39').error).toBeTruthy();
    expect(normalizePhoneNumber('+44 20 7946 0958', '+39').e164).toBeNull();
  });

  it('rejects values that cannot be a valid international phone number', () => {
    expect(normalizePhoneNumber('123', '+39').error).toBeTruthy();
  });
});

describe('phoneForDisplay', () => {
  it('hides only the Italian prefix while preserving the rest of the number', () => {
    expect(phoneForDisplay('+393331234567')).toBe('3331234567');
    expect(phoneForDisplay('0039 333 1234567')).toBe('333 1234567');
    expect(phoneForDisplay('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });
});

describe('renderMessageTemplate', () => {
  it('replaces known placeholders and leaves unknown placeholders unchanged', () => {
    expect(
      renderMessageTemplate('Ciao {nome}, ti aspettiamo il {data} alle {ora} · {extra}', {
        nome: 'Ada',
        data: '06/11/2026',
        ora: '10:30',
        servizio: 'Taglio',
        salone: 'Il salone',
      }),
    ).toBe('Ciao Ada, ti aspettiamo il 06/11/2026 alle 10:30 · {extra}');
  });
});

describe('appointment duration and overlap', () => {
  it('converts same-day half-hour ranges into minutes, including midnight as 24:00', () => {
    expect(appointmentDurationFromTimes('08:30', '10:00')).toBe(90);
    expect(appointmentDurationFromTimes('23:30', '00:00')).toBe(30);
    expect(appointmentDurationFromTimes('08:30', '08:30')).toBeNull();
    expect(appointmentDurationFromTimes('08:30', '09:15')).toBeNull();
    expect(appointmentDurationFromTimes('23:30', '00:30')).toBeNull();
  });

  it('formats a persisted duration as a readable appointment range', () => {
    expect(formatAppointmentTimeRange(appointment({ time: '08:30', durationMinutes: 90 }))).toBe('08:30–10:00');
    expect(formatAppointmentTimeRange(appointment({ time: '23:30', durationMinutes: 30 }))).toBe('23:30–24:00');
  });

  it('returns same-assignee appointments whose intervals overlap and excludes a touching boundary', () => {
    const existing = appointment({ employeeId: 'employee-1', employeeName: 'Lara Rossi', time: '08:30', durationMinutes: 90 });
    expect(findAppointmentOverlaps([existing], {
      date: '2026-11-06', time: '09:00', durationMinutes: 30, employeeId: 'employee-1', employeeName: 'Lara Rossi',
    })).toEqual([existing]);
    expect(findAppointmentOverlaps([existing], {
      date: '2026-11-06', time: '10:00', durationMinutes: 30, employeeId: 'employee-1', employeeName: 'Lara Rossi',
    })).toEqual([]);
  });

  it('ignores other assignees, inactive appointments, other dates and the edited record', () => {
    const existing = [
      appointment({ id: 'same', employeeId: 'employee-1', time: '08:30', durationMinutes: 90 }),
      appointment({ id: 'other', employeeId: 'employee-2', time: '08:30', durationMinutes: 90 }),
      appointment({ id: 'cancelled', employeeId: 'employee-1', time: '08:30', durationMinutes: 90, status: 'cancelled' }),
      appointment({ id: 'completed', employeeId: 'employee-1', time: '08:30', durationMinutes: 90, status: 'completed' }),
      appointment({ id: 'different-date', employeeId: 'employee-1', time: '08:30', durationMinutes: 90, date: '2026-11-07' }),
    ];
    expect(findAppointmentOverlaps(existing, {
      date: '2026-11-06', time: '09:00', durationMinutes: 30, employeeId: 'employee-1', excludeId: 'same',
    })).toEqual([]);
  });

  it('does not confuse an archived employee snapshot with the Sissy assignee', () => {
    const legacyAssignment = appointment({
      id: 'legacy-assignment', employeeId: null, employeeName: 'Giulia Bianchi', time: '08:30', durationMinutes: 90,
    });
    expect(findAppointmentOverlaps([legacyAssignment], {
      date: '2026-11-06', time: '09:00', durationMinutes: 30, employeeId: null, employeeName: 'Admin',
    })).toEqual([]);
  });
});

describe('isAppointmentSlotAtCapacity', () => {
  it('allows an existing assignee to take another client while fewer than three start together', () => {
    const existing = [
      appointment({ id: 'admin', employeeId: null }),
      appointment({ id: 'employee-1', employeeId: 'employee-1' }),
    ];
    expect(isAppointmentSlotAtCapacity(existing, { date: '2026-11-06', time: '10:30', employeeId: 'employee-1' })).toBe(false);
  });

  it('blocks a fourth appointment at the same start regardless of assignee', () => {
    const existing = [
      appointment({ id: 'admin', employeeId: null }),
      appointment({ id: 'employee-1', employeeId: 'employee-1' }),
      appointment({ id: 'employee-2', employeeId: 'employee-2' }),
    ];
    expect(isAppointmentSlotAtCapacity(existing, { date: '2026-11-06', time: '10:30', employeeId: 'employee-3' })).toBe(true);
  });

  it('ignores cancelled or completed appointments and excludes the edited appointment from capacity', () => {
    const existing = [
      appointment({ id: 'editing' }),
      appointment({ id: 'second', employeeId: 'employee-1' }),
      appointment({ id: 'third', employeeId: 'employee-2' }),
      appointment({ id: 'cancelled', status: 'cancelled' }),
      appointment({ id: 'completed', status: 'completed' }),
    ];
    expect(isAppointmentSlotAtCapacity(existing, { date: '2026-11-06', time: '10:30', excludeId: 'editing' })).toBe(false);
    expect(isAppointmentSlotAtCapacity(existing, { date: '2026-11-06', time: '10:30' })).toBe(true);
  });
});
