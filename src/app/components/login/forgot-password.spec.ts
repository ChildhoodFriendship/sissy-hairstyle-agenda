import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../api/auth.service';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  it('requests recovery by email and shows a generic confirmation', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: { requestPasswordReset, isConfigured: () => true } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#recovery-email') as HTMLInputElement;
    input.value = 'owner@example.com';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(requestPasswordReset).toHaveBeenCalledWith('owner@example.com', `${window.location.origin}/login?recovery=1`);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Se l’email corrisponde');
  });
});
