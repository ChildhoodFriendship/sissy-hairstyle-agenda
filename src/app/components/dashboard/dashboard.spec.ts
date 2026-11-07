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
          listAppointments: async () => [], listClients: async () => [sampleClient],
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
  });

  it('opens the appointment form from the main action', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((item: HTMLButtonElement) => item.textContent?.includes('Nuovo appuntamento')) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"] h2')?.textContent).toContain('Aggiungi all’agenda');
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
