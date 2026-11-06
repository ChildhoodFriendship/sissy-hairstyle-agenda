import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({ imports: [Dashboard] }).compileComponents();
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
});
