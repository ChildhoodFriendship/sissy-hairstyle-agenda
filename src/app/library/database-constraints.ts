export const DATABASE_LIMITS = {
  name: 100,
  phoneMinimum: 7,
  phoneMaximum: 24,
  appointmentName: 201,
  serviceName: 100,
  usernameMinimum: 3,
  usernameMaximum: 30,
  workScheduleSlots: 48,
  appointmentDurationMinimum: 30,
  appointmentDurationMaximum: 720,
} as const;

export type DatabaseWriteOperation =
  | 'appointment'
  | 'client'
  | 'employee'
  | 'registration'
  | 'schedule'
  | 'service'
  | 'settings';

interface DatabaseErrorLike {
  code?: unknown;
  constraint?: unknown;
  details?: unknown;
  message?: unknown;
}

export function validateName(value: string, label: string): string | null {
  const length = Array.from(value.trim()).length;
  if (!length) return `${label}: campo obbligatorio.`;
  if (length > DATABASE_LIMITS.name) return `${label}: massimo ${DATABASE_LIMITS.name} caratteri.`;
  return null;
}

export function validateServiceName(value: string): string | null {
  const length = Array.from(value.trim()).length;
  if (!length) return 'Inserisci il nome del servizio.';
  if (length > DATABASE_LIMITS.serviceName) return `Il nome del servizio: massimo ${DATABASE_LIMITS.serviceName} caratteri.`;
  return null;
}

export function validateUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  return /^[a-z0-9_.-]{3,30}$/.test(username)
    ? null
    : 'Lo username deve contenere 3–30 caratteri: lettere, numeri, punto, trattino o trattino basso.';
}

export function validateAppointmentTime(value: string): string | null {
  return /^(?:[01]\d|2[0-3]):(?:00|30)$/.test(value)
    ? null
    : 'L’orario deve essere valido e su intervalli di 30 minuti.';
}

export function validateAppointmentDuration(value: number): string | null {
  return Number.isInteger(value) && value >= DATABASE_LIMITS.appointmentDurationMinimum &&
    value <= DATABASE_LIMITS.appointmentDurationMaximum && value % 30 === 0
    ? null
    : 'La durata deve essere compresa tra 30 minuti e 12 ore, a intervalli di mezz’ora.';
}

export function validateWorkSlots(slots: readonly number[]): string | null {
  if (slots.length > DATABASE_LIMITS.workScheduleSlots) {
    return `Il turno non può contenere più di ${DATABASE_LIMITS.workScheduleSlots} fasce da mezz’ora.`;
  }
  if (slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= DATABASE_LIMITS.workScheduleSlots)) {
    return 'Il turno contiene una fascia non valida: scegli orari tra 00:00 e 23:30.';
  }
  if (new Set(slots).size !== slots.length) return 'Il turno non può contenere fasce duplicate.';
  return null;
}

export function isUniqueConstraintViolation(error: unknown, constraintName: string): boolean {
  const record = toErrorRecord(error);
  const serverText = `${record.message} ${record.details}`;
  return record.code === '23505' && (record.constraint === constraintName || serverText.includes(constraintName) ||
    (constraintName === 'clients_owner_id_phone_key' && /\(owner_id,\s*phone\)/i.test(serverText)));
}

