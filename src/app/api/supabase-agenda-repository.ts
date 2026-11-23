import { inject, Injectable } from '@angular/core';
import type { AppointmentRepository, ClientRepository, EmployeeRepository, SettingsRepository } from './repositories';
import { LocalStorageRepository } from './local-storage-repository';
import { SUPABASE_CLIENT } from './supabase-client';
import type { Appointment, Client, Employee, SalonSettings } from '../library/models';
import type { DailyWorkSchedule } from '../library/work-schedule';

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp_consent: boolean;
  notes: string;
  created_at: string;
}

interface AppointmentRow {
  id: string;
  client_id: string | null;
  client_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  service: string;
  notes: string;
  status: Appointment['status'];
  reminder_consent: boolean;
  created_at: string;
  employee_id: string | null;
  employee_name: string;
}

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  is_active: boolean;
}

const SETTINGS_COLUMNS = 'salon_name,default_country_code,business_hours,message_templates,demo_data_enabled';

@Injectable({ providedIn: 'root' })
export class SupabaseAgendaRepository extends LocalStorageRepository implements AppointmentRepository, ClientRepository, EmployeeRepository, SettingsRepository {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private settingsUnavailable = false;

  override async listAppointments(): Promise<Appointment[]> {
    const client = this.requireClient();
    const { data, error } = await client.from('appointments').select('*').order('appointment_date').order('appointment_time');
    if (error) throw error;
    return (data as AppointmentRow[]).map((row) => ({
      id: row.id,
      clientId: row.client_id ?? '',
      clientName: row.client_name,
      phone: row.phone,
      date: row.appointment_date,
      time: row.appointment_time.slice(0, 5),
      service: row.service,
      notes: row.notes,
      status: row.status,
      reminderConsent: row.reminder_consent,
      createdAt: row.created_at,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
    }));
  }

