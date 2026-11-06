import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { it } from '../../../bundle/it';
import { AuthService } from '../../api/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <main class="login-layout">
      <section class="login-story" aria-labelledby="login-title">
        <div class="story-top"><span class="brand-mark">S</span><span>{{ copy.appName }}</span><span class="demo-pill">{{ copy.common.demoTag }}</span></div>
        <div class="story-copy">
          <p class="eyebrow">{{ copy.login.eyebrow }}</p>
          <h1 id="login-title">{{ copy.login.title }}</h1>
          <p class="story-description">{{ copy.login.description }}</p>
          <div class="story-note"><span class="note-dot"></span><span>{{ copy.common.localOnly }}</span></div>
        </div>
        <div class="story-footer"><span>01 / 04</span><span class="footer-line"></span><span>Agenda · Clienti · Messaggi · Note</span></div>
      </section>
      <section class="login-panel" aria-label="Accesso">
        <div class="panel-card">
          <p class="eyebrow">BENTORNATA</p>
          <h2>Accedi al tuo spazio</h2>
          <p class="panel-intro">Inserisci le credenziali demo per aprire l’agenda.</p>
          <form (submit)="submit($event)" autocomplete="on">
            <label for="username">{{ copy.login.username }}</label>
            <input id="username" name="username" autocomplete="username" required [value]="username()" (input)="username.set(inputValue($event))" />
            <label for="password">{{ copy.login.password }}</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required [value]="password()" (input)="password.set(inputValue($event))" />
            @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
            <button class="button-primary" type="submit">{{ copy.login.submit }} <span aria-hidden="true">↗</span></button>
          </form>
          <p class="demo-hint">{{ copy.login.demo }}</p>
          <div class="security-warning"><span aria-hidden="true">ⓘ</span><p>{{ copy.login.warning }}</p></div>
        </div>
        <p class="panel-foot">Agenda di prova · Dati memorizzati nel browser</p>
      </section>
    </main>
  `,
  styles: `
    :host{display:block;min-height:100dvh;color:#2c2422;font-family:Arial,sans-serif}.login-layout{min-height:100dvh;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(380px,.92fr);background:#f8f5f1}.login-story{position:relative;min-height:100dvh;padding:clamp(24px,5vw,72px);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:#eee8df}.login-story:after{content:"";position:absolute;width:min(58vw,720px);aspect-ratio:1;border:1px solid #d6c7b7;border-radius:50%;right:-18%;bottom:-35%;box-shadow:0 0 0 46px #eee8df,0 0 0 47px #d6c7b7,0 0 0 104px #eee8df,0 0 0 105px #d6c7b7;opacity:.72}.story-top,.story-footer{position:relative;z-index:1;display:flex;align-items:center;gap:12px;font-size:13px;letter-spacing:.04em}.brand-mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#73524e;color:#fff;font:italic 22px Georgia,serif}.demo-pill{margin-left:auto;border:1px solid #c9b9a7;border-radius:99px;padding:7px 12px;font-size:10px;letter-spacing:.14em}.story-copy{position:relative;z-index:1;max-width:590px;margin:12vh 0}.eyebrow{margin:0 0 18px;color:#8b655c;font-size:10px;font-weight:700;letter-spacing:.18em}.story-copy h1{white-space:pre-line;margin:0;font:400 clamp(48px,7vw,96px)/.98 Georgia,serif;letter-spacing:-.055em}.story-description{max-width:390px;margin:24px 0;color:#675d57;font-size:15px;line-height:1.7}.story-note{display:flex;align-items:center;gap:9px;margin-top:40px;color:#786e68;font-size:11px}.note-dot{width:7px;height:7px;border-radius:50%;background:#839177}.story-footer{font-size:10px;color:#83776f}.footer-line{height:1px;flex:1;background:#d4c6b7}.login-panel{display:grid;place-items:center;padding:40px 30px}.panel-card{width:min(100%,390px)}.panel-card h2{margin:0;font:400 34px/1.12 Georgia,serif;letter-spacing:-.04em}.panel-intro{margin:12px 0 32px;color:#827770;font-size:13px;line-height:1.6}.panel-card form{display:grid;gap:10px}.panel-card label{margin-top:10px;font-size:11px;font-weight:700;color:#51443e}.panel-card input{width:100%;height:48px;border:1px solid #ded5cc;border-radius:10px;background:#fff;padding:0 14px;font:inherit;color:#2c2422;outline:none}.panel-card input:focus{border-color:#9a7168;box-shadow:0 0 0 3px #9a716822}.button-primary{height:50px;margin-top:15px;border:0;border-radius:10px;background:#73524e;color:white;font:600 12px Arial,sans-serif;letter-spacing:.04em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:14px}.button-primary:hover{background:#5e403c}.form-error{margin:4px 0 0;color:#a53737;font-size:12px}.demo-hint{margin:18px 0 0;text-align:center;color:#8b655c;font-size:11px}.security-warning{display:flex;gap:10px;margin-top:28px;padding:13px;border:1px solid #e5d8c8;border-radius:10px;background:#f1ece5;color:#786b60;font-size:11px;line-height:1.55}.security-warning p{margin:0}.panel-foot{align-self:end;margin:32px 0 0;color:#968a81;font-size:10px;text-align:center}@media(max-width:800px){.login-layout{grid-template-columns:1fr}.login-story{min-height:38vh;padding:22px 24px}.story-copy{margin:5vh 0 3vh}.story-copy h1{font-size:clamp(42px,12vw,70px)}.story-description{margin:14px 0;font-size:13px}.story-note{margin-top:20px}.story-footer{display:none}.login-story:after{width:80vw;right:-44%;bottom:-65%}.login-panel{padding:38px 24px 24px}.panel-foot{align-self:auto}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly copy = it;
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.auth.login(this.username(), this.password())) {
      await this.router.navigateByUrl('/agenda');
      return;
    }
    const remaining = this.auth.remainingLockSeconds();
    this.error.set(remaining ? this.copy.login.locked.replace('{seconds}', String(remaining)) : this.copy.login.invalid);
  }
}
