import { Injectable } from '@angular/core';

const SESSION_KEY = 'sissy-agenda-demo-session';
const LOCK_KEY = 'sissy-agenda-demo-lock';
const ATTEMPTS_KEY = 'sissy-agenda-demo-attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  login(username: string, password: string): boolean {
    const now = Date.now();
    const lockedUntil = this.readNumber(LOCK_KEY);
    if (lockedUntil > now) return false;

    if (username === 'admin' && password === 'admin') {
      this.write(SESSION_KEY, 'demo');
      this.write(ATTEMPTS_KEY, '0');
      this.write(LOCK_KEY, '0');
      return true;
    }

    const attempts = this.readNumber(ATTEMPTS_KEY) + 1;
    this.write(ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_ATTEMPTS) {
      this.write(LOCK_KEY, String(now + LOCK_MS));
      this.write(ATTEMPTS_KEY, '0');
    }
    return false;
  }

  logout(): void {
    this.remove(SESSION_KEY);
  }

  isAuthenticated(): boolean {
    return this.read(SESSION_KEY) === 'demo';
  }

  remainingLockSeconds(): number {
    return Math.max(0, Math.ceil((this.readNumber(LOCK_KEY) - Date.now()) / 1000));
  }

  private read(key: string): string | null {
    try {
      return globalThis.sessionStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private readNumber(key: string): number {
    const value = Number(this.read(key));
    return Number.isFinite(value) ? value : 0;
  }

  private write(key: string, value: string): void {
    try {
      globalThis.sessionStorage?.setItem(key, value);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }

  private remove(key: string): void {
    try {
      globalThis.sessionStorage?.removeItem(key);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }
}
