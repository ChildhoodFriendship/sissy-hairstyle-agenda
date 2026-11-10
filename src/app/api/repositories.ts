import type { Appointment, Client, Employee, SalonSettings } from '../library/models';

export interface AppointmentRepository {
  listAppointments(): Promise<Appointment[]>;
  saveAppointment(appointment: Appointment): Promise<void>;
  deleteAppointment(id: string): Promise<void>;
}

export interface ClientRepository {
  listClients(): Promise<Client[]>;
  saveClient(client: Client): Promise<void>;
  deleteClient(id: string): Promise<void>;
}

export interface EmployeeRepository {
  listEmployees(): Promise<Employee[]>;
  saveEmployee(employee: Employee): Promise<void>;
  deleteEmployee(id: string): Promise<void>;
}

export interface SettingsRepository {
  loadSettings(): Promise<SalonSettings>;
  saveSettings(settings: SalonSettings): Promise<void>;
}

export interface AgendaBackup {
  version: 1;
  exportedAt: string;
  appointments: Appointment[];
  clients: Client[];
  settings: SalonSettings;
}
