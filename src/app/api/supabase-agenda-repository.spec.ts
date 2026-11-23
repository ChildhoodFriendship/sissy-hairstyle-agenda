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

describe('SupabaseAgendaRepository salon settings', () => {
  const settingsKey = 'sissy-agenda-settings-v1';
  const localSettings = {
    salonName: 'Salone locale', defaultCountryCode: '+39', services: ['Servizio non persistito'],
    businessHours: { open: '09:00', close: '18:00', closedDays: [0] },
    messageTemplates: { confirmation: 'Conferma locale', reminder: 'Promemoria locale' },
    demoDataEnabled: true,
  };
  const row = {
    salon_name: 'Salone remoto', default_country_code: '+39',
    business_hours: { open: '08:30', close: '19:00', closedDays: [0, 1] },
    message_templates: { confirmation: 'Conferma remota', reminder: 'Promemoria remoto' },
    demo_data_enabled: false,
  };

  it('loads owner settings from Supabase and removes the stale local copy', async () => {
    localStorage.setItem(settingsKey, JSON.stringify(localSettings));
    const query = {
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });
    const repository = TestBed.inject(SupabaseAgendaRepository);

    await expect(repository.loadSettings()).resolves.toEqual({
      salonName: 'Salone remoto', defaultCountryCode: '+39', services: [],
      businessHours: row.business_hours, messageTemplates: row.message_templates, demoDataEnabled: false,
    });
    expect(from).toHaveBeenCalledWith('salon_settings');
    expect(localStorage.getItem(settingsKey)).toBeNull();
    expect(repository.hasSettingsWarning()).toBe(false);
  });

  it('migrates legacy browser settings only when the owner has no remote row', async () => {
    localStorage.setItem(settingsKey, JSON.stringify(localSettings));
    const query = {
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: row, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });
    const repository = TestBed.inject(SupabaseAgendaRepository);

    await expect(repository.loadSettings()).resolves.toMatchObject({
      salonName: 'Salone remoto', messageTemplates: row.message_templates,
    });
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({
      salon_name: 'Salone locale', default_country_code: '+39',
      business_hours: localSettings.businessHours,
      message_templates: localSettings.messageTemplates,
      demo_data_enabled: true,
    }), { onConflict: 'owner_id', ignoreDuplicates: true });
    expect(query.upsert.mock.calls[0][0]).not.toHaveProperty('services');
    expect(localStorage.getItem(settingsKey)).toBeNull();
  });

  it('preserves the browser copy and exposes a warning when remote migration fails', async () => {
    localStorage.setItem(settingsKey, JSON.stringify(localSettings));
    const query = {
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: { code: 'PGRST205', message: 'Table not found' } }),
    };
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });
    const repository = TestBed.inject(SupabaseAgendaRepository);

    await expect(repository.loadSettings()).resolves.toMatchObject({
      salonName: 'Salone locale', businessHours: localSettings.businessHours,
    });
    expect(localStorage.getItem(settingsKey)).not.toBeNull();
    expect(repository.hasSettingsWarning()).toBe(true);
  });

  it('saves salon preferences remotely without keeping them in localStorage', async () => {
    localStorage.setItem(settingsKey, JSON.stringify(localSettings));
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: { from } }] });
    const repository = TestBed.inject(SupabaseAgendaRepository);

    await repository.saveSettings(localSettings);

    expect(from).toHaveBeenCalledWith('salon_settings');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      salon_name: 'Salone locale', default_country_code: '+39',
      business_hours: localSettings.businessHours,
      message_templates: localSettings.messageTemplates,
      demo_data_enabled: true,
    }), { onConflict: 'owner_id' });
    expect(upsert.mock.calls[0][0]).not.toHaveProperty('services');
    expect(localStorage.getItem(settingsKey)).toBeNull();
  });
});
