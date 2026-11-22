import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseAgendaRepository } from './supabase-agenda-repository';
import { SUPABASE_CLIENT } from './supabase-client';

describe('SupabaseAgendaRepository employee archival', () => {
  it('marks an employee inactive instead of deleting the row', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    await TestBed.inject(SupabaseAgendaRepository).deleteEmployee('employee-1');

    expect(from).toHaveBeenCalledWith('employees');
    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(eq).toHaveBeenCalledWith('id', 'employee-1');
  });
});

describe('SupabaseAgendaRepository salon services', () => {
  it('loads service names from the owner-scoped Supabase table', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: { name: string }[]; error: null }) => unknown) =>
        Promise.resolve(resolve({ data: [{ name: 'Taglio' }, { name: 'Piega' }], error: null })),
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    const services = await TestBed.inject(SupabaseAgendaRepository).listServices();

    expect(from).toHaveBeenCalledWith('salon_services');
    expect(query.select).toHaveBeenCalledWith('name');
    expect(query.order).toHaveBeenNthCalledWith(1, 'position');
    expect(services).toEqual(['Taglio', 'Piega']);
  });

  it('deletes removed services and upserts the current ordered list', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: { id: string; name: string }[]; error: null }) => unknown) =>
        Promise.resolve(resolve({ data: [{ id: 'service-2', name: 'Piega' }], error: null })),
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });

    await TestBed.inject(SupabaseAgendaRepository).saveServices(['Taglio', ' Colore ']);

    expect(query.delete).toHaveBeenCalledOnce();
    expect(query.in).toHaveBeenCalledWith('id', ['service-2']);
    expect(query.upsert).toHaveBeenCalledWith([
      { name: 'Taglio', position: 0 }, { name: 'Colore', position: 1 },
    ], { onConflict: 'owner_id,name' });
  });
});
