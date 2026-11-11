import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { it } from '../../../bundle/it';
import { AuthService } from '../../api/auth.service';
import { SupabaseAgendaRepository } from '../../api/supabase-agenda-repository';
import type { Appointment, Client, Employee, SalonSettings } from '../../library/models';
import { findAppointmentConflict, getDueReminders, normalizePhoneNumber, renderMessageTemplate } from '../../library/domain-utils';

const LEGACY_EMPLOYEE_ASSIGNMENT = '__legacy_employee_assignment__';

 type View = 'agenda' | 'clients' | 'employees' | 'settings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="workspace" [class.dark]="darkMode()">
      <aside class="sidebar">
        <a class="brand" href="/agenda" (click)="$event.preventDefault(); view.set('agenda')"><span class="brand-mark">S</span><span>Agenda <em>Sissy</em></span></a>
        <p class="side-label">IL TUO SALONE</p>
        <nav aria-label="Navigazione principale">
          <button [class.active]="view()==='agenda'" (click)="view.set('agenda')"><img src="/assets/agenda.svg" alt="" />Agenda</button>
          <button [class.active]="view()==='clients'" (click)="view.set('clients')"><img src="/assets/clients.svg" alt="" />Clienti</button>
          <button [class.active]="view()==='employees'" (click)="view.set('employees')"><img src="/assets/clients.svg" alt="" />Dipendenti</button>
          <button [class.active]="view()==='settings'" (click)="view.set('settings')"><img src="/assets/settings.svg" alt="" />Impostazioni</button>
        </nav>
        <div class="sidebar-bottom"><button class="logout" (click)="logout()"><span>Esci</span><img [class.inverted]="darkMode()" src="/assets/logout.svg" alt="" aria-hidden="true" /></button></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="mobile-brand"><span class="brand-mark">S</span> Agenda Sissy</div><span class="demo-label"><i></i> AREA RISERVATA</span><button class="theme-toggle" type="button" (click)="toggleTheme()">{{ darkMode() ? '☀ Modalità chiara' : '☾ Modalità scura' }}</button><button class="mobile-logout" (click)="logout()">Esci</button></header>
        @if (storageWarning()) { <div class="notice warning" role="alert">{{ copy.common.localStorageError }} Puoi continuare a usare questa schermata, ma i dati potrebbero non essere salvati.</div> }
        @if (notice()) { <div class="toast" role="status" aria-live="polite"><span>{{ notice() }}</span><button type="button" aria-label="Chiudi notifica" (click)="dismissNotice()">×</button></div> }
        @if (view()==='agenda') {
          <section class="page-heading"><div><h1>{{ copy.agenda.title }}</h1></div><button class="primary new-button" (click)="openForm()">＋ <span>{{ copy.common.newAppointment }}</span></button></section>
          <section class="datebar"><button class="icon-button previous-day" (click)="shiftDate(-1)" aria-label="Giorno precedente"><img class="date-arrow" [class.inverted]="darkMode()" src="/assets/arrow_right.svg" alt="" aria-hidden="true" /></button><label class="date-chip"><span>GIORNO SELEZIONATO</span><input type="date" [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event)" /></label><button class="icon-button next-day" (click)="shiftDate(1)" aria-label="Giorno successivo"><img class="date-arrow" [class.inverted]="darkMode()" src="/assets/arrow_left.svg" alt="" aria-hidden="true" /></button><button class="today-button" (click)="selectedDate.set(today)">Oggi</button></section>
          <section class="stats"><article><span>APPUNTAMENTI</span><strong>{{ todayAppointments().length }}</strong><small>nel giorno selezionato</small></article><article><span>CONFERMATI</span><strong>{{ confirmedCount() }}</strong><small>orari riservati</small></article><article><span>PROMEMORIA</span><strong>{{ dueReminders().length }}</strong><small>da preparare · non inviati</small></article></section>
          <section class="agenda-card"><div class="card-title"><div><p class="eyebrow">{{ selectedDate() === today ? 'OGGI' : 'AGENDA DEL GIORNO' }}</p><h2>{{ displayDate(selectedDate()) }}</h2></div><span class="count-pill">{{ todayAppointments().length }} {{ copy.ui.appointmentCount }}</span></div>
            @if (todayAppointments().length) { <div class="appointment-list"><div class="time-rail"><span>09</span><span>12</span><span>15</span><span>18</span></div><div class="appointment-items">@for (item of todayAppointments(); track item.id) { <article class="appointment" [class.cancelled]="item.status==='cancelled'"><div class="appointment-time">{{ item.time }}</div><div class="appointment-body"><div class="appointment-top"><h3>{{ item.clientName }}</h3><span class="status" [class]="'status '+item.status">{{ statusLabel(item.status) }}</span></div><p>{{ item.service || 'Servizio non indicato' }} <span>·</span> {{ item.phone }} <span>·</span> {{ item.employeeName || 'Admin' }}</p>@if(item.notes){<small>{{ item.notes }}</small>}</div><div class="appointment-actions"><button class="whatsapp" [disabled]="!clientConsent(item.clientId)" (click)="openWhatsApp(item,'reminder')" [attr.aria-label]="clientConsent(item.clientId) ? 'Prepara promemoria WhatsApp per '+item.clientName : 'Consenso WhatsApp non registrato'"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20l1.2-4.4A8.4 8.4 0 1 1 20 11.5Z"/><path d="M8.5 8.3c.5 3 2.2 4.7 5.2 5.4"/></svg>Messaggio</button><button class="edit-appointment" (click)="edit(item)" aria-label="Modifica appuntamento"><img src="/assets/green_edit.svg" alt="" aria-hidden="true" /></button><button (click)="changeStatus(item, item.status==='cancelled'?'confirmed':'cancelled')">{{ item.status==='cancelled'?'Ripristina':'Annulla' }}</button><button class="delete-appointment" (click)="removeAppointment(item)" aria-label="Elimina appuntamento"><img src="/assets/red_delete.svg" alt="" aria-hidden="true" /></button></div></article> }</div></div> }
            @else { <div class="empty"><span class="empty-art">✳</span><h3>{{ copy.agenda.emptyTitle }}</h3><p>{{ copy.agenda.emptyText }}</p><button class="secondary" (click)="openForm()">＋ Crea appuntamento</button></div> }
          </section>
          @if(dueReminders().length){<section class="reminder-card"><div><span class="reminder-icon">◷</span><div><b>Promemoria da preparare</b><p>{{ dueReminders().length }} appuntamenti per domani. Si aprono da ogni appuntamento.</p></div></div></section>}
        }
        @if (view()==='clients') {
          <section class="page-heading clients-heading"><h1>Clienti</h1><div class="client-actions"><label class="search"><span>⌕</span><input type="search" placeholder="Cerca per nome o telefono" [ngModel]="clientSearch()" (ngModelChange)="clientSearch.set($event)" /></label><button class="primary" (click)="addClient()"><img src="/assets/add.svg" alt="" aria-hidden="true" />Aggiungi cliente</button></div></section>
          <section class="stats"><article><span>CLIENTI</span><strong>{{ clients().length }}</strong><small>contatti in rubrica</small></article><article><span>CONSENSO WHATSAPP</span><strong>{{ consentingClients().length }}</strong><small>consenso registrato</small></article><article><span>APPUNTAMENTI TOTALI</span><strong>{{ appointments().length }}</strong><small>compresi quelli passati</small></article></section>
          <section class="agenda-card"><div class="card-title"><div><p class="eyebrow">RUBRICA</p><h2>I tuoi clienti</h2></div></div>
            @if(filteredClients().length){<div class="client-list">@for(client of filteredClients();track client.id){<article class="client-row"><span class="client-avatar">{{ initials(client.name) }}</span><div class="client-info"><b>{{ client.name }}</b><span>{{ client.phone }}</span></div><span class="consent-pill" [class.yes]="client.whatsappConsent">{{ client.whatsappConsent?'Consenso WhatsApp':'Nessun consenso' }}</span><span class="client-count">{{ clientAppointments(client.id) }} app.</span><button class="text-button" (click)="startAppointment(client)">＋ Appuntamento</button><button class="text-button" [attr.aria-label]="'Modifica cliente '+client.name" (click)="editClient(client)">Modifica</button><button class="text-button danger" (click)="removeClient(client)">Elimina</button></article>}</div>}
            @else{<div class="empty"><span class="empty-art">♙</span><h3>{{ clients().length ? 'Nessuna cliente trovata' : 'La rubrica è ancora vuota' }}</h3><p>Aggiungi una cliente per ritrovarla rapidamente quando crei un appuntamento.</p><button class="secondary" (click)="addClient()">＋ Aggiungi cliente</button></div>}
          </section>
        }

        @if (view()==='employees') {
          <section class="page-heading"><div><p class="eyebrow">IL TUO TEAM</p><h1>Dipendenti</h1><p class="subtitle">Gestisci le persone assegnabili agli appuntamenti.</p></div><button class="primary" (click)="addEmployee()">＋ Aggiungi dipendente</button></section>
          <section class="agenda-card"><div class="card-title"><div><p class="eyebrow">PERSONALE</p><h2>Il team del salone</h2></div><span class="count-pill">{{ activeEmployees().length }} dipendenti</span></div>
            @if(activeEmployees().length){<div class="client-list">@for(employee of activeEmployees();track employee.id){<article class="employee-row"><span class="client-avatar">{{ initials(employee.firstName+' '+employee.lastName) }}</span><div class="client-info"><b>{{ employee.firstName }} {{ employee.lastName }}</b></div><button class="text-button" (click)="editEmployee(employee)">Modifica</button><button class="text-button danger" (click)="removeEmployee(employee)">Elimina</button></article>}</div>}
            @else{<div class="empty"><span class="empty-art">♙</span><h3>Nessun dipendente ancora</h3><p>Aggiungi nome e cognome per poter assegnare gli appuntamenti.</p><button class="secondary" (click)="addEmployee()">＋ Aggiungi dipendente</button></div>}
          </section>
        }

        @if (view()==='settings') {
          <section class="page-heading"><div><p class="eyebrow">IL TUO SPAZIO</p><h1>Impostazioni</h1><p class="subtitle">Preferenze del salone.</p></div></section>
          <section class="settings-grid"><article class="agenda-card settings-card"><div class="card-title"><div><p class="eyebrow">IL SALONE</p><h2>Preferenze</h2></div></div><form (submit)="$event.preventDefault(); saveSettings()"><label>Nome del salone<input name="salonName" [(ngModel)]="settingsDraft.salonName" /></label><label>Servizi</label><div class="service-editor">@for(service of settingsDraft.services;track service;let i=$index){<div class="service-row"><span>{{ service }}</span><button type="button" class="text-button danger" (click)="removeService(i)" aria-label="Rimuovi servizio">Rimuovi</button></div>}</div><div class="service-add"><input name="newService" [(ngModel)]="newService" placeholder="Aggiungi un servizio" /><button type="button" class="secondary" (click)="addService()">Aggiungi</button></div><label>Testo del promemoria<textarea name="reminder" rows="3" [(ngModel)]="settingsDraft.messageTemplates.reminder"></textarea></label><small class="muted">{{ copy.settings.placeholders }}</small><button class="primary" type="submit">Salva impostazioni</button></form></article></section>
        }
      </main>
    </div>
    @if(formOpen()) { <div class="scrim" [class.dark]="darkMode()" (click)="closeForm()"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="form-title" (click)="$event.stopPropagation()"><button class="close" (click)="closeForm()" aria-label="Chiudi">×</button><p class="eyebrow">{{ editingId()?'APPUNTAMENTO':'NUOVO · 01 / 01' }}</p><h2 id="form-title">{{ editingId()?'Modifica appuntamento':'Aggiungi all’agenda' }}</h2><p class="subtitle">I campi con * sono obbligatori.</p><form (submit)="$event.preventDefault(); saveAppointment()"><label>Cliente<select name="clientId" [ngModel]="draft.clientId || ''" (ngModelChange)="selectAppointmentClient($event)"><option value="">Nuova cliente</option>@for(client of clients();track client.id){<option [value]="client.id">{{ client.name }}</option>}</select></label><label class="check"><input type="checkbox" name="addToContacts" [(ngModel)]="draft.addToContacts" /><span>Aggiungi anche alla Rubrica Clienti</span></label><label>Nome *<input name="firstName" required autocomplete="given-name" [(ngModel)]="draft.firstName" /></label><label>Cognome *<input name="lastName" required autocomplete="family-name" [(ngModel)]="draft.lastName" /></label><label>Telefono *<input name="phone" type="tel" required autocomplete="tel" placeholder="+39 333 1234567" [(ngModel)]="draft.phone" /></label><div class="two-fields"><label>Data *<div class="picker-field"><input #datePicker name="date" type="date" required tabindex="-1" [(ngModel)]="draft.date" /><button type="button" (click)="showPicker(datePicker)" aria-label="Scegli la data">▦</button></div></label><label>Ora *<div class="picker-field"><input #timePicker name="time" type="time" step="1800" required tabindex="-1" [(ngModel)]="draft.time" /><button type="button" (click)="showPicker(timePicker)" aria-label="Scegli l’ora">◷</button></div></label></div><label>Seguito da<select name="employeeId" [(ngModel)]="draft.employeeId"><option [ngValue]="null">Admin</option>@if(legacyEmployeeName(); as legacyName){<option [ngValue]="legacyEmployeeAssignmentValue" disabled>{{ legacyName }} (non attivo)</option>}@if(archivedEmployee(); as archived){<option [ngValue]="archived.id" disabled>{{ archivedEmployeeName() }} (non attivo)</option>}@for(employee of activeEmployees();track employee.id){<option [ngValue]="employee.id">{{ employee.firstName }} {{ employee.lastName }}</option>}</select></label><label>Servizio<select name="service" [(ngModel)]="draft.service"><option value="">Nessun servizio indicato</option>@for(service of settingsDraft.services;track service){<option [value]="service">{{ service }}</option>}</select></label><label>Note<textarea name="notes" rows="3" [(ngModel)]="draft.notes"></textarea></label><label class="check"><input type="checkbox" name="reminderConsent" [(ngModel)]="draft.reminderConsent" /><span>Il cliente ha acconsentito a ricevere promemoria WhatsApp</span></label>@if(formError()){<p class="form-error" role="alert">{{ formError() }}</p>}<div class="dialog-actions"><button class="secondary" type="button" (click)="closeForm()">Annulla</button><button class="primary" type="submit">{{ editingId()?'Salva modifiche':'Salva appuntamento' }}</button></div></form></section></div> }
    @if(employeeFormOpen()) { <div class="scrim" [class.dark]="darkMode()" (click)="closeEmployeeForm()"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="employee-form-title" (click)="$event.stopPropagation()"><button class="close" (click)="closeEmployeeForm()" aria-label="Chiudi">×</button><p class="eyebrow">PERSONALE</p><h2 id="employee-form-title">{{ editingEmployee() ? 'Modifica dipendente' : 'Aggiungi dipendente' }}</h2><p class="subtitle">Sono sufficienti nome e cognome.</p><form (submit)="$event.preventDefault(); saveEmployee()"><label>Nome *<input name="employeeFirstName" required autocomplete="given-name" [(ngModel)]="employeeDraft.firstName" /></label><label>Cognome *<input name="employeeLastName" required autocomplete="family-name" [(ngModel)]="employeeDraft.lastName" /></label>@if(employeeFormError()){<p class="form-error" role="alert">{{ employeeFormError() }}</p>}<div class="dialog-actions"><button class="secondary" type="button" (click)="closeEmployeeForm()">Annulla</button><button class="primary" type="submit">Salva dipendente</button></div></form></section></div> }\n    @if(clientFormOpen()) { <div class="scrim" [class.dark]="darkMode()" (click)="closeClientForm()"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="client-form-title" (click)="$event.stopPropagation()"><button class="close" (click)="closeClientForm()" aria-label="Chiudi">×</button><p class="eyebrow">RUBRICA CLIENTI</p><h2 id="client-form-title">{{ editingClient() ? 'Modifica cliente' : 'Aggiungi cliente' }}</h2><p class="subtitle">Inserisci i dati della cliente.</p><form (submit)="$event.preventDefault(); saveClient()"><label>Nome *<input name="firstName" required autocomplete="given-name" [(ngModel)]="clientDraft.firstName" /></label><label>Cognome *<input name="lastName" required autocomplete="family-name" [(ngModel)]="clientDraft.lastName" /></label><label>Telefono *<input name="clientPhone" type="tel" required autocomplete="tel" placeholder="+39 333 1234567" [(ngModel)]="clientDraft.phone" /></label><label>Note<textarea name="clientNotes" rows="2" [(ngModel)]="clientDraft.notes"></textarea></label><label class="check"><input type="checkbox" name="clientConsent" [(ngModel)]="clientDraft.whatsappConsent" /><span>Consenso WhatsApp registrato</span></label>@if(clientFormError()){<p class="form-error" role="alert">{{ clientFormError() }}</p>}<div class="dialog-actions"><button class="secondary" type="button" (click)="closeClientForm()">Annulla</button><button class="primary" type="submit">Salva cliente</button></div></form></section></div> }
  `,
  styles: `
    /* Previous dashboard styling retired; the clean design system follows.
    :host{display:block;min-height:100dvh;background:#f7fbff;color:#18304b;font:14px Arial,Helvetica,sans-serif}*{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer}:focus-visible{outline:3px solid #76a9dc;outline-offset:2px}.workspace{min-height:100dvh}.sidebar{position:fixed;inset:0 auto 0 0;width:248px;padding:26px 18px;display:flex;flex-direction:column;z-index:4;border-right:1px solid #dce7f1;background:#fff}.brand{display:flex;align-items:center;gap:11px;padding:0 8px;color:#18304b;text-decoration:none;font:18px Georgia,serif}.brand em{font-weight:400}.brand-mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:#fff;font:italic 22px Georgia,serif}.side-label{padding:0 12px;margin:52px 0 14px}.sidebar nav{display:grid;gap:5px}.sidebar nav button{border:0;background:transparent;text-align:left;padding:13px 14px;border-radius:9px;font-size:13px}.sidebar nav button.active{font-weight:700}.sidebar-bottom{margin-top:auto}.profile{display:flex;align-items:center;gap:10px;padding:12px 8px 18px;border-bottom:1px solid #dce7f1}.avatar,.client-avatar{width:34px;height:34px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;font:italic 16px Georgia,serif}.profile b,.profile small{display:block}.profile b{font-size:12px}.profile small{margin-top:4px;font-size:10px}.logout{width:100%;display:flex;justify-content:space-between;padding:14px 9px 0;border:0;background:transparent;font-size:12px}.main{margin-left:248px;max-width:1600px;padding:0 42px 70px}.topbar{height:76px;display:flex;align-items:center;justify-content:flex-end;border-bottom:1px solid #dce7f1}.demo-label{display:flex;align-items:center;gap:8px;font-size:9px;letter-spacing:.12em}.demo-label i{width:7px;height:7px;border-radius:50%;background:#3978b8}.mobile-brand,.mobile-logout{display:none}.page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:42px 0 25px}.eyebrow{margin:0 0 11px;font-size:10px;letter-spacing:.16em;font-weight:700}.page-heading h1{margin:0;font:400 clamp(36px,4vw,50px)/1 Georgia,serif;letter-spacing:-.045em}.subtitle{margin:12px 0 0;font-size:13px;line-height:1.6}.primary,.secondary,.today-button,.icon-button{border-radius:9px;transition:background .15s,border-color .15s}.primary{padding:12px 18px;font-weight:600}.new-button{display:flex;align-items:center;gap:9px;height:46px}.secondary{padding:10px 14px;font-weight:600}.datebar{display:flex;align-items:center;gap:10px;margin:3px 0 22px}.icon-button{width:38px;height:38px;border:1px solid #dce7f1}.date-chip{display:flex;flex-direction:column;gap:3px;padding:7px 12px;border:1px solid #dce7f1;border-radius:9px}.date-chip span{font-size:8px;letter-spacing:.12em}.date-chip input{border:0;outline:0;font-size:12px}.today-button{margin-left:3px;border:1px solid transparent;padding:10px 15px;font-size:12px}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:20px}.stats article{min-height:105px;padding:18px 20px;border:1px solid #dce7f1;border-radius:12px}.stats article span,.stats article small{display:block}.stats article span{font-size:9px;letter-spacing:.12em}.stats article strong{display:block;margin:9px 0 4px;font:400 28px Georgia,serif}.stats article small{font-size:10px}.agenda-card{margin-bottom:16px;padding:22px;border:1px solid #dce7f1;border-radius:13px}.card-title{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid #dce7f1}.card-title .eyebrow{margin-bottom:7px}.card-title h2{margin:0;font:400 22px Georgia,serif;letter-spacing:-.02em}.count-pill{border-radius:99px;padding:7px 11px;font-size:10px}.appointment-list{display:grid;grid-template-columns:38px minmax(0,1fr);padding-top:8px}.time-rail{display:flex;flex-direction:column;justify-content:space-around;font:10px Georgia,serif;min-height:180px}.appointment-items{display:grid}.appointment{display:grid;grid-template-columns:58px minmax(150px,1fr) auto;align-items:center;gap:12px;padding:17px 4px;border-bottom:1px solid #dce7f1}.appointment:last-child{border:0}.appointment-time{font:17px Georgia,serif}.appointment-top{display:flex;align-items:center;gap:9px}.appointment h3{margin:0;font-size:13px}.appointment-body p{margin:6px 0 0;font-size:11px}.appointment-body p span{padding:0 3px}.appointment-body small{display:block;margin-top:6px;font-size:10px}.status{border-radius:99px;padding:4px 7px;font-size:9px}.appointment.cancelled .appointment-body{text-decoration:line-through;opacity:.65}.appointment-actions{display:flex;gap:6px}.appointment-actions button,.text-button{padding:6px;border:0;background:none;font-size:10px}.empty{min-height:215px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:28px}.empty-art{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;font:22px Georgia,serif}.empty h3{margin:14px 0 6px;font:400 19px Georgia,serif}.empty p{max-width:340px;margin:0 0 15px;font-size:11px;line-height:1.6}.reminder-card{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:16px 18px;border:1px solid #c9dced;border-radius:12px}.reminder-card>div{display:flex;align-items:center;gap:12px}.reminder-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center}.reminder-card b{font-size:12px}.reminder-card p{margin:4px 0 0;font-size:10px}.client-list{display:grid}.client-row{display:flex;align-items:center;gap:12px;padding:13px 2px;border-bottom:1px solid #dce7f1}.client-row:last-child{border:0}.client-info{flex:1;min-width:100px}.client-info b,.client-info span{display:block}.client-info b{font-size:12px}.client-info span{margin-top:5px;font-size:10px}.consent-pill{border-radius:99px;padding:6px 9px;font-size:9px;white-space:nowrap}.client-count{font-size:10px;white-space:nowrap}.search{display:flex;align-items:center;gap:8px;width:min(280px,100%);padding:0 12px;border:1px solid #dce7f1;border-radius:9px}.search input{min-width:0;width:100%;height:40px;border:0;outline:none;font-size:11px}.settings-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}.settings-card{padding:20px}.settings-card form{display:grid;gap:13px;padding-top:16px}.settings-card label,.dialog form>label{display:grid;gap:7px;font-size:11px;font-weight:600}.settings-card input,.settings-card textarea,.dialog input,.dialog select,.dialog textarea{width:100%;min-height:42px;padding:10px 11px;border:1px solid #dce7f1;border-radius:8px;outline:none;font-size:12px}.settings-card textarea,.dialog textarea{resize:vertical;line-height:1.5}.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.notice{margin:15px 0 0;padding:12px 15px;border:1px solid #c9dced;border-radius:9px;font-size:11px}.notice.warning{border-color:#f0d9b4}.scrim{position:fixed;inset:0;z-index:10;display:grid;place-items:center;padding:20px;overflow:auto}.dialog{position:relative;width:min(100%,510px);max-height:min(94dvh,900px);overflow:auto;padding:27px;border-radius:15px;box-shadow:0 24px 80px #0003}.dialog .close{position:absolute;right:19px;top:17px;width:33px;height:33px;border:1px solid #dce7f1;border-radius:50%;font-size:20px}.dialog h2{margin:0;font:400 28px Georgia,serif}.dialog .subtitle{margin:8px 0 20px}.dialog form{display:grid;gap:12px}.dialog .check{display:flex;align-items:center;gap:9px;padding:9px 0}.dialog .check input{width:17px;min-height:17px;accent-color:#3978b8}.dialog .check span{font-size:11px}.form-hint{margin:-6px 0 0;font-size:10px;line-height:1.5}.form-error{margin:0;color:#a34036;font-size:11px}.dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:6px}.picker-field{display:flex;align-items:center}@media(max-width:1050px){.main{padding:0 26px 60px}.sidebar{width:210px}.main{margin-left:210px}.appointment{grid-template-columns:48px minmax(120px,1fr)}.appointment-actions{grid-column:2;justify-content:flex-start}.client-row{flex-wrap:wrap}}@media(max-width:720px){.sidebar{inset:auto 0 0;width:auto;height:65px;padding:5px 8px;border-right:0;border-top:1px solid #dce7f1}.brand,.side-label,.sidebar-bottom{display:none}.sidebar nav{height:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:0}.sidebar nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:5px 2px;font-size:9px}.sidebar nav button img{width:20px;height:20px}.main{margin:0;padding:0 16px 86px}.topbar{height:58px;justify-content:space-between}.mobile-brand{display:flex;align-items:center;gap:8px;font:13px Georgia,serif}.mobile-brand .brand-mark{width:29px;height:29px;font-size:17px}.demo-label{margin-left:auto;margin-right:12px;font-size:7px}.mobile-logout{display:block;border:0;background:transparent;font-size:11px}.page-heading{padding:28px 0 20px;align-items:flex-start;flex-wrap:wrap}.page-heading h1{font-size:39px}.page-heading .subtitle{font-size:11px}.new-button{height:42px;padding:0 12px}.new-button span{font-size:10px}.stats{gap:7px}.stats article{padding:13px 10px;min-height:91px}.stats article span{font-size:7px;letter-spacing:.08em}.stats article strong{font-size:23px}.stats article small{font-size:8px}.agenda-card{padding:16px}.card-title h2{font-size:19px}.appointment-list{grid-template-columns:25px minmax(0,1fr)}.time-rail{font-size:8px}.appointment{grid-template-columns:42px minmax(0,1fr);gap:8px;padding:14px 0}.appointment-time{font-size:15px}.appointment h3{font-size:12px}.appointment-body p{font-size:9px}.appointment-actions{grid-column:1/-1;justify-content:flex-end;gap:2px}.appointment-actions button{font-size:9px;padding:5px}.date-chip{padding:6px 8px}.date-chip span{font-size:7px}.date-chip input{font-size:10px}.icon-button{width:34px;height:34px}.today-button{padding:9px 11px;font-size:10px}.reminder-card{align-items:flex-start;flex-direction:column}.search{width:100%}.client-row{gap:8px}.client-info{flex:1}.client-count{display:none}.client-row .consent-pill{font-size:8px}.text-button{font-size:9px}.settings-card{padding:16px}.dialog{padding:23px 18px}.dialog h2{font-size:24px}.dialog-actions .primary,.dialog-actions .secondary{padding:11px 12px;font-size:10px}.page-heading>.primary{margin-left:auto}.service-add{display:flex;gap:8px}.service-add input{flex:1;min-width:0}.service-row{display:flex;align-items:center;justify-content:space-between;padding:8px 11px}.workspace.dark .sidebar{border-color:#2a3e55}}
    .workspace{--accent:#3978b8;--accent-dark:#28639e;--accent-soft:#e8f2fc;--surface:#fff;--surface-muted:#f4f8fc;--line:#dce7f1;--text:#18304b;--muted:#627991;color:var(--text);background:#f7fbff}.brand em,.side-label,.eyebrow,.appointment-time{color:var(--accent)}.brand-mark,.primary{background:var(--accent);border-color:var(--accent)}.primary:hover{background:var(--accent-dark)}.sidebar,.stats article,.agenda-card,.secondary,.icon-button,.date-chip,.search,.dialog{background:var(--surface)}.sidebar,.topbar,.stats article,.agenda-card,.appointment,.card-title,.client-row{border-color:var(--line)}.sidebar nav button.active,.count-pill,.today-button,.client-avatar,.empty-art{background:var(--accent-soft);color:var(--accent-dark)}.sidebar nav button{color:var(--muted)}.sidebar nav button.active,.secondary,.appointment-actions button,.text-button{color:var(--accent-dark)}.subtitle,.stats article span,.stats article small,.appointment-body p,.client-info span,.empty p,.settings-card label,.dialog form>label{color:var(--muted)}.settings-card input,.settings-card textarea,.dialog input,.dialog select,.dialog textarea,.date-chip input{background:var(--surface);color:var(--text);border-color:var(--line)}.sidebar nav button img{width:20px;height:20px}.sidebar nav button{display:flex;align-items:center;gap:10px}.appointment-actions .whatsapp{color:#18875b}.appointment-actions .whatsapp:disabled{opacity:.4;cursor:not-allowed}.appointment-actions .whatsapp svg{width:16px;height:16px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.picker-field{display:flex;align-items:center}.picker-field input{flex:1;pointer-events:none}.picker-field button{height:42px;min-width:42px;border:1px solid var(--line);border-left:0;border-radius:0 8px 8px 0;background:var(--accent-soft);color:var(--accent);font-size:18px}.picker-field input{border-radius:8px 0 0 8px}.service-editor{display:grid;gap:6px}.service-row{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface-muted);font-size:12px}.service-add{display:flex;gap:8px}.service-add input{flex:1;min-width:0}.reminder-card{border-color:#c9dced;background:#eaf4fd;color:#254766}.reminder-icon{background:#d6e9f9;color:#3978b8}.consent-pill,.count-pill{background:#e8f2fc;color:#3978b8}.consent-pill.yes,.status.confirmed{background:#e8f4ed;color:#357553}.status.cancelled{background:#fff0ef;color:#a3524e}.status.completed{background:#e8eff8;color:#516d90}.notice{border-color:#c9dced;background:#eaf4fd;color:#28577e}.notice.warning{border-color:#f0d9b4;background:#fff7e9;color:#80623a}.scrim{background:#14243ac2}.dialog{color:#18304b}.workspace.dark{background:#101a28;color:#e5edf7;--surface:#172436;--surface-muted:#1e3046;--line:#2a3e55;--text:#e5edf7;--muted:#a5b6ca;--accent:#77b5f0;--accent-dark:#a8d1fa;--accent-soft:#243d58}.workspace.dark .sidebar,.workspace.dark .stats article,.workspace.dark .agenda-card,.workspace.dark .date-chip,.workspace.dark .search,.workspace.dark .secondary{background:var(--surface);color:var(--text);border-color:var(--line)}.workspace.dark .main,.workspace.dark .topbar{color:var(--text);border-color:var(--line)}.workspace.dark .primary{background:#3978b8;color:#fff}.workspace.dark .form-hint,.workspace.dark .muted{color:var(--muted)}.scrim.dark{background:#050b14d9}.scrim.dark .dialog{background:#172436;color:#e5edf7}.scrim.dark .dialog input,.scrim.dark .dialog select,.scrim.dark .dialog textarea,.scrim.dark .dialog .close{background:#1e3046;color:#e5edf7;border-color:#2a3e55}.workspace.dark .demo-label,.workspace.dark .logout,.workspace.dark .client-count{color:var(--muted)}.workspace.dark .status.confirmed,.workspace.dark .consent-pill.yes{background:#233b32;color:#9bd9b4}.workspace.dark .appointment-actions button{color:var(--accent-dark)}.workspace.dark .sidebar nav button img{filter:brightness(0) saturate(100%) invert(73%) sepia(21%) saturate(1200%) hue-rotate(177deg)}.workspace.dark .reminder-card,.workspace.dark .notice{background:#1d3045;border-color:#304b68;color:#c4dcf4}.workspace.dark .count-pill,.workspace.dark .consent-pill{background:var(--accent-soft);color:var(--accent-dark)}@media(max-width:720px){.sidebar nav{grid-template-columns:repeat(3,1fr)}.page-heading{flex-wrap:wrap}.page-heading .search{order:3;width:100%}.page-heading>.primary{margin-left:auto}.service-add .secondary{padding:9px}.appointment{grid-template-columns:42px minmax(0,1fr)}.appointment-actions{grid-column:1/-1;justify-content:flex-end}.workspace.dark .sidebar{background:var(--surface);border-color:var(--line)}}
    .theme-toggle{margin-left:16px;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--accent-dark);font-size:11px;font-weight:600}.theme-toggle:hover{background:var(--accent-soft)}@media(max-width:720px){.demo-label{display:none}.theme-toggle{margin-left:auto;margin-right:12px;padding:8px 10px;font-size:10px}}
    .scrim:not(.dark) .dialog{background:#fff;color:#18304b;border-color:#dce7f1}.scrim:not(.dark) .dialog input,.scrim:not(.dark) .dialog select,.scrim:not(.dark) .dialog textarea,.scrim:not(.dark) .dialog .close{background:#f4f8fc;color:#18304b;border-color:#dce7f1}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
    */
    :host {
      --page: #F5F5F7; --surface: #FFFFFF; --surface-muted: #F0F0F2;
      --ink: #1D1D1F; --muted: #6B6B70; --line: #E2E2E7;
      --accent: #7D3F4C; --accent-hover: #6E3440; --accent-soft: #F5ECEE; --accent-ink: #FFFFFF;
      display: block; min-height: 100dvh; color: var(--ink); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
    .workspace {
      --page: #F5F5F7; --surface: #FFFFFF; --surface-muted: #F0F0F2;
      --ink: #1D1D1F; --muted: #6B6B70; --line: #E2E2E7;
      --accent: #7D3F4C; --accent-hover: #6E3440; --accent-soft: #F5ECEE; --accent-ink: #FFFFFF;
      min-height: 100dvh; color: var(--ink); background: var(--page); color-scheme: light;
    }
    .workspace.dark {
      --page: #111113; --surface: #1C1C1E; --surface-muted: #242428;
      --ink: #F5F5F7; --muted: #A1A1A6; --line: #38383D;
      --accent: #D899A3; --accent-hover: #E5A8B0; --accent-soft: #38292D; --accent-ink: #1D1D1F;
      color-scheme: dark;
    }
    .sidebar { position: fixed; inset: 0 auto 0 0; z-index: 4; display: flex; flex-direction: column; width: 252px; padding: 24px 16px; background: var(--surface); border-right: 1px solid var(--line); }
    .brand { display: flex; align-items: center; gap: 11px; padding: 0 8px; color: var(--ink); text-decoration: none; font-size: 16px; font-weight: 650; letter-spacing: -.02em; }
    .brand em { color: var(--muted); font-style: normal; font-weight: 450; }
    .brand-mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: var(--accent); color: var(--accent-ink); font-size: 18px; font-weight: 650; }
    .side-label, .eyebrow { color: var(--muted); font-size: 10px; font-weight: 650; letter-spacing: .12em; }
    .side-label { margin: 42px 0 12px; padding: 0 12px; }
    .sidebar nav { display: grid; gap: 5px; }
    .sidebar nav button { display: flex; align-items: center; gap: 11px; width: 100%; padding: 11px 12px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); text-align: left; font-size: 13px; font-weight: 500; }
    .sidebar nav button img { width: 18px; height: 18px; opacity: .72; }
    .sidebar nav button:hover { background: var(--surface-muted); color: var(--ink); }
    .sidebar nav button.active { background: var(--accent-soft); color: var(--accent); font-weight: 650; }
    .sidebar nav button.active img { opacity: 1; }
    .sidebar-bottom { margin-top: auto; }
    .client-avatar { display: grid; flex: 0 0 auto; width: 36px; height: 36px; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 650; }
    .logout, .mobile-logout { border: 0; background: transparent; color: var(--muted); }
    .logout { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 13px 8px 0; font-size: 12px; }
    .logout img { width: 18px; height: 18px; }
    .inverted { filter: invert(1); }
    .logout:hover, .mobile-logout:hover { color: var(--ink); }
    .main { min-height: 100dvh; margin-left: 252px; padding: 0 clamp(24px, 4vw, 58px) 64px; }
    .topbar { display: flex; align-items: center; justify-content: flex-end; gap: 14px; height: 72px; border-bottom: 1px solid var(--line); }
    .demo-label { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 10px; font-weight: 600; letter-spacing: .1em; }
    .demo-label i { width: 7px; height: 7px; border-radius: 50%; background: #4F9A78; }
    .mobile-brand, .mobile-logout { display: none; }
    .theme-toggle { padding: 8px 12px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); color: var(--ink); font-size: 12px; font-weight: 550; }
    .theme-toggle:hover { background: var(--surface-muted); }
    .page-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 38px 0 24px; }
    .page-heading .eyebrow, .card-title .eyebrow { margin: 0 0 7px; }
    .page-heading h1 { margin: 0; font-size: clamp(28px, 3vw, 36px); font-weight: 650; letter-spacing: -.045em; line-height: 1.12; }
    .subtitle { margin: 8px 0 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
    .primary, .secondary, .today-button, .icon-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 0 14px; border: 1px solid transparent; border-radius: 9px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    .primary { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
    .primary:hover:not(:disabled) { border-color: var(--accent-hover); background: var(--accent-hover); }
    .secondary, .today-button { border-color: var(--line); background: var(--surface); color: var(--ink); }
    .secondary:hover:not(:disabled), .today-button:hover:not(:disabled) { background: var(--surface-muted); }
    .datebar { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
    .icon-button { width: 40px; min-width: 40px; padding: 0; border-color: var(--line); background: var(--surface); color: var(--ink); font-size: 16px; }
    .icon-button:hover { background: var(--surface-muted); }
    .date-arrow { width: 16px; height: 16px; }
    .date-chip { display: grid; gap: 2px; min-width: 180px; padding: 7px 11px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); }
    .date-chip span { color: var(--muted); font-size: 8px; font-weight: 650; letter-spacing: .1em; }
    .date-chip input { min-width: 0; border: 0; background: transparent; color: var(--ink); font-size: 12px; font-weight: 550; }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .stats article { display: grid; gap: 3px; padding: 17px 18px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); }
    .stats article span { color: var(--muted); font-size: 9px; font-weight: 650; letter-spacing: .08em; }
    .stats article strong { font-size: 25px; font-weight: 650; letter-spacing: -.04em; line-height: 1.2; }
    .stats article small { color: var(--muted); font-size: 11px; }
    .agenda-card, .reminder-card { border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
    .agenda-card { overflow: hidden; }
    .card-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 19px 21px; border-bottom: 1px solid var(--line); }
    .card-title h2 { margin: 0; font-size: 18px; font-weight: 620; letter-spacing: -.025em; }
    .count-pill, .consent-pill { display: inline-flex; align-items: center; min-height: 25px; padding: 0 9px; border-radius: 99px; background: var(--surface-muted); color: var(--muted); font-size: 10px; font-weight: 550; }
    .appointment-list { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; padding: 17px 20px 8px; }
    .time-rail { display: flex; flex-direction: column; justify-content: space-between; padding: 4px 0 18px; color: var(--muted); font-size: 10px; }
    .appointment-items { min-width: 0; }
    .appointment { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; align-items: start; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--line); }
    .appointment:last-child { border-bottom: 0; }
    .appointment-time { padding-top: 2px; color: var(--accent); font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums; }
    .appointment-body { min-width: 0; }
    .appointment-top { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .appointment-body h3 { margin: 0; font-size: 13px; font-weight: 620; }
    .appointment-body p { margin: 3px 0 0; color: var(--muted); font-size: 11px; overflow-wrap: anywhere; }
    .appointment-body p span { padding: 0 2px; }
    .appointment-body small { display: block; margin-top: 5px; color: var(--muted); font-size: 11px; }
    .status { display: inline-flex; align-items: center; min-height: 20px; padding: 0 7px; border-radius: 99px; background: #E9F4ED; color: #34734D; font-size: 9px; font-weight: 600; }
    .status.cancelled { background: #F7EDEE; color: #8A4650; }
    .status.completed { background: #EEF0F2; color: #5F6268; }
    .workspace.dark .status { background: #20372A; color: #9BD0AE; }
    .workspace.dark .status.cancelled { background: #3C272B; color: #E9AAB2; }
    .workspace.dark .status.completed { background: #303034; color: #C3C3C8; }
    .appointment.cancelled .appointment-body { opacity: .66; }
    .appointment-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 3px; }
    .appointment-actions button, .text-button { min-height: 30px; padding: 0 8px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 10px; font-weight: 550; }
    .appointment-actions button:hover:not(:disabled), .text-button:hover { background: var(--surface-muted); color: var(--ink); }
    .appointment-actions .edit-appointment, .appointment-actions .delete-appointment { display: grid; width: 32px; height: 30px; place-items: center; padding: 0; }
    .appointment-actions .edit-appointment img, .appointment-actions .delete-appointment img { width: 17px; height: 17px; }
    .appointment-actions .whatsapp { color: #347A57; }
    .appointment-actions .whatsapp:disabled { opacity: .45; cursor: not-allowed; }
    .appointment-actions .whatsapp svg { width: 15px; height: 15px; margin-right: 3px; vertical-align: -3px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .appointment-actions .delete, .text-button.danger { color: #A64A55; }
    .empty { display: grid; justify-items: center; padding: 42px 20px 46px; text-align: center; }
    .empty-art { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 13px; background: var(--accent-soft); color: var(--accent); font-size: 19px; }
    .empty h3 { margin: 13px 0 0; font-size: 15px; font-weight: 620; }
    .empty p { max-width: 360px; margin: 6px 0 16px; color: var(--muted); font-size: 12px; }
    .reminder-card { margin-top: 14px; padding: 14px 17px; }
    .reminder-card > div { display: flex; align-items: center; gap: 12px; }
    .reminder-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: var(--accent-soft); color: var(--accent); font-size: 18px; }
    .reminder-card b { font-size: 12px; font-weight: 620; }
    .reminder-card p { margin: 2px 0 0; color: var(--muted); font-size: 11px; }
    .search { display: flex; align-items: center; gap: 8px; min-width: min(260px, 100%); padding: 0 11px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); color: var(--muted); }
    .search span { font-size: 18px; }
    .search input { width: 100%; min-width: 0; height: 40px; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 12px; }
    .client-actions { display: flex; align-items: center; gap: 10px; }
    .client-actions .primary img { width: 16px; height: 16px; filter: invert(1); }
    .employee-row { display:grid; grid-template-columns:36px minmax(0,1fr) auto auto; align-items:center; gap:11px; min-height:66px; padding:8px 0; border-bottom:1px solid var(--line); }
    .employee-row:last-child { border-bottom:0; }
    .client-list { padding:0 18px; }
    .client-row { display:grid; grid-template-columns: 36px minmax(140px, 1fr) auto 54px auto auto auto; align-items: center; gap: 11px; min-height: 66px; border-bottom: 1px solid var(--line); }
    .client-row:last-child { border-bottom: 0; }
    .client-info { min-width: 0; }
    .client-info b, .client-info span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .client-info b { font-size: 12px; font-weight: 600; }
    .client-info span { margin-top: 3px; color: var(--muted); font-size: 10px; }
    .consent-pill.yes { background: #E9F4ED; color: #34734D; }
    .workspace.dark .consent-pill.yes { background: #20372A; color: #9BD0AE; }
    .client-count { color: var(--muted); font-size: 10px; white-space: nowrap; }
    .settings-grid { display: grid; grid-template-columns: minmax(0, 680px); }
    .settings-card { padding-bottom: 22px; }
    .settings-card form { display: grid; gap: 14px; padding: 20px 22px; }
    .settings-card label, .dialog form > label { display: grid; gap: 6px; color: var(--ink); font-size: 11px; font-weight: 550; }
    .settings-card input, .settings-card textarea, .dialog input, .dialog select, .dialog textarea { width: 100%; min-height: 42px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 12px; }
    .settings-card textarea, .dialog textarea { min-height: 86px; resize: vertical; }
    input::placeholder, textarea::placeholder { color: var(--muted); opacity: .8; }
    .settings-card .muted { color: var(--muted); font-size: 10px; }
    .service-editor { display: grid; gap: 6px; }
    .service-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 11px; border: 1px solid var(--line); border-radius: 8px; font-size: 12px; }
    .service-add { display: flex; gap: 8px; }
    .service-add input { flex: 1; min-width: 0; }
    .toast { position: fixed; z-index: 20; top: 18px; right: 20px; display: flex; align-items: center; gap: 18px; max-width: min(440px, calc(100vw - 32px)); padding: 12px 14px 12px 17px; border: 1px solid #C9E2D1; border-radius: 10px; background: #F0F7F2; color: #315D3F; box-shadow: 0 8px 30px #0002; font-size: 13px; }
    .toast button { display: grid; width: 28px; height: 28px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 20px; line-height: 1; }
    .toast button:hover { background: #0001; }
    .workspace.dark .toast { border-color: #294535; background: #1C2D22; color: #B5D4BD; }
    .notice.warning { border-color: #EAD9B8; background: #FBF6EA; color: #705825; }
    .workspace.dark .notice.warning { border-color: #4A3E24; background: #302918; color: #E1CE9A; }
    .scrim { position: fixed; inset: 0; z-index: 10; display: grid; place-items: center; padding: 20px; background: rgb(17 17 19 / 48%); }
    .scrim.dark { --surface: #1C1C1E; --surface-muted: #242428; --ink: #F5F5F7; --muted: #A1A1A6; --line: #38383D; --accent: #D899A3; --accent-hover: #E5A8B0; --accent-soft: #38292D; --accent-ink: #1D1D1F; color-scheme: dark; background: rgb(0 0 0 / 64%); }
    .dialog { position: relative; width: min(560px, 100%); max-height: min(88dvh, 820px); overflow: auto; padding: 27px; border: 1px solid var(--line); border-radius: 17px; background: var(--surface); color: var(--ink); box-shadow: 0 18px 54px rgb(0 0 0 / 16%); }
    .scrim.dark .dialog { box-shadow: 0 18px 54px rgb(0 0 0 / 42%); }
    .dialog > .eyebrow { margin: 0 0 7px; color: var(--accent); }
    .dialog h2 { margin: 0; font-size: 23px; font-weight: 650; letter-spacing: -.035em; }
    .dialog > .subtitle { margin: 6px 0 21px; }
    .dialog .close { position: absolute; top: 17px; right: 17px; display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); color: var(--muted); font-size: 20px; line-height: 1; }
    .dialog .close:hover { background: var(--surface-muted); color: var(--ink); }
    .dialog form { display: grid; gap: 13px; }
    .two-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .picker-field { display: flex; min-width: 0; }
    .picker-field input { flex: 1; min-width: 0; border-radius: 8px 0 0 8px; pointer-events: none; }
    .picker-field button { width: 43px; flex: 0 0 43px; border: 1px solid var(--line); border-left: 0; border-radius: 0 8px 8px 0; background: var(--surface-muted); color: var(--ink); font-size: 17px; }
    .check { display: flex !important; align-items: flex-start; gap: 9px !important; color: var(--muted) !important; font-size: 11px !important; line-height: 1.5; }
    .check input { width: 16px !important; min-height: 16px !important; margin: 1px 0 0; accent-color: var(--accent); }
    .form-error { margin: 0; color: #A33F4B; font-size: 11px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 6px; }
    @media (max-width: 1050px) {
      .sidebar { width: 220px; }
      .main { margin-left: 220px; padding-right: 28px; padding-left: 28px; }
      .appointment { grid-template-columns: 46px minmax(0, 1fr); }
      .appointment-actions { grid-column: 2; justify-content: flex-start; }
      .client-row { grid-template-columns: 36px minmax(120px, 1fr) auto auto; }
      .client-row .text-button { padding-inline: 5px; }
    }
    @media (max-width: 720px) {
      .sidebar { position: fixed; inset: auto 0 0; width: 100%; padding: 7px 10px max(7px, env(safe-area-inset-bottom)); border: 0; border-top: 1px solid var(--line); }
      .sidebar .brand, .side-label, .sidebar-bottom { display: none; }
      .sidebar nav { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
      .sidebar nav button { flex-direction: column; justify-content: center; gap: 3px; min-height: 52px; padding: 5px 3px; font-size: 10px; }
      .sidebar nav button img { width: 17px; height: 17px; }
      .main { margin: 0; padding: 0 18px 102px; }
      .topbar { justify-content: space-between; height: 62px; }
      .mobile-brand { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 620; }
      .mobile-brand .brand-mark { width: 30px; height: 30px; border-radius: 9px; font-size: 15px; }
      .mobile-logout { display: inline-flex; padding: 8px 0; font-size: 11px; }
      .demo-label { display: none; }
      .theme-toggle { margin-left: auto; padding: 7px 9px; font-size: 10px; }
      .page-heading { align-items: flex-start; flex-wrap: wrap; gap: 14px; padding: 27px 0 18px; }
      .page-heading h1 { font-size: 29px; }
      .page-heading .primary { margin-left: auto; }
      .page-heading .search { order: 3; width: 100%; }
      .client-actions { width: 100%; }
      .client-actions .search { flex: 1; min-width: 0; width: auto; }
      .client-actions .primary { margin-left: 0; padding-inline: 11px; }
      .stats { gap: 8px; }
      .stats article { padding: 12px 10px; }
      .stats article span { font-size: 8px; }
      .stats article strong { font-size: 21px; }
      .stats article small { font-size: 9px; line-height: 1.3; }
      .card-title { padding: 16px; }
      .appointment-list { grid-template-columns: 24px minmax(0, 1fr); gap: 8px; padding: 12px 13px 6px; }
      .appointment { grid-template-columns: 42px minmax(0, 1fr); gap: 9px; }
      .appointment-actions { grid-column: 1 / -1; justify-content: flex-start; padding-left: 50px; }
      .client-list { padding: 0 13px; }
      .client-row { grid-template-columns: 34px minmax(0, 1fr) auto; gap: 8px; padding: 10px 0; }
      .client-row .consent-pill { grid-column: 2; justify-self: start; }
      .client-count { display: none; }
      .client-row .text-button { min-height: 28px; padding: 0 6px; font-size: 9px; }
      .settings-card form { padding: 16px; }
      .dialog { padding: 24px 19px; }
      .dialog h2 { padding-right: 30px; font-size: 21px; }
      .dialog-actions .primary, .dialog-actions .secondary { flex: 1; padding-inline: 8px; }
    }
    @media (max-width: 420px) {
      .main { padding-right: 13px; padding-left: 13px; }
      .page-heading .primary { min-height: 38px; padding-inline: 11px; font-size: 10px; }
      .stats { gap: 6px; }
      .stats article { padding: 10px 8px; }
      .stats article span { letter-spacing: .02em; }
      .two-fields { gap: 8px; }
      .dialog { padding-inline: 16px; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly copy = it;
  private readonly repo = inject(SupabaseAgendaRepository);
  private readonly auth = inject(AuthService);
  protected readonly view = signal<View>('agenda');
  protected readonly darkMode = signal(localStorage.getItem('sissy-agenda-theme') === 'dark');
  protected newService = '';
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly clients = signal<Client[]>([]);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly activeEmployees = computed(() => this.employees().filter((employee) => employee.isActive !== false));
  protected readonly legacyEmployeeAssignmentValue = LEGACY_EMPLOYEE_ASSIGNMENT;
  protected readonly settings = signal<SalonSettings>({ salonName: 'Il tuo salone', defaultCountryCode: '+39', services: [], businessHours: { open: '', close: '', closedDays: [] }, messageTemplates: { confirmation: 'Ciao {nome}, il tuo appuntamento è fissato per {data} alle {ora}. A presto! — {salone}', reminder: 'Buongiorno {nome}, le ricordo il suo appuntamento il {data} alle {ora}. A presto! — {salone}' }, demoDataEnabled: false });
  protected settingsDraft: SalonSettings = structuredClone(this.settings());
  protected readonly formOpen = signal(false);
  protected readonly clientFormOpen = signal(false);
  protected readonly employeeFormOpen = signal(false);
  protected readonly employeeFormError = signal('');
  protected readonly employeeDraft = { firstName: '', lastName: '' };
  protected readonly editingEmployee = signal<Employee | null>(null);
  protected readonly clientFormError = signal('');
  protected readonly clientDraft = { firstName: '', lastName: '', phone: '', notes: '', whatsappConsent: false };
  protected readonly editingClient = signal<Client | null>(null);
  protected readonly formError = signal('');
  protected readonly notice = signal('');
  private noticeTimeout: ReturnType<typeof setTimeout> | undefined;
  protected readonly storageWarning = signal(false);
  protected readonly editingId = signal('');
  protected readonly selectedDate = signal(this.localDate());
  protected readonly today = this.localDate();
  protected readonly clientSearch = signal('');
  protected readonly draft = this.emptyDraft();
  protected readonly todayAppointments = computed(() => this.appointments().filter((item) => item.date === this.selectedDate()).sort((a,b) => a.time.localeCompare(b.time)));
  protected readonly confirmedAppointments = computed(() => this.appointments().filter((item) => item.status === 'confirmed').sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
  protected readonly confirmedCount = computed(() => this.todayAppointments().filter((item) => item.status === 'confirmed').length);
  protected readonly dueReminders = computed(() => getDueReminders(this.appointments(), this.selectedDate()));
  protected readonly consentingClients = computed(() => this.clients().filter((item) => item.whatsappConsent));
  protected readonly directoryClients = computed(() => this.clients().filter((client) => client.inContacts !== false));
  protected readonly filteredClients = computed(() => { const q = this.clientSearch().trim().toLocaleLowerCase('it'); return this.directoryClients().filter((c) => `${c.name} ${c.phone}`.toLocaleLowerCase('it').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'it')); });

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    try {
      const [appointments, clients, employees, settings] = await Promise.all([this.repo.listAppointments(), this.repo.listClients(), this.repo.listEmployees(), this.repo.loadSettings()]);
      this.appointments.set(appointments); this.clients.set(clients); this.employees.set(employees); this.settings.set(settings); this.settingsDraft = structuredClone(settings);
    } catch { this.showNotice(this.copy.ui.genericError); }
    this.storageWarning.set(this.repo.hasStorageWarning());
  }

  protected showNotice(message: string): void {
    if (this.noticeTimeout) clearTimeout(this.noticeTimeout);
    this.notice.set(message);
    this.noticeTimeout = setTimeout(() => {
      this.notice.set('');
      this.noticeTimeout = undefined;
    }, 3000);
  }
  protected dismissNotice(): void {
    if (this.noticeTimeout) clearTimeout(this.noticeTimeout);
    this.noticeTimeout = undefined;
    this.notice.set('');
  }

  protected openForm(): void { this.editingId.set(''); Object.assign(this.draft, this.emptyDraft()); this.draft.date = this.selectedDate(); this.formError.set(''); this.formOpen.set(true); }
  protected addEmployee(): void { this.editingEmployee.set(null); this.employeeDraft.firstName = ''; this.employeeDraft.lastName = ''; this.employeeFormError.set(''); this.employeeFormOpen.set(true); }
  protected editEmployee(employee: Employee): void { this.editingEmployee.set(employee); this.employeeDraft.firstName = employee.firstName; this.employeeDraft.lastName = employee.lastName; this.employeeFormError.set(''); this.employeeFormOpen.set(true); }
  protected closeEmployeeForm(): void { this.employeeFormOpen.set(false); this.employeeFormError.set(''); }
  protected async saveEmployee(): Promise<void> {
    const firstName = this.employeeDraft.firstName.trim();
    const lastName = this.employeeDraft.lastName.trim();
    if (!firstName || !lastName) { this.employeeFormError.set('Inserisci nome e cognome.'); return; }
    const original = this.editingEmployee();
    try {
      await this.repo.saveEmployee({ ...(original ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() }), firstName, lastName });
      await this.load();
      this.showNotice(original ? 'Dati dipendente aggiornati.' : 'Dipendente aggiunto.');
      this.closeEmployeeForm();
    } catch { this.employeeFormError.set(this.copy.ui.genericError); }
  }
  protected async removeEmployee(employee: Employee): Promise<void> {
    if (!globalThis.confirm(`Eliminare ${employee.firstName} ${employee.lastName}? Gli appuntamenti storici resteranno.`)) return;
    try { await this.repo.deleteEmployee(employee.id); await this.load(); this.showNotice('Dipendente eliminato.'); }
    catch { this.showNotice(this.copy.ui.genericError); }
  }
  protected archivedEmployee(): Employee | null {
    const employeeId = this.draft.employeeId;
    if (!employeeId) return null;
    const employee = this.employees().find((item) => item.id === employeeId);
    return employee?.isActive === false ? employee : null;
  }
  protected archivedEmployeeName(): string {
    const employee = this.archivedEmployee();
    if (!employee) return '';
    const prior = this.appointments().find((item) => item.id === this.editingId());
    return prior?.employeeId === employee.id && prior.employeeName
      ? prior.employeeName
      : `${employee.firstName} ${employee.lastName}`;
  }
  protected legacyEmployeeName(): string | null {
    if (this.draft.employeeId !== LEGACY_EMPLOYEE_ASSIGNMENT) return null;
    const prior = this.appointments().find((item) => item.id === this.editingId());
    if (!prior || prior.employeeId != null || !prior.employeeName || prior.employeeName === 'Admin') return null;
    return prior.employeeName;
  }
  protected addClient(): void { this.editingClient.set(null); Object.assign(this.clientDraft, { firstName: '', lastName: '', phone: '', notes: '', whatsappConsent: false }); this.clientFormError.set(''); this.clientFormOpen.set(true); }
  protected selectAppointmentClient(id: string): void { const client = this.clients().find((item) => item.id === id); this.draft.clientId = client?.id; this.draft.addToContacts = client ? client.inContacts !== false : false; if (client) { const parts = client.name.trim().split(/\s+/); this.draft.firstName = client.firstName || parts.shift() || ''; this.draft.lastName = client.lastName || parts.join(' '); this.draft.clientName = client.name; this.draft.phone = client.phone; this.draft.reminderConsent = client.whatsappConsent; } else { this.draft.firstName = ''; this.draft.lastName = ''; this.draft.clientName = ''; this.draft.phone = ''; this.draft.reminderConsent = false; } }
  protected showPicker(input: HTMLInputElement): void { try { input.showPicker(); } catch { input.click(); } }
  protected toggleTheme(): void { this.darkMode.update((dark) => !dark); localStorage.setItem('sissy-agenda-theme', this.darkMode() ? 'dark' : 'light'); }
  protected closeForm(): void { this.formOpen.set(false); this.formError.set(''); }
  protected edit(item: Appointment): void { this.editingId.set(item.id); const parts = item.clientName.trim().split(/\s+/); const linkedClient = this.clients().find((client) => client.id === item.clientId); Object.assign(this.draft, this.emptyDraft(), {clientId:item.clientId,clientName:item.clientName,firstName:parts.shift()||'',lastName:parts.join(' '),phone:item.phone,date:item.date,time:item.time,service:item.service,notes:item.notes,reminderConsent:item.reminderConsent,addToContacts:linkedClient?.inContacts !== false,employeeId:item.employeeId??(item.employeeName&&item.employeeName!=='Admin'?LEGACY_EMPLOYEE_ASSIGNMENT:null)}); this.formError.set(''); this.formOpen.set(true); }
  protected startAppointment(client: Client): void { this.openForm(); this.selectAppointmentClient(client.id); this.view.set('agenda'); }
  protected editClient(client: Client): void {
    const parts = client.name.trim().split(/\s+/);
    this.editingClient.set(client);
    this.clientDraft.firstName = client.firstName || parts.shift() || '';
    this.clientDraft.lastName = client.lastName || parts.join(' ');
    this.clientDraft.phone = client.phone;
    this.clientDraft.notes = client.notes;
    this.clientDraft.whatsappConsent = client.whatsappConsent;
    this.clientFormError.set('');
    this.clientFormOpen.set(true);
  }
  protected closeClientForm(): void { this.clientFormOpen.set(false); this.clientFormError.set(''); }
  protected async saveClient(): Promise<void> {
    const original = this.editingClient();
    const phone = normalizePhoneNumber(this.clientDraft.phone, '+39');
    if (!this.clientDraft.firstName.trim() || !this.clientDraft.lastName.trim()) {
      this.clientFormError.set('Inserisci nome e cognome.');
      return;
    }
    if (!phone.e164) {
      this.clientFormError.set(phone.error ?? this.copy.form.invalidPhone);
      return;
    }
    try {
      const firstName = this.clientDraft.firstName.trim();
      const lastName = this.clientDraft.lastName.trim();
      const client: Client = { ...(original ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() }), firstName, lastName, name: `${firstName} ${lastName}`, phone: phone.e164, notes: this.clientDraft.notes.trim(), whatsappConsent: this.clientDraft.whatsappConsent, inContacts: true };
      await this.repo.saveClient(client);
      await this.load();
      this.showNotice(original ? 'Dati cliente aggiornati.' : 'Cliente aggiunta alla rubrica.');
      this.closeClientForm();
    } catch {
      this.showNotice(this.copy.ui.genericError);
    }
  }
  protected async saveAppointment(): Promise<void> {
    this.formError.set('');
    const phone = normalizePhoneNumber(this.draft.phone, '+39');
    if (!phone.e164) { this.formError.set(phone.error ?? this.copy.form.invalidPhone); return; }
    const clientName = `${this.draft.firstName.trim()} ${this.draft.lastName.trim()}`.trim();
    if (!this.draft.firstName.trim() || !this.draft.lastName.trim() || !this.draft.date || !this.draft.time) { this.formError.set(this.copy.form.required); return; }
    const existing = this.appointments();
    const prior = this.editingId() ? existing.find((item)=>item.id===this.editingId()) : undefined;
    const employee = this.employees().find((item) => item.id === this.draft.employeeId);
    const legacyEmployeeName = this.legacyEmployeeName();
    const requestedEmployeeId = this.draft.employeeId === LEGACY_EMPLOYEE_ASSIGNMENT ? null : this.draft.employeeId ?? null;
    const requestedEmployeeName = legacyEmployeeName ?? (employee ? `${employee.firstName} ${employee.lastName}` : 'Admin');
    if (findAppointmentConflict(existing,{date:this.draft.date,time:this.draft.time,employeeId:requestedEmployeeId,employeeName:requestedEmployeeName,excludeId:this.editingId()||undefined})) { this.formError.set(this.copy.form.conflict); return; }
    const matchedClient=this.clients().find((item)=>item.id===this.draft.clientId)||this.clients().find((item)=>item.phone===phone.e164);
    const client: Client = { id:this.draft.clientId||prior?.clientId||matchedClient?.id||crypto.randomUUID(), firstName:this.draft.firstName.trim(), lastName:this.draft.lastName.trim(), name:clientName, phone:phone.e164, whatsappConsent:matchedClient?.whatsappConsent ?? this.draft.reminderConsent, notes:matchedClient?.notes||'', createdAt:matchedClient?.createdAt||prior?.createdAt||new Date().toISOString(), inContacts:matchedClient?.inContacts !== false || this.draft.addToContacts };
    const employeeName = legacyEmployeeName ?? (employee
      ? employee.isActive === false && prior?.employeeId === employee.id
        ? prior.employeeName || `${employee.firstName} ${employee.lastName}`
        : `${employee.firstName} ${employee.lastName}`
      : 'Admin');
    const appointment: Appointment = { id:this.editingId()||crypto.randomUUID(),clientId:client.id,clientName,phone:client.phone,date:this.draft.date,time:this.draft.time,service:this.draft.service.trim(),notes:this.draft.notes.trim(),status:prior?.status||'confirmed',reminderConsent:this.draft.reminderConsent,createdAt:prior?.createdAt||new Date().toISOString(),employeeId:employee?.id??null,employeeName };
    try { await this.repo.saveClient(client); await this.repo.saveAppointment(appointment); await this.load(); this.selectedDate.set(appointment.date); this.showNotice(this.copy.form.saveSuccess); this.closeForm(); }
    catch { this.showNotice(this.copy.ui.genericError); }
  }
  protected async changeStatus(item: Appointment, status: Appointment['status']): Promise<void> { try { await this.repo.saveAppointment({...item,status}); await this.load(); } catch { this.showNotice(this.copy.ui.genericError); } }
  protected async removeAppointment(item: Appointment): Promise<void> { if (!globalThis.confirm(this.copy.common.confirmDelete)) return; try { await this.repo.deleteAppointment(item.id); await this.load(); } catch { this.showNotice(this.copy.ui.genericError); } }
  protected async removeClient(client: Client): Promise<void> { if (!globalThis.confirm(`Eliminare ${client.name} dalla rubrica? Gli appuntamenti restano nell’agenda.`)) return; try { await this.repo.deleteClient(client.id); await this.load(); } catch { this.showNotice(this.copy.ui.genericError); } }
  protected setServices(value: string): void { this.settingsDraft.services = value.split('\\n').map((item) => item.trim()).filter(Boolean); }
  protected addService(): void { const value = this.newService.trim(); if (value && !this.settingsDraft.services.some((item) => item.toLocaleLowerCase('it') === value.toLocaleLowerCase('it'))) this.settingsDraft.services = [...this.settingsDraft.services, value]; this.newService = ''; }
  protected removeService(index: number): void { this.settingsDraft.services = this.settingsDraft.services.filter((_item, itemIndex) => itemIndex !== index); }
  protected async saveSettings(): Promise<void> {    try { this.settingsDraft.defaultCountryCode = '+39'; await this.repo.saveSettings(this.settingsDraft); this.settings.set(structuredClone(this.settingsDraft)); this.showNotice(this.copy.settings.saveSuccess); } catch { this.showNotice(this.copy.ui.genericError); } }
  protected async seedDemo(): Promise<void> { const ok=await this.repo.seedDemoData(); if(!ok){this.showNotice('Per caricare i dati demo, prima esporta o rimuovi gli appuntamenti e clienti già presenti.');return;} this.settingsDraft.demoDataEnabled=true; await this.repo.saveSettings(this.settingsDraft); await this.load(); this.showNotice(this.copy.ui.demoLoaded); }
  protected async removeDemo(): Promise<void> { await this.repo.removeDemoData(); await this.load(); this.showNotice(this.copy.ui.demoRemoved); }

  protected async importBackup(event: Event): Promise<void> { const file=(event.target as HTMLInputElement).files?.[0]; if(!file)return; try { const text=await file.text(); const ok=await this.repo.importBackup(text); if(!ok){this.showNotice(this.copy.settings.importError);return;} await this.load();this.showNotice(this.copy.settings.importSuccess); } catch { this.showNotice(this.copy.settings.importError); } finally {(event.target as HTMLInputElement).value='';} }
  protected async seedDemoNoop(): Promise<void> { await this.repo.seedDemoData(); }
  protected preview(item: Appointment, kind:'confirmation'|'reminder'): string { return renderMessageTemplate(this.settings().messageTemplates[kind],{nome:item.clientName.trim().split(/\s+/)[0]||item.clientName,data:this.displayDate(item.date),ora:item.time,servizio:item.service||'il tuo appuntamento',salone:this.settings().salonName}); }
  protected clientConsent(id:string):boolean { return this.clients().find((item)=>item.id===id)?.whatsappConsent===true; }
  protected openWhatsApp(item:Appointment,kind:'confirmation'|'reminder'): void { if(!this.clientConsent(item.clientId)){this.showNotice(this.copy.messages.consentRequired);return;} const number=item.phone.replace(/\D/g,'');const href=`https://wa.me/${number}?text=${encodeURIComponent(this.preview(item,kind))}`;window.open(href,'_blank','noopener,noreferrer'); }
  protected shiftDate(delta:number):void { const [y,m,d]=this.selectedDate().split('-').map(Number);const date=new Date(y,m-1,d);date.setDate(date.getDate()+delta);this.selectedDate.set(this.localDate(date)); }
  protected displayDate(value:string):string { const [y,m,d]=value.split('-').map(Number);return new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d)); }
  protected statusLabel(status:Appointment['status']):string { return ({confirmed:'Confermato',cancelled:'Annullato',completed:'Completato'} as const)[status]; }
  protected clientAppointments(id:string):number { return this.appointments().filter((item)=>item.clientId===id).length; }
  protected initials(value:string):string { return value.trim().split(/\s+/).slice(0,2).map((p)=>p[0]?.toLocaleUpperCase('it')).join(''); }
  protected async logout():Promise<void> { await this.auth.logout(); window.location.assign('/login'); }
  private emptyDraft(): {clientId?:string;clientName:string;firstName:string;lastName:string;phone:string;date:string;time:string;service:string;notes:string;reminderConsent:boolean;addToContacts:boolean;employeeId:string|null} { return {clientName:'',firstName:'',lastName:'',phone:'',date:this.localDate(),time:'',service:'',notes:'',reminderConsent:false,addToContacts:false,employeeId:null}; }
  private localDate(date=new Date()):string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
}
