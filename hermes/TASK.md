# TASK: Agenda appuntamenti per salone di parrucchieri (frontend-only) + wiki conforme a SCHEMA.md + integrazione sottodominio

## Contesto
Sto sviluppando per una cliente (salone di parrucchieri) un'agenda appuntamenti. Obiettivo finale: la cliente inserisce nome e telefono del cliente, data e ora, e dal suo numero WhatsApp aziendale parte in automatico un promemoria. Per ora costruiamo SOLO il frontend, completo e rifinito come prodotto finale, senza backend reale. Il backend (Supabase + Cloudflare Workers/Netlify Functions + WhatsApp Cloud API) arriverà dopo, quindi l'architettura deve renderne facile l'innesto.

## Gerarchia delle fonti
1. `SCHEMA.md`: autorità assoluta su struttura, metadati, vocabolario e validazione della documentazione. Va seguito alla lettera, senza reinterpretazioni.
2. `AGENTS.md`: istruzioni operative, comandi, convenzioni di codice e sicurezza del repository.
3. Questo prompt: funzionalità del prodotto.

Se questo prompt contrasta con SCHEMA.md sulla documentazione, vince SCHEMA.md. Se contrasta con AGENTS.md su comandi o convenzioni, vince AGENTS.md. Per ambiguità residue scegli l'opzione più conservativa e annotala nel riepilogo finale.

## Fase 0: adattare AGENTS.md e SCHEMA.md a questo progetto
I due file presenti nella cartella provengono da un altro progetto (stack Angular, dominio traffico/dispositivi, più prodotti ed edizioni). Adattali a questo progetto con queste regole.

Mantieni intatto, parola per parola dove possibile, tutto ciò che è struttura normativa di SCHEMA.md: autorità documentale, struttura wiki (`index.md`, `overview.md`, aree con `overview.md`, sezioni), regole strutturali, struttura comune dei documenti con capitoli e ordine, frontmatter (`title`, `status`, `role`, `navigation`, `source`), tipi di navigazione, vocabolario controllato dei verbi, tabelle di variabili e costanti, regole di validazione incrociate.

Rimuovi o sostituisci tutto ciò che è specifico dell'altro progetto:
- nomi di prodotto e azienda, edizioni (tmacs, smacs, c-its, cartesio-*, predict, rsmp-proxy) e la proprietà `edition`;
- RSMP, MQTT, TLC/VMS, dispositivi, identity provider, broker;
- tecnologie non usate qui: l'enum `technology` si riduce ad `angular`;
- sezioni di AGENTS.md su manuale utente, MCP wiki, build-config-examples, localizzazioni multiple;
- esempi del dominio traffico, da sostituire con esempi del dominio salone (agenda, appuntamento, cliente, servizio, promemoria).

Percorsi: repository a progetto singolo. Wiki in `docs/wiki/`, `AGENTS.md` nella root, `SCHEMA.md` in `docs/wiki/SCHEMA.md`. Aggiorna di conseguenza la tabella dell'autorità documentale e gli alberi di esempio.

AGENTS.md deve descrivere questo progetto: struttura reale delle cartelle, confini (frontend-only, nessuna persistenza server, nessun invio WhatsApp reale), comandi reali (`npm ci`, `npm run serve`, `npm run build`, `npm run lint`, `npm test`, `npm run validate-wiki`, `git diff --check`), regole di sicurezza del repo. Dichiara solo comandi che esistono davvero: crea gli script prima di documentarli.

Lingua: wiki in inglese (come da SCHEMA), UI dell'app in italiano.

Nessun riferimento all'altro progetto o all'azienda di origine deve restare in nessun file. Al termine mostrami un riepilogo breve: cosa hai rimosso, cosa hai mantenuto, cosa hai sostituito. Poi prosegui senza attendere.

## Fase 1: pulizia della documentazione esistente
Obiettivo: `docs/` contiene solo ciò che SCHEMA.md adattato prevede, cioè `docs/wiki/SCHEMA.md`, `index.md`, `overview.md`, le aree con il loro `overview.md` e le sezioni raggiunte dall'index. `AGENTS.md` resta nella root.

