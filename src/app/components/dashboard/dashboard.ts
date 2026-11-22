import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkHoursEditor } from '../work-hours-editor/work-hours-editor';
import { DEFAULT_WORK_SLOTS, freeTimesForPerson, type DailyWorkSchedule } from '../../library/work-schedule';
import { it } from '../../../bundle/it';
import { AuthService } from '../../api/auth.service';
import { SupabaseAgendaRepository } from '../../api/supabase-agenda-repository';
import type { Appointment, Client, Employee, SalonSettings } from '../../library/models';
import { findAppointmentConflict, normalizePhoneNumber, phoneForDisplay, renderMessageTemplate } from '../../library/domain-utils';
import { initialDarkMode, saveThemePreference, syncThemeColor } from '../../library/theme';

const LEGACY_EMPLOYEE_ASSIGNMENT = '__legacy_employee_assignment__';

 type View = 'agenda' | 'clients' | 'employees' | 'settings';
type AgendaColumn = { id: string; name: string; appointments: Appointment[]; bookable: boolean; freeTimes: string[] };
type ShiftEditor = { name: string; schedule: DailyWorkSchedule };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, WorkHoursEditor],
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
        <header class="topbar"><div class="mobile-brand"><span class="brand-mark">S</span> Agenda Sissy</div><button class="theme-toggle" type="button" (click)="toggleTheme()">{{ darkMode() ? '☀ Modalità chiara' : '☾ Modalità scura' }}</button><button class="mobile-logout" (click)="logout()">Esci</button></header>
        @if (storageWarning()) { <div class="notice warning" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="alert">{{ copy.common.localStorageError }} Puoi continuare a usare questa schermata, ma i dati potrebbero non essere salvati.</div> }
        @if (notice()) { <div class="toast" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="status" aria-live="polite"><span>{{ notice() }}</span><button type="button" aria-label="Chiudi notifica" (click)="dismissNotice()">×</button></div> }
        @if (view()==='agenda') {
          <section class="page-heading" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><div><h1>{{ copy.agenda.title }}</h1></div><button class="primary new-button" (click)="openForm()">＋ <span>{{ copy.common.newAppointment }}</span></button></section>
          <section class="datebar" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><button class="icon-button previous-day" (click)="shiftDate(-1)" aria-label="Giorno precedente"><img class="date-arrow" [class.inverted]="darkMode()" src="/assets/arrow_right.svg" alt="" aria-hidden="true" /></button><label class="date-chip"><span>GIORNO SELEZIONATO</span><input type="date" [ngModel]="selectedDate()" (ngModelChange)="selectDay($event)" /></label><button class="icon-button next-day" (click)="shiftDate(1)" aria-label="Giorno successivo"><img class="date-arrow" [class.inverted]="darkMode()" src="/assets/arrow_left.svg" alt="" aria-hidden="true" /></button><button class="today-button" (click)="selectDay(today)">Oggi</button></section>
          <section class="agenda-card" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><div class="card-title"><div><p class="eyebrow">{{ selectedDate() === today ? 'OGGI' : 'AGENDA DEL GIORNO' }}</p><h2>{{ displayDate(selectedDate()) }}</h2></div><span class="count-pill">{{ todayAppointments().length }} {{ copy.ui.appointmentCount }}</span></div>
            <div class="agenda-view-controls">
              <button type="button" class="secondary agenda-view-toggle" [attr.aria-pressed]="singleAgendaView()" (click)="toggleSingleAgendaView()">{{ copy.agenda.singleView }}</button>
              @if (singleAgendaView()) {
                <label class="agenda-single-selector"><span>{{ copy.agenda.personFilter }}</span><select [ngModel]="selectedAgendaColumn()?.id ?? ''" (ngModelChange)="selectAgendaColumn($event)">@for (column of agendaColumns(); track column.id) { <option [value]="column.id">{{ column.name }}</option> }</select></label>
              }
              @if (agendaColumns().length > 2 && !singleAgendaView()) { <span class="agenda-scroll-hint" aria-hidden="true">{{ copy.agenda.scrollHint }}</span> }
            </div>
            @if (shiftState() === 'missing') {
              <p class="muted" role="status">I turni per persona non sono ancora attivi. Puoi continuare a prenotare dall’agenda.</p>
            } @else if (shiftState() === 'error') {
              <p role="alert">Disponibilità non caricata. <button class="text-button" (click)="refreshHours()">Riprova</button></p>
            } @else if (shiftState() === 'loading') { <p class="muted" role="status">Caricamento dei turni…</p> }
            <div class="appointment-list" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="region" tabindex="0" [attr.aria-label]="singleAgendaView() ? copy.agenda.singleAgendaLabel + ' ' + (selectedAgendaColumn()?.name ?? copy.agenda.personFilter) : copy.agenda.allAgendasLabel" [class.single-employee-view]="singleAgendaView() || visibleAgendaColumns().length === 1" [style.--agenda-column-count]="visibleAgendaColumns().length">
              @for (column of visibleAgendaColumns(); track column.id) {
                <section class="employee-agenda-column" role="group" [attr.aria-label]="'Agenda di '+column.name">
                  <header class="employee-agenda-heading"><h3>{{ column.name }}</h3><span class="employee-agenda-count">{{ column.appointments.length }} {{ column.appointments.length === 1 ? 'appuntamento' : 'appuntamenti' }}</span></header>
                  @if (column.appointments.length) {
                    <div class="employee-appointments">
                      @for (item of column.appointments; track item.id) {
                        <article class="appointment" animate.enter="ui-fade-in" animate.leave="ui-fade-out" [class.cancelled]="item.status==='cancelled'">
                          <div class="appointment-summary">
                            <div class="appointment-time">{{ item.time }}</div>
                            <div class="appointment-top"><h4>{{ item.clientName }}</h4>@if(item.status!=='confirmed'){<span class="status" [class]="'status '+item.status">{{ statusLabel(item.status) }}</span>}</div>
                            <button type="button" class="appointment-toggle" [attr.aria-expanded]="!collapsedAppointments().has(item.id)" [attr.aria-controls]="'appointment-details-'+item.id" [attr.aria-label]="(collapsedAppointments().has(item.id) ? 'Mostra dettagli' : 'Riduci') + ' appuntamento di ' + item.clientName + ' alle ' + item.time" (click)="toggleAppointment(item.id)"><svg class="material-icon appointment-chevron" data-icon="arrow-upward" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z"/></svg></button>
                          </div>
                          <div class="appointment-details" [id]="'appointment-details-'+item.id" [hidden]="collapsedAppointments().has(item.id)">
                            <div class="appointment-body"><p>{{ item.service || 'Servizio non indicato' }} <span>·</span> {{ phoneForDisplay(item.phone) }}</p>@if(item.notes){<small>{{ item.notes }}</small>}</div>
                            <div class="appointment-actions"><button class="whatsapp" [disabled]="!item.reminderConsent" (click)="openWhatsApp(item,'reminder')" [attr.aria-label]="item.reminderConsent ? 'Prepara promemoria WhatsApp per '+item.clientName : 'Consenso WhatsApp non registrato'"><img src="/assets/whatsapp.svg" alt="" aria-hidden="true" /></button><button class="edit-appointment" (click)="edit(item)" aria-label="Modifica appuntamento"><img src="/assets/green_edit.svg" alt="" aria-hidden="true" /></button><button class="delete-appointment" (click)="removeAppointment(item)" aria-label="Elimina appuntamento"><img src="/assets/red_delete.svg" alt="" aria-hidden="true" /></button></div>
                          </div>
                        </article>
                      }
                    </div>
                  } @else if (todayAppointments().length) {<p class="employee-agenda-empty">Nessun appuntamento</p>}
                @if (column.bookable && shiftState() === 'ready' && loadedShiftDate() === selectedDate()) {
                  <div class="column-availability">
                    <button type="button" class="shift-action text-button" [attr.aria-label]="'Modifica turno di ' + column.name" (click)="editHours(column)">Modifica turno</button>
                    <h4>Orari liberi</h4>
                    @if (column.freeTimes.length) {
                      <div class="free-slot-list">@for (time of column.freeTimes; track time) {
                        <button type="button" class="free-slot" [attr.aria-label]="'Prenota alle ' + time + ' con ' + column.name" (click)="bookSlot(column, time)">{{ time }}</button>
                      }</div>
                    } @else { <p class="muted">Nessuna fascia libera.</p> }
                  </div>
                }
              </section> }</div>@if(!todayAppointments().length && shiftState() !== 'ready'){ <div class="empty" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><span class="empty-art">✳</span><h3>{{ copy.agenda.emptyTitle }}</h3><p>{{ copy.agenda.emptyText }}</p><button class="secondary" (click)="openForm()">＋ Crea appuntamento</button></div> }
          </section>
        }
        @if (view()==='clients') {
          <section class="page-heading clients-heading" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><h1>Clienti</h1><div class="client-actions"><label class="search"><span>⌕</span><input type="search" placeholder="Cerca per nome o telefono" [ngModel]="clientSearch()" (ngModelChange)="clientSearch.set($event)" /></label><button class="primary" (click)="addClient()"><img [class.inverted]="!darkMode()" src="/assets/add.svg" alt="" aria-hidden="true" />Aggiungi cliente</button></div></section>
          <section class="stats" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><article><span>CLIENTI</span><strong>{{ clients().length }}</strong><small>contatti in rubrica</small></article><article><span>CONSENSO WHATSAPP</span><strong>{{ consentingClients().length }}</strong><small>consenso registrato</small></article></section>
          <section class="agenda-card" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><div class="card-title"><div><p class="eyebrow">RUBRICA</p><h2>I tuoi clienti</h2></div></div>
            @if(filteredClients().length){<div class="client-list" animate.enter="ui-fade-in" animate.leave="ui-fade-out">@for(client of filteredClients();track client.id){<article class="client-row" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><span class="client-avatar">{{ initials(client.name) }}</span><div class="client-info"><b>{{ client.name }}</b><span>{{ phoneForDisplay(client.phone) }}</span></div><span class="consent-pill" [class.yes]="client.whatsappConsent">{{ client.whatsappConsent?'Consenso WhatsApp':'Nessun consenso' }}</span><span class="client-count">{{ clientAppointments(client.id) }} app.</span><div class="client-row-actions"><button class="text-button appointment-action" type="button" [attr.aria-label]="'Crea appuntamento per '+client.name" (click)="startAppointment(client)"><img [class.inverted]="darkMode()" src="/assets/agenda.svg" alt="" aria-hidden="true" /></button><button class="text-button" [attr.aria-label]="'Modifica cliente '+client.name" (click)="editClient(client)">Modifica</button><button class="text-button danger" (click)="removeClient(client)">Elimina</button></div></article>}</div>}
            @else{<div class="empty" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><span class="empty-art">♙</span><h3>{{ clients().length ? 'Nessuna cliente trovata' : 'La rubrica è ancora vuota' }}</h3><p>Aggiungi una cliente per ritrovarla rapidamente quando crei un appuntamento.</p><button class="secondary" (click)="addClient()">＋ Aggiungi cliente</button></div>}
          </section>
        }

        @if (view()==='employees') {
          <section class="page-heading" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><div><p class="eyebrow">IL TUO TEAM</p><h1>Dipendenti</h1></div><button class="primary" (click)="addEmployee()">＋ Aggiungi dipendente</button></section>
          <section class="agenda-card" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><div class="card-title"><div><p class="eyebrow">PERSONALE</p><h2>Il team del salone</h2></div><span class="count-pill">{{ activeEmployees().length }} dipendenti</span></div>
            @if(activeEmployees().length){<div class="client-list" animate.enter="ui-fade-in" animate.leave="ui-fade-out">@for(employee of activeEmployees();track employee.id){<article class="employee-row" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><span class="client-avatar">{{ initials(employee.firstName+' '+employee.lastName) }}</span><div class="client-info"><b>{{ employee.firstName }} {{ employee.lastName }}</b></div><button class="text-button" (click)="editEmployee(employee)">Modifica</button><button class="text-button danger" (click)="removeEmployee(employee)">Elimina</button></article>}</div>}
            @else{<div class="empty" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><span class="empty-art">♙</span><h3>Nessun dipendente ancora</h3><p>Aggiungi nome e cognome per poter assegnare gli appuntamenti.</p><button class="secondary" (click)="addEmployee()">＋ Aggiungi dipendente</button></div>}
          </section>
        }

        @if (view()==='settings') {
          <section class="page-heading" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><div><p class="eyebrow">IL TUO SPAZIO</p><h1>Impostazioni</h1><p class="subtitle">Preferenze del salone.</p></div></section>
          <section class="settings-grid" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><article class="agenda-card settings-card"><div class="card-title"><div><p class="eyebrow">IL SALONE</p><h2>Preferenze</h2></div></div><form (submit)="$event.preventDefault(); saveSettings()"><label>Nome del salone<input name="salonName" [(ngModel)]="settingsDraft.salonName" /></label><label>Servizi</label>@if(servicesUnavailable()){<p class="muted" role="alert">Non riesco a caricare o salvare i servizi nel database. Applica prima la query SQL di configurazione.</p>}<div class="service-editor">@for(service of settingsDraft.services;track service;let i=$index){<div class="service-row" animate.enter="ui-fade-in" animate.leave="ui-fade-out"><span>{{ service }}</span><button type="button" class="text-button danger" (click)="removeService(i)" aria-label="Rimuovi servizio">Rimuovi</button></div>}</div><div class="service-add"><input name="newService" [(ngModel)]="newService" placeholder="Aggiungi un servizio" /><button type="button" class="secondary" (click)="addService()">Aggiungi</button></div><div class="reminder-template-setting"><label>Testo del promemoria</label><p>Componi il messaggio con parole semplici e aggiungi i dati dell’appuntamento con un tocco.</p><button type="button" class="secondary edit-reminder-template" (click)="reminderEditorOpen.set(true)">Crea o modifica il promemoria</button><small class="muted">{{ settingsDraft.messageTemplates.reminder || 'Non hai ancora scritto un promemoria.' }}</small></div><button class="primary" type="submit">Salva impostazioni</button></form></article></section>
        }
      </main>
    </div>
    @if (shiftEditor(); as editor) {
      <app-work-hours-editor [class.dark]="darkMode()" [personName]="editor.name" [date]="editor.schedule.date" [slots]="editor.schedule.slots"
        [saving]="shiftSaving()" [error]="shiftError()" (dismiss)="closeShiftEditor()" (saveHours)="saveHours($event)" />
    }
    @if(formOpen()) { <div class="scrim" animate.enter="ui-fade-in" animate.leave="ui-fade-out" [class.dark]="darkMode()" (click)="closeForm()"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="form-title" (click)="$event.stopPropagation()"><button class="close" (click)="closeForm()" aria-label="Chiudi"><svg class="material-icon" data-icon="close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button><p class="eyebrow">{{ editingId()?'APPUNTAMENTO':'NUOVO · 01 / 01' }}</p><h2 id="form-title">{{ editingId()?'Modifica appuntamento':'Aggiungi all’agenda' }}</h2><p class="subtitle">I campi con * sono obbligatori.</p><form (submit)="$event.preventDefault(); saveAppointment()"><label>Cliente<select name="clientId" [ngModel]="draft.clientId || ''" (ngModelChange)="selectAppointmentClient($event)"><option value="">Nuova cliente</option>@for(client of clients();track client.id){<option [value]="client.id">{{ client.name }}</option>}</select></label><label class="check"><input type="checkbox" name="addToContacts" [(ngModel)]="draft.addToContacts" /><span>Aggiungi anche alla Rubrica Clienti</span></label><label>Nome *<input name="firstName" required autocomplete="given-name" [(ngModel)]="draft.firstName" /></label><label>Cognome *<input name="lastName" required autocomplete="family-name" [(ngModel)]="draft.lastName" /></label><label>Telefono *<input name="phone" type="tel" required autocomplete="tel" placeholder="333 1234567" [ngModel]="draft.phone" (ngModelChange)="draft.phone = phoneForDisplay($event)" /></label>
      <div class="two-fields"><label>Data *<div class="picker-field"><input #datePicker name="date" type="date" required [ngModel]="draft.date" (ngModelChange)="changeDraftDate($event)" /><button type="button" (click)="showPicker(datePicker)" aria-label="Scegli la data">▦</button></div></label>
      <label>Seguito da<select name="employeeId" [ngModel]="draft.employeeId" (ngModelChange)="changeDraftPerson($event)"><option [ngValue]="null">Sissy</option>@if(legacyEmployeeName(); as legacyName){<option [ngValue]="legacyEmployeeAssignmentValue" disabled>{{ legacyName }} (non attivo)</option>}@if(archivedEmployee(); as archived){<option [ngValue]="archived.id" disabled>{{ archivedEmployeeName() }} (non attivo)</option>}@for(employee of activeEmployees();track employee.id){<option [ngValue]="employee.id">{{ employee.firstName }} {{ employee.lastName }}</option>}</select></label></div>
      @if (shiftState() === 'missing') {
        <label>Ora *<div class="picker-field"><input #timePicker name="time" type="time" step="1800" required [(ngModel)]="draft.time" /><button type="button" (click)="showPicker(timePicker)" aria-label="Scegli l’ora">◷</button></div></label>
      } @else {
        @let choices = formTimes();
        <label>Ora *<select name="time" required [(ngModel)]="draft.time"><option value="">Scegli un orario</option>@for (time of choices; track time) {<option [value]="time">{{ time }}</option>}</select></label>
        @if (shiftState() === 'error') {<p role="alert">Disponibilità non caricata. <button class="text-button" type="button" (click)="refreshHours()">Riprova</button></p>}
        @else if (shiftState() === 'loading') {<small role="status">Caricamento dei turni…</small>}
        @else if (!choices.length) {<small role="status">Nessuna fascia libera per questa persona. Scegli un’altra data o persona, oppure imposta il turno nell’agenda.</small>}
      }
      <label>Servizio<select name="service" [(ngModel)]="draft.service"><option value="">Nessun servizio indicato</option>@for(service of settingsDraft.services;track service){<option [value]="service">{{ service }}</option>}</select></label><label>Note<textarea name="notes" rows="3" [(ngModel)]="draft.notes"></textarea></label><label class="check"><input type="checkbox" name="reminderConsent" [(ngModel)]="draft.reminderConsent" /><span>Il cliente ha acconsentito a ricevere promemoria WhatsApp</span></label>@if(formError()){<p class="form-error" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="alert">{{ formError() }}</p>}<div class="dialog-actions"><button class="secondary" type="button" (click)="closeForm()">Annulla</button><button class="primary" type="submit">{{ editingId()?'Salva modifiche':'Salva appuntamento' }}</button></div></form></section></div> }
    @if(reminderEditorOpen()) { <div class="scrim" animate.enter="ui-fade-in" animate.leave="ui-fade-out" [class.dark]="darkMode()" (click)="reminderEditorOpen.set(false)"><section class="dialog reminder-dialog" role="dialog" aria-modal="true" aria-labelledby="reminder-editor-title" (click)="$event.stopPropagation()"><button class="close" type="button" (click)="reminderEditorOpen.set(false)" aria-label="Chiudi"><svg class="material-icon" data-icon="close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button><p class="eyebrow">PROMEMORIA WHATSAPP</p><h2 id="reminder-editor-title">Crea il tuo messaggio</h2><p class="subtitle">Scrivi come parleresti alla cliente. Per aggiungere un dato, premi uno dei pulsanti qui sotto: verrà inserito nel punto in cui si trova il cursore.</p><label>Il tuo messaggio<textarea #reminderEditor name="reminder" rows="5" [(ngModel)]="settingsDraft.messageTemplates.reminder"></textarea></label><div class="placeholder-tools" aria-label="Dati da inserire nel messaggio"><button type="button" class="secondary" (click)="insertReminderToken(reminderEditor, '{nome}')">Nome cliente</button><button type="button" class="secondary" (click)="insertReminderToken(reminderEditor, '{data}')">Data appuntamento</button><button type="button" class="secondary" (click)="insertReminderToken(reminderEditor, '{ora}')">Ora</button><button type="button" class="secondary" (click)="insertReminderToken(reminderEditor, '{servizio}')">Servizio</button><button type="button" class="secondary" (click)="insertReminderToken(reminderEditor, '{salone}')">Nome salone</button></div><section class="reminder-preview" aria-live="polite"><h3>Anteprima di esempio</h3><p>{{ reminderPreview() }}</p></section><div class="dialog-actions"><button class="primary" type="button" (click)="reminderEditorOpen.set(false)">Fatto</button></div></section></div> }
    @if(employeeFormOpen()) { <div class="scrim" animate.enter="ui-fade-in" animate.leave="ui-fade-out" [class.dark]="darkMode()" (click)="closeEmployeeForm()"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="employee-form-title" (click)="$event.stopPropagation()"><button class="close" (click)="closeEmployeeForm()" aria-label="Chiudi"><svg class="material-icon" data-icon="close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button><p class="eyebrow">PERSONALE</p><h2 id="employee-form-title">{{ editingEmployee() ? 'Modifica dipendente' : 'Aggiungi dipendente' }}</h2><form (submit)="$event.preventDefault(); saveEmployee()"><label>Nome *<input name="employeeFirstName" required autocomplete="given-name" [(ngModel)]="employeeDraft.firstName" /></label><label>Cognome *<input name="employeeLastName" required autocomplete="family-name" [(ngModel)]="employeeDraft.lastName" /></label>@if(employeeFormError()){<p class="form-error" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="alert">{{ employeeFormError() }}</p>}<div class="dialog-actions"><button class="secondary" type="button" (click)="closeEmployeeForm()">Annulla</button><button class="primary" type="submit">Salva dipendente</button></div></form></section></div> }\n    @if(clientFormOpen()) { <div class="scrim" animate.enter="ui-fade-in" animate.leave="ui-fade-out" [class.dark]="darkMode()" (click)="closeClientForm()"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="client-form-title" (click)="$event.stopPropagation()"><button class="close" (click)="closeClientForm()" aria-label="Chiudi"><svg class="material-icon" data-icon="close" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button><p class="eyebrow">RUBRICA CLIENTI</p><h2 id="client-form-title">{{ editingClient() ? 'Modifica cliente' : 'Aggiungi cliente' }}</h2><p class="subtitle">Inserisci i dati della cliente.</p><form (submit)="$event.preventDefault(); saveClient()"><label>Nome *<input name="firstName" required autocomplete="given-name" [(ngModel)]="clientDraft.firstName" /></label><label>Cognome *<input name="lastName" required autocomplete="family-name" [(ngModel)]="clientDraft.lastName" /></label><label>Telefono *<input name="clientPhone" type="tel" required autocomplete="tel" placeholder="333 1234567" [ngModel]="clientDraft.phone" (ngModelChange)="clientDraft.phone = phoneForDisplay($event)" /></label><label>Note<textarea name="clientNotes" rows="2" [(ngModel)]="clientDraft.notes"></textarea></label><label class="check"><input type="checkbox" name="clientConsent" [(ngModel)]="clientDraft.whatsappConsent" /><span>Consenso WhatsApp registrato</span></label>@if(clientFormError()){<p class="form-error" animate.enter="ui-fade-in" animate.leave="ui-fade-out" role="alert">{{ clientFormError() }}</p>}<div class="dialog-actions"><button class="secondary" type="button" (click)="closeClientForm()">Annulla</button><button class="primary" type="submit">Salva cliente</button></div></form></section></div> }
  `,
  styleUrls: [
    './dashboard-shell.css',
    './dashboard-content.css',
    './dashboard-responsive.css',
    './dashboard-premium.css',
    './dashboard-slots.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly copy = it;
  protected readonly phoneForDisplay = phoneForDisplay;
  private readonly repo = inject(SupabaseAgendaRepository);
  private readonly auth = inject(AuthService);
  protected readonly view = signal<View>('agenda');
  protected readonly singleAgendaView = signal(false);
  protected readonly selectedAgendaColumnId = signal('admin');
  protected readonly darkMode = signal(initialDarkMode());
  protected newService = '';
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly collapsedAppointments = signal<ReadonlySet<string>>(new Set());
  protected readonly clients = signal<Client[]>([]);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly activeEmployees = computed(() => this.employees().filter((employee) => employee.isActive !== false));
  protected readonly legacyEmployeeAssignmentValue = LEGACY_EMPLOYEE_ASSIGNMENT;
  protected readonly settings = signal<SalonSettings>({ salonName: 'Il tuo salone', defaultCountryCode: '+39', services: [], businessHours: { open: '', close: '', closedDays: [] }, messageTemplates: { confirmation: 'Ciao {nome}, il tuo appuntamento è fissato per {data} alle {ora}. A presto! — {salone}', reminder: 'Buongiorno {nome}, le ricordo il suo appuntamento il {data} alle {ora}. A presto! — {salone}' }, demoDataEnabled: false });
  protected settingsDraft: SalonSettings = structuredClone(this.settings());
  protected readonly formOpen = signal(false);
  protected readonly reminderEditorOpen = signal(false);
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
  protected readonly servicesUnavailable = signal(false);
  private noticeTimeout: ReturnType<typeof setTimeout> | undefined;
  protected readonly storageWarning = signal(false);
  protected readonly editingId = signal('');
  protected readonly selectedDate = signal(this.localDate());
  protected readonly today = this.localDate();
  protected readonly clientSearch = signal('');
  protected readonly draft = this.emptyDraft();
  protected readonly todayAppointments = computed(() => this.appointments().filter((item) => item.date === this.selectedDate()).sort((a,b) => a.time.localeCompare(b.time)));
  private readonly schedules = signal<DailyWorkSchedule[]>([]);
  protected readonly loadedShiftDate = signal('');
  protected readonly shiftState = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly shiftEditor = signal<ShiftEditor | null>(null);
  protected readonly shiftSaving = signal(false);
  protected readonly shiftError = signal('');
  private shiftRequest = 0;
  protected readonly agendaColumns = computed<AgendaColumn[]>(() => {
    const appointments = this.todayAppointments();
    const employeeColumns = this.employees().map((employee) => {
      const name = `${employee.firstName} ${employee.lastName}`;
      return {
        id: employee.id,
        name,
        bookable: employee.isActive !== false,
        freeTimes: employee.isActive === false ? [] : this.availableTimes(this.selectedDate(), employee.id),
        appointments: appointments.filter((item) => item.employeeId === employee.id || (!item.employeeId && item.employeeName === name)),
      };
    });
    const knownIds = new Set(employeeColumns.map((column) => column.id));
    const knownNames = new Set(employeeColumns.map((column) => column.name));
    const legacyAppointments = appointments.filter((item) => item.employeeId
      ? !knownIds.has(item.employeeId)
      : Boolean(item.employeeName && item.employeeName !== 'Admin' && !knownNames.has(item.employeeName)));
    const legacyKeys = [...new Set(legacyAppointments.map((item) => item.employeeId ?? item.employeeName ?? 'unknown'))];
    const legacyColumns = legacyKeys.map((key) => {
      const assigned = legacyAppointments.filter((item) => (item.employeeId ?? item.employeeName ?? 'unknown') === key);
      return { id: `legacy:${key}`, bookable: false, freeTimes: [], name: `Storico · ${assigned[0]?.employeeName || 'dipendente'}`, appointments: assigned };
    });
    const adminColumn = {
      id: 'admin',
      name: 'Sissy',
      bookable: true,
      freeTimes: this.availableTimes(this.selectedDate(), null),
      appointments: appointments.filter((item) => !item.employeeId && (!item.employeeName || item.employeeName === 'Admin')),
    };
    return [adminColumn, ...employeeColumns, ...legacyColumns];
  });
  protected readonly selectedAgendaColumn = computed(() => this.agendaColumns().find((column) => column.id === this.selectedAgendaColumnId()) ?? this.agendaColumns()[0] ?? null);
  protected readonly visibleAgendaColumns = computed(() => {
    if (!this.singleAgendaView()) return this.agendaColumns();
    const column = this.selectedAgendaColumn();
    return column ? [column] : [];
  });
  protected readonly consentingClients = computed(() => this.clients().filter((item) => item.whatsappConsent));
  protected readonly directoryClients = computed(() => this.clients());
  protected readonly filteredClients = computed(() => { const q = this.clientSearch().trim().toLocaleLowerCase('it'); return this.directoryClients().filter((c) => `${c.name} ${c.phone}`.toLocaleLowerCase('it').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'it')); });

  constructor() {
    syncThemeColor(this.darkMode());
    void this.load();
    void this.fetchHours(this.selectedDate());
  }

  private async fetchHours(date: string, force = false): Promise<void> {
    if (!force && this.loadedShiftDate() === date && this.shiftState() !== 'error') return;
    const request = ++this.shiftRequest;
    this.loadedShiftDate.set(date);
    this.schedules.set([]);
    this.shiftState.set('loading');
    if (!date) return;
    try {
      const schedules = await this.repo.listWorkSchedules(date);
      if (request !== this.shiftRequest) return;
      this.schedules.set(schedules);
      this.shiftState.set('ready');
    } catch (err) {
      if (request !== this.shiftRequest) return;
      const code = (err as {code?: string} | null)?.code;
      // Only a missing relation enables the pre-migration native picker. Other failures fail closed.
      this.shiftState.set(code === 'PGRST205' || code === '42P01' ? 'missing' : 'error');
    }
  }
  protected refreshHours(): void { void this.fetchHours(this.formOpen() ? this.draft.date : this.selectedDate(), true); }
  protected selectDay(date: string): void {
    if (!date) return;
    this.selectedDate.set(date);
    void this.fetchHours(date);
  }
  private availableTimes(date: string, employeeId: string | null, excludeId?: string): string[] {
    if (this.shiftState() !== 'ready' || this.loadedShiftDate() !== date) return [];
    return freeTimesForPerson(this.schedules(), this.appointments(), date, employeeId, excludeId);
  }
  private originalFormTime(): string | undefined {
    const prior = this.appointments().find(item => item.id === this.editingId());
    if (!prior || prior.date !== this.draft.date) return undefined;
    const assignee = prior.employeeId ?? (prior.employeeName && prior.employeeName !== 'Admin' ? LEGACY_EMPLOYEE_ASSIGNMENT : null);
    return assignee === this.draft.employeeId ? prior.time : undefined;
  }
  protected formTimes(): string[] {
    const id = this.draft.employeeId;
    const times = id === null || this.activeEmployees().some(person => person.id === id)
      ? this.availableTimes(this.draft.date, id, this.editingId() || undefined) : [];
    // An unchanged historical booking remains editable even if the shift was removed later.
    const original = this.originalFormTime();
    if (original && !times.includes(original)) times.push(original);
    return times.sort();
  }
  protected changeDraftDate(date: string): void {
    this.draft.date = date;
    this.draft.time = '';
    void this.fetchHours(date);
  }
  protected changeDraftPerson(id: string | null): void { this.draft.employeeId = id; this.draft.time = ''; }
  protected bookSlot(column: AgendaColumn, time: string): void {
    if (!column.bookable || !column.freeTimes.includes(time)) return;
    this.openForm();
    this.draft.employeeId = column.id === 'admin' ? null : column.id;
    this.draft.time = time;
  }
  protected editHours(column: AgendaColumn): void {
    if (!column.bookable || this.shiftState() !== 'ready' || this.loadedShiftDate() !== this.selectedDate()) return;
    const employeeId = column.id === 'admin' ? null : column.id;
    const date = this.selectedDate();
    const savedSchedule = this.schedules().find(row => row.employeeId === employeeId && row.date === date);
    const slots = savedSchedule?.slots ?? [...DEFAULT_WORK_SLOTS];
    this.shiftError.set('');
    this.shiftEditor.set({ name: column.name, schedule: { date, employeeId, slots: [...slots] } });
  }
  protected closeShiftEditor(): void { if (!this.shiftSaving()) this.shiftEditor.set(null); }
  protected async saveHours(slots: number[]): Promise<void> {
    const editor = this.shiftEditor();
    if (!editor || this.shiftSaving()) return;
    this.shiftSaving.set(true);
    this.shiftError.set('');
    try {
      await this.repo.saveWorkSchedule({ ...editor.schedule, slots });
      this.shiftEditor.set(null);
      await this.fetchHours(this.selectedDate(), true);
      this.showNotice('Turno salvato.');
    } catch { this.shiftError.set('Turno non salvato. Le modifiche sono ancora qui: riprova.'); }
    finally { this.shiftSaving.set(false); }
  }

  private async load(): Promise<void> {
    try {
      const [appointments, clients, employees, settings, serviceResult] = await Promise.all([
        this.repo.listAppointments(), this.repo.listClients(), this.repo.listEmployees(), this.repo.loadSettings(),
        this.repo.listServices().then((services) => ({ services, unavailable: false as const }))
          .catch(() => ({ services: [] as string[], unavailable: true as const })),
      ]);
      this.appointments.set(appointments); this.clients.set(clients); this.employees.set(employees);
      this.servicesUnavailable.set(serviceResult.unavailable);
      const persistedSettings = { ...settings, services: serviceResult.services };
      this.settings.set(persistedSettings); this.settingsDraft = structuredClone(persistedSettings);
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

  protected openForm(): void { this.editingId.set(''); Object.assign(this.draft, this.emptyDraft()); this.draft.date = this.selectedDate(); void this.fetchHours(this.draft.date); this.formError.set(''); this.formOpen.set(true); }
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
  protected selectAppointmentClient(id: string): void { const client = this.clients().find((item) => item.id === id); this.draft.clientId = client?.id ?? ''; this.draft.addToContacts = Boolean(client); if (client) { const parts = client.name.trim().split(/\s+/); this.draft.firstName = client.firstName || parts.shift() || ''; this.draft.lastName = client.lastName || parts.join(' '); this.draft.clientName = client.name; this.draft.phone = phoneForDisplay(client.phone); this.draft.reminderConsent = client.whatsappConsent; } else { this.draft.firstName = ''; this.draft.lastName = ''; this.draft.clientName = ''; this.draft.phone = ''; this.draft.reminderConsent = false; } }
  protected showPicker(input: HTMLInputElement): void { try { input.showPicker(); } catch { input.click(); } }
  protected toggleTheme(): void { this.darkMode.update((dark) => !dark); saveThemePreference(this.darkMode()); }
  protected toggleSingleAgendaView(): void { this.singleAgendaView.update((single) => !single); }
  protected toggleAppointment(id: string): void { this.collapsedAppointments.update((collapsed) => { const next = new Set(collapsed); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  protected selectAgendaColumn(id: string): void { this.selectedAgendaColumnId.set(id); }
  protected closeForm(): void { this.formOpen.set(false); this.formError.set(''); void this.fetchHours(this.selectedDate()); }
  protected edit(item: Appointment): void { this.editingId.set(item.id); const parts = item.clientName.trim().split(/\s+/); const linkedClient = this.clients().find((client) => client.id === item.clientId); Object.assign(this.draft, this.emptyDraft(), {clientId:item.clientId,clientName:item.clientName,firstName:parts.shift()||'',lastName:parts.join(' ')||parts[0]||'',phone:phoneForDisplay(item.phone),date:item.date,time:item.time,service:item.service,notes:item.notes,reminderConsent:item.reminderConsent,addToContacts:Boolean(linkedClient),employeeId:item.employeeId??(item.employeeName&&item.employeeName!=='Admin'?LEGACY_EMPLOYEE_ASSIGNMENT:null)}); void this.fetchHours(this.draft.date); this.formError.set(''); this.formOpen.set(true); }
  protected startAppointment(client: Client): void { this.openForm(); this.selectAppointmentClient(client.id); this.view.set('agenda'); }
  protected editClient(client: Client): void {
    const parts = client.name.trim().split(/\s+/);
    this.editingClient.set(client);
    this.clientDraft.firstName = client.firstName || parts.shift() || '';
    this.clientDraft.lastName = client.lastName || parts.join(' ');
    this.clientDraft.phone = phoneForDisplay(client.phone);
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
      const client: Client = { ...(original ?? { id: crypto.randomUUID(), createdAt: new Date().toISOString() }), firstName, lastName, name: `${firstName} ${lastName}`, phone: phone.e164, notes: this.clientDraft.notes.trim(), whatsappConsent: this.clientDraft.whatsappConsent };
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
    const sameBooking = !!prior && this.originalFormTime() === this.draft.time;
    if (!sameBooking && this.shiftState() !== 'missing' && !this.formTimes().includes(this.draft.time)) {
      this.formError.set('Questa fascia non è disponibile per la persona selezionata. Scegli un altro orario.'); return;
    }
    if (!sameBooking && findAppointmentConflict(existing,{date:this.draft.date,time:this.draft.time,employeeId:requestedEmployeeId,employeeName:requestedEmployeeName,excludeId:this.editingId()||undefined})) { this.formError.set(this.copy.form.conflict); return; }
    const matchedClient=this.clients().find((item)=>item.id===this.draft.clientId)||this.clients().find((item)=>item.phone===phone.e164);
    const existingClientId = this.draft.clientId || prior?.clientId || matchedClient?.id || '';
    const isNewClient = !existingClientId && !matchedClient;
    const clientId = existingClientId || (this.draft.addToContacts && isNewClient ? crypto.randomUUID() : '');
    const client: Client = { id:clientId, firstName:this.draft.firstName.trim(), lastName:this.draft.lastName.trim(), name:clientName, phone:phone.e164, whatsappConsent:this.draft.reminderConsent, notes:matchedClient?.notes||'', createdAt:matchedClient?.createdAt||prior?.createdAt||new Date().toISOString() };
    const employeeName = legacyEmployeeName ?? (employee
      ? employee.isActive === false && prior?.employeeId === employee.id
        ? prior.employeeName || `${employee.firstName} ${employee.lastName}`
        : `${employee.firstName} ${employee.lastName}`
      : 'Admin');
    const appointment: Appointment = { id:this.editingId()||crypto.randomUUID(),clientId:client.id,clientName,phone:client.phone,date:this.draft.date,time:this.draft.time,service:this.draft.service.trim(),notes:this.draft.notes.trim(),status:prior?.status||'confirmed',reminderConsent:this.draft.reminderConsent,createdAt:prior?.createdAt||new Date().toISOString(),employeeId:employee?.id??null,employeeName };
    try {
      if (!sameBooking && appointment.status === 'confirmed' && !legacyEmployeeName && this.shiftState() === 'ready' &&
        !this.schedules().some(row => row.date === appointment.date && row.employeeId === appointment.employeeId)) {
        const defaultSchedule: DailyWorkSchedule = {
          date: appointment.date,
          employeeId: appointment.employeeId ?? null,
          slots: [...DEFAULT_WORK_SLOTS],
        };
        await this.repo.saveWorkSchedule(defaultSchedule);
        this.schedules.update(rows => [...rows, defaultSchedule]);
      }
      if (isNewClient && this.draft.addToContacts) await this.repo.saveClient(client);
      await this.repo.saveAppointment(appointment);
      await this.load();
      this.selectedDate.set(appointment.date);
      this.showNotice(this.copy.form.saveSuccess);
      this.closeForm();
    }
    catch (err) {
      const code = (err as {code?: string} | null)?.code;
      if (code === '23514' || code === '23505' || code === '23P01') {
        await Promise.all([this.fetchHours(this.draft.date, true), this.load()]);
        this.formError.set('L’orario non è più disponibile. Controlla il turno e scegli un’altra fascia.');
      } else { this.showNotice(this.copy.ui.genericError); }
    }
  }
  protected async removeAppointment(item: Appointment): Promise<void> { if (!globalThis.confirm(this.copy.common.confirmDelete)) return; try { await this.repo.deleteAppointment(item.id); await this.load(); } catch { this.showNotice(this.copy.ui.genericError); } }
  protected async removeClient(client: Client): Promise<void> { if (!globalThis.confirm(`Eliminare ${client.name} dalla rubrica? Gli appuntamenti restano nell’agenda.`)) return; try { await this.repo.deleteClient(client.id); await this.load(); } catch { this.showNotice(this.copy.ui.genericError); } }
  protected setServices(value: string): void { this.settingsDraft.services = value.split('\\n').map((item) => item.trim()).filter(Boolean); }
  protected addService(): void { const value = this.newService.trim(); if (value && !this.settingsDraft.services.some((item) => item.toLocaleLowerCase('it') === value.toLocaleLowerCase('it'))) this.settingsDraft.services = [...this.settingsDraft.services, value]; this.newService = ''; }
  protected removeService(index: number): void { this.settingsDraft.services = this.settingsDraft.services.filter((_item, itemIndex) => itemIndex !== index); }
  protected insertReminderToken(input: HTMLTextAreaElement, token: string): void {
    const text = this.settingsDraft.messageTemplates.reminder;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? start;
    const next = `${text.slice(0, start)}${token}${text.slice(end)}`;
    this.settingsDraft.messageTemplates.reminder = next;
    input.value = next;
    input.focus();
    input.setSelectionRange(start + token.length, start + token.length);
  }
  protected reminderPreview(): string {
    return renderMessageTemplate(this.settingsDraft.messageTemplates.reminder, {
      nome: 'Giulia', data: 'sabato 24 maggio', ora: '10:30', servizio: 'Taglio e piega', salone: this.settingsDraft.salonName || 'Il tuo salone',
    });
  }

  protected async saveSettings(): Promise<void> { try { this.settingsDraft.defaultCountryCode = '+39'; await this.repo.saveSettings(this.settingsDraft); await this.repo.saveServices(this.settingsDraft.services); this.servicesUnavailable.set(false); this.settings.set(structuredClone(this.settingsDraft)); this.showNotice(this.copy.settings.saveSuccess); } catch { this.servicesUnavailable.set(true); this.showNotice(this.copy.ui.genericError); } }
  protected async seedDemo(): Promise<void> { const ok=await this.repo.seedDemoData(); if(!ok){this.showNotice('Per caricare i dati demo, prima esporta o rimuovi gli appuntamenti e clienti già presenti.');return;} this.settingsDraft.demoDataEnabled=true; await this.repo.saveSettings(this.settingsDraft); await this.load(); this.showNotice(this.copy.ui.demoLoaded); }
  protected async removeDemo(): Promise<void> { await this.repo.removeDemoData(); await this.load(); this.showNotice(this.copy.ui.demoRemoved); }

  protected async importBackup(event: Event): Promise<void> { const file=(event.target as HTMLInputElement).files?.[0]; if(!file)return; try { const text=await file.text(); const ok=await this.repo.importBackup(text); if(!ok){this.showNotice(this.copy.settings.importError);return;} await this.load();this.showNotice(this.copy.settings.importSuccess); } catch { this.showNotice(this.copy.settings.importError); } finally {(event.target as HTMLInputElement).value='';} }
  protected async seedDemoNoop(): Promise<void> { await this.repo.seedDemoData(); }
  protected preview(item: Appointment, kind:'confirmation'|'reminder'): string { return renderMessageTemplate(this.settings().messageTemplates[kind],{nome:item.clientName.trim().split(/\s+/)[0]||item.clientName,data:this.displayDate(item.date),ora:item.time,servizio:item.service||'il tuo appuntamento',salone:this.settings().salonName}); }
  protected openWhatsApp(item:Appointment,kind:'confirmation'|'reminder'): void { if(!item.reminderConsent){this.showNotice(this.copy.messages.consentRequired);return;} if (!item.phone.startsWith('+39') || !normalizePhoneNumber(item.phone, '+39').e164) { this.showNotice('Numero non italiano: controlla il telefono prima di aprire WhatsApp.'); return; } const number=item.phone.replace(/\D/g,'');const href=`https://wa.me/${number}?text=${encodeURIComponent(this.preview(item,kind))}`;window.open(href,'_blank','noopener,noreferrer'); }
  protected shiftDate(delta:number):void { const [y,m,d]=this.selectedDate().split('-').map(Number);const date=new Date(y,m-1,d);date.setDate(date.getDate()+delta);this.selectDay(this.localDate(date)); }
  protected displayDate(value:string):string { const [y,m,d]=value.split('-').map(Number);return new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d)); }
  protected statusLabel(status:Appointment['status']):string { return status === 'cancelled' ? 'Annullato' : status === 'completed' ? 'Completato' : ''; }
  protected clientAppointments(id:string):number { return this.appointments().filter((item)=>item.clientId===id).length; }
  protected initials(value:string):string { return value.trim().split(/\s+/).slice(0,2).map((p)=>p[0]?.toLocaleUpperCase('it')).join(''); }
  protected async logout():Promise<void> { await this.auth.logout(); window.location.assign('/login'); }
  private emptyDraft(): {clientId:string;clientName:string;firstName:string;lastName:string;phone:string;date:string;time:string;service:string;notes:string;reminderConsent:boolean;addToContacts:boolean;employeeId:string|null} { return {clientId:'',clientName:'',firstName:'',lastName:'',phone:'',date:this.localDate(),time:'',service:'',notes:'',reminderConsent:false,addToContacts:false,employeeId:null}; }
  private localDate(date=new Date()):string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
}
