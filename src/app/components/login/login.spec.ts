import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../api/auth.service';
import { Login } from './login';

describe('Login password recovery', () => {
  it('lets the user switch the login screen between light and dark themes', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            onPasswordRecovery: () => null,
            requestPasswordReset: vi.fn().mockResolvedValue(true),
            isConfigured: () => true,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.story-footer')).toBeNull();
    expect(fixture.nativeElement.querySelector('.story-top .demo-pill')?.textContent?.trim()).toBe('AREA RISERVATA');
    expect(fixture.nativeElement.querySelector('.story-copy .eyebrow')).toBeNull();
    const toggle = fixture.nativeElement.querySelector('.theme-toggle') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.login-layout')?.classList.contains('dark')).toBe(false);

    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-layout')?.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('sissy-agenda-theme')).toBe('dark');
  });

  it('links to a dedicated password recovery page', async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            onPasswordRecovery: () => null,
            isConfigured: () => true,
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/forgot-password"]')?.textContent).toContain('Password dimenticata?');
    expect(fixture.nativeElement.querySelector('#username')?.getAttribute('type')).toBe('text');
  });

  it('opens registration with username, email and password fields', async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: { onPasswordRecovery: () => null, isConfigured: () => true } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('button')]
      .find((item: HTMLButtonElement) => item.textContent?.includes('Crea un account')) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#new-username')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#register-email')?.getAttribute('type')).toBe('email');
    expect(fixture.nativeElement.querySelector('#register-password')?.getAttribute('type')).toBe('password');
  });
});
