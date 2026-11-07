# Supabase — configurazione, accesso e dati di prova

Questa guida descrive la configurazione del progetto Supabase **sissy hairstyle agenda**, l’attivazione dell’account operatore, il recupero password e i dati dimostrativi.

## Stato verificato del progetto

Verifica read-only del 7 novembre 2026: in `auth.users` esiste un utente confermato con l’email configurata nel seed. `public.clients` e `public.appointments` contengono 7 righe ciascuna: 6 per tabella sono i record fittizi di questo seed e 1 per tabella non è marcata come seed; verifica quelle due righe in dashboard prima di modificarle o cancellarle. Se serve un account separato per Sissy, non risulta ancora creato.

La schermata **Password dimenticata?** ha risposto: quel messaggio generico è intenzionale e non prova che sia stata inviata un’email. Supabase non invia il link se l’indirizzo non corrisponde a un account, ma restituisce comunque una risposta generica per non rivelare quali email siano registrate. Il recupero password non crea utenti.

## Configurazione del progetto

1. **Database e RLS.** Nel progetto corretto, il SQL Editor può eseguire `supabase/migrations/20261107000000_create_agenda_core.sql` per una nuova installazione. In questo progetto le tabelle e le policy RLS sono già presenti: non rieseguire la migrazione senza prima verificare lo schema. La migrazione crea solo tabelle e policy, non crea utenti né password.
2. **Chiave browser.** La configurazione locale `public/supabase-config.json` contiene l’URL `https://jawxcjkheoarslyvupir.supabase.co` e una chiave di tipo Publishable. Se la config viene rigenerata o il valore manca, in **Project Settings → API Keys** copia esclusivamente la chiave **Publishable** (`sb_publishable_…`) nel campo `publishableKey`. È una chiave destinata al browser e può essere distribuita con l’app; l’accesso ai dati è protetto dalle policy RLS. Non inserire mai chiavi `secret` o `service_role` in `public/`, nel codice frontend, in Git o in chat.
3. **URL Auth.** In **Authentication → URL Configuration** imposta:
   - **Site URL**: `https://sissy-hairstyle-agenda.vercel.app` (origine senza percorso/query), come destinazione predefinita degli inviti senza redirect esplicito.
   - **Redirect URLs**: `https://sissy-hairstyle-agenda.vercel.app`, `https://sissy-hairstyle-agenda.vercel.app/login?recovery=1` e `http://localhost:4200/login?recovery=1` per i test locali. La allow-list autorizza destinazioni, ma non sceglie il Site URL. Non impostare `localhost:3000`: l’app Angular locale usa la porta `4200`.
4. **Email.** In **Authentication → Emails** (sezione **Notifications**) configura **Custom SMTP / SMTP Settings** e un mittente verificato per inviti e recupero verso indirizzi ordinari. Inserisci le credenziali SMTP solo nel pannello Supabase. Il provider predefinito è per test: invia solo agli indirizzi del team del progetto, ha un limite complessivo di 2 email/ora e non garantisce la consegna. Controlla anche Spam e i log Auth quando un’email non arriva.

## Creare o verificare l’account di accesso

L’accesso è con **email e password**. `sissy` e `admin` possono essere etichette informali, ma non sono username separati e `admin` non ha privilegi speciali. Ogni account vede esclusivamente le proprie righe grazie a RLS: un secondo account Sissy avrà un’agenda separata e vuota. Se deve condividere i dati del primo account, fermati prima di invitarla: servono un modello e policy per utenti del medesimo salone, non basta creare un secondo utente Auth.

1. Apri **Authentication → Users** e controlla l’indirizzo esatto dell’account esistente. Deve coincidere con l’email digitata nella schermata di login.
2. Se non c’è un account con l’indirizzo desiderato, scegli **Add user → Send invitation**, inserisci quell’indirizzo esatto e invia l’invito. L’invito crea un utente Auth in attesa; il link ricevuto conferma l’indirizzo e completa la configurazione. Se l’account esiste già, usa quello invece di crearne un duplicato.
3. Dopo aver accettato l’invito, apri l’app e imposta la password tramite **Password dimenticata?** se non ne hai già una. La richiesta deve usare la stessa email registrata in Auth. Se il link di invito porta a Vercel, è la destinazione predefinita impostata sopra; i test del recupero avviati dall’app locale tornano invece a `http://localhost:4200/login?recovery=1`.

Non scrivere in `auth.users` né impostare password con SQL. Non condividere inviti o URL di recupero: possono contenere token di sessione; se un link è già stato condiviso, non riutilizzarlo e genera un nuovo flusso dal pannello.

## Recuperare la password

1. Verifica prima in **Authentication → Users** che esista l’account e che la sua email coincida esattamente con quella inserita nella pagina di accesso.
2. Se l’utente non esiste, crea/invita prima l’account seguendo la sezione precedente. La richiesta di recupero non registra utenti e non invia email per indirizzi non associati a un account.
3. Se l’utente esiste, seleziona **Password dimenticata?**. La conferma mostrata è volutamente generica; non garantisce la consegna. Se non arriva nulla, controlla email dell’account, Spam, configurazione SMTP, eventuali limiti di invio e **Authentication → Audit Logs**.
4. Apri il link ricevuto sullo stesso browser e imposta una password nuova di almeno 8 caratteri. Non copiare o inoltrare la URL completa.

## Provare l’app in locale

Dal repository esegui `npm run serve` e apri `http://localhost:4200/login`. Non modificare l’URL del progetto Supabase o il Site URL di produzione: deve essere ammesso solo il redirect locale nella allow-list. La build locale usa lo stesso progetto Supabase remoto, quindi gli inserimenti di prova vengono salvati lì; usa solo dati fittizi.

## Aggiungere sei clienti e appuntamenti fittizi

Dopo aver verificato l’account Auth e che la migrazione è applicata, apri `supabase/seed-example-clients.sql`, sostituisci **entrambe** le occorrenze di `sissy@example.com` con l’email esatta del proprietario e lancia lo script nel SQL Editor. Lo script aggiunge sei clienti e relativi appuntamenti futuri; se l’email non coincide con un account Auth inserisce zero righe. I nominativi e i numeri sono segnaposto, le note indicano che i record sono fittizi e il consenso WhatsApp è `false`. Non inviare messaggi a questi dati e cancellali prima dell’uso reale.

## Limiti e sicurezza

RLS è obbligatoria anche se la chiave Publishable è pubblica. Non usare credenziali demo o chiavi privilegiate nel browser. Il pulsante WhatsApp prepara un link `wa.me` e lascia l’invio manuale all’operatore; inviare promemoria solo dopo aver verificato il consenso del cliente.
