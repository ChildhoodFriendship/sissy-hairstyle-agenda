# Supabase — configurazione, accesso e dati di prova

Questa guida descrive la configurazione del progetto Supabase **sissy hairstyle agenda**, l’attivazione dell’account operatore, il recupero password e i dati dimostrativi.

## Stato verificato del progetto

Verifica read-only del 7 novembre 2026: in `auth.users` esiste un utente confermato con l’email configurata nel seed. `public.clients` e `public.appointments` contengono 7 righe ciascuna: 6 per tabella sono i record fittizi di questo seed e 1 per tabella non è marcata come seed; verifica quelle due righe in dashboard prima di modificarle o cancellarle. Se serve un account separato per Sissy, non risulta ancora creato.

La schermata **Password dimenticata?** ha risposto: quel messaggio generico è intenzionale e non prova che sia stata inviata un’email. Supabase non invia il link se l’indirizzo non corrisponde a un account, ma restituisce comunque una risposta generica per non rivelare quali email siano registrate. Il recupero password non crea utenti.

## Configurazione del progetto

1. **Database e RLS.** La migrazione base `supabase/migrations/20261107000000_create_agenda_core.sql` e `supabase/migrations/20261110000000_employees_capacity_and_usernames.sql` sono già state applicate: non rieseguirle. Applica `supabase/migrations/20261110220224_employee_archive_and_username_backfill.sql` nel SQL Editor del progetto corretto; ripara eventuali profili username mancanti, abilita l’archiviazione dei dipendenti, disattiva la cancellazione fisica via API e conserva gli assegnatari storici.
2. **Edge Function login.** Distribuisci `supabase/functions/login-with-username/index.ts` come `login-with-username`; `supabase/config.toml` disattiva la verifica JWT per questa funzione di login pubblico. Se l’ambiente del progetto non espone la variabile legacy di service role, configura il secret server-side `SERVICE_ROLE_KEY`. Non copiare mai questa chiave nel client o in chat.
3. **Chiave browser.** `public/supabase-config.json` contiene già URL progetto e chiave Publishable; non sostituirla con una chiave `secret` o `service_role`.
4. **URL Auth ed email.** Mantieni configurati Site URL, redirect di recupero effettivamente usati e un mittente SMTP verificato per email di conferma/recupero. Controlla Spam e i log Auth se un messaggio non arriva.

## Creare o verificare l’account di accesso

L’app registra il titolare con **username, email e password**. L’accesso ordinario usa username e password; l’email resta necessaria per confermare l’account e recuperare la password. Il login username richiede la Edge Function `login-with-username` e le migrazioni `20261110000000_employees_capacity_and_usernames.sql` e `20261110220224_employee_archive_and_username_backfill.sql`. Gli account Auth distinti continuano ad avere dati separati per proprietario: non creare un secondo account se deve condividere i dati del primo salone.

1. Per un nuovo account, apri **Crea un account** dalla schermata di accesso e inserisci username, email e password. Se la conferma email è attiva, completa la registrazione dal messaggio ricevuto.
2. Per l’account Auth già esistente, le migrazioni creano o riparano uno username usando i metadati Auth validi o, in mancanza, la parte dell’email prima di `@`; in caso di collisione provano un suffisso univoco. Usa quel valore per il primo accesso username.
3. Non inserire utenti o password via SQL. Non usare un secondo account Auth per simulare un dipendente: i dipendenti si gestiscono nella schermata **Dipendenti** e restano sotto lo stesso proprietario.

Non scrivere in `auth.users` né impostare password con SQL. Non condividere inviti o URL di recupero: possono contenere token di sessione; se un link è già stato condiviso, non riutilizzarlo e genera un nuovo flusso dal pannello.

## Recuperare la password

1. Apri **Password dimenticata?** dalla schermata di accesso: si apre la pagina dedicata, dove inserire l’email dell’account.
2. La conferma è volutamente generica e non garantisce la consegna. Se arriva l’email, apri il link nello stesso browser e imposta una nuova password di almeno 8 caratteri.
3. Se non arriva nulla, controlla l’indirizzo, Spam, configurazione SMTP e **Authentication → Audit Logs**. Il recupero non crea un account.

## Provare l’app in locale

Dal repository esegui `npm run serve` e apri `http://localhost:4200/login`. Non modificare l’URL del progetto Supabase o il Site URL di produzione: deve essere ammesso solo il redirect locale nella allow-list. La build locale usa lo stesso progetto Supabase remoto, quindi gli inserimenti di prova vengono salvati lì; usa solo dati fittizi.

## Aggiungere sei clienti e appuntamenti fittizi

Dopo aver verificato l’account Auth e che la migrazione è applicata, apri `supabase/seed-example-clients.sql`, sostituisci **entrambe** le occorrenze di `sissy@example.com` con l’email esatta del proprietario e lancia lo script nel SQL Editor. Lo script aggiunge sei clienti e relativi appuntamenti futuri; se l’email non coincide con un account Auth inserisce zero righe. I nominativi e i numeri sono segnaposto, le note indicano che i record sono fittizi e il consenso WhatsApp è `false`. Non inviare messaggi a questi dati e cancellali prima dell’uso reale.

## Limiti e sicurezza

RLS è obbligatoria anche se la chiave Publishable è pubblica. Non usare credenziali demo o chiavi privilegiate nel browser. Il pulsante WhatsApp prepara un link `wa.me` e lascia l’invio manuale all’operatore; inviare promemoria solo dopo aver verificato il consenso del cliente.
