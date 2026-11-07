import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../api/auth.service';
import { Login } from './login';

describe('Login password recovery', () => {
  it('explains that password recovery requires an existing Auth account', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            onPasswordRecovery: () => null,
            requestPasswordReset,
            isConfigured: () => true,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const emailInput = fixture.nativeElement.querySelector('#username') as HTMLInputElement;
    emailInput.value = 'owner@example.com';
    emailInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const resetButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.includes('Password dimenticata?')) as HTMLButtonElement;
    resetButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(requestPasswordReset).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent)
      .toContain('questa richiesta non crea account');
    expect(fixture.nativeElement.textContent).toContain('prima aggiungilo in Supabase');
  });
});
