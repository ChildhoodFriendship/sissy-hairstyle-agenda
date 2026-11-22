import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../api/auth.service';
import { initialDarkMode, syncThemeColor } from '../../library/theme';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  template: `
    <main class="recovery-page" animate.enter="ui-fade-in" animate.leave="ui-fade-out" [class.dark]="darkMode()">
      <section class="recovery-card" aria-labelledby="recovery-title">
        <a class="back" href="/login">← Torna all’accesso</a>
        <span class="brand-mark" aria-hidden="true">S</span>
        <p class="eyebrow">RECUPERO ACCOUNT</p>
        <h1 id="recovery-title">Password dimenticata?</h1>
        <p class="intro">Inserisci l’email associata al tuo account. Ti invieremo un link per reimpostare la password.</p>
        <form animate.enter="ui-fade-in" animate.leave="ui-fade-out" (submit)="submit($event)">
          <label for="recovery-email">Email</label>
          <input id="recovery-email" name="email" type="email" autocomplete="email" required [value]="email()" (input)="email.set(inputValue($event))" />
          @if(error()){<p class="error" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="alert">{{ error() }}</p>}
          @if(status()){<p class="status" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="status">{{ status() }}</p>}
          <button type="submit">Invia il link</button>
        </form>
      </section>
    </main>
  `,
  styles: `
    :host { --page:var(--sissy-light-page); --surface:var(--sissy-light-surface); --ink:var(--sissy-light-text); --muted:var(--sissy-light-muted); --line:var(--sissy-light-line); --accent:var(--sissy-light-accent); --accent-hover:var(--sissy-light-accent-hover); --accent-soft:var(--sissy-light-accent-soft); --accent-ink:var(--sissy-light-accent-ink); --secondary:var(--sissy-light-secondary); --secondary-hover:var(--sissy-light-secondary-hover); --secondary-soft:var(--sissy-light-secondary-soft); --danger:var(--sissy-light-danger); display:block; min-height:100dvh; }
    .recovery-page { display:grid; min-height:100dvh; place-items:center; padding:24px; background:var(--page); color:var(--ink); color-scheme:light; font-family:var(--sissy-font-ui); transition:background-color var(--sissy-motion-standard) var(--sissy-ease),color var(--sissy-motion-standard) var(--sissy-ease); }
    .recovery-page.dark { --page:var(--sissy-dark-page); --surface:var(--sissy-dark-surface); --ink:var(--sissy-dark-text); --muted:var(--sissy-dark-muted); --line:var(--sissy-dark-line); --accent:var(--sissy-dark-accent); --accent-hover:var(--sissy-dark-accent-hover); --accent-soft:var(--sissy-dark-accent-soft); --accent-ink:var(--sissy-dark-accent-ink); --secondary:var(--sissy-dark-secondary); --secondary-hover:var(--sissy-dark-secondary-hover); --secondary-soft:var(--sissy-dark-secondary-soft); --danger:var(--sissy-dark-danger); color-scheme:dark; }
    .recovery-card { width:min(100%,440px); padding:clamp(26px,5vw,44px); border:1px solid var(--line); border-radius:8px; background:var(--surface); transition:background-color var(--sissy-motion-standard) var(--sissy-ease),color var(--sissy-motion-standard) var(--sissy-ease),border-color var(--sissy-motion-standard) var(--sissy-ease); }
    .back { display:inline-block; min-height:44px; margin-bottom:30px; color:var(--muted); font-size:12px; line-height:44px; text-decoration:none; }
    .back:hover { color:var(--secondary-hover); }
    .brand-mark { display:grid; width:40px; height:40px; place-items:center; border:1px solid var(--accent); border-radius:50%; background:transparent; color:var(--accent); font:italic 22px/1 var(--sissy-font-editorial); }
    .eyebrow { margin:26px 0 8px; color:var(--accent); font-size:9px; font-weight:650; letter-spacing:.16em; }
    h1 { margin:0; font-family:var(--sissy-font-editorial); font-size:clamp(28px,7vw,36px); font-weight:400; letter-spacing:-.045em; line-height:1.08; }
    .intro { margin:12px 0 24px; color:var(--muted); font-size:13px; line-height:1.6; }
    form { display:grid; gap:10px; }
    label { font-size:12px; font-weight:600; }
    input { min-height:48px; padding:0 12px; border:1px solid var(--line); border-radius:5px; background:var(--page); color:var(--ink); font:inherit; }
    input:focus { border-color:var(--accent); outline:0; box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 22%,transparent); }
    button { min-height:48px; margin-top:8px; border:1px solid var(--accent); border-radius:5px; background:var(--accent); color:var(--accent-ink); font:inherit; font-size:12px; font-weight:650; cursor:pointer; }
    button:hover { border-color:var(--accent-hover); background:var(--accent-hover); }
    .error { color:var(--danger); font-size:12px; }
    .status { color:var(--muted); font-size:12px; line-height:1.5; }
    :focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  protected readonly email = signal('');
  protected readonly error = signal('');
  protected readonly status = signal('');
  protected readonly darkMode = signal(initialDarkMode());
  private readonly auth = inject(AuthService);

  constructor() { syncThemeColor(this.darkMode()); }

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
