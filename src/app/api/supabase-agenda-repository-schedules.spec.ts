import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAgendaRepository } from './supabase-agenda-repository';
import { SUPABASE_CLIENT } from './supabase-client';

const date = '2026-12-01';
const employeeId = 'f5267f31-be8d-4f18-878d-6f19e07789a5';

function setup(table: object) {
  const from = vi.fn().mockReturnValue(table);
  TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });
  return { repository: TestBed.inject(SupabaseAgendaRepository), from };
}

describe('SupabaseAgendaRepository daily work schedules', () => {
  it('reads one calendar date and preserves separate Sissy and employee schedules', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [
      { work_date: date, employee_id: null, slots: [0, 47] },
      { work_date: date, employee_id: employeeId, slots: [] },
    ], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    const { repository, from } = setup({ select });

    await expect(repository.listWorkSchedules(date)).resolves.toEqual([
      { date, employeeId: null, slots: [0, 47] },
      { date, employeeId, slots: [] },
    ]);
    expect(from).toHaveBeenCalledWith('daily_work_schedules');
    expect(eq).toHaveBeenCalledWith('work_date', date);
  });

  it('does not fabricate schedules for an unconfigured date', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [], error: null });
    const { repository } = setup({ select: () => ({ eq }) });
    await expect(repository.listWorkSchedules(date)).resolves.toEqual([]);
  });

  it.each([
    { employeeId: null, slots: [] },
    { employeeId, slots: [18, 19, 28] },
  ])('atomically replaces only the given person/date, including an empty schedule', async (person) => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const { repository, from } = setup({ upsert });

    await repository.saveWorkSchedule({ date, ...person });

    expect(from).toHaveBeenCalledWith('daily_work_schedules');
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({ work_date: date, employee_id: person.employeeId, slots: person.slots },
      { onConflict: 'owner_id,work_date,employee_id' });
  });

  it('propagates the original missing-table error rather than treating it as a closed day', async () => {
    const error = { code: 'PGRST205', message: 'Table not found in the schema cache' };
    const eq = vi.fn().mockResolvedValue({ data: null, error });
    const { repository } = setup({ select: () => ({ eq }) });
    await expect(repository.listWorkSchedules(date)).rejects.toBe(error);
  });

  it.each(['23514', '23505'])('preserves booking rejection code %s from an appointment upsert', async (code) => {
    const error = { code, message: 'Slot no longer available' };
    const { repository, from } = setup({ upsert: vi.fn().mockResolvedValue({ error }) });
    await expect(repository.saveAppointment({
      id: 'bf594afe-f602-480b-bda2-b2d05aa7d066', clientId: '', clientName: 'Test', phone: '0000000', date, time: '09:00',
      status: 'confirmed', employeeId: null, employeeName: 'Admin', service: '', notes: '',
      reminderConsent: false, createdAt: '2026-12-01T00:00:00Z',
    })).rejects.toBe(error);
    expect(from).toHaveBeenCalledWith('appointments');
  });

  it('propagates a rejected schedule write', async () => {
    const error = { code: '23514', message: 'Slot constraint violation' };
    const { repository } = setup({ upsert: vi.fn().mockResolvedValue({ error }) });
    await expect(repository.saveWorkSchedule({ date, employeeId, slots: [48] })).rejects.toBe(error);
  });
});
