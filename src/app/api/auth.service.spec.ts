import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase-client';

describe('AuthService password recovery', () => {
  it('requests a reset link with the configured application return URL', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: { auth: { resetPasswordForEmail } } }],
    });

    const auth = TestBed.inject(AuthService);
    await expect(auth.requestPasswordReset('owner@example.com', 'https://agenda.example/login?recovery=1')).resolves.toBe(true);
    expect(resetPasswordForEmail).toHaveBeenCalledWith('owner@example.com', {
      redirectTo: 'https://agenda.example/login?recovery=1',
    });
  });

  it('updates the password after the recovery link establishes a session', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: { auth: { updateUser } } }],
    });

    await expect(TestBed.inject(AuthService).updatePassword('Strong-example-42')).resolves.toBe(true);
    expect(updateUser).toHaveBeenCalledWith({ password: 'Strong-example-42' });
  });
});
