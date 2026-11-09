import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { it } from '../../../bundle/it';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <main class="login-layout" [class.dark]="darkMode()">
      <section class="login-story" aria-labelledby="login-title">
        <div class="story-top"><span class="brand-mark" aria-hidden="true">S</span><span class="demo-pill">{{ copy.common.demoTag }}</span><button class="theme-toggle" type="button" (click)="toggleTheme()">{{ darkMode() ? '☀ Tema chiaro' : '☾ Tema scuro' }}</button></div>
        <div class="story-copy">
          <p class="eyebrow">{{ copy.login.eyebrow }}</p>
          <h1 id="login-title">{{ copy.login.title }}</h1>
          <p class="story-description">{{ copy.login.description }}</p>

        </div>
        <div class="story-footer"><span>01 / 04</span><span class="footer-line"></span><span>Agenda · Clienti · Messaggi · Note</span></div>
      </section>
      <section class="login-panel" aria-label="Accesso">
        <div class="panel-card">
          <p class="eyebrow">BENTORNATA</p>
          @if (recoveryMode()) {
            <h2>Imposta una nuova password</h2>
            <p class="panel-intro">Scegli una password nuova per il tuo account.</p>
            <form (submit)="saveNewPassword($event)" autocomplete="on">
              <label for="new-password">Nuova password</label>
              <input id="new-password" name="new-password" type="password" autocomplete="new-password" minlength="8" required [value]="newPassword()" (input)="newPassword.set(inputValue($event))" />
              @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
              @if (statusMessage()) { <p role="status">{{ statusMessage() }}</p> }
              <button class="button-primary" type="submit">Salva nuova password</button>
            </form>
          } @else {
            <h2>Accedi al tuo spazio</h2>

            <form (submit)="submit($event)" autocomplete="on">
              <label for="username">{{ copy.login.username }}</label>
              <input id="username" name="username" type="email" autocomplete="username" required [value]="username()" (input)="username.set(inputValue($event))" />
              <label for="password">{{ copy.login.password }}</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required [value]="password()" (input)="password.set(inputValue($event))" />
              @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
              @if (statusMessage()) { <p role="status">{{ statusMessage() }}</p> }
              <button class="button-primary" type="submit">{{ copy.login.submit }} <span aria-hidden="true">↗</span></button>
            </form>
            <button type="button" class="demo-hint" (click)="requestPasswordReset()">Password dimenticata?</button>
            <p class="demo-hint">{{ copy.login.recoveryHelp }}</p>
          }

        </div>
        <p class="panel-foot">Agenda riservata · Accesso con account autorizzato</p>
      </section>
    </main>
  `,
  styles: `
    /* Previous login styling retired; the clean design system follows.
    :host{display:block;min-height:100dvh;color:#18304b;font-family:Arial,sans-serif}.login-layout{min-height:100dvh;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(380px,.92fr);background:#f7fbff}.login-story{position:relative;min-height:100dvh;padding:clamp(24px,5vw,72px);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:#e8f2fc}.login-story:after{content:"";position:absolute;width:min(58vw,720px);aspect-ratio:1;border:1px solid #c6d9ed;border-radius:50%;right:-18%;bottom:-35%;box-shadow:0 0 0 46px #e8f2fc,0 0 0 47px #c6d9ed,0 0 0 104px #e8f2fc,0 0 0 105px #c6d9ed;opacity:.72}.story-top,.story-footer{position:relative;z-index:1;display:flex;align-items:center;gap:12px;font-size:13px;letter-spacing:.04em}.brand-mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#3978b8;color:#fff;font:italic 22px Georgia,serif}.demo-pill{margin-left:auto;border:1px solid #b8cee4;border-radius:99px;padding:7px 12px;font-size:10px;letter-spacing:.14em}.story-copy{position:relative;z-index:1;max-width:590px;margin:12vh 0}.eyebrow{margin:0 0 18px;color:#3978b8;font-size:10px;font-weight:700;letter-spacing:.18em}.story-copy h1{white-space:pre-line;margin:0;font:400 clamp(48px,7vw,96px)/.98 Georgia,serif;letter-spacing:-.055em}.story-description{max-width:390px;margin:24px 0;color:#526982;font-size:15px;line-height:1.7}.story-footer{font-size:10px;color:#647b94}.footer-line{height:1px;flex:1;background:#c6d9ed}.login-panel{display:grid;place-items:center;padding:40px 30px}.panel-card{width:min(100%,390px)}.panel-card h2{margin:0 0 28px;font:400 34px/1.12 Georgia,serif;letter-spacing:-.04em}.panel-intro{margin:12px 0 32px;color:#71849a;font-size:13px;line-height:1.6}.panel-card form{display:grid;gap:10px}.panel-card label{margin-top:10px;font-size:11px;font-weight:700;color:#314b66}.panel-card input{width:100%;height:48px;border:1px solid #d4e1ee;border-radius:10px;background:#fff;padding:0 14px;font-size:13px;outline:0}.panel-card input:focus{border-color:#3978b8;box-shadow:0 0 0 3px #3978b822}.button-primary{height:48px;margin-top:10px;border:0;border-radius:9px;background:#3978b8;color:#fff;font-size:12px;font-weight:700}.button-primary span{float:right}.button-primary:hover{background:#28639e}.demo-hint{display:block;margin:20px auto 0;border:0;background:none;color:#3978b8;font-size:11px}.panel-card .demo-hint+ .demo-hint{margin-top:10px;color:#71849a;line-height:1.6;text-align:center}.form-error{color:#a34036;font-size:11px}.panel-foot{align-self:end;margin:32px 0 0;color:#8093a8;font-size:10px;text-align:center}@media(max-width:800px){.login-layout{grid-template-columns:1fr}.login-story{min-height:38vh;padding:22px 24px}.story-copy{margin:5vh 0 3vh}.story-copy h1{font-size:clamp(42px,12vw,70px)}.story-description{margin:14px 0;font-size:13px}.story-footer{display:none}.login-story:after{width:80vw;right:-44%;bottom:-65%}.login-panel{padding:38px 24px 24px}.panel-foot{align-self:auto}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
    */
    :host { --page: #F5F5F7; --surface: #FFFFFF; --surface-muted: #F0F0F2; --ink: #1D1D1F; --muted: #6B6B70; --line: #E2E2E7; --accent: #7D3F4C; --accent-hover: #6E3440; --accent-soft: #F5ECEE; --accent-ink: #FFFFFF; display: block; min-height: 100dvh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .login-layout { min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(390px, .9fr); background: var(--page); color: var(--ink); color-scheme: light; }
    .login-layout.dark { --page: #111113; --surface: #1C1C1E; --surface-muted: #242428; --ink: #F5F5F7; --muted: #A1A1A6; --line: #38383D; --accent: #D899A3; --accent-hover: #E5A8B0; --accent-soft: #38292D; --accent-ink: #1D1D1F; color-scheme: dark; }
    .login-layout :focus-visible { outline-color: var(--accent); }
    .login-story { display: flex; min-height: 100dvh; flex-direction: column; justify-content: space-between; padding: clamp(28px, 5vw, 72px); border-right: 1px solid var(--line); background: var(--surface-muted); }
    .login-story::after { display: none; }
    .story-top, .story-footer { display: flex; align-items: center; gap: 12px; }
    .brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 11px; background: var(--accent); color: var(--accent-ink); font-size: 18px; font-weight: 650; }
    .demo-pill { margin-left: auto; padding: 6px 10px; border: 1px solid var(--line); border-radius: 99px; color: var(--muted); font-size: 9px; font-weight: 600; letter-spacing: .1em; }
    .theme-toggle { padding: 8px 10px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); color: var(--ink); font-size: 10px; font-weight: 550; white-space: nowrap; }
    .theme-toggle:hover { background: var(--surface-muted); }
    .story-copy { max-width: 560px; margin: 10vh 0; }
    .eyebrow { margin: 0 0 15px; color: var(--accent); font-size: 10px; font-weight: 650; letter-spacing: .13em; }
    .story-copy h1 { margin: 0; font-size: clamp(46px, 6vw, 76px); font-weight: 600; letter-spacing: -.065em; line-height: .99; white-space: pre-line; }
    .story-description { max-width: 390px; margin: 23px 0 0; color: var(--muted); font-size: 14px; line-height: 1.7; }
    .story-footer { color: var(--muted); font-size: 10px; }
    .footer-line { height: 1px; flex: 1; background: var(--line); }
    .login-panel { display: grid; place-items: center; padding: 38px; background: var(--page); }
    .panel-card { width: min(100%, 420px); padding: clamp(24px, 3vw, 36px); border: 1px solid var(--line); border-radius: 16px; background: var(--surface); }
    .panel-card h2 { margin: 0 0 24px; font-size: 27px; font-weight: 620; letter-spacing: -.045em; line-height: 1.15; }
    .panel-intro { margin: -10px 0 23px; color: var(--muted); font-size: 12px; line-height: 1.6; }
    .panel-card form { display: grid; gap: 8px; }
    .panel-card label { margin-top: 8px; color: var(--ink); font-size: 11px; font-weight: 600; }
    .panel-card input { width: 100%; height: 44px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 12px; outline: 0; }
    .panel-card input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 17%, transparent); }
    .button-primary { min-height: 44px; margin-top: 10px; padding: 0 14px; border: 1px solid var(--accent); border-radius: 9px; background: var(--accent); color: var(--accent-ink); font-size: 12px; font-weight: 620; text-align: left; }
    .button-primary span { float: right; }
    .button-primary:hover { border-color: var(--accent-hover); background: var(--accent-hover); }
    .demo-hint { display: block; margin: 17px auto 0; border: 0; background: transparent; color: var(--accent); font-size: 11px; }
    .panel-card .demo-hint + .demo-hint { margin-top: 10px; color: var(--muted); line-height: 1.55; text-align: center; }
    .form-error { margin: 4px 0; color: #A33F4B; font-size: 11px; }
    .panel-foot { margin: 20px 0 0; color: var(--muted); font-size: 10px; text-align: center; }
    @media (max-width: 800px) {
      .login-layout { grid-template-columns: 1fr; }
      .login-story { min-height: 37vh; padding: 22px 24px; border-right: 0; border-bottom: 1px solid var(--line); }
      .story-copy { margin: 5vh 0 4vh; }
      .story-copy h1 { font-size: clamp(40px, 11vw, 62px); }
      .story-description { margin-top: 14px; font-size: 12px; }
      .story-footer { display: none; }
      .login-panel { padding: 26px 20px 30px; }
      .panel-card { width: min(100%, 460px); }
    }
    @media (max-width: 430px) {
      .login-story { min-height: 32vh; padding: 18px; }
      .story-top { gap: 8px; }
      .demo-pill { padding: 6px 7px; font-size: 8px; }
      .theme-toggle { padding: 7px 8px; font-size: 9px; }
      .login-panel { padding-inline: 14px; }
      .panel-card { padding: 22px 18px; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly copy = it;
  protected readonly darkMode = signal(localStorage.getItem('sissy-agenda-theme') === 'dark');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly statusMessage = signal('');
  protected readonly recoveryMode = signal(false);
  protected readonly newPassword = signal('');
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly recoverySubscription = this.auth.onPasswordRecovery(() => {
    this.recoveryMode.set(true);
    this.statusMessage.set('Link verificato. Ora puoi impostare una nuova password.');
    this.error.set('');
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.recoverySubscription?.unsubscribe());
  }

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected toggleTheme(): void {
    this.darkMode.update((dark) => !dark);
    localStorage.setItem('sissy-agenda-theme', this.darkMode() ? 'dark' : 'light');
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (await this.auth.login(this.username(), this.password())) {
      await this.router.navigateByUrl('/agenda');
      return;
    }
    this.error.set(this.auth.isConfigured() ? this.copy.login.invalid : this.copy.login.notConfigured);
  }

  protected async requestPasswordReset(): Promise<void> {
    this.error.set('');
    this.statusMessage.set('');
    const sent = await this.auth.requestPasswordReset(this.username(), `${window.location.origin}/login?recovery=1`);
    if (sent) {
      this.statusMessage.set('Richiesta ricevuta da Supabase. Il link viene inviato solo se l’email è associata a un utente Auth; questa richiesta non crea account.');
    } else {
      this.error.set(this.auth.isConfigured() ? 'Impossibile richiedere il link. Riprova più tardi.' : this.copy.login.notConfigured);
    }
  }

  protected async saveNewPassword(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    if (this.newPassword().length < 8) {
      this.error.set('La password deve contenere almeno 8 caratteri.');
      return;
    }
    if (await this.auth.updatePassword(this.newPassword())) {
      this.statusMessage.set('Password aggiornata. Ora puoi accedere con la nuova password.');
      this.recoveryMode.set(false);
      this.password.set('');
      this.newPassword.set('');
      return;
    }
    this.error.set('Il link non è valido o è scaduto. Richiedi un nuovo link per il recupero.');
  }
}
