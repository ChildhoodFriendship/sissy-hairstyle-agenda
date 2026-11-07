import { Injectable } from '@angular/core';
import type { AgendaBackup, AppointmentRepository, ClientRepository, SettingsRepository } from './repositories';
import type { Appointment, Client, SalonSettings } from '../library/models';

const APPOINTMENTS_KEY = 'sissy-agenda-appointments-v1';
const CLIENTS_KEY = 'sissy-agenda-clients-v1';
const SETTINGS_KEY = 'sissy-agenda-settings-v1';
const MAX_BACKUP_BYTES = 1_000_000;

const defaultSettings: SalonSettings = {
  salonName: 'Il tuo salone',
  defaultCountryCode: '+39',
  services: [],
  businessHours: { open: '', close: '', closedDays: [] },
  messageTemplates: {
    confirmation: 'Ciao {nome}, il tuo appuntamento è fissato per {data} alle {ora}. A presto! — {salone}',
    reminder: 'Buongiorno {nome}, le ricordo il suo appuntamento il {data} alle {ora}. A presto! — {salone}',
  },
  demoDataEnabled: false,
};

@Injectable({ providedIn: 'root' })
export class LocalStorageRepository implements AppointmentRepository, ClientRepository, SettingsRepository {
  private storageUnavailable = false;

  hasStorageWarning(): boolean {
    return this.storageUnavailable;
  }

  async listAppointments(): Promise<Appointment[]> {
    return this.readArray<Appointment>(APPOINTMENTS_KEY);
  }

  async saveAppointment(appointment: Appointment): Promise<void> {
    const records = await this.listAppointments();
    const next = records.filter((item) => item.id !== appointment.id);
    next.push(appointment);
    await this.write(APPOINTMENTS_KEY, next);
  }

  async deleteAppointment(id: string): Promise<void> {
    const records = await this.listAppointments();
    await this.write(APPOINTMENTS_KEY, records.filter((item) => item.id !== id));
  }

  async listClients(): Promise<Client[]> {
    return this.readArray<Client>(CLIENTS_KEY);
  }

  async saveClient(client: Client): Promise<void> {
    const records = await this.listClients();
    const next = records.filter((item) => item.id !== client.id);
    next.push(client);
    await this.write(CLIENTS_KEY, next);
  }

  async deleteClient(id: string): Promise<void> {
    const records = await this.listClients();
    await this.write(CLIENTS_KEY, records.filter((item) => item.id !== id));
  }

