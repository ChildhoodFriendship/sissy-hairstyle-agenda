import { describe, expect, it } from 'vitest';
import {
  findAppointmentConflict,
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

describe('findAppointmentConflict', () => {
  it('finds another active appointment in the same date and time', () => {
    expect(
      findAppointmentConflict([appointment()], { date: '2026-11-06', time: '10:30' }),
    ).toBe(true);
  });

  it('ignores canceled appointments and the appointment being edited', () => {
    expect(
      findAppointmentConflict(
        [appointment({ status: 'cancelled' }), appointment({ id: 'editing' })],
        { date: '2026-11-06', time: '10:30', excludeId: 'editing' },
      ),
    ).toBe(false);
  });

  it('allows distinct assignees to share a slot until its three-appointment limit', () => {
    const existing = [
      appointment({ id: 'admin', employeeId: null }),
      appointment({ id: 'employee-1', employeeId: 'employee-1' }),
    ];
    expect(findAppointmentConflict(existing, {
      date: '2026-11-06', time: '10:30', employeeId: 'employee-2',
    })).toBe(false);
  });

  it('blocks a fourth appointment and duplicate assignee in the same slot', () => {
    const existing = [
      appointment({ id: 'admin', employeeId: null }),
      appointment({ id: 'employee-1', employeeId: 'employee-1' }),
      appointment({ id: 'employee-2', employeeId: 'employee-2' }),
    ];
    expect(findAppointmentConflict(existing, {
      date: '2026-11-06', time: '10:30', employeeId: 'employee-3',
    })).toBe(true);
    expect(findAppointmentConflict(existing, {
      date: '2026-11-06', time: '10:30', employeeId: null,
    })).toBe(true);
  });

  it('does not treat an archived employee snapshot without an id as the Admin assignee', () => {
    const legacyAssignment = appointment({
      id: 'legacy-assignment',
      employeeId: null,
      employeeName: 'Giulia Bianchi',
    });
    expect(findAppointmentConflict([legacyAssignment], {
      date: '2026-11-06', time: '10:30', employeeId: null, employeeName: 'Admin',
    })).toBe(false);
  });
});
