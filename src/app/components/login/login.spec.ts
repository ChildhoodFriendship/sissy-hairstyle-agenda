import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../api/auth.service';
import { Login } from './login';

describe('Login password recovery', () => {
  it('opens in the dark theme and persists a light-theme choice', async () => {
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
    expect(fixture.nativeElement.querySelector('.login-layout')?.classList.contains('dark')).toBe(true);
    expect(toggle.textContent).toContain('Tema chiaro');

    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.login-layout')?.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('sissy-agenda-theme')).toBe('light');
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

  it('explains that the database rejected the registration profile and suggests checking the username', async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), {
        provide: AuthService,
        useValue: { onPasswordRecovery: () => null, isConfigured: () => true, register: vi.fn().mockResolvedValue('profile-save-failed') },
      }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      registerUsername: { set(value: string): void };
      registerEmail: { set(value: string): void };
      registerPassword: { set(value: string): void };
      register(event: Event): Promise<void>;
      error(): string;
    };
    component.registerUsername.set('ada');
    component.registerEmail.set('ada@example.com');
    component.registerPassword.set('Strong-pass-42');

    await component.register(new Event('submit'));

    expect(component.error()).toContain('database non è riuscito a salvare il profilo');
    expect(component.error()).toContain('username non sia già in uso');
  });
});
