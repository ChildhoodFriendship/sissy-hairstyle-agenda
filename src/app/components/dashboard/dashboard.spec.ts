import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { SupabaseAgendaRepository } from '../../api/supabase-agenda-repository';
import { SUPABASE_CLIENT } from '../../api/supabase-client';
import type { Appointment, Client, Employee } from '../../library/models';

describe('Dashboard', () => {
  let savedClient: Client | undefined;
  let saveClientCalls = 0;
  let savedAppointment: Appointment | undefined;
  let failClientList = false;
  let failNextAppointmentSave = false;
  let nextClientSaveError: { code?: string; constraint?: string } | null = null;
  let clientSaveGate: Promise<void> | null = null;
  let employeeSaveCalls = 0;
  let workScheduleSaveCalls = 0;
  let failSettingsLoad = false;
  let settingsWarning = false;

  const sampleClient: Client = {
    id: 'client-1', name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace',
    phone: '+393331234567', whatsappConsent: false, notes: '', createdAt: '2026-01-01T00:00:00.000Z',
  };

  let readShifts: (date: string) => Promise<{ date: string; employeeId: string | null; slots: number[] }[]>;

  beforeEach(async () => {
    // Exercise the pre-migration fallback in the existing native-picker scenarios.
    readShifts = async () => { throw { code: 'PGRST205', message: 'public.daily_work_schedules not found' }; };
    localStorage.clear();
    sessionStorage.clear();
    savedClient = undefined;
    saveClientCalls = 0;
    savedAppointment = undefined;
    failClientList = false;
    failNextAppointmentSave = false;
    nextClientSaveError = null;
    clientSaveGate = null;
    employeeSaveCalls = 0;
    workScheduleSaveCalls = 0;
    failSettingsLoad = false;
    settingsWarning = false;
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{
        provide: SupabaseAgendaRepository,
        useValue: {
          listWorkSchedules: (date: string) => readShifts(date),
          listAppointments: async () => [], listClients: async () => {
            if (failClientList) throw new Error('Clients unavailable');
            return [sampleClient];
          }, listEmployees: async () => [],
          saveClient: async (client: Client) => {
            saveClientCalls += 1;
            if (nextClientSaveError) {
              const error = nextClientSaveError;
              nextClientSaveError = null;
              throw error;
            }
            savedClient = client;
            if (clientSaveGate) await clientSaveGate;
          },
          saveAppointment: async (appointment: Appointment) => {
            if (failNextAppointmentSave) {
              failNextAppointmentSave = false;
              throw { code: '23505' };
            }
            savedAppointment = appointment;
          },
          saveEmployee: async () => { employeeSaveCalls += 1; }, deleteEmployee: async () => undefined,
          saveWorkSchedule: async () => { workScheduleSaveCalls += 1; },
          loadSettings: async () => {
            if (failSettingsLoad) throw new Error('Settings table unavailable');
            return { salonName: 'Salone', defaultCountryCode: '+39', services: [], businessHours: { open: '', close: '', closedDays: [] }, messageTemplates: { confirmation: '', reminder: '' }, demoDataEnabled: false };
          },
          listServices: async () => [], saveServices: async () => undefined,
          hasStorageWarning: () => false,
          hasSettingsWarning: () => settingsWarning,
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
    expect(fixture.nativeElement.querySelector('.demo-label')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sidebar .profile')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sidebar .logout img')?.getAttribute('src')).toBe('/assets/logout.svg');
  });

  it('keeps the dashboard available and warns when remote salon settings cannot load', async () => {
    failSettingsLoad = true;
    settingsWarning = true;
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { load(): Promise<void> };
    await instance.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Agenda');
    expect((fixture.componentInstance as unknown as { settingsUnavailable: () => boolean }).settingsUnavailable()).toBe(true);
    (fixture.componentInstance as unknown as { view: { set(value: string): void } }).view.set('settings');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Impostazioni del salone non raggiungibili su Supabase');
  });

  it('uses edit and delete icons for appointment actions', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      appointments: { set(value: Appointment[]): void };
    };
    const appointment: Appointment = {
      id: 'appointment-1', clientId: sampleClient.id, clientName: sampleClient.name, phone: sampleClient.phone,
      date: instance.selectedDate(), time: '09:00', service: 'Taglio', notes: '', status: 'confirmed',
      reminderConsent: false, createdAt: '2026-01-01T00:00:00.000Z', employeeId: null, employeeName: 'Admin',
    };
    instance.appointments.set([appointment]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.agenda-stats')).toBeNull();
    expect(fixture.nativeElement.querySelector('.reminder-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.appointment .status')).toBeNull();
    expect(fixture.nativeElement.querySelector('.appointment-body p')?.textContent).not.toContain('+39');
    expect(fixture.nativeElement.textContent).not.toMatch(/confermat/i);
    expect(fixture.nativeElement.querySelector('.whatsapp img')?.getAttribute('src')).toBe('/assets/whatsapp.svg');
    expect(fixture.nativeElement.querySelector('.whatsapp')?.textContent.trim()).toBe('');
    expect(fixture.nativeElement.querySelector('.whatsapp')?.getAttribute('aria-label')).toContain('WhatsApp');
    expect(fixture.nativeElement.querySelector('.appointment-status-action')).toBeNull();
    const editAction = fixture.nativeElement.querySelector('.edit-appointment') as HTMLButtonElement;
    expect(editAction.previousElementSibling).toBe(fixture.nativeElement.querySelector('.whatsapp'));
    expect(editAction.querySelector('img')?.getAttribute('src')).toBe('/assets/green_edit.svg');
    expect(fixture.nativeElement.querySelector('.delete-appointment img')?.getAttribute('src')).toBe('/assets/red_delete.svg');
    expect(editAction.getAttribute('aria-label')).toBe('Modifica appuntamento');
    expect(fixture.nativeElement.querySelector('.delete-appointment')?.getAttribute('aria-label')).toBe('Elimina appuntamento');
    instance.appointments.set([{ ...appointment, status: 'cancelled' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.appointment .status')?.textContent?.trim()).toBe('Annullato');
    expect(fixture.nativeElement.querySelector('.appointment-status-action')).toBeNull();
  });

  it('collapses only the chosen appointment, preserving its time and name', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      appointments: { set(value: Appointment[]): void };
    };
    const appointment: Appointment = {
      id: 'first', clientId: '', clientName: 'Ada Lovelace', phone: sampleClient.phone,
      date: instance.selectedDate(), time: '09:00', service: 'Taglio', notes: 'Nota riservata',
      status: 'confirmed', reminderConsent: true, createdAt: '2026-01-01T00:00:00.000Z',
      employeeId: null, employeeName: 'Admin',
    };
    instance.appointments.set([appointment, { ...appointment, id: 'second', clientName: 'Grace Hopper', time: '10:00' }]);
    fixture.detectChanges();
    const agendaTotal = fixture.nativeElement.querySelector('.agenda-total') as HTMLElement;
    expect(agendaTotal.textContent).toContain('Appuntamenti totali: 2');
    expect(fixture.nativeElement.querySelector('.mobile-date-summary')).toBeNull();
    expect(fixture.nativeElement.querySelector('.date-chip span')).toBeNull();
    const cards = fixture.nativeElement.querySelectorAll('.appointment') as NodeListOf<HTMLElement>;
    const toggle = cards[0].querySelector('.appointment-toggle') as HTMLButtonElement;
    expect(cards[0].style.getPropertyValue('--ui-enter-delay')).toBe('0ms');
    expect(cards[1].style.getPropertyValue('--ui-enter-delay')).toBe('28ms');
    expect(toggle.querySelector('svg[data-icon="arrow-upward"]')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('appointment-details-first');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(cards[0].textContent).toContain('09:00');
    expect(cards[0].textContent).toContain('Ada Lovelace');
    expect(cards[0].querySelector('.appointment-preview')?.textContent).toContain('Taglio');
    const collapsedDetails = cards[0].querySelector('.appointment-details') as HTMLElement;
    const expandedDetails = cards[1].querySelector('.appointment-details') as HTMLElement;
    expect(collapsedDetails.classList.contains('is-collapsed')).toBe(true);
    expect(collapsedDetails.getAttribute('aria-hidden')).toBe('true');
    expect(collapsedDetails.hasAttribute('inert')).toBe(true);
    expect(expandedDetails.classList.contains('is-collapsed')).toBe(false);
    expect(expandedDetails.hasAttribute('inert')).toBe(false);
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(collapsedDetails.classList.contains('is-collapsed')).toBe(false);
    expect(collapsedDetails.getAttribute('aria-hidden')).toBeNull();
    expect(collapsedDetails.hasAttribute('inert')).toBe(false);
    expect(cards[0].querySelector('.appointment-details')?.textContent).toContain('Nota riservata');
    expect(cards[0].querySelector('.edit-appointment')).not.toBeNull();
  });

  it('does not open WhatsApp for a saved contact with a wrong country prefix', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      const instance = fixture.componentInstance as unknown as {
        openWhatsApp(item: Appointment, kind: 'reminder'): void;
        notice(): string;
      };
      instance.openWhatsApp({
        id: 'legacy-appointment', clientId: '', clientName: 'Cliente Demo', phone: '+303331234567',
        date: '2026-11-23', time: '10:00', service: '', notes: '', status: 'confirmed',
        reminderConsent: true, createdAt: '2026-11-22T10:00:00.000Z',
      }, 'reminder');
      expect(open).not.toHaveBeenCalled();
      expect(instance.notice()).toContain('Numero non italiano');
    } finally {
      open.mockRestore();
    }
  });

  it('shows a separate agenda column for Sissy and each registered employee', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      appointments: { set(value: Appointment[]): void };
      employees: { set(value: Employee[]): void };
    };
    const employees: Employee[] = [
      { id: 'employee-1', firstName: 'Lara', lastName: 'Rossi', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'employee-2', firstName: 'Mia', lastName: 'Bianchi', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const appointments: Appointment[] = [
      { id: 'admin-appointment', clientId: '', clientName: 'Ada Lovelace', phone: '+393331234567', date: instance.selectedDate(), time: '09:00', service: 'Taglio', notes: '', status: 'confirmed', reminderConsent: false, createdAt: '2026-01-01T00:00:00.000Z', employeeId: null, employeeName: 'Admin' },
      { id: 'employee-appointment', clientId: '', clientName: 'Grace Hopper', phone: '+393331234568', date: instance.selectedDate(), time: '10:00', service: 'Piega', notes: '', status: 'confirmed', reminderConsent: false, createdAt: '2026-01-01T00:00:00.000Z', employeeId: 'employee-1', employeeName: 'Lara Rossi' },
    ];
    instance.employees.set(employees);
    instance.appointments.set(appointments);
    fixture.detectChanges();

    const columns = Array.from(fixture.nativeElement.querySelectorAll('.employee-agenda-column')) as HTMLElement[];
    expect(columns).toHaveLength(3);
    expect(columns.map((column) => column.querySelector('.employee-agenda-heading h3')?.textContent?.trim())).toEqual(['Sissy', 'Lara Rossi', 'Mia Bianchi']);
    expect(columns.map((column) => column.querySelectorAll('.appointment').length)).toEqual([1, 1, 0]);
    expect(window.getComputedStyle(columns[1].querySelector('h3') as HTMLElement).whiteSpace).toBe('nowrap');

    const toggle = fixture.nativeElement.querySelector('.agenda-view-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const selector = fixture.nativeElement.querySelector('.agenda-single-selector select') as HTMLSelectElement;
    selector.value = 'employee-2';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const singleColumn = fixture.nativeElement.querySelectorAll('.employee-agenda-column');
    expect(singleColumn).toHaveLength(1);
    expect(singleColumn[0].querySelector('.employee-agenda-heading h3')?.textContent?.trim()).toBe('Mia Bianchi');
    expect(fixture.nativeElement.querySelector('.appointment-list')?.classList.contains('single-employee-view')).toBe(true);
    expect(fixture.nativeElement.querySelector('.appointment-list')?.style.getPropertyValue('--agenda-column-count')).toBe('1');

    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.employee-agenda-column')).toHaveLength(3);

    const mobileView = fixture.nativeElement.querySelector('.agenda-mobile-view select') as HTMLSelectElement;
    expect(mobileView.value).toBe('all');
    mobileView.value = 'employee-1';
    mobileView.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.employee-agenda-column')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.employee-agenda-heading h3')?.textContent?.trim()).toBe('Lara Rossi');
    mobileView.value = 'all';
    mobileView.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.employee-agenda-column')).toHaveLength(3);
  });

  it('shows the horizontal-scroll hint when two agenda columns are available', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as { employees: { set(value: Employee[]): void } };
    instance.employees.set([{ id: 'employee-1', firstName: 'Lara', lastName: 'Rossi', createdAt: '2026-01-01T00:00:00.000Z' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.employee-agenda-column')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.agenda-scroll-hint')?.textContent?.trim()).toBe('Scorri per le altre persone →');
  });

  it('books a free employee half hour without offering the same occupied time for Sissy', async () => {
    readShifts = async date => [null, 'employee-1'].map(employeeId => ({ date, employeeId, slots: [20] }));
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const state = fixture.componentInstance as unknown as {
      selectedDate(): string; appointments: { set(values: Appointment[]): void }; employees: { set(values: Employee[]): void };
      draft: { employeeId: string | null; date: string; time: string };
    };
    const date = state.selectedDate();
    state.employees.set([{ id: 'employee-1', firstName: 'Mia', lastName: 'Rossi', createdAt: date }]);
    state.appointments.set([{ id: 'a', clientId: '', clientName: 'Cliente A', date, time: '10:00', status: 'confirmed', employeeId: null, employeeName: 'Admin', phone: '', service: '', notes: '', reminderConsent: false, createdAt: date }]);
    fixture.detectChanges();
    const [sissy, mia] = Array.from(fixture.nativeElement.querySelectorAll('.employee-agenda-column')) as HTMLElement[];
    expect(sissy.textContent).toContain('Cliente A');
    expect(sissy.querySelector('.free-slot')).toBeNull();
    const slot = mia.querySelector<HTMLButtonElement>('.free-slot')!;
    expect(slot.textContent?.trim()).toBe('10:00');
    slot.click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(state.draft).toMatchObject({ date, employeeId: 'employee-1', time: '10:00' });
  });

  it('opens in the dark theme and persists a light-theme choice', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.theme-toggle') as HTMLButtonElement;
    const sidebarIcon = fixture.nativeElement.querySelector('.sidebar nav button img') as HTMLImageElement;
    expect(fixture.nativeElement.querySelector('.workspace')?.classList.contains('dark')).toBe(true);
    expect(sidebarIcon.classList.contains('inverted')).toBe(true);
    expect(button.textContent).toContain('Modalità chiara');
    (fixture.componentInstance as unknown as { view: { set(value: string): void } }).view.set('clients');
    fixture.detectChanges();
    const clientAddIcon = fixture.nativeElement.querySelector('.client-actions .primary img') as HTMLImageElement;
    expect(clientAddIcon.classList.contains('inverted')).toBe(false);
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.workspace')?.classList.contains('dark')).toBe(false);
    expect(sidebarIcon.classList.contains('inverted')).toBe(false);
    expect(clientAddIcon.classList.contains('inverted')).toBe(true);
    expect(fixture.nativeElement.querySelector('.sidebar .logout img')?.classList.contains('inverted')).toBe(false);
    expect(button.textContent).toContain('Modalità scura');
    expect(localStorage.getItem('sissy-agenda-theme')).toBe('light');
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
    expect(dialog.querySelector('input[name="phone"]')?.getAttribute('placeholder')).toBe('333 1234567');
    expect(dialog.querySelector('.close svg[data-icon="close"]')).toBeTruthy();
    expect(dialog.querySelector('select[name="employeeId"] option')?.textContent).toContain('Sissy');
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
    expect(fixture.nativeElement.querySelector('.scrim')?.classList.contains('dark'))
      .toBe(fixture.nativeElement.querySelector('.workspace')?.classList.contains('dark'));
  });

  it('keeps checked WhatsApp consent enabled for an existing client when saving an appointment', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      draft: { clientId: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      saveAppointment(): Promise<void>;
    };
    Object.assign(instance.draft, { clientId: sampleClient.id, firstName: 'Ada', lastName: 'Lovelace', phone: '+393331234567', date: instance.selectedDate(), time: '10:00', service: '', notes: '', reminderConsent: true, addToContacts: true, employeeId: null });
    await instance.saveAppointment();
    expect(saveClientCalls).toBe(0);
    expect(savedAppointment?.clientId).toBe(sampleClient.id);
    expect(savedAppointment?.reminderConsent).toBe(true);
  });

  it('saves a new appointment without a client when the directory opt-in is unchecked', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      draft: { clientId?: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      saveAppointment(): Promise<void>;
    };
    Object.assign(instance.draft, { clientId: '', firstName: 'Grace', lastName: 'Hopper', phone: '+393331234568', date: instance.selectedDate(), time: '10:00', service: '', notes: '', reminderConsent: false, addToContacts: false, employeeId: null });
    await instance.saveAppointment();
    expect(saveClientCalls).toBe(0);
    expect(savedAppointment?.clientId).toBe('');
    expect(savedAppointment?.status).toBe('confirmed');
  });

  it('saves a new client before its appointment when the directory opt-in is checked', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      draft: { clientId?: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      saveAppointment(): Promise<void>;
    };
    Object.assign(instance.draft, { clientId: '', firstName: 'Katherine', lastName: 'Johnson', phone: '+393331234569', date: instance.selectedDate(), time: '10:30', service: '', notes: '', reminderConsent: false, addToContacts: true, employeeId: null });
    await instance.saveAppointment();
    expect(saveClientCalls).toBe(1);
    expect(savedClient?.name).toBe('Katherine Johnson');
    expect(savedAppointment?.clientId).toBe(savedClient?.id);
  });

  it('prevents concurrent direct client submissions', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      addClient(): void;
      clientDraft: { firstName: string; lastName: string; phone: string; notes: string; whatsappConsent: boolean };
      saveClient(): Promise<void>;
    };
    instance.addClient();
    Object.assign(instance.clientDraft, { firstName: 'Grace', lastName: 'Hopper', phone: '3331234567', notes: '', whatsappConsent: false });
    let releaseSave!: () => void;
    clientSaveGate = new Promise<void>((resolve) => { releaseSave = resolve; });

    const firstSave = instance.saveClient();
    const duplicateSave = instance.saveClient();
    fixture.detectChanges();
    const submit = fixture.nativeElement.querySelector('form button[type="submit"]') as HTMLButtonElement;
    const submitWasDisabled = submit.disabled;
    const submitLabel = submit.textContent?.trim() ?? '';
    releaseSave();
    await Promise.all([firstSave, duplicateSave]);

    expect(saveClientCalls).toBe(1);
    expect(submitWasDisabled).toBe(true);
    expect(submitLabel).toContain('Salvataggio');
  });

  it('keeps a saved client visible when the dashboard list cannot be reloaded', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      addClient(): void;
      clientDraft: { firstName: string; lastName: string; phone: string; notes: string; whatsappConsent: boolean };
      saveClient(): Promise<void>;
      clients(): Client[];
    };
    instance.addClient();
    Object.assign(instance.clientDraft, { firstName: 'Grace', lastName: 'Hopper', phone: '3331234567', notes: '', whatsappConsent: false });
    failClientList = true;

    await instance.saveClient();

    expect(instance.clients().some((client) => client.id === savedClient?.id)).toBe(true);
  });

  it('does not save an appointment opt-in client twice after an appointment conflict', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      load(): Promise<void>;
      selectedDate(): string;
      draft: { clientId: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      formError(): string;
      clients(): Client[];
      saveAppointment(): Promise<void>;
    };
    Object.assign(instance.draft, { clientId: '', firstName: 'Katherine', lastName: 'Johnson', phone: '3337654321', date: instance.selectedDate(), time: '10:30', service: '', notes: '', reminderConsent: false, addToContacts: true, employeeId: null });
    await instance.load();
    failClientList = true;
    failNextAppointmentSave = true;

    await instance.saveAppointment();

    expect(instance.clients().map((client) => client.id)).toEqual(expect.arrayContaining([savedClient?.id]));
    expect(instance.formError().toLocaleLowerCase('it')).toContain('cliente');
    await instance.saveAppointment();
    expect(saveClientCalls).toBe(1);
    expect(savedAppointment?.clientId).toBe(savedClient?.id);
  });

  it('reports a duplicate opt-in client as a client error, not a time conflict', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      draft: { clientId: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      formError(): string;
      saveAppointment(): Promise<void>;
    };
    Object.assign(instance.draft, { clientId: '', firstName: 'Katherine', lastName: 'Johnson', phone: '3337654321', date: instance.selectedDate(), time: '10:30', service: '', notes: '', reminderConsent: false, addToContacts: true, employeeId: null });
    nextClientSaveError = { code: '23505', constraint: 'clients_owner_id_phone_key' };

    await instance.saveAppointment();

    expect(instance.formError().toLocaleLowerCase('it')).toContain('cliente');
    expect(instance.formError().toLocaleLowerCase('it')).not.toContain('orario');
    expect(savedAppointment).toBeUndefined();
  });

  it('prevents concurrent appointment submissions from saving the opt-in client twice', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      selectedDate(): string;
      draft: { clientId: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      saveAppointment(): Promise<void>;
    };
    Object.assign(instance.draft, { clientId: '', firstName: 'Katherine', lastName: 'Johnson', phone: '3337654321', date: instance.selectedDate(), time: '10:30', service: '', notes: '', reminderConsent: false, addToContacts: true, employeeId: null });
    let releaseSave!: () => void;
    clientSaveGate = new Promise<void>((resolve) => { releaseSave = resolve; });

    const firstSave = instance.saveAppointment();
    const duplicateSave = instance.saveAppointment();
    expect(saveClientCalls).toBe(1);
    releaseSave();
    await Promise.all([firstSave, duplicateSave]);

    expect(savedAppointment?.clientId).toBe(savedClient?.id);
  });

  it('prefills appointment details when a saved client is selected', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      load(): Promise<void>;
      openForm(): void;
      selectAppointmentClient(id: string): void;
      draft: { clientId?: string; clientName: string; firstName: string; lastName: string; phone: string };
    };
    await instance.load();
    instance.openForm();
    instance.selectAppointmentClient(sampleClient.id);
    expect(instance.draft.clientName).toBe('Ada Lovelace');
    expect(instance.draft.firstName).toBe('Ada');
    expect(instance.draft.lastName).toBe('Lovelace');
    expect(instance.draft.phone).toBe('3331234567');

    instance.openForm();
    fixture.detectChanges();
    expect(instance.draft.clientId).toBe('');
    expect(instance.draft.clientName).toBe('');
    expect(instance.draft.firstName).toBe('');
    expect(instance.draft.lastName).toBe('');
    expect(instance.draft.phone).toBe('');
    expect((fixture.nativeElement.querySelector('select[name="clientId"]') as HTMLSelectElement).value).toBe('');
  });

  it('offers adding a client directly from the clients screen', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const instance = fixture.componentInstance as unknown as {
      load(): Promise<void>;
      view: { set(value: string): void };
    };
    await instance.load();
    instance.view.set('clients');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.client-info span')?.textContent).toBe('3331234567');
    expect(fixture.nativeElement.textContent).toContain('Aggiungi cliente');
    expect(fixture.nativeElement.querySelector('.page-heading h1')?.textContent?.trim()).toBe('Clienti');
    expect(fixture.nativeElement.textContent).not.toContain('APPUNTAMENTI TOTALI');
    expect(fixture.nativeElement.querySelector('.agenda-card h2')?.textContent?.trim()).toBe('I tuoi clienti');
    expect(fixture.nativeElement.querySelector('.page-heading')?.textContent).not.toContain('Rubrica del salone sincronizzata');
    expect(fixture.nativeElement.querySelector('.page-heading')?.textContent).not.toContain('Contatti salvati in modo protetto');
    const clientActions = fixture.nativeElement.querySelector('.client-actions') as HTMLElement;
    expect(clientActions.querySelector('.search')).toBeTruthy();
    expect(clientActions.querySelector('.primary img')?.getAttribute('src')).toBe('/assets/add.svg');
    expect(clientActions.querySelector('.search')?.parentElement).toBe(clientActions.querySelector('.primary')?.parentElement);
    const appointmentButton = fixture.nativeElement.querySelector('.client-row-actions .appointment-action') as HTMLButtonElement;
    expect(appointmentButton.textContent?.trim()).toBe('');
    expect(appointmentButton.getAttribute('aria-label')).toBe('Crea appuntamento per Ada Lovelace');
    expect(appointmentButton.querySelector('img')?.getAttribute('src')).toBe('/assets/agenda.svg');
    const appointmentButtonStyles = window.getComputedStyle(appointmentButton);
    expect(appointmentButtonStyles.display).toBe('grid');
    expect(appointmentButtonStyles.placeItems).toBe('center');
    (fixture.componentInstance as unknown as { addClient(): void }).addClient();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Aggiungi cliente');
  });

  it('opens a guided reminder editor with live preview and insertable fields', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { view: { set(value: string): void } }).view.set('settings');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.edit-reminder-template') as HTMLButtonElement).click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Anteprima di esempio');
    const editor = dialog.querySelector('textarea[name="reminder"]') as HTMLTextAreaElement;
    expect(editor).toBeTruthy();
    const nameButton = [...dialog.querySelectorAll('button')].find((button) => button.textContent?.includes('Nome cliente')) as HTMLButtonElement;
    expect(nameButton).toBeTruthy();
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
    nameButton.click();
    fixture.detectChanges();
    expect(editor.value).toContain('{nome}');
  });

  it('shows the employee screen and only asks for first and last name', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { view: { set(value: string): void } }).view.set('employees');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Dipendenti');
    expect(fixture.nativeElement.querySelector('.page-heading .subtitle')).toBeNull();
    (fixture.componentInstance as unknown as { addEmployee(): void }).addEmployee();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.querySelector('.subtitle')).toBeNull();
    expect(dialog.querySelector('[name="employeeFirstName"]')).toBeTruthy();
    expect(dialog.querySelector('[name="employeeLastName"]')).toBeTruthy();
    expect(dialog.querySelectorAll('input')).toHaveLength(2);
  });

  it('shows save feedback as a dismissible toast instead of inline page text', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { showNotice(message: string): void }).showNotice('Appuntamento salvato.');
    fixture.detectChanges();
    const toast = fixture.nativeElement.querySelector('.toast[role="status"]') as HTMLElement;
    expect(toast.textContent).toContain('Appuntamento salvato.');
    const toastStyles = window.getComputedStyle(toast);
    expect(toastStyles.position).toBe('fixed');
    expect(toastStyles.top).not.toBe('50%');
    expect(toastStyles.left).toBe('50%');
    expect(toastStyles.transform).not.toBe('none');
    const close = toast.querySelector('button[aria-label="Chiudi notifica"]') as HTMLButtonElement;
    expect(close).toBeTruthy();
    const closeStyles = window.getComputedStyle(close);
    expect(closeStyles.width).toBe('44px');
    expect(closeStyles.height).toBe('44px');
    expect(closeStyles.alignItems).toBe('center');
    expect(closeStyles.justifyItems).toBe('center');
    expect(closeStyles.paddingLeft).toBe('0px');
    expect(closeStyles.paddingRight).toBe('0px');
    close.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast[role="status"]')).toBeNull();
  });

  it('centers icon-bearing client actions and popup close controls', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      view: { set(value: 'clients'): void };
      addClient(): void;
    };
    component.view.set('clients');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.client-actions .primary') as HTMLButtonElement;
    expect(addButton.querySelector('img')).toBeTruthy();
    const addButtonStyles = window.getComputedStyle(addButton);
    expect(addButtonStyles.alignItems).toBe('center');
    expect(addButtonStyles.justifyContent).toBe('center');

    component.addClient();
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector('.dialog .close') as HTMLButtonElement;
    expect(close.querySelector('svg[data-icon="close"]')).toBeTruthy();
    const scrim = close.closest('.scrim') as HTMLElement;
    expect(window.getComputedStyle(scrim).alignContent).toBe('start');
    const closeStyles = window.getComputedStyle(close);
    expect(closeStyles.width).toBe('44px');
    expect(closeStyles.height).toBe('44px');
    expect(closeStyles.alignItems).toBe('center');
    expect(closeStyles.justifyItems).toBe('center');
    expect(closeStyles.paddingLeft).toBe('0px');
    expect(closeStyles.paddingRight).toBe('0px');
  });

  it('opens the client editor with the selected client details', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.componentInstance as unknown as { editClient(client: Client): void }).editClient(sampleClient);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Modifica cliente');
    expect((fixture.componentInstance as unknown as { clientDraft: { firstName: string } }).clientDraft.firstName).toBe('Ada');
    expect((fixture.nativeElement.querySelector('input[name="clientPhone"]') as HTMLInputElement).value).toBe('3331234567');
    expect(fixture.nativeElement.querySelector('input[name="clientPhone"]')?.getAttribute('placeholder')).toBe('333 1234567');
  });

  it('saves an edited national number with the Italian prefix without displaying it', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as { editClient(client: Client): void; saveClient(): Promise<void> };
    component.editClient({ ...sampleClient, phone: '+393331234567' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[name="clientPhone"]') as HTMLInputElement;
    expect(input.value).toBe('3331234567');
    input.value = '+39 333 1234567';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(input.value).toBe('333 1234567');
    await component.saveClient();
    expect(savedClient?.phone).toBe('+393331234567');
  });

  it('shows a dismissible in-app confirmation before removing a client', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      removeClient(client: Client): void;
      pendingConfirmation(): unknown;
    };
    component.removeClient(sampleClient);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('app-confirmation-dialog dialog') as HTMLDialogElement;
    expect(dialog?.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirmation-title');
    const dialogStyles = window.getComputedStyle(dialog);
    expect(dialogStyles.position).toBe('fixed');
    expect(dialogStyles.top).not.toBe('50%');
    const close = dialog.querySelector('button[aria-label="Chiudi conferma"]') as HTMLButtonElement;
    const closeStyles = window.getComputedStyle(close);
    expect(closeStyles.width).toBe('44px');
    expect(closeStyles.height).toBe('44px');
    expect(closeStyles.alignItems).toBe('center');
    expect(closeStyles.justifyItems).toBe('center');
    (fixture.nativeElement.querySelector('app-confirmation-dialog button[autofocus]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.pendingConfirmation()).toBeNull();
  });

  it('blocks names longer than the database limit before saving a client', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      addClient(): void;
      clientDraft: { firstName: string; lastName: string; phone: string };
      saveClient(): Promise<void>;
      clientFormError(): string;
    };
    component.addClient();
    Object.assign(component.clientDraft, { firstName: 'A'.repeat(101), lastName: 'Rossi', phone: '3331234567' });

    await component.saveClient();

    expect(saveClientCalls).toBe(0);
    expect(component.clientFormError()).toContain('massimo 100');
  });

  it('blocks employee names longer than the database limit before saving', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      addEmployee(): void;
      employeeDraft: { firstName: string; lastName: string };
      saveEmployee(): Promise<void>;
      employeeFormError(): string;
    };
    component.addEmployee();
    Object.assign(component.employeeDraft, { firstName: 'A'.repeat(101), lastName: 'Rossi' });

    await component.saveEmployee();

    expect(employeeSaveCalls).toBe(0);
    expect(component.employeeFormError()).toContain('massimo 100');
  });

  it('blocks appointment times that violate the database half-hour rule', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      selectedDate(): string;
      draft: { clientId: string; firstName: string; lastName: string; phone: string; date: string; time: string; service: string; notes: string; reminderConsent: boolean; addToContacts: boolean; employeeId: string | null };
      formError(): string;
      saveAppointment(): Promise<void>;
    };
    Object.assign(component.draft, { clientId: '', firstName: 'Ada', lastName: 'Rossi', phone: '3331234567', date: component.selectedDate(), time: '10:15', service: '', notes: '', reminderConsent: false, addToContacts: false, employeeId: null });

    await component.saveAppointment();

    expect(savedAppointment).toBeUndefined();
    expect(component.formError()).toContain('30 minuti');
  });

  it('explains duplicate service names instead of silently ignoring the second entry', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      settingsDraft: { services: string[] };
      newService: string;
      addService(): void;
      settingsFormError(): string;
    };
    component.settingsDraft.services = ['Taglio'];
    component.newService = 'taglio';

    component.addService();

    expect(component.settingsDraft.services).toEqual(['Taglio']);
    expect(component.settingsFormError()).toContain('Esiste già un servizio');
  });

  it('blocks invalid daily schedule slots before calling the database repository', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      shiftEditor: { set(value: unknown): void };
      saveHours(slots: number[]): Promise<void>;
      shiftError(): string;
    };
    component.shiftEditor.set({ name: 'Sissy', schedule: { date: '2026-11-24', employeeId: null, slots: [] } });

    await component.saveHours([4, 4]);

    expect(workScheduleSaveCalls).toBe(0);
    expect(component.shiftError()).toContain('fasce duplicate');
  });
});
