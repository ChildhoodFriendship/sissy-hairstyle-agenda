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
  demo?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  whatsappConsent: boolean;
  notes: string;
  createdAt: string;
  demo?: boolean;
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
}

export interface MessagePlaceholders {
  nome: string;
  data: string;
  ora: string;
  servizio: string;
  salone: string;
}
