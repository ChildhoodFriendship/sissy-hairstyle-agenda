import { describe, expect, it } from 'vitest';
import {
  findAppointmentConflict,
  getDueReminders,
  normalizePhoneNumber,
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

  it('preserves an explicit international country code', () => {
    expect(normalizePhoneNumber('+44 20 7946 0958', '+39').e164).toBe('+442079460958');
  });

  it('rejects values that cannot be a valid international phone number', () => {
    expect(normalizePhoneNumber('123', '+39').error).toBeTruthy();
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
});

describe('getDueReminders', () => {
  it('returns only confirmed appointments for tomorrow with explicit reminder consent', () => {
    const result = getDueReminders(
      [
        appointment(),
        appointment({ id: 'no-consent', reminderConsent: false }),
        appointment({ id: 'cancelled', status: 'cancelled' }),
        appointment({ id: 'later', date: '2026-11-07' }),
      ],
      '2026-11-05',
    );

    expect(result.map(({ id }) => id)).toEqual(['a-1']);
  });
});
