import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { SupabaseAgendaRepository } from '../../api/supabase-agenda-repository';
import { SUPABASE_CLIENT } from '../../api/supabase-client';
import type { Appointment, Client } from '../../library/models';

describe('Dashboard', () => {
  const sampleClient: Client = {
    id: 'client-1', name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace',
    phone: '+393331234567', whatsappConsent: false, notes: '', createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{
        provide: SupabaseAgendaRepository,
        useValue: {
          listAppointments: async () => [], listClients: async () => [sampleClient], listEmployees: async () => [],
          saveEmployee: async () => undefined, deleteEmployee: async () => undefined,
          loadSettings: async () => ({ salonName: 'Salone', defaultCountryCode: '+39', services: [], businessHours: { open: '', close: '', closedDays: [] }, messageTemplates: { confirmation: '', reminder: '' }, demoDataEnabled: false }),
          hasStorageWarning: () => false,
        },
      }, {
        provide: SUPABASE_CLIENT,
        useValue: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }) } },
      }],
    }).compileComponents();
  });

  it('shows the daily agenda by default', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Agenda');
    expect(fixture.nativeElement.textContent).not.toContain('IL TUO SALONE, IN ORDINE');
    expect(fixture.nativeElement.textContent).not.toContain('Appuntamenti del giorno, senza perdere il filo.');
    expect(fixture.nativeElement.querySelector('.previous-day img')?.getAttribute('src')).toBe('/assets/arrow_right.svg');
    expect(fixture.nativeElement.querySelector('.next-day img')?.getAttribute('src')).toBe('/assets/arrow_left.svg');
    expect(fixture.nativeElement.querySelector('[aria-label="Navigazione principale"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sidebar .profile')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sidebar .logout img')?.getAttribute('src')).toBe('/assets/logout.svg');
  });

  it('uses edit and delete icons for appointment actions', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      appointments: { set(value: Appointment[]): void };
    };
    instance.appointments.set([{
      id: 'appointment-1', clientId: sampleClient.id, clientName: sampleClient.name, phone: sampleClient.phone,
      date: instance.selectedDate(), time: '09:00', service: 'Taglio', notes: '', status: 'confirmed',
      reminderConsent: false, createdAt: '2026-01-01T00:00:00.000Z', employeeId: null, employeeName: 'Admin',
    }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.edit-appointment img')?.getAttribute('src')).toBe('/assets/green_edit.svg');
    expect(fixture.nativeElement.querySelector('.delete-appointment img')?.getAttribute('src')).toBe('/assets/red_delete.svg');
    expect(fixture.nativeElement.querySelector('.edit-appointment')?.getAttribute('aria-label')).toBe('Modifica appuntamento');
    expect(fixture.nativeElement.querySelector('.delete-appointment')?.getAttribute('aria-label')).toBe('Elimina appuntamento');
  });

  it('exposes the theme toggle in the top bar and applies the dark theme', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.theme-toggle') as HTMLButtonElement;
    expect(button.textContent).toContain('Modalità scura');
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.workspace')?.classList.contains('dark')).toBe(true);
    expect(button.textContent).toContain('Modalità chiara');
  });

  it('opens the appointment form from the main action', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    await (fixture.componentInstance as unknown as { load(): Promise<void> }).load();
    fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((item: HTMLButtonElement) => item.textContent?.includes('Nuovo appuntamento')) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.querySelector('h2')?.textContent).toContain('Aggiungi all’agenda');
    expect(dialog.querySelector('select[name="employeeId"] option')?.textContent).toContain('Admin');
    expect(dialog.textContent).toContain('Il cliente ha acconsentito a ricevere promemoria WhatsApp');
    const clientOption = [...dialog.querySelectorAll('select[name="clientId"] option')].find((option) => (option as HTMLOptionElement).value === sampleClient.id) as HTMLOptionElement;
    expect(clientOption).toBeTruthy();
    expect(clientOption?.textContent?.trim()).toBe(sampleClient.name);
    expect(clientOption?.textContent).not.toContain(sampleClient.phone);
    expect(dialog.querySelector('input[name="time"]')?.getAttribute('step')).toBe('1800');
    expect(dialog.querySelector('input[name="addToContacts"]')?.getAttribute('type')).toBe('checkbox');
    expect((dialog.querySelector('input[name="addToContacts"]') as HTMLInputElement).checked).toBe(false);
    (fixture.nativeElement.querySelector('.theme-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.scrim')?.classList.contains('dark')).toBe(true);
  });

  it('prefills appointment details when a saved client is selected', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      load(): Promise<void>;
      openForm(): void;
      selectAppointmentClient(id: string): void;
      draft: { clientName: string; firstName: string; lastName: string; phone: string };
    };
    await instance.load();
    instance.openForm();
    instance.selectAppointmentClient(sampleClient.id);
    expect(instance.draft.clientName).toBe('Ada Lovelace');
    expect(instance.draft.firstName).toBe('Ada');
    expect(instance.draft.lastName).toBe('Lovelace');
    expect(instance.draft.phone).toBe(sampleClient.phone);
  });

  it('offers adding a client directly from the clients screen', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { view: { set(value: string): void } }).view.set('clients');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aggiungi cliente');
    expect(fixture.nativeElement.querySelector('.page-heading h1')?.textContent?.trim()).toBe('Clienti');
    expect(fixture.nativeElement.querySelector('.agenda-card h2')?.textContent?.trim()).toBe('I tuoi clienti');
    expect(fixture.nativeElement.querySelector('.page-heading')?.textContent).not.toContain('Rubrica del salone sincronizzata');
    expect(fixture.nativeElement.querySelector('.page-heading')?.textContent).not.toContain('Contatti salvati in modo protetto');
    const clientActions = fixture.nativeElement.querySelector('.client-actions') as HTMLElement;
    expect(clientActions.querySelector('.search')).toBeTruthy();
    expect(clientActions.querySelector('.primary img')?.getAttribute('src')).toBe('/assets/add.svg');
    expect(clientActions.querySelector('.search')?.parentElement).toBe(clientActions.querySelector('.primary')?.parentElement);
    (fixture.componentInstance as unknown as { addClient(): void }).addClient();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Aggiungi cliente');
  });

  it('shows the employee screen and only asks for first and last name', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { view: { set(value: string): void } }).view.set('employees');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Dipendenti');
    (fixture.componentInstance as unknown as { addEmployee(): void }).addEmployee();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.querySelector('[name="employeeFirstName"]')).toBeTruthy();
    expect(dialog.querySelector('[name="employeeLastName"]')).toBeTruthy();
    expect(dialog.querySelectorAll('input')).toHaveLength(2);
  });

  it('opens the client editor with the selected client details', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.componentInstance as unknown as { editClient(client: Client): void }).editClient(sampleClient);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Modifica cliente');
    expect((fixture.componentInstance as unknown as { clientDraft: { firstName: string } }).clientDraft.firstName).toBe('Ada');
  });
});