  override async saveAppointment(item: Appointment): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.from('appointments').upsert({
      id: item.id,
      client_id: item.clientId || null,
      client_name: item.clientName,
      phone: item.phone,
      appointment_date: item.date,
      appointment_time: item.time,
      service: item.service,
      notes: item.notes,
      status: item.status,
      reminder_consent: item.reminderConsent,
      created_at: item.createdAt,
      employee_id: item.employeeId ?? null,
      employee_name: item.employeeName || 'Admin',
    });
    if (error) throw error;
  }

  override async deleteAppointment(id: string): Promise<void> {
    const { error } = await this.requireClient().from('appointments').delete().eq('id', id);
    if (error) throw error;
  }

  override async listClients(): Promise<Client[]> {
    const { data, error } = await this.requireClient().from('clients').select('*').order('last_name').order('first_name');
    if (error) throw error;
    return (data as ClientRow[]).map((row) => ({
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' '),
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      whatsappConsent: row.whatsapp_consent,
      notes: row.notes,
      createdAt: row.created_at,
    }));
  }

  override async saveClient(item: Client): Promise<void> {
    const parts = item.name.trim().split(/\s+/);
    const firstName = item.firstName?.trim() || parts.shift() || '';
    const lastName = item.lastName?.trim() || parts.join(' ') || firstName;
    const { error } = await this.requireClient().from('clients').upsert({
      id: item.id,
      first_name: firstName,
      last_name: lastName,
      phone: item.phone,
      whatsapp_consent: item.whatsappConsent,
      notes: item.notes,
      created_at: item.createdAt,
    });
    if (error) throw error;
  }

  override async deleteClient(id: string): Promise<void> {
    const { error } = await this.requireClient().from('clients').delete().eq('id', id);
    if (error) throw error;
  }

  async listEmployees(): Promise<Employee[]> {
    const { data, error } = await this.requireClient().from('employees').select('*').order('last_name').order('first_name');
    if (error) throw error;
    return (data as EmployeeRow[]).map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      createdAt: row.created_at,
      isActive: row.is_active,
    }));
  }

  async saveEmployee(item: Employee): Promise<void> {
    const { error } = await this.requireClient().from('employees').upsert({
      id: item.id,
      first_name: item.firstName,
      last_name: item.lastName,
      created_at: item.createdAt,
      is_active: item.isActive !== false,
    });
    if (error) throw error;
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await this.requireClient().from('employees').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  }

  async listWorkSchedules(date: string): Promise<DailyWorkSchedule[]> {
    const { data, error } = await this.requireClient().from('daily_work_schedules')
      .select('work_date,employee_id,slots').eq('work_date', date);
    if (error) throw error;
    return data.map((row) => ({ date: row.work_date, employeeId: row.employee_id, slots: row.slots }));
  }

  async saveWorkSchedule(schedule: DailyWorkSchedule): Promise<void> {
    const { error } = await this.requireClient().from('daily_work_schedules').upsert({
      work_date: schedule.date,
      employee_id: schedule.employeeId,
      slots: schedule.slots,
    }, { onConflict: 'owner_id,work_date,employee_id' });
    if (error) throw error;
  }

  override async listServices(): Promise<string[]> {
    const { data, error } = await this.requireClient().from('salon_services')
      .select('name').order('position').order('name');
    if (error) throw error;
    return (data as { name: string }[]).map((row) => row.name);
  }

  override async loadSettings(): Promise<SalonSettings> {
    let fallback: SalonSettings | undefined;
    try {
      const remoteSettings = await this.readSettings();
      if (remoteSettings) {
        this.settingsUnavailable = false;
        this.removeStoredSettings();
        return remoteSettings;
      }

      fallback = await super.loadSettings();
      if (!this.hasStoredSettings()) {
        this.settingsUnavailable = false;
        return { ...fallback, services: [] };
      }

      await this.upsertSettings(fallback, true);
      const migratedSettings = await this.readSettings();
      if (!migratedSettings) throw new Error('Salon settings migration did not produce a row.');
      this.removeStoredSettings();
      this.settingsUnavailable = false;
      return migratedSettings;
    } catch {
      this.settingsUnavailable = true;
      fallback ??= await super.loadSettings();
      return { ...fallback, services: [] };
    }
  }

  hasSettingsWarning(): boolean {
    return this.settingsUnavailable;
  }

  override async saveSettings(settings: SalonSettings): Promise<void> {
    try {
      await this.upsertSettings(settings);
      this.settingsUnavailable = false;
      this.removeStoredSettings();
    } catch (error) {
      this.settingsUnavailable = true;
      throw error;
    }
  }

  override async saveServices(services: string[]): Promise<void> {
    const client = this.requireClient();
    const uniqueNames = new Map<string, string>();
    for (const service of services) {
      const name = service.trim();
      const key = name.toLocaleLowerCase();
      if (key && !uniqueNames.has(key)) uniqueNames.set(key, name);
    }
    const names = [...uniqueNames.values()];
    const { data, error } = await client.from('salon_services').select('id,name');
    if (error) throw error;

    const wanted = new Set(names.map((name) => name.toLocaleLowerCase()));
    const removedIds = (data as { id: string; name: string }[])
      .filter((row) => !wanted.has(row.name.toLocaleLowerCase())).map((row) => row.id);
    if (removedIds.length) {
      const { error: deleteError } = await client.from('salon_services').delete().in('id', removedIds);
      if (deleteError) throw deleteError;
    }
    if (names.length) {
      const { error: upsertError } = await client.from('salon_services').upsert(
        names.map((name, position) => ({ name, position })),
        { onConflict: 'owner_id,name' },
      );
      if (upsertError) throw upsertError;
    }
  }

  override async importBackup(_text: string): Promise<boolean> {
    return false;
  }

  override async seedDemoData(): Promise<boolean> {
    return false;
  }

  override async removeDemoData(): Promise<void> {}

  private requireClient() {
    if (!this.supabase) throw new Error('Configurazione Supabase mancante.');
    return this.supabase;
  }

  private async readSettings(): Promise<SalonSettings | null> {
    const { data, error } = await this.requireClient().from('salon_settings')
      .select(SETTINGS_COLUMNS).maybeSingle();
    if (error) throw error;
    return data ? salonSettingsFromRow(data) : null;
  }

  private async upsertSettings(settings: SalonSettings, ignoreDuplicates = false): Promise<void> {
    const { error } = await this.requireClient().from('salon_settings').upsert({
      salon_name: settings.salonName,
      default_country_code: settings.defaultCountryCode,
      business_hours: settings.businessHours,
      message_templates: settings.messageTemplates,
      demo_data_enabled: settings.demoDataEnabled,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'owner_id',
      ...(ignoreDuplicates ? { ignoreDuplicates: true } : {}),
    });
    if (error) throw error;
  }
}

function salonSettingsFromRow(value: unknown): SalonSettings {
  if (!isRecord(value) || typeof value['salon_name'] !== 'string' ||
      typeof value['default_country_code'] !== 'string' || typeof value['demo_data_enabled'] !== 'boolean') {
    throw new Error('Invalid salon settings row.');
  }

  const hours = value['business_hours'];
  const templates = value['message_templates'];
  if (!isRecord(hours) || typeof hours['open'] !== 'string' || typeof hours['close'] !== 'string' ||
      !Array.isArray(hours['closedDays']) || !hours['closedDays'].every((day) =>
        typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) ||
      !isRecord(templates) || typeof templates['confirmation'] !== 'string' ||
      typeof templates['reminder'] !== 'string') {
    throw new Error('Invalid salon settings JSON.');
  }

  return {
    salonName: value['salon_name'],
    defaultCountryCode: value['default_country_code'],
    services: [],
    businessHours: {
      open: hours['open'],
      close: hours['close'],
      closedDays: [...hours['closedDays']] as number[],
    },
    messageTemplates: {
      confirmation: templates['confirmation'],
      reminder: templates['reminder'],
    },
    demoDataEnabled: value['demo_data_enabled'],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