  async loadSettings(): Promise<SalonSettings> {
    const raw = this.read(SETTINGS_KEY);
    if (!raw) return structuredClone(defaultSettings);
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isSettings(parsed)) return { ...structuredClone(defaultSettings), ...parsed };
      this.storageUnavailable = true;
      return structuredClone(defaultSettings);
    } catch {
      this.storageUnavailable = true;
      return structuredClone(defaultSettings);
    }
  }

  async saveSettings(settings: SalonSettings): Promise<void> {
    await this.write(SETTINGS_KEY, settings);
  }

  async exportBackup(): Promise<string> {
    const data: AgendaBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appointments: await this.listAppointments(),
      clients: await this.listClients(),
      settings: await this.loadSettings(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importBackup(text: string): Promise<boolean> {
    if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) return false;
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      return false;
    }
    if (!isBackup(value)) return false;
    const previous = this.snapshot();
    try {
      this.writeRaw(APPOINTMENTS_KEY, JSON.stringify(value.appointments));
      this.writeRaw(CLIENTS_KEY, JSON.stringify(value.clients));
      this.writeRaw(SETTINGS_KEY, JSON.stringify(value.settings));
      return true;
    } catch {
      this.restore(previous);
      this.storageUnavailable = true;
      return false;
    }
  }

  async seedDemoData(): Promise<boolean> {
    const [appointments, clients] = await Promise.all([this.listAppointments(), this.listClients()]);
    if (appointments.length || clients.length) return false;
    const today = localIsoDate(new Date());
    const tomorrow = addDays(today, 1);
    const createdAt = new Date().toISOString();
    const demoClients: Client[] = [
      { id: 'demo-client-1', name: 'Cliente Demo 01', phone: '+393330000001', whatsappConsent: false, notes: '', createdAt, demo: true },
      { id: 'demo-client-2', name: 'Cliente Demo 02', phone: '+393330000002', whatsappConsent: false, notes: '', createdAt, demo: true },
    ];
    const demoAppointments: Appointment[] = [
      { id: 'demo-appointment-1', clientId: 'demo-client-1', clientName: 'Cliente Demo 01', phone: '+393330000001', date: today, time: '10:30', service: 'Servizio demo', notes: 'Dato fittizio', status: 'confirmed', reminderConsent: false, createdAt, demo: true },
      { id: 'demo-appointment-2', clientId: 'demo-client-2', clientName: 'Cliente Demo 02', phone: '+393330000002', date: tomorrow, time: '15:00', service: 'Servizio demo', notes: 'Dato fittizio', status: 'confirmed', reminderConsent: false, createdAt, demo: true },
    ];
    try {
      this.writeRaw(CLIENTS_KEY, JSON.stringify(demoClients));
      this.writeRaw(APPOINTMENTS_KEY, JSON.stringify(demoAppointments));
      return true;
    } catch {
      this.storageUnavailable = true;
      return false;
    }
  }

  async removeDemoData(): Promise<void> {
    const [appointments, clients] = await Promise.all([this.listAppointments(), this.listClients()]);
    await this.write(APPOINTMENTS_KEY, appointments.filter((item) => !item.demo));
    await this.write(CLIENTS_KEY, clients.filter((item) => !item.demo));
  }

  private readArray<T>(key: string): T[] {
    const raw = this.read(key);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
      this.storageUnavailable = true;
    } catch {
      this.storageUnavailable = true;
    }
    return [];
  }

  private read(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      this.storageUnavailable = true;
      return null;
    }
  }

  private async write(key: string, value: unknown): Promise<void> {
    try {
      this.writeRaw(key, JSON.stringify(value));
    } catch (error) {
      this.storageUnavailable = true;
      throw error;
    }
  }

  private writeRaw(key: string, value: string): void {
    if (typeof globalThis.localStorage === 'undefined') throw new Error('Browser storage is unavailable.');
    globalThis.localStorage.setItem(key, value);
  }

  private snapshot(): Map<string, string | null> {
    return new Map([APPOINTMENTS_KEY, CLIENTS_KEY, SETTINGS_KEY].map((key) => [key, this.read(key)]));
  }

  private restore(snapshot: Map<string, string | null>): void {
    for (const [key, value] of snapshot) {
      try {
        if (value === null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } catch {
        this.storageUnavailable = true;
      }
    }
  }
}

function isSettings(value: unknown): value is SalonSettings {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SalonSettings>;
  return typeof item.salonName === 'string' && typeof item.defaultCountryCode === 'string' &&
    Array.isArray(item.services) && !!item.businessHours && !!item.messageTemplates &&
    typeof item.messageTemplates.confirmation === 'string' && typeof item.messageTemplates.reminder === 'string';
}

function isBackup(value: unknown): value is AgendaBackup {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<AgendaBackup>;
  return item.version === 1 && Array.isArray(item.appointments) && item.appointments.every(isAppointment) &&
    Array.isArray(item.clients) && item.clients.every(isClient) && isSettings(item.settings);
}

function isAppointment(value: unknown): value is Appointment {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Appointment>;
  return typeof item.id === 'string' && typeof item.clientId === 'string' && typeof item.clientName === 'string' &&
    typeof item.phone === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date ?? '') && /^\d{2}:\d{2}$/.test(item.time ?? '') &&
    ['confirmed', 'cancelled', 'completed'].includes(item.status ?? '') && typeof item.reminderConsent === 'boolean';
}

function isClient(value: unknown): value is Client {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Client>;
  return typeof item.id === 'string' && typeof item.name === 'string' && typeof item.phone === 'string' &&
    typeof item.whatsappConsent === 'boolean';
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}
