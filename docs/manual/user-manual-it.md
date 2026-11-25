# Sissy Hairstyle Agenda

## Manuale utente

**Versione applicativa:** da completare prima della distribuzione

**Lingua:** italiano

## Informazioni sul documento

Questo manuale descrive i flussi visibili all’operatore. Prima di distribuirlo, il gestore deve verificare la versione dell’app e completare i recapiti di assistenza riportati alla fine. Le funzioni che dipendono da Supabase sono disponibili solo quando l’istanza è configurata.

## Indice

- [1. Introduzione](#1-introduzione)
- [2. Panoramica del software](#2-panoramica-del-software)
- [3. Primi passi](#3-primi-passi)
- [4. Panoramica dell’interfaccia](#4-panoramica-dellinterfaccia)
- [5. Moduli dell’interfaccia](#5-moduli-dellinterfaccia)
- [6. Risoluzione dei problemi](#6-risoluzione-dei-problemi)
- [7. Informazioni di supporto](#7-informazioni-di-supporto)

## Glossario

| Termine | Significato |
|---|---|
| Appuntamento | Prenotazione con cliente, data, ora e, quando indicati, servizio, note e persona assegnata. |
| Cliente in rubrica | Contatto mostrato nella schermata **Clienti**. Un appuntamento può contenere i dati di una cliente senza aggiungerla alla rubrica. |
| Dipendente | Persona del team assegnabile agli appuntamenti quando è attiva; non è un account di accesso separato. |
| Consenso WhatsApp | Consenso registrato per il cliente e richiesto per preparare dall’app il collegamento a WhatsApp. |
| Promemoria | Testo preparato dall’app e aperto in WhatsApp per revisione e invio manuale. |

## 1. Introduzione

Questo manuale spiega come accedere a Sissy Hairstyle Agenda e usare l’agenda, la rubrica clienti, il team e le impostazioni. È rivolto alla persona che gestisce il salone con un account autorizzato.

L’interfaccia descritta non garantisce che un’istanza specifica sia configurata o raggiungibile. Registrazione, accesso, salvataggio dei dati e consegna delle email dipendono anche dalla configurazione del gestore.

## 2. Panoramica del software

L’applicazione consente di consultare e gestire gli appuntamenti per data, aggiungere clienti e dipendenti, configurare i servizi e il testo dei promemoria, e scegliere il tema chiaro o scuro. Gli appuntamenti possono essere assegnati a Sissy o a un dipendente attivo.

Quando il backend è configurato, i dati del salone sono associati all’account autenticato. Le preferenze del tema e la sessione di accesso restano nel browser. Un messaggio WhatsApp non viene inviato automaticamente: l’app prepara un collegamento che l’operatore deve controllare e inviare manualmente.

## 3. Primi passi

### Creare un account

1. Nella schermata di accesso scegli **Crea un account**.
2. Inserisci username, email e password rispettando i requisiti mostrati dall’app.
3. Scegli **Crea account** e segui l’eventuale richiesta di conferma inviata all’email.

La registrazione dipende dalla configurazione Supabase dell’istanza. La conferma mostrata dall’app non prova che un’email sia stata consegnata. Se non puoi registrarti o non ricevi il messaggio, contatta il gestore.

### Accedere

1. Inserisci username e password dell’account.
2. Scegli **Accedi**.
3. Se l’accesso non riesce, verifica i dati e l’eventuale conferma email; per assistenza contatta il gestore senza condividere la password.

### Recuperare la password

1. Scegli **Password dimenticata?** nella schermata di accesso.
2. Inserisci l’email associata all’account e invia la richiesta.
3. Controlla posta in arrivo e Spam. La conferma generica a schermo non dimostra che il messaggio sia stato consegnato.
4. Se ricevi il link, aprilo nello stesso browser, imposta una nuova password e salvala.

## 4. Panoramica dell’interfaccia

Dopo l’accesso, la navigazione permette di aprire **Agenda**, **Clienti**, **Dipendenti** e **Impostazioni**. Su desktop la navigazione è nella barra laterale; sugli schermi più stretti si sposta nella parte inferiore.

Nell’agenda scegli la data da consultare e passa tra le colonne di Sissy e dei dipendenti attivi. Per gli schermi stretti puoi scorrere orizzontalmente le colonne oppure selezionare una sola persona. I controlli del tema sono disponibili nella schermata di accesso e nell’area di lavoro.

Le finestre di conferma e modifica si aprono nella parte alta della schermata con un’animazione breve. Gli avvisi di operazione appaiono in alto e possono essere chiusi con il pulsante X.

## 5. Moduli dell’interfaccia

### 5.1 Agenda

L’agenda mostra gli appuntamenti della data selezionata, divisi per Sissy e per ciascun dipendente. La scheda indica il totale degli appuntamenti. Usa **Giorno precedente**, **Giorno successivo** o **Oggi** per cambiare data; su schermi stretti puoi scorrere tra le colonne o filtrare la vista a una sola persona.

#### Creare un appuntamento

1. Apri **Agenda** e scegli **Nuovo appuntamento**.
2. Inserisci nome, cognome e telefono della cliente. Seleziona una cliente salvata per precompilare i dati oppure scegli **Nuova cliente** per svuotare i campi.
3. Se la nuova cliente deve comparire nella rubrica, seleziona **Aggiungi anche alla Rubrica Clienti**.
4. Scegli data, ora di inizio, ora di fine e persona assegnata. La durata predefinita è di 30 minuti; puoi selezionare intervalli più lunghi di mezz’ora in mezz’ora, entro il turno. Inserisci, se necessario, servizio, note e consenso WhatsApp.
5. Scegli **Salva appuntamento**. Durante una modifica, scegli **Salva modifiche**.

Inserisci un numero italiano senza prefisso: l’app aggiunge `+39` e rifiuta prefissi internazionali diversi. Data e ora sono selezionate con i controlli disponibili nel modulo.

Quando la gestione dei turni è disponibile, **Modifica turno** permette di impostare una o più fasce per la persona e la data selezionate. Per una pausa crea due fasce; per un giorno di riposo non inserirne. In **Orari liberi**, scegli una mezz’ora per aprire il modulo con data, ora e persona già selezionate. In assenza di turni personalizzati l’app usa la disponibilità predefinita; un turno salvato o un giorno di riposo la sostituisce.

Per lo stesso giorno e ora possono esserci al massimo tre appuntamenti confermati. La stessa persona può seguire più clienti in intervalli sovrapposti: prima del salvataggio l’app mostra gli appuntamenti già presenti e l’intervallo della nuova prenotazione. Scegli **Conferma comunque** solo se vuoi accettare la sovrapposizione; senza conferma l’appuntamento non viene salvato. Se l’agenda cambia durante il salvataggio, l’app aggiorna l’elenco: se restano sovrapposizioni diverse, chiede una nuova conferma; se non ne restano, invita a controllare i dati e salvare di nuovo. Gli appuntamenti annullati o completati non occupano la fascia. Il database precedente non registrava l’ora di fine: dopo la migrazione gli appuntamenti esistenti avranno una durata iniziale di 30 minuti. Correggi la durata degli appuntamenti più lunghi prima di fare affidamento sugli avvisi di sovrapposizione. Se la persona assegnata è stata archiviata, l’app conserva la sua indicazione negli appuntamenti storici.

#### Consultare e modificare

- Apri la freccia sulla scheda per mostrare o nascondere i dettagli e le azioni.
- Scegli **Modifica appuntamento** per aggiornare una scheda.
- Per rimuoverla, scegli **Elimina appuntamento** e conferma nella finestra dell’app. La conferma appare in alto; puoi chiuderla con **Annulla** o con la X.
- Non è disponibile un’azione per annullare o riattivare un appuntamento. Le etichette di stato già presenti restano visibili.

Gli errori di compilazione o di disponibilità sono mostrati nel modulo; l’esito del salvataggio appare come avviso temporaneo in alto. Eliminare una cliente dalla rubrica non elimina gli appuntamenti già registrati.

### 5.2 Clienti

La schermata **Clienti** contiene i contatti visibili nella rubrica. Puoi cercare per nome o telefono, vedere il consenso WhatsApp registrato e il numero di appuntamenti collegati.

#### Gestire la rubrica

1. Apri **Clienti** e scegli **Aggiungi cliente**.
2. Inserisci nome, cognome e telefono; aggiungi eventuali note e salva.
3. Usa **Modifica** per aggiornare un contatto. Per rimuoverlo, scegli **Elimina** e conferma nella finestra che appare in alto.
4. Per iniziare un appuntamento con i dati di una cliente, usa l’icona dell’agenda nella sua riga.

Inserisci il numero italiano senza prefisso `+39`: il prefisso non appare nel campo o nell’elenco, ma viene conservato nei dati. Numeri non validi o con un prefisso internazionale diverso non possono essere salvati. La cancellazione del contatto non elimina gli appuntamenti, che conservano i dati registrati al momento della prenotazione.

### 5.3 Dipendenti

La schermata **Dipendenti** gestisce le persone del team che possono essere assegnate agli appuntamenti.

#### Gestire il team

1. Apri **Dipendenti** e scegli **Aggiungi dipendente**.
2. Inserisci nome e cognome, quindi scegli **Salva dipendente**.
3. Usa **Modifica** per aggiornare i dati.
4. Per rimuovere una persona dal team, scegli **Elimina** e conferma nella finestra dell’app che appare in alto.

La rimozione archivia il dipendente: non viene proposto per nuovi appuntamenti, ma gli appuntamenti storici conservano la sua assegnazione.

### 5.4 Impostazioni

La schermata **Impostazioni** contiene il nome del salone, l’elenco dei servizi e il testo del promemoria.

#### Modificare e salvare le preferenze

1. Apri **Impostazioni** e modifica il **Nome del salone** se necessario.
2. Per aggiungere un servizio, inserisci il nome e scegli **Aggiungi**. Usa **Rimuovi** per eliminarlo dall’elenco.
3. Scegli **Crea o modifica il promemoria** per aprire l’editor. Scrivi il messaggio e usa i pulsanti per inserire nome cliente, data, ora, servizio o nome salone nel punto desiderato.
4. Controlla l’anteprima, che è solo dimostrativa. Scegli **Fatto** per tornare al modulo.
5. Scegli **Salva impostazioni** per salvare le preferenze e i servizi.

Le preferenze del salone e i servizi sono salvati su Supabase nell’account del proprietario; non sono semplici preferenze locali del tema. La disponibilità dipende dalla configurazione del database e dalla connessione. Se compare un avviso di indisponibilità, non considerare le modifiche salvate e contatta il gestore. Il tema e la sessione di accesso restano nel browser.

### 5.5 Promemoria WhatsApp e tema

#### Preparare un promemoria

1. Verifica che il consenso WhatsApp sia registrato per l’appuntamento.
2. Nella scheda aperta dell’appuntamento scegli l’icona di WhatsApp. Se manca il consenso o il numero non è valido per la destinazione italiana, l’azione non apre il collegamento.
3. WhatsApp si apre con il testo precompilato. Rileggi il messaggio e invialo manualmente solo se corretto e autorizzato.

L’applicazione non invia messaggi, non verifica la consegna e non programma invii automatici. L’anteprima del testo nelle impostazioni è un esempio, non un invio.

#### Cambiare tema

Usa il controllo del tema per passare tra chiaro e scuro. La preferenza è conservata nel browser e non viene sincronizzata tra dispositivi; cancellando i dati locali del browser può andare persa.

## 6. Risoluzione dei problemi

### Non riesco a registrarmi o non arriva l’email

Controlla i dati richiesti e riprova. La registrazione può dipendere dalle impostazioni dell’istanza e la conferma a schermo non dimostra che un’email sia stata consegnata. Controlla la posta indesiderata; se il problema continua, contatta il gestore senza inviare password o codici.

### Non riesco ad accedere

Verifica username e password e, se hai appena creato l’account, completa l’eventuale conferma email. Se il problema persiste, contatta il gestore dell’istanza.

### Non riesco a salvare un appuntamento

Controlla i campi obbligatori, la data e l’ora. Per lo stesso orario possono esserci al massimo tre appuntamenti confermati e la stessa persona non può essere assegnata due volte. Se compare un errore, annota il messaggio e contatta il gestore.

### Non vedo fasce orarie disponibili

Verifica che per quella data sia stato impostato un turno per Sissy o per il dipendente attivo. Un giorno senza fasce salvate non mostra orari prenotabili. Gli appuntamenti già presenti restano consultabili.

### Le impostazioni o i servizi mostrano un avviso

Non considerare salvate le modifiche se l’app segnala che le impostazioni o i servizi non sono raggiungibili su Supabase. Contatta il gestore perché verifichi la connessione e la configurazione del database.

### Il pulsante WhatsApp non è disponibile

L’azione richiede il consenso WhatsApp registrato per l’appuntamento e un numero valido per la destinazione italiana. L’app apre WhatsApp solo per consentire la revisione e l’invio manuale.

### Il tema non viene mantenuto

La scelta del tema è conservata nel browser. Se la memoria locale viene cancellata o il browser impedisce l’archiviazione, la preferenza può andare persa.

## 7. Informazioni di supporto

Il gestore deve completare questi dati prima della distribuzione; non inserire recapiti non verificati.

| Informazione | Valore |
|---|---|
| Referente | Da completare dal gestore |
| Email o telefono | Da fornire |
| Orari di assistenza | Da definire |
