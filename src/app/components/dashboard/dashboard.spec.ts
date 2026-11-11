import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { SupabaseAgendaRepository } from '../../api/supabase-agenda-repository';
import { SUPABASE_CLIENT } from '../../api/supabase-client';
import type { Client } from '../../library/models';

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
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Agenda');
    expect(fixture.nativeElement.querySelector('[aria-label="Navigazione principale"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sidebar .profile')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sidebar .logout img')?.getAttribute('src')).toBe('/assets/logout.svg');
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
    const clientOption = [...dialog.querySelectorAll('select[name="clientId"] option')].find((option) => (option as HTMLOptionElement).value === sampleClient.id) as HTMLOptionElement;
    expect(clientOption).toBeTruthy();
    expect(clientOption?.textContent?.trim()).toBe(sampleClient.name);
    expect(clientOption?.textContent).not.toContain(sampleClient.phone);
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
