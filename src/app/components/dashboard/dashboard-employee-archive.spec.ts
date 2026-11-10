import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from './dashboard';
import { SupabaseAgendaRepository } from '../../api/supabase-agenda-repository';
import { SUPABASE_CLIENT } from '../../api/supabase-client';
import type { Appointment } from '../../library/models';

const archivedEmployee = {
  id: 'employee-1',
  firstName: 'Giulia',
  lastName: 'Neri',
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: false,
};

const assignedAppointment: Appointment = {
  id: 'appointment-1',
  clientId: 'client-1',
  clientName: 'Ada Rossi',
  phone: '+393331234567',
  date: '2026-11-11',
  time: '10:30',
  service: 'Piega',
  notes: '',
  status: 'confirmed',
  reminderConsent: false,
  createdAt: '2026-11-10T10:00:00.000Z',
  employeeId: archivedEmployee.id,
  employeeName: 'Giulia Bianchi',
};

describe('Dashboard archived employee assignments', () => {
  it('keeps the archived assignee visible and preserves it when editing an appointment', async () => {
    const repository = {
      listAppointments: vi.fn().mockResolvedValue([assignedAppointment]),
      listClients: vi.fn().mockResolvedValue([]),
      listEmployees: vi.fn().mockResolvedValue([archivedEmployee]),
      loadSettings: vi.fn().mockResolvedValue({
        salonName: 'Salone', defaultCountryCode: '+39', services: [],
        businessHours: { open: '', close: '', closedDays: [] },
        messageTemplates: { confirmation: '', reminder: '' }, demoDataEnabled: false,
      }),
      hasStorageWarning: vi.fn().mockReturnValue(false),
      saveClient: vi.fn().mockResolvedValue(undefined),
      saveAppointment: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: SupabaseAgendaRepository, useValue: repository },
        { provide: SUPABASE_CLIENT, useValue: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) } } },
      ],
    });

    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      load(): Promise<void>;
      view: { set(value: 'agenda' | 'employees'): void };
      edit(item: Appointment): void;
      saveAppointment(): Promise<void>;
    };
    await instance.load();
    instance.view.set('employees');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Giulia Neri');
    instance.view.set('agenda');
    instance.edit(assignedAppointment);
    fixture.detectChanges();

    const archivedOption = [...fixture.nativeElement.querySelectorAll('select[name="employeeId"] option')]
      .find((option) => (option as HTMLOptionElement).textContent?.includes('Giulia Bianchi')) as HTMLOptionElement | undefined;
    expect(archivedOption?.disabled).toBe(true);
    expect(archivedOption?.textContent).toContain('Giulia Bianchi (non attivo)');

    await instance.saveAppointment();
    expect(repository.saveAppointment).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: archivedEmployee.id,
      employeeName: 'Giulia Bianchi',
    }));
  });

  it('preserves an employee name snapshot when the old employee row is already missing', async () => {
    const legacyAppointment: Appointment = {
      ...assignedAppointment,
      id: 'legacy-appointment',
      employeeId: null,
      employeeName: 'Giulia Bianchi',
    };
    const repository = {
      listAppointments: vi.fn().mockResolvedValue([legacyAppointment]),
      listClients: vi.fn().mockResolvedValue([]),
      listEmployees: vi.fn().mockResolvedValue([]),
      loadSettings: vi.fn().mockResolvedValue({
        salonName: 'Salone', defaultCountryCode: '+39', services: [],
        businessHours: { open: '', close: '', closedDays: [] },
        messageTemplates: { confirmation: '', reminder: '' }, demoDataEnabled: false,
      }),
      hasStorageWarning: vi.fn().mockReturnValue(false),
      saveClient: vi.fn().mockResolvedValue(undefined),
      saveAppointment: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: SupabaseAgendaRepository, useValue: repository },
        { provide: SUPABASE_CLIENT, useValue: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) } } },
      ],
    });

    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      load(): Promise<void>;
      edit(item: Appointment): void;
      saveAppointment(): Promise<void>;
    };
    await instance.load();
    instance.edit(legacyAppointment);
    fixture.detectChanges();

    const legacyOption = [...fixture.nativeElement.querySelectorAll('select[name="employeeId"] option')]
      .find((option) => (option as HTMLOptionElement).textContent?.includes('Giulia Bianchi')) as HTMLOptionElement | undefined;
    expect(legacyOption?.disabled).toBe(true);
    expect(legacyOption?.textContent).toContain('Giulia Bianchi (non attivo)');

    await instance.saveAppointment();
    expect(repository.saveAppointment).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: null,
      employeeName: 'Giulia Bianchi',
    }));
  });
});
