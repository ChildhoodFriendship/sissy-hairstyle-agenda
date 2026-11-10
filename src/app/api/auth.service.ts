import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from './supabase-client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async login(username: string, password: string): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { data, error } = await this.supabase.functions.invoke('login-with-username', {
        body: { username: username.trim().toLowerCase(), password },
      });
      if (error || !data?.access_token || !data?.refresh_token) return false;
      const { error: sessionError } = await this.supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return !sessionError;
    } catch {
      return false;
    }
  }

  async register(username: string, email: string, password: string): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { error } = await this.supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim().toLowerCase() } },
      });
      return !error;
    } catch {
      return false;
    }
  }

  isConfigured(): boolean {
    return this.supabase !== null;
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      return !error;
    } catch {
      return false;
    }
  }

  async updatePassword(password: string): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { error } = await this.supabase.auth.updateUser({ password });
      return !error;
    } catch {
      return false;
    }
  }

  onPasswordRecovery(callback: () => void): { unsubscribe: () => void } | null {
    if (!this.supabase) return null;
    const { data } = this.supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') callback();
    });
    return data.subscription;
  }

  async logout(): Promise<void> {
    if (this.supabase) await this.supabase.auth.signOut();
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.supabase) return false;
    const { data, error } = await this.supabase.auth.getSession();
    return !error && !!data.session;
  }
}