1. Inventaria `docs/` e ogni altro `.md` di documentazione, e classificali: mantieni, riscrivi, elimina.
2. Elimina ogni file di documentazione che lo SCHEMA non prevede (es. `changelog.md`, `roadmap.md`, cartelle `manual/`, `build-config-examples/`, file orfani o non linkati dall'index).
3. Ambito rigoroso: solo documentazione. NON toccare mai sorgenti, `package.json` e lockfile, file di configurazione, `.git`, la cartella hermes, il sito esistente, né qualunque file fuori da `docs/` non classificabile come documentazione. Se un file ti sembra da eliminare ma è fuori ambito, elencalo nel riepilogo senza cancellarlo.
4. Sicurezza: prima di eliminare esegui `git status`. Elimina con `git rm` solo file tracciati. Per file non tracciati, elencali e chiedimi conferma prima di cancellarli. Non fare commit.
5. Alla fine riportami l'elenco esatto dei file rimossi e di quelli riscritti.

## Fase 2: webapp frontend-only (prodotto finale, senza backend)
Stack: Angular (ultima LTS), componenti standalone, TypeScript strict, `@angular/service-worker` per la PWA. Stile a tua scelta (CSS o Tailwind), senza dipendenze superflue; pinna le versioni. UI interamente in italiano con testi centralizzati in `src/bundle/` (solo `it`), mobile-first (la useranno dal telefono, anche in piedi nel salone), tocchi grandi e inserimento rapido.

Struttura, in linea con AGENTS.md: componenti in `src/app/components/`, repository e auth in `src/app/api/`, tipi di dominio, template dei messaggi, normalizzazione telefono, rilevamento conflitti e calcolo promemoria in `src/app/library/`.

Funzionalità:
- **Login** (vedi Auth).
- **Agenda giornaliera** (default oggi) con navigazione giorno precedente/successivo e selettore data, appuntamenti ordinati per ora. Vista settimanale solo se non complica.
- **Nuovo appuntamento** in un form velocissimo (obiettivo 10 secondi): nome cliente, telefono (validazione e normalizzazione in formato internazionale, default +39), data, ora, servizio (opzionale, lista configurabile), note (opzionale).
- **Modifica, annulla ed elimina**, con stato `confermato`, `annullato`, `completato`.
- **Conflitti**: avviso se esiste già un appuntamento nello stesso orario.
- **Messaggi WhatsApp simulati**: anteprima del messaggio di conferma e del promemoria (giorno prima) da template modificabili con segnaposto `{nome}`, `{data}`, `{ora}`, `{servizio}`, `{salone}`. Stato invio (`da inviare`, `inviato (simulato)`). Pulsante "Apri in WhatsApp" con `https://wa.me/<numero>?text=<messaggio>` come fallback manuale. NESSUN invio reale.
- **Impostazioni**: nome salone, template messaggi, servizi, orari di apertura.
- **Rubrica clienti** con ricerca per nome/telefono e autocompletamento nel form.
- **PWA**: manifest, icone, service worker, installabile, `scope` e `start_url` sulla radice del sottodominio.
- Stati vuoti, caricamento ed errori curati; accessibilità di base; tema chiaro, pulito, professionale (settore beauty/hair).

Architettura dati:
- Tutta la persistenza passa da interfacce repository asincrone (`AppointmentRepository`, `ClientRepository`, `SettingsRepository`).
- L'implementazione attuale usa `localStorage` (`LocalStorageRepository`), isolata in un solo modulo, così il futuro `ApiRepository`/`SupabaseRepository` non toccherà UI e logica.
- Tipi e validazione condivisi, allineati alle pagine di modello dati della wiki.
- Seed di dati demo attivabile/disattivabile dalle impostazioni, con "Esporta/Importa JSON" per backup manuale.
- La logica "promemoria il giorno prima" vivrà in futuro nel backend (cron): nel frontend esponi solo una funzione pura che calcola quali appuntamenti avrebbero il promemoria in scadenza.

## Auth temporanea
- Login con username `admin` e password `admin`, scritti nel codice.
- Tutto isolato in un solo servizio (`AuthService` con `login`, `logout`, `isAuthenticated`) in `src/app/api/`, così verrà sostituito da Supabase Auth senza toccare il resto.
- Sessione in `sessionStorage` (o `localStorage` con "resta connesso"), route guard su tutte le rotte tranne il login, logout visibile.
- Rate limit finto lato client (blocco 30 secondi dopo 5 tentativi) solo come deterrente.
- Commento chiaro nel codice e documentazione nella wiki: le credenziali sono visibili a chiunque ispezioni il bundle, protezione solo provvisoria. Nessun dato personale reale finché non esiste un backend con autenticazione vera.

## Fase 3: wiki conforme a SCHEMA.md
Scrivi la wiki in `docs/wiki/` seguendo SCHEMA.md adattato in ogni dettaglio: `index.md`, `overview.md` radice, aree con un solo `overview.md` ciascuna e relative sezioni, frontmatter completo, capitoli nell'ordine previsto (omettendo quelli non applicabili, `Description` sempre presente), `Description` che definisce prima il soggetto, vocabolario controllato per `Functional Characteristics`, link relativi validi, nessuna duplicazione tra index, overview e sezioni.

Aree suggerite (adeguale se lo SCHEMA lo richiede):
- `scheduling`: agenda giornaliera, form appuntamento, rilevamento conflitti, stati.
- `clients`: rubrica e autocompletamento.
- `messaging`: template, anteprime, fallback wa.me, calcolo promemoria.
- `settings`: salone, servizi, orari, import/export, dati demo.
- `access`: login temporaneo, limiti di sicurezza, piano di sostituzione.
- `data`: entità (Appointment, Client, Service, Message Template, Settings) come sezioni `config-data` con `Description` e `Variables` nella stessa pagina, repository e persistenza locale.
- `deployment`: sottodominio, DNS, PWA, noindex/robots, link dalla landing.
- `backend-migration`: backend, invio WhatsApp reale, Supabase Auth, notifiche. Pagine con `status: draft` e senza `source` inventati (regola 13 dello SCHEMA).

Le `source references` devono puntare solo a file realmente esistenti: scrivi lo scheletro delle pagine insieme alla webapp e completa i riferimenti dopo aver scritto il codice. Il changelog non è previsto dallo SCHEMA: non crearlo.

Crea inoltre `npm run validate-wiki` (script in `src/scripts/`) che verifica almeno: frontmatter obbligatorio e valori degli enum, ordine dei capitoli, link relativi esistenti, ogni sezione linkata dal proprio `overview.md`, ogni overview e sezione linkata dall'`index.md`, source references che puntano a file esistenti.

## Fase 4: integrazione col sito esistente tramite sottodominio
Dati: sito esistente su `[DOMINIO, es. salone.it]`, stack/hosting `[WordPress / Wix / Next.js / HTML statico / non so]`, webapp su `agenda.[DOMINIO]`.

1. Verifica lo stack e l'hosting del sito esistente se hai accesso al repo o ai file, e dimmi cosa hai trovato. Se non è determinabile, procedi con l'opzione sottodominio generica.
2. Prepara la webapp per il deploy su `agenda.[DOMINIO]` come progetto separato, con configurazione per `[Cloudflare Workers/Pages | Netlify]` (lo stesso provider del sito se noto) e fallback SPA (tutte le route su `index.html`).
3. Documenta in `docs/wiki/deployment/` i passaggi DNS: record `CNAME` da `agenda` verso il target del provider, custom domain e HTTPS.
4. SEO e privacy: `<meta name="robots" content="noindex, nofollow">` ovunque, `robots.txt` con `Disallow: /`, header `X-Robots-Tag: noindex` nella configurazione di hosting.
5. Snippet pronto (HTML e, se riconosci lo stack, versione adatta) per un link discreto "Area riservata" nel footer del sito esistente verso `https://agenda.[DOMINIO]`. Non modificare il sito esistente senza mia conferma esplicita: proponi la modifica come diff o snippet.
6. Se lo stack permette un sotto-percorso `/admin` in modo pulito, descrivilo nella wiki come alternativa. L'implementazione di default resta il sottodominio.

## Regole di lavoro
- Ordine: Fase 0, Fase 1, Fase 2 con scheletro wiki, completamento Fase 3, Fase 4. Fermati e chiedimi conferma solo se trovi conflitti non risolvibili con la gerarchia delle fonti, file non tracciati da eliminare o qualsiasi azione fuori ambito.
- Test unitari per: normalizzazione telefono, generazione messaggi dai template, rilevamento conflitti, calcolo promemoria. Usa il test runner di default della versione di Angular scelta e aggiungi lo script `npm test`.
- Esegui lint, build, test, `npm run validate-wiki`, `git diff --check` e `git status --short` prima di chiudere. Non dichiarare passati comandi che non hai eseguito. Una build locale non dimostra comportamento in produzione o accettazione nel browser: dillo.
- Non fare commit, push o riscritture della storia. Non committare `dist/`.
- Riepilogo finale: file creati, modificati e rimossi, come avviare in locale, cosa resta da fare per il backend, decisioni prese al posto mio.