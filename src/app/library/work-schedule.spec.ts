import { describe, expect, it } from 'vitest';
import type { Appointment } from './models';
import { freeTimesForPerson, type DailyWorkSchedule } from './work-schedule';

const date = '2026-11-20';
const otherDate = '2026-11-21';
const schedule = (employeeId: string | null, slots: number[]): DailyWorkSchedule => ({ date, employeeId, slots });
const booking = (id: string, employeeId: string | null, overrides: Partial<Appointment> = {}): Appointment => ({
  id, employeeId, date, time: '10:00', status: 'confirmed',
  clientId: 'client', clientName: 'Ada', phone: '', service: '', notes: '',
  reminderConsent: false, createdAt: '2026-11-19T12:00:00Z', ...overrides,
});

describe('freeTimesForPerson', () => {
  it('returns no times without explicitly configured slots for this person and date', () => {
    const rows = [schedule('ada', []), schedule(null, [20]), { ...schedule('ada', [21]), date: otherDate }];
    expect(freeTimesForPerson([], [], date, null)).toEqual([]);
    expect(freeTimesForPerson(rows, [], date, 'ada')).toEqual([]);
    expect(freeTimesForPerson(rows, [], date, 'bea')).toEqual([]);
  });

  it('combines matching rows into sorted unique half-hour starts without filling shift gaps', () => {
    const rows = [schedule('ada', [47, 20, 0]), schedule('ada', [21, 20]), schedule(null, [22])];
    expect(freeTimesForPerson(rows, [], date, 'ada')).toEqual(['00:00', '10:00', '10:30', '23:30']);
  });

  it('ignores indices outside the day and indices that are not integers', () => {
    const rows = [schedule(null, [-1, 48, 1.5, NaN, Infinity, 1])];
    expect(freeTimesForPerson(rows, [], date, null)).toEqual(['00:30']);
  });

  it('blocks a confirmed assignee, not a different person working the same slot', () => {
    const rows = [schedule(null, [20]), schedule('ada', [20]), schedule('bea', [20])];
    const bookings = [booking('a', null, { employeeName: 'Admin' }), booking('b', 'ada')];
    expect(freeTimesForPerson(rows, bookings, date, null)).toEqual([]);
    expect(freeTimesForPerson(rows, bookings, date, 'ada')).toEqual([]);
    expect(freeTimesForPerson(rows, bookings, date, 'bea')).toEqual(['10:00']);
  });

  it('ignores cancelled, completed, other-date and other-time appointments', () => {
    const bookings = [
      booking('a', 'ada', { status: 'cancelled' }), booking('b', 'ada', { status: 'completed' }),
      booking('c', 'ada', { date: otherDate }), booking('d', 'ada', { time: '10:30' }),
    ];
    expect(freeTimesForPerson([schedule('ada', [20])], bookings, date, 'ada')).toEqual(['10:00']);
  });

  it('counts a historical null-ID assignment toward capacity without treating it as Sissy', () => {
    const rows = [schedule(null, [20, 21])];
    const bookings = [booking('legacy', null, { employeeName: 'Former employee' }), booking('a', 'ada')];
    expect(freeTimesForPerson(rows, bookings, date, null)).toEqual(['10:00', '10:30']);
    expect(freeTimesForPerson(rows, [...bookings, booking('b', 'bea')], date, null)).toEqual(['10:30']);
  });

  it('excludes the edited appointment from both the assignee check and the capacity count', () => {
    const rows = [schedule('ada', [20])];
    const bookings = [booking('editing', 'ada'), booking('b', 'bea'), booking('c', null)];
    expect(freeTimesForPerson(rows, bookings, date, 'ada', 'editing')).toEqual(['10:00']);
    expect(freeTimesForPerson(rows, bookings, date, 'ada', 'b')).toEqual([]);
  });
});
