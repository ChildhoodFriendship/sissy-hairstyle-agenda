import { inject, Injectable } from '@angular/core';
import type { AppointmentRepository, ClientRepository, EmployeeRepository } from './repositories';
import { LocalStorageRepository } from './local-storage-repository';
import { SUPABASE_CLIENT } from './supabase-client';
import type { Appointment, Client, Employee } from '../library/models';

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

@Injectable({ providedIn: 'root' })
export class SupabaseAgendaRepository extends LocalStorageRepository implements AppointmentRepository, ClientRepository, EmployeeRepository {
  private readonly supabase = inject(SUPABASE_CLIENT);

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
}
