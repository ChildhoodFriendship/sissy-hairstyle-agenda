export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  service: string;
  notes: string;
  status: AppointmentStatus;
  reminderConsent: boolean;
  createdAt: string;
  employeeId?: string | null;
  employeeName?: string;
  demo?: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isActive?: boolean;
}

export interface Client {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  whatsappConsent: boolean;
  notes: string;
  createdAt: string;
  demo?: boolean;
  inContacts?: boolean;
}

export interface MessageTemplates {
  confirmation: string;
  reminder: string;
}

export interface BusinessHours {
  open: string;
  close: string;
  closedDays: number[];
}

export interface SalonSettings {
  salonName: string;
  defaultCountryCode: string;
  services: string[];
  businessHours: BusinessHours;
  messageTemplates: MessageTemplates;
  demoDataEnabled: boolean;
}

export interface AppointmentDraft {
  clientId?: string;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  service: string;
  notes: string;
  reminderConsent: boolean;
  employeeId?: string | null;
}

export interface MessagePlaceholders {
  nome: string;
  data: string;
  ora: string;
  servizio: string;
  salone: string;
}
