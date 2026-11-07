# Handoff temporaneo — Agenda Sissy

> Per una nuova chat: leggi questo file prima di intervenire. È un promemoria temporaneo, non una specifica definitiva; non committarlo senza richiesta.

## Obiettivo e confini

- Continuare il progetto standalone **Agenda Sissy** per Sissy HairStyle. Non modificare il sito esistente `C:\projects\childhood friendship\websites\sissy-hairstyle`.
- Progetto locale: `C:\projects\childhood friendship\websites\sissy-hairstyle-agenda`.
- Interfaccia e testi in italiano. Non inventare indirizzi, date, claim o dati aziendali non confermati.
- Prima di cambiare funzionalità, leggere integralmente e nell’ordine richiesto i file originali in `C:\Users\pardi\Downloads\sissy\sissy\`: `sissy-task.md`, `SCHEMA.md`, `AGENTS.md`. Gerarchia: SCHEMA > AGENTS > TASK.
- Per promemoria WhatsApp, richiedere consenso esplicito sì/no sia per il cliente sia per il modulo; niente invio automatico.

## Stato dell’app

L’app Angular è un prototipo frontend-only: login dimostrativo, dashboard/agenda, appuntamenti, clienti derivati, consensi WhatsApp e apertura manuale dei messaggi, impostazioni, backup JSON e PWA. I dati sono conservati nel browser (`localStorage`); non c’è backend né autenticazione sicura. Non inserire dati reali di clienti e non presentarla come sistema pronto per uso operativo. Vercel serve la SPA con fallback; il deployment è impostato `noindex, nofollow`.

## GitHub e Vercel — stato verificato il 6 novembre 2026

- Repo pubblica: `https://github.com/ChildhoodFriendship/sissy-hairstyle-agenda`, branch `main`.
- Commit pushato: `e1f99102503e57401a20023e3b3ce523a1fb0a53`.
- Progetto Vercel `sissy-hairstyle-agenda`, team Childhood Friendship; project ID `prj_LU5Ov5UKK4QnBrZvSaMopkLj7uZC`.
- Deployment di produzione `READY`; URL: `https://sissy-hairstyle-agenda.vercel.app`.
- Smoke check reale: HTTP 200, titolo `Agenda Sissy · Area demo`, header `X-Robots-Tag: noindex, nofollow`.
- Il push iniziale era rimasto in attesa del credential helper globale; verificato che non fosse avvenuto, poi riuscito con `gh auth git-credential` limitato al singolo comando. La configurazione globale non è stata cambiata.

## Verifiche e limiti tecnici

- `npm ci`: riuscito; audit ha segnalato 16 vulnerabilità moderate.
- `npm test -- --watch=false`: 10 test superati.
- `npm run build`: riuscito. In locale era attivo Node `v23.11.0`, che ha prodotto warning di engine per Angular; il progetto Vercel usa Node `26.x` e il deployment è riuscito.
- `npm run validate-wiki`: fallisce perché manca `src/scripts/validate-wiki.mjs`.
- `npm run lint`: fallisce perché lo script `lint` non è definito.
- Il README è ancora quello scaffold Angular e la wiki/validazione necessitano completamento.

## File da non ignorare / gate

Il `AGENTS.md` locale del progetto contiene istruzioni per una diversa applicazione MACS Webapp, non per Sissy. Un precedente tentativo di modificarlo è stato bloccato dal gate con divieto esplicito di riprovare o aggirare la modifica. Non modificarlo né tentare la stessa modifica tramite un altro strumento/percorso; consultare i file originali in Downloads e seguire il gate previsto. Per il push già effettuato, `AGENTS.md`, `hermes/TASK.md` e `.vscode/` sono stati lasciati fuori dal commit. Restano file locali non tracciati.

GitHub secret-scanning non era disponibile e non è stata verificata tutta la cronologia: non dichiarare il repository privo di segreti. Non leggere, stampare o salvare valori di `.env`, token o chiavi private.
