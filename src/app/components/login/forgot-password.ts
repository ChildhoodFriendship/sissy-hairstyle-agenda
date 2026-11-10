import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  template: `
    <main class="recovery-page" [class.dark]="darkMode()">
      <section class="recovery-card" aria-labelledby="recovery-title">
        <a class="back" href="/login">← Torna all’accesso</a>
        <span class="brand-mark" aria-hidden="true">S</span>
        <p class="eyebrow">RECUPERO ACCOUNT</p>
        <h1 id="recovery-title">Password dimenticata?</h1>
        <p class="intro">Inserisci l’email associata al tuo account. Ti invieremo un link per reimpostare la password.</p>
        <form (submit)="submit($event)">
          <label for="recovery-email">Email</label>
          <input id="recovery-email" name="email" type="email" autocomplete="email" required [value]="email()" (input)="email.set(inputValue($event))" />
          @if(error()){<p class="error" role="alert">{{ error() }}</p>}
          @if(status()){<p class="status" role="status">{{ status() }}</p>}
          <button type="submit">Invia il link</button>
        </form>
      </section>
    </main>
  `,
  styles: `
    :host { --page:#F5F5F7; --surface:#fff; --ink:#1D1D1F; --muted:#6B6B70; --line:#E2E2E7; --accent:#7D3F4C; display:block; min-height:100dvh; }
    .recovery-page { display:grid; min-height:100dvh; place-items:center; padding:24px; background:var(--page); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    .recovery-page.dark { --page:#111113; --surface:#1C1C1E; --ink:#F5F5F7; --muted:#A1A1A6; --line:#38383D; --accent:#D899A3; color-scheme:dark; }
    .recovery-card { width:min(100%,440px); padding:clamp(24px,5vw,42px); border:1px solid var(--line); border-radius:18px; background:var(--surface); }
    .back { display:inline-block; margin-bottom:34px; color:var(--muted); font-size:12px; text-decoration:none; }
    .brand-mark { display:grid; width:38px; height:38px; place-items:center; border-radius:11px; background:var(--accent); color:#fff; font-weight:700; }
    .eyebrow { margin:26px 0 8px; color:var(--accent); font-size:10px; font-weight:700; letter-spacing:.13em; }
    h1 { margin:0; font-size:clamp(25px,7vw,32px); letter-spacing:-.045em; }
    .intro { margin:12px 0 24px; color:var(--muted); font-size:13px; line-height:1.6; }
    form { display:grid; gap:10px; }
    label { font-size:12px; font-weight:600; }
    input { min-height:44px; padding:0 12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font:inherit; }
    button { min-height:44px; margin-top:8px; border:0; border-radius:9px; background:var(--accent); color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
    .error { color:#A33F4B; font-size:12px; }
    .status { color:var(--muted); font-size:12px; line-height:1.5; }
    :focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  protected readonly email = signal('');
  protected readonly error = signal('');
  protected readonly status = signal('');
  protected readonly darkMode = signal(localStorage.getItem('sissy-agenda-theme') === 'dark');
  private readonly auth = inject(AuthService);

  protected inputValue(event: Event): string { return (event.target as HTMLInputElement).value; }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.status.set('');
    const ok = await this.auth.requestPasswordReset(this.email(), `${window.location.origin}/login?recovery=1`);
    if (ok) {
      this.status.set('Se l’email corrisponde a un account, riceverai un link per reimpostare la password. Controlla anche la cartella Spam.');
    } else {
      this.error.set(this.auth.isConfigured() ? 'Non è stato possibile inviare la richiesta. Riprova più tardi.' : 'Collegamento a Supabase non configurato.');
    }
  }
}
