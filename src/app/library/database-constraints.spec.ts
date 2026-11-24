import { describe, expect, it } from 'vitest';
import {
  DATABASE_LIMITS,
  databaseConstraintMessage,
  isUniqueConstraintViolation,
  validateAppointmentTime,
  validateName,
  validateServiceName,
  validateUsername,
  validateWorkSlots,
} from './database-constraints';

describe('database constraints and user-facing errors', () => {
  it('matches the database name and service limits', () => {
    expect(DATABASE_LIMITS.name).toBe(100);
    expect(validateName('a'.repeat(100), 'Nome')).toBeNull();
    expect(validateName('a'.repeat(101), 'Nome')).toContain('massimo 100');
    expect(validateName('   ', 'Cognome')).toContain('obbligatorio');
    expect(validateServiceName('a'.repeat(100))).toBeNull();
    expect(validateServiceName('a'.repeat(101))).toContain('massimo 100');
  });

  it('rejects appointment times that the database work-slot trigger cannot accept', () => {
    expect(validateAppointmentTime('10:30')).toBeNull();
    expect(validateAppointmentTime('10:15')).toContain('30 minuti');
    expect(validateAppointmentTime('24:00')).toContain('30 minuti');
  });

  it('matches the database username normalization, character set and length limits', () => {
    expect(validateUsername('Ada.1')).toBeNull();
    expect(validateUsername('ab')).toContain('3–30');
    expect(validateUsername('a'.repeat(31))).toContain('3–30');
    expect(validateUsername('bad name')).toContain('3–30');
  });

  it('validates schedule slot indexes against the database array constraint', () => {
    expect(validateWorkSlots(Array.from({ length: 48 }, (_value, index) => index))).toBeNull();
    expect(validateWorkSlots([1, 1])).toContain('duplicat');
    expect(validateWorkSlots([-1])).toContain('00:00');
    expect(validateWorkSlots(Array.from({ length: 49 }, (_value, index) => index % 48))).toContain('48');
  });

  it('identifies only the client phone unique constraint as a duplicate-number error', () => {
    const duplicatePhone = { code: '23505', constraint: 'clients_owner_id_phone_key' };
    expect(isUniqueConstraintViolation(duplicatePhone, 'clients_owner_id_phone_key')).toBe(true);
    expect(databaseConstraintMessage(duplicatePhone, 'client')).toContain('Esiste già');
    expect(databaseConstraintMessage({ code: '23505', constraint: 'clients_pkey' }, 'client')).not.toContain('numero');
  });

  it('explains appointment capacity, work-hour and employee-reference conflicts separately', () => {
    expect(databaseConstraintMessage({ code: '23514', message: 'appointment_slot_capacity_exceeded' }, 'appointment')).toContain('limite di 3');
    expect(databaseConstraintMessage({ code: '23514', message: 'appointment_outside_work_schedule' }, 'appointment')).toContain('turno salvato');
    expect(databaseConstraintMessage({ code: '23514', message: 'appointment_assignee_unavailable' }, 'appointment')).toContain('dipendente attivo');
    expect(databaseConstraintMessage({ code: '23503', constraint: 'appointments_employee_owner_fk' }, 'appointment')).toContain('persona assegnata');
  });

  it('explains service and schedule uniqueness and missing-table errors', () => {
    expect(databaseConstraintMessage({ code: '23505', constraint: 'salon_services_owner_id_name_key' }, 'service')).toContain('servizio con questo nome');
    expect(databaseConstraintMessage({ code: '23505', constraint: 'daily_work_schedules_owner_id_work_date_employee_id_key' }, 'schedule')).toContain('turno');
    expect(databaseConstraintMessage({ code: 'PGRST205' }, 'schedule')).toContain('migrazione dei turni');
  });

  it('explains invalid JSON settings instead of returning a generic database constraint error', () => {
    expect(databaseConstraintMessage({ code: '23514', constraint: 'salon_settings_business_hours_check' }, 'settings'))
      .toContain('orari');
    expect(databaseConstraintMessage({ code: '23514', constraint: 'salon_settings_message_templates_check' }, 'settings'))
      .toContain('modelli dei messaggi');
  });
});
