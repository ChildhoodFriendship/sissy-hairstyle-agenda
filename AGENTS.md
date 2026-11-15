# AGENTS.md — Sissy Hairstyle Agenda

## Ambito e confini

Queste istruzioni si applicano alla repository `sissy-hairstyle-agenda`. È una singola applicazione web Angular/TypeScript per la gestione dell’agenda di un salone. Prima di intervenire, verificare la root Git, branch, remoti, working tree e configurazioni pertinenti; preservare ogni modifica preesistente.

## Struttura verificata

- `src/main.ts`, `src/app/` — bootstrap Angular, configurazione e schermate.
- `src/app/components/` — interfaccia per login, recupero password e agenda.
- `src/app/api/` — autenticazione, client Supabase e repository dati.
- `src/app/library/` — modelli e logica di dominio.
- `src/bundle/` — risorse linguistiche dell’interfaccia.
- `public/` — asset e configurazione runtime pubblica; non inserire credenziali segrete.
- `supabase/` — configurazione, migrazioni SQL, Edge Function e istruzioni di setup.
- `docs/wiki/` — documentazione tecnica e funzionale; `docs/wiki/index.md` è l’indice e `docs/wiki/SCHEMA.md` ne definisce le regole.
- `docs/manual/` — manuale utente in italiano.
- `docs/todo` — richieste e attività di prodotto.
- `package.json`, `package-lock.json`, `angular.json`, `tsconfig*.json` — dipendenze e configurazione Angular/TypeScript.
- `dist/` — output generato: non trattarlo come fonte e non committarlo salvo richiesta esplicita.

Verificare sempre i percorsi e i simboli nel tree corrente; l’elenco non sostituisce l’ispezione dei file coinvolti.

## Applicazione e integrazioni

L’applicazione offre login, recupero password e un’agenda per appuntamenti, clienti, dipendenti e impostazioni del salone. Le route applicative sono definite in `src/app/app.routes.ts`; la configurazione Supabase è caricata a runtime da `/supabase-config.json` in `src/main.ts`. Il codice include repository Supabase e repository locale: verificare il selettore e la configurazione attivi prima di descrivere o modificare il comportamento effettivo.

L’autenticazione e i dati remoti dipendono dal progetto Supabase configurato, dalle migrazioni, dalle policy e dalla Edge Function presenti in `supabase/`. L’esistenza dei file non dimostra che un deployment sia attivo o configurato correttamente. I promemoria WhatsApp preparano un collegamento/testo per revisione e invio manuale; non affermare che l’app invii automaticamente messaggi. Consultare la wiki e le istruzioni Supabase per i dettagli verificati e i limiti.

## Strumenti e comandi dichiarati

La repository dichiara npm `11.4.1`, Angular CLI e gli script seguenti in `package.json`:

- `npm run serve` — server di sviluppo Angular.
- `npm run build` — build Angular.
- `npm test` — suite di test dichiarata.
- `npm run validate-wiki` — validazione documentale.

Eseguire i comandi dalla root e solo dopo aver controllato le istruzioni di progetto e i vincoli ambientali. Installazioni, build e test non sono autorizzati su questa VM per il lavoro corrente; non aggirare tale limite tramite wrapper o strumenti alternativi. Dichiarare esplicitamente le verifiche non eseguite.

## Convenzioni e sicurezza

- Conservare i confini Angular esistenti, i collegamenti template/stili, le route, gli identificatori e i contratti Supabase.
- Per UI e documentazione rispettare la lingua e i nomi visibili effettivamente presenti; non inventare funzionalità o dati di prodotto.
- Non leggere, stampare, copiare o committare `.env`, token, password, chiavi private o credenziali. Usare solo valori pubblici e segnaposto nei file di esempio.
- Non modificare migrazioni, policy o configurazioni di servizi senza comprenderne gli effetti e l’ambito.

## Documentazione

Prima di modificare la wiki, leggere `docs/wiki/SCHEMA.md`, `docs/wiki/index.md`, la pagina di area e la pagina bersaglio pertinenti. Verificare i fatti nel codice e nelle configurazioni; aggiornare i collegamenti e l’indice interessati. Mantenere la wiki in inglese come stabilito dallo schema e il manuale utente secondo la lingua del documento. Dopo ogni modifica alla documentazione, aggiornare la pagina o l’indice wiki pertinente. Usare `~/GUIDE/templates/Project-User-Manual-Schema.md` solo come struttura editoriale iniziale: adattarla al prodotto verificato e lasciare segnaposto per i dati ignoti; non dichiarare conformità normativa senza evidenze.

## Verifiche e Git

- Non dichiarare build, test, deploy, autenticazione o comportamento di servizi riusciti senza evidenza reale.
- Quando consentito, eseguire controlli statici circoscritti e `git diff --check`; riportare esattamente cosa è stato eseguito.
- Prima di ogni commit o push, verificare branch, remote, identità Git, working tree e contenuto completo delle modifiche. Preservare modifiche preesistenti e non includere file generati o segreti.
- Commit e push sono consentiti solo su richiesta esplicita dell’utente. Dopo un push autorizzato, leggere lo stato remoto per verificarne il risultato.