export function databaseConstraintMessage(error: unknown, operation: DatabaseWriteOperation): string {
  const record = toErrorRecord(error);
  const code = record.code;
  const constraint = record.constraint;
  const serverMessage = `${record.message} ${record.details}`.toLowerCase();

  if (operation === 'appointment' && code === 'APPOINTMENT_FEATURE_MIGRATION_REQUIRED') {
    return 'La migrazione per le durate e le sovrapposizioni non è applicata. Esegui il file `supabase/migrations/20261125000000_appointment_duration_and_overlap.sql` nel progetto Supabase e ricarica la pagina.';
  }

  if (code === '23505') {
    if (operation === 'client' && (constraint === 'clients_owner_id_phone_key' ||
      serverMessage.includes('clients_owner_id_phone_key') || /\(owner_id,\s*phone\)/.test(serverMessage))) {
      return 'Esiste già una cliente con questo numero. Apri il contatto esistente dalla rubrica per modificarlo.';
    }
    if (operation === 'service' && (constraint === 'salon_services_owner_id_name_key' ||
      serverMessage.includes('salon_services_owner_id_name_key') || /\(owner_id,\s*name\)/.test(serverMessage))) {
      return 'Esiste già un servizio con questo nome. Modifica quello presente oppure scegli un nome diverso.';
    }
    if (operation === 'schedule' && (constraint.includes('daily_work_schedules') || serverMessage.includes('daily_work_schedules_'))) {
      return 'Esiste già un turno per questa persona e data. Aggiorna la pagina e riprova.';
    }
    if (operation === 'appointment' && (constraint === 'appointments_owner_confirmed_assignee_idx' || serverMessage.includes('appointments_owner_confirmed_assignee_idx'))) {
      return 'La persona selezionata ha già un appuntamento confermato a quest’ora. Scegli un altro orario o un’altra persona.';
    }
    if (operation === 'appointment' && (constraint === 'appointments_owner_confirmed_slot_idx' || serverMessage.includes('appointments_owner_confirmed_slot_idx'))) {
      return 'La fascia risulta già occupata nel database. Scegli un altro orario e aggiorna la pagina.';
    }
    if (operation === 'registration' && (constraint === 'user_profiles_username_key' || serverMessage.includes('user_profiles_username_key'))) {
      return 'Questo username è già in uso. Scegline un altro.';
    }
    return 'Esiste già un record con questo identificativo. Aggiorna la pagina e riprova.';
  }

  if (code === '23514') {
    if (operation === 'appointment' && serverMessage.includes('appointment_overlap_confirmation_required')) {
      return 'La disponibilità è cambiata mentre salvavi. Ho aggiornato gli appuntamenti: controlla la sovrapposizione e conferma di nuovo.';
    }
    if (operation === 'appointment' && (constraint === 'appointments_duration_minutes_check' || serverMessage.includes('appointment_duration_invalid'))) {
      return 'La durata non è valida. Scegli un orario finale a intervalli di mezz’ora.';
    }
    if (operation === 'appointment' && serverMessage.includes('appointment_slot_capacity_exceeded')) {
      return 'La fascia ha già raggiunto il limite di 3 appuntamenti confermati. Scegli un altro orario.';
    }
    if (operation === 'appointment' && serverMessage.includes('appointment_outside_work_schedule')) {
      return 'L’orario non rientra nel turno salvato. Scegli una fascia disponibile o aggiorna il turno.';
    }
    if (operation === 'appointment' && serverMessage.includes('appointment_assignee_unavailable')) {
      return 'La persona assegnata non è più disponibile. Seleziona Sissy o un dipendente attivo.';
    }
    if (operation === 'schedule') {
      return 'Il turno contiene fasce non valide. Usa orari distinti compresi tra 00:00 e 23:30.';
    }
    if (operation === 'settings' && (constraint === 'salon_settings_business_hours_check' || serverMessage.includes('salon_settings_business_hours_check'))) {
      return 'Gli orari del salone devono avere una struttura valida. Controlla le preferenze e riprova.';
    }
    if (operation === 'settings' && (constraint === 'salon_settings_message_templates_check' || serverMessage.includes('salon_settings_message_templates_check'))) {
      return 'I modelli dei messaggi devono avere una struttura valida. Controlla le preferenze e riprova.';
    }
    if (operation === 'appointment' && (constraint === 'appointments_status_check' || serverMessage.includes('appointments_status_check'))) {
      return 'Lo stato dell’appuntamento non è valido. Aggiorna la pagina e riprova.';
    }
    return 'I dati inseriti non rispettano un vincolo del database. Controlla i campi indicati e riprova.';
  }

  if (code === '23503') {
    if (operation === 'appointment' && (constraint === 'appointments_client_owner_fk' || serverMessage.includes('appointments_client_owner_fk'))) {
      return 'La cliente selezionata non è più disponibile. Aggiorna la rubrica e selezionala di nuovo.';
    }
    if (operation === 'appointment' && (constraint === 'appointments_employee_owner_fk' || serverMessage.includes('appointments_employee_owner_fk'))) {
      return 'La persona assegnata non è più disponibile. Seleziona Sissy o un dipendente attivo.';
    }
    if (operation === 'schedule' && (constraint.includes('employee') || serverMessage.includes('employee'))) {
      return 'Il dipendente selezionato non è più disponibile. Aggiorna la pagina e imposta di nuovo il turno.';
    }
    return 'Un elemento collegato non è più disponibile. Aggiorna la pagina e riprova.';
  }

  if (code === '23502') return 'Manca un campo obbligatorio. Controlla i campi contrassegnati e riprova.';
  if (code === '22001') return 'Uno dei valori supera la lunghezza massima consentita dal database. Riduci il testo e riprova.';
  if (code === '42501' || code === 'PGRST301') return 'Operazione non autorizzata o sessione scaduta. Accedi di nuovo e riprova.';
  if (code === 'PGRST205') {
    if (operation === 'schedule') return 'I turni non sono disponibili nel database. Verifica che la migrazione dei turni sia applicata.';
    if (operation === 'service') return 'I servizi non sono disponibili nel database. Verifica che la migrazione dei servizi sia applicata.';
    if (operation === 'settings') return 'Le impostazioni non sono disponibili nel database. Verifica che la migrazione delle impostazioni sia applicata.';
  }

  const fallback: Record<DatabaseWriteOperation, string> = {
    appointment: 'Appuntamento non salvato. Verifica cliente, data, ora e persona assegnata, poi riprova.',
    client: 'Cliente non salvata. Verifica nome, cognome e numero di telefono, poi riprova.',
    employee: 'Dipendente non salvato. Verifica nome e cognome, poi riprova.',
    registration: 'Impossibile creare l’account. Verifica i dati e riprova più tardi.',
    schedule: 'Turno non salvato. Verifica le fasce orarie e riprova.',
    service: 'Servizi non salvati. Verifica i nomi e riprova.',
    settings: 'Impostazioni non salvate. Verifica la connessione e riprova.',
  };
  return fallback[operation];
}

function toErrorRecord(error: unknown): { code: string; constraint: string; details: string; message: string } {
  if (typeof error !== 'object' || error === null) return { code: '', constraint: '', details: '', message: '' };
  const value = error as DatabaseErrorLike;
  return {
    code: typeof value.code === 'string' ? value.code : '',
    constraint: typeof value.constraint === 'string' ? value.constraint : '',
    details: typeof value.details === 'string' ? value.details : '',
    message: typeof value.message === 'string' ? value.message : '',
  };
}
