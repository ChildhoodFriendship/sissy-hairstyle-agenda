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
    const range = vi.fn().mockResolvedValue({ data: [
      { work_date: date, employee_id: null, slots: [0, 47] },
      { work_date: date, employee_id: employeeId, slots: [] },
    ], error: null, count: 2 });
    const order = vi.fn().mockReturnValue({ range });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const { repository, from } = setup({ select });

    await expect(repository.listWorkSchedules(date)).resolves.toEqual([
      { date, employeeId: null, slots: [0, 47] },
      { date, employeeId, slots: [] },
    ]);
    expect(from).toHaveBeenCalledWith('daily_work_schedules');
    expect(eq).toHaveBeenCalledWith('work_date', date);
    expect(range).toHaveBeenCalledWith(0, 499);
  });

  it('does not fabricate schedules for an unconfigured date', async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 });
    const eq = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range }) });
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
    const range = vi.fn().mockResolvedValue({ data: null, error, count: null });
    const eq = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range }) });
    const { repository } = setup({ select: () => ({ eq }) });
    await expect(repository.listWorkSchedules(date)).rejects.toBe(error);
  });

  it('checks the feature columns and sends duration plus the one-save overlap confirmation', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ limit });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const { repository } = setup({ select, upsert });

    const acknowledgement = [{
      id: 'a0f1d333-7333-4b16-bf89-990d738a7f3c', date, time: '08:30', durationMinutes: 90,
      employeeId: null, employeeName: 'Admin', clientName: 'Existing',
    }];
    await repository.saveAppointment({
      id: 'bf594afe-f602-480b-bda2-b2d05aa7d066', clientId: '', clientName: 'Test', phone: '0000000', date, time: '09:00',
      durationMinutes: 90, status: 'confirmed', employeeId: null, employeeName: 'Admin', service: '', notes: '',
      reminderConsent: false, createdAt: '2026-12-01T00:00:00Z',
    }, { overlapAcknowledgement: acknowledgement });

    expect(select).toHaveBeenCalledWith('duration_minutes,overlap_acknowledgement');
    expect(limit).toHaveBeenCalledWith(0);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ duration_minutes: 90, overlap_acknowledgement: acknowledgement }));
  });

  it.each(['duration_minutes', 'overlap_acknowledgement'])('fails closed with a clear migration code when %s is absent', async (column) => {
    const select = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST204', message: `Could not find '${column}' column` } }),
    });
    const upsert = vi.fn();
    const { repository } = setup({ select, upsert });

    await expect(repository.saveAppointment({
      id: 'bf594afe-f602-480b-bda2-b2d05aa7d066', clientId: '', clientName: 'Test', phone: '0000000', date, time: '09:00',
      durationMinutes: 90, status: 'confirmed', employeeId: null, employeeName: 'Admin', service: '', notes: '',
      reminderConsent: false, createdAt: '2026-12-01T00:00:00Z',
    })).rejects.toMatchObject({ code: 'APPOINTMENT_FEATURE_MIGRATION_REQUIRED' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each(['23514', '23505'])('preserves booking rejection code %s from an appointment upsert', async (code) => {
    const error = { code, message: 'Slot no longer available' };
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ limit });
    const { repository, from } = setup({ select, upsert: vi.fn().mockResolvedValue({ error }) });
    await expect(repository.saveAppointment({
      id: 'bf594afe-f602-480b-bda2-b2d05aa7d066', clientId: '', clientName: 'Test', phone: '0000000', date, time: '09:00',
      durationMinutes: 30, status: 'confirmed', employeeId: null, employeeName: 'Admin', service: '', notes: '',
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
