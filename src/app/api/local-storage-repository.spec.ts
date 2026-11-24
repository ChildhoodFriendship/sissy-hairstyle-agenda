import { describe, expect, it, beforeEach } from 'vitest';
import { LocalStorageRepository } from './local-storage-repository';

const SETTINGS_KEY = 'sissy-agenda-settings-v1';

const validSettings = {
  salonName: 'Salone',
  defaultCountryCode: '+39',
  services: [],
  businessHours: { open: '', close: '', closedDays: [] },
  messageTemplates: { confirmation: 'Conferma', reminder: 'Promemoria' },
  demoDataEnabled: false,
};

describe('LocalStorageRepository legacy settings validation', () => {
  beforeEach(() => localStorage.clear());

  it('preserves legacy settings that predate the demo-data flag', async () => {
    const legacySettings = {
      salonName: 'Salone storico',
      defaultCountryCode: '+39',
      services: [],
      businessHours: { open: '', close: '', closedDays: [] },
      messageTemplates: { confirmation: 'Conferma', reminder: 'Promemoria' },
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(legacySettings));
    const repository = new LocalStorageRepository();

    const settings = await repository.loadSettings();

    expect(settings.salonName).toBe('Salone storico');
    expect(settings.demoDataEnabled).toBe(false);
    expect(repository.hasStorageWarning()).toBe(false);
  });

  it('rejects a truthy non-object business-hours value before it can be migrated to Supabase', async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...validSettings, businessHours: [] }));
    const repository = new LocalStorageRepository();

    const settings = await repository.loadSettings();

    expect(settings.businessHours).toEqual({ open: '', close: '', closedDays: [] });
    expect(repository.hasStorageWarning()).toBe(true);
  });

  it('rejects a non-boolean demo-data flag that violates the settings table type', async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...validSettings, demoDataEnabled: 'false' }));
    const repository = new LocalStorageRepository();

    const settings = await repository.loadSettings();

    expect(settings.demoDataEnabled).toBe(false);
    expect(repository.hasStorageWarning()).toBe(true);
  });
});
