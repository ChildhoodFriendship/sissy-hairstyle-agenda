import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAgendaRepository } from './supabase-agenda-repository';
import { SUPABASE_CLIENT } from './supabase-client';

describe('SupabaseAgendaRepository complete reads and duplicate lookup', () => {
  it('loads all appointment rows across PostgREST pages', async () => {
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: `appointment-${index}`,
      client_id: null,
      client_name: `Client ${index}`,
      phone: '+393331234567',
      appointment_date: '2026-12-01',
      appointment_time: '10:00:00',
      service: '',
      notes: '',
      status: 'confirmed' as const,
      reminder_consent: false,
      created_at: '2026-01-01T00:00:00.000Z',
      employee_id: null,
      employee_name: 'Admin',
    }));
    const ranges: [number, number][] = [];
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockImplementation(async (from: number, to: number) => {
        ranges.push([from, to]);
        return { data: rows.slice(from, to + 1), error: null, count: rows.length };
      }),
      then: (resolve: (value: { data: typeof rows; error: null; count: number }) => unknown) =>
        Promise.resolve(resolve({ data: rows.slice(0, 500), error: null, count: rows.length })),
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    const appointments = await TestBed.inject(SupabaseAgendaRepository).listAppointments();

    expect(appointments).toHaveLength(501);
    expect(ranges).toEqual([[0, 499], [500, 999]]);
  });

  it('rejects collection reads when the exact row count changes between pages', async () => {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: `appointment-${index}`,
      client_id: null,
      client_name: `Client ${index}`,
      phone: '+393****4567',
      appointment_date: '2026-12-01',
      appointment_time: '10:00:00',
      service: '',
      notes: '',
      status: 'confirmed' as const,
      reminder_consent: false,
      created_at: '2026-01-01T00:00:00.000Z',
      employee_id: null,
      employee_name: 'Admin',
    }));
    const ranges: [number, number][] = [];
    const range = vi.fn().mockImplementation(async (from: number, to: number) => {
      ranges.push([from, to]);
      return from === 0
        ? { data: rows, error: null, count: 501 }
        : { data: [], error: null, count: 500 };
    });
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range,
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    await expect(TestBed.inject(SupabaseAgendaRepository).listAppointments())
      .rejects.toThrow('Database result count changed during pagination');

    expect(ranges).toEqual([[0, 499], [500, 999]]);
  });

  it('rejects collection reads when the exact row count is unavailable', async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: null, count: null });
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    await expect(TestBed.inject(SupabaseAgendaRepository).listAppointments())
      .rejects.toThrow('Database result count is unavailable');
    expect(range).toHaveBeenCalledWith(0, 499);
  });

  it('rejects an empty collection page when the exact count reports remaining rows', async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null, count: 1 });
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    await expect(TestBed.inject(SupabaseAgendaRepository).listAppointments())
      .rejects.toThrow('Database returned an incomplete page');
    expect(range).toHaveBeenCalledWith(0, 499);
  });

  it('looks up a client by the normalized unique phone and maps the complete row', async () => {
    const row = {
      id: 'client-1', first_name: 'Ada', last_name: 'Lovelace', phone: '+393331234567',
      whatsapp_consent: true, notes: 'Test', created_at: '2026-01-01T00:00:00.000Z',
    };
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
    const query = { select: vi.fn().mockReturnThis(), eq, maybeSingle };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    const client = await (TestBed.inject(SupabaseAgendaRepository) as unknown as {
      findClientByPhone(phone: string): Promise<unknown>;
    }).findClientByPhone(row.phone);

    expect(from).toHaveBeenCalledWith('clients');
    expect(eq).toHaveBeenCalledWith('phone', row.phone);
    expect(client).toEqual({
      id: row.id, name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', phone: row.phone,
      whatsappConsent: true, notes: 'Test', createdAt: row.created_at,
    });
  });
});
