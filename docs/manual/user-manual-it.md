# Sissy Hairstyle Agenda

## Manuale utente

**Versione software:** da confermare

**Lingua:** italiano

---

## Indice

- [Informazioni sul documento](#informazioni-sul-documento)
- [Cronologia revisioni](#cronologia-revisioni)
- [Glossario](#glossario)
- [1. Introduzione](#introduzione)
- [2. Panoramica del software](#panoramica-del-software)
- [3. Primi passi](#primi-passi)
- [4. Panoramica dell’interfaccia](#panoramica-dellinterfaccia)
- [5. Moduli dell’interfaccia](#moduli-dellinterfaccia)
  - [5.1 Agenda](#agenda)
  - [5.2 Clienti](#clienti)
  - [5.3 Dipendenti](#dipendenti)
  - [5.4 Impostazioni](#impostazioni)
  - [5.5 Promemoria WhatsApp e tema](#promemoria-whatsapp-e-tema)
- [6. Risoluzione dei problemi](#risoluzione-dei-problemi)
- [7. Informazioni di supporto](#informazioni-di-supporto)

## Informazioni sul documento

| Campo | Valore |
|---|---|
| ID documento | Da assegnare |
| Nome software | Sissy Hairstyle Agenda |
| Versione software | Da confermare |

Questa è una bozza Markdown adattata al modello `Project-User-Manual-Schema.md`. Non è un documento Word/PDF impaginato: screenshot, logo e dati di contatto non sono stati forniti o verificati. I passaggi descrivono l’interfaccia e la documentazione del progetto; non attestano che un’istanza Supabase o la consegna delle email siano attive.

## Cronologia revisioni

| Revisione | Data | Descrizione |
|---|---|---|
| 0.1 | 2026-11-13 | Prima bozza italiana basata sulle schermate e sulle guide del progetto; verifica visiva e configurazione live non eseguite. |

## Glossario

### Acronimi e abbreviazioni

| Acronimo / abbreviazione | Significato |
|---|---|
| Nessuno | Non sono necessari acronimi per seguire le procedure di questa bozza. |

### Concetti

| Concetto | Definizione |
|---|---|
| Appuntamento | Prenotazione con cliente, data, ora e, quando indicati, servizio, note e persona assegnata. |
| Cliente in rubrica | Contatto visibile nella schermata **Clienti**. Un contatto collegato a un appuntamento può non comparire nella rubrica se non viene selezionata l’opzione dedicata. |
| Dipendente | Persona registrata nel team del salone e assegnabile agli appuntamenti quando è attiva. Non è un account di accesso separato. |
| Consenso WhatsApp | Consenso registrato per il cliente; è necessario per preparare dall’app un collegamento al messaggio WhatsApp. |
| Promemoria | Testo preparato dall’app e aperto in WhatsApp per la revisione e l’invio manuale dell’operatore. |
| Account titolare | Account Auth che accede ai dati del proprio salone. Account distinti hanno dati separati. |

<a id="introduzione"></a>
## 1. Introduzione

Questo manuale spiega come accedere a Sissy Hairstyle Agenda e usare agenda, rubrica clienti, team, impostazioni e preparazione dei promemoria. È rivolto alla persona che gestisce il salone con un account autorizzato.

La guida non sostituisce la configurazione dell’istanza: registrazione, conferma email, accesso e salvataggio dei dati dipendono anche dalle impostazioni e dai servizi predisposti dal gestore.

<a id="panoramica-del-software"></a>
## 2. Panoramica del software

Sissy Hairstyle Agenda permette di:

- consultare gli appuntamenti per una data selezionata;
- creare e modificare appuntamenti e assegnarli all’amministratore o a un dipendente attivo;
- gestire clienti e dipendenti;
- impostare il nome del salone, i servizi e il testo dei promemoria;
- preparare un messaggio WhatsApp da controllare e inviare manualmente;
- scegliere il tema chiaro o scuro.

Un messaggio WhatsApp non viene inviato automaticamente dall’app. La preparazione del messaggio e l’interazione con WhatsApp sono due passaggi distinti.

<a id="primi-passi"></a>
## 3. Primi passi

### Creare un account

1. Nella schermata di accesso scegli **Crea un account**.
2. Inserisci uno username (da 3 a 30 caratteri: lettere, numeri, punto, trattino o trattino basso), un indirizzo email e una password di almeno 8 caratteri.
3. Scegli **Crea account**.
4. Quando la registrazione va a buon fine, la schermata chiede: **Controlla la posta elettronica per completare la registrazione.** Se l’istanza richiede la conferma email, apri il messaggio e completa la procedura.

La registrazione autonoma dipende dalle impostazioni di Supabase; se non è disponibile o non ricevi l’email, contatta il gestore dell’istanza. Un account nuovo è separato dagli altri account e non condivide automaticamente i dati di un altro salone. I dipendenti si gestiscono nella schermata **Dipendenti**, non creando account separati.

### Accedere

1. Inserisci lo username e la password dell’account.
2. Scegli **Accedi**.
3. Se l’accesso non riesce, verifica le credenziali e che l’account sia stato completato; in caso di persistenza del problema contatta il gestore.

### Recuperare la password

1. Dalla schermata di accesso scegli **Password dimenticata?**.
2. Inserisci l’email associata all’account e invia la richiesta.
3. La conferma a schermo è generica e non prova che l’email sia stata consegnata. Controlla posta in arrivo e Spam.
4. Se ricevi il link, aprilo nello stesso browser e imposta una nuova password di almeno 8 caratteri.

<a id="panoramica-dellinterfaccia"></a>
## 4. Panoramica dell’interfaccia

Dopo l’accesso, la navigazione permette di aprire **Agenda**, **Clienti**, **Dipendenti** e **Impostazioni**. Su schermi più stretti la navigazione si sposta nella parte inferiore; su desktop è nella barra laterale. I nomi delle sezioni restano gli stessi.

Il selettore del tema è disponibile nella schermata di accesso e nell’area di lavoro. La scelta viene conservata nel browser; non è una preferenza sincronizzata tra account o dispositivi.

**Immagine dell’interfaccia:** non inserita. Aggiungere solo uno screenshot acquisito e verificato sulla versione destinata alla pubblicazione, con testo alternativo descrittivo.

<a id="moduli-dellinterfaccia"></a>
## 5. Moduli dell’interfaccia

Le immagini delle schermate sono lasciate come attività editoriale: non sono state acquisite perché questa bozza non è stata verificata avviando l’app.

<a id="agenda"></a>
### 5.1 Agenda

**Descrizione breve:** mostra gli appuntamenti della data selezionata e consente di crearli, modificarli, annullarli o eliminarli.

**Immagine:** da acquisire e verificare prima della pubblicazione; aggiungere testo alternativo.

**Campi principali del modulo appuntamento**

| Campo | Descrizione |
|---|---|
| Cliente | Seleziona un cliente salvato oppure **Nuova cliente**. Quando selezioni un cliente salvato, i suoi dati vengono precompilati; scegliendo **Nuova cliente** i campi si svuotano. |
| Aggiungi anche alla Rubrica Clienti | Selezionalo per rendere visibile nella schermata **Clienti** la nuova cliente creata dall’appuntamento. |
| Nome, Cognome, Telefono | Dati obbligatori della cliente. Il telefono viene controllato e normalizzato; per i numeri italiani il prefisso predefinito è `+39`. |
| Data, Ora | Dati obbligatori scelti con i selettori del browser. L’orario è selezionabile a intervalli di 30 minuti. |
| Seguito da | Scegli **Admin** o un dipendente attivo. |
| Servizio, Note | Informazioni facoltative; il servizio può rimanere non indicato. |
| Il cliente ha acconsentito a ricevere promemoria WhatsApp | Registra il consenso del cliente. È necessario per abilitare la preparazione del promemoria WhatsApp. |

**Creare un appuntamento**

1. Apri **Agenda** e scegli **Nuovo appuntamento**. Se non ci sono appuntamenti, puoi usare **Crea appuntamento**.
2. Compila i campi obbligatori. Se vuoi collegare una cliente già salvata, selezionala nel campo **Cliente**.
3. Se la nuova cliente deve comparire nella rubrica, seleziona **Aggiungi anche alla Rubrica Clienti**.
4. Scegli data, ora e persona assegnata; aggiungi, se necessario, servizio, note e consenso.
5. Scegli **Salva appuntamento**. Durante la modifica il pulsante è **Salva modifiche**.

Il controllo non ammette più di tre appuntamenti confermati nella stessa data e ora, né due appuntamenti confermati assegnati alla stessa persona nello stesso slot. Gli errori di validazione e i conflitti sono mostrati nel modulo; gli esiti del salvataggio sono mostrati con un avviso temporaneo.

**Consultare e gestire gli appuntamenti**

- Usa il selettore **Giorno selezionato**, i pulsanti **Giorno precedente** e **Giorno successivo**, oppure **Oggi**.
- Nella scheda di un appuntamento scegli **Modifica appuntamento** per aggiornare i dati.
- Scegli **Annulla** per annullare un appuntamento; l’azione disponibile diventa **Ripristina**.
- Scegli **Elimina appuntamento** e conferma la richiesta del browser per cancellare la scheda.
- La cancellazione di un cliente non elimina gli appuntamenti già registrati.

<a id="clienti"></a>
### 5.2 Clienti

**Descrizione breve:** la schermata **Clienti** contiene i contatti visibili nella rubrica.

**Immagine:** da acquisire e verificare prima della pubblicazione; aggiungere testo alternativo.

**Campi principali**

| Campo | Descrizione |
|---|---|
| Nome, Cognome, Telefono | Obbligatori per creare o modificare un contatto. Un numero non valido impedisce il salvataggio. |
| Note | Informazione facoltativa. |
| Consenso WhatsApp registrato | Indica se il cliente ha espresso il consenso. |

**Gestire la rubrica**

1. Apri **Clienti**. Cerca per nome o telefono usando **Cerca per nome o telefono**.
2. Scegli **Aggiungi cliente**, compila i dati e salva.
3. Per aggiornare un contatto usa **Modifica** nella sua riga; per rimuoverlo usa **Elimina** e conferma.
4. Per avviare un appuntamento con i dati del contatto, scegli l’icona dell’agenda nella riga della cliente.

L’eliminazione di un contatto non elimina gli appuntamenti collegati: le schede conservano i dati storici necessari all’agenda.

<a id="dipendenti"></a>
### 5.3 Dipendenti

**Descrizione breve:** gestisce l’elenco delle persone assegnabili agli appuntamenti.

**Immagine:** da acquisire e verificare prima della pubblicazione; aggiungere testo alternativo.

| Campo | Descrizione |
|---|---|
| Nome | Obbligatorio. |
| Cognome | Obbligatorio. |

**Gestire il team**

1. Apri **Dipendenti** e scegli **Aggiungi dipendente**.
2. Inserisci nome e cognome, quindi scegli **Salva dipendente**.
3. Usa **Modifica** per aggiornare una persona.
4. Usa **Elimina** e conferma per archiviarla. Una persona archiviata non è proposta per nuovi appuntamenti, ma i riferimenti negli appuntamenti storici vengono conservati.

<a id="impostazioni"></a>
### 5.4 Impostazioni

**Descrizione breve:** contiene nome del salone, servizi e testo del promemoria.

**Immagine:** da acquisire e verificare prima della pubblicazione; aggiungere testo alternativo.

| Campo o controllo | Descrizione |
|---|---|
| Nome del salone | Nome usato nell’interfaccia e, se presente nel modello, nel testo del promemoria. |
| Servizi | Aggiungi un servizio non vuoto con **Aggiungi**; **Rimuovi** lo elimina dalla lista. Un duplicato che differisce solo per maiuscole/minuscole non viene aggiunto. |
| Crea o modifica il promemoria | Apre l’editor del messaggio. **Fatto** chiude l’editor e torna alle impostazioni senza salvare da solo l’intero modulo. |
| Salva impostazioni | Salva il modulo delle preferenze. |

Le preferenze del salone sono conservate nel browser. Non presumere che siano sincronizzate tra browser o dispositivi diversi.

<a id="promemoria-whatsapp-e-tema"></a>
### 5.5 Promemoria WhatsApp e tema

**Descrizione breve:** prepara un collegamento WhatsApp per la revisione manuale e permette di scegliere il tema visivo.

**Immagine:** da acquisire e verificare prima della pubblicazione; aggiungere testo alternativo.

**Preparare un promemoria**

1. Verifica che il cliente abbia il consenso WhatsApp registrato.
2. Nella scheda dell’appuntamento scegli **Messaggio**. Se il consenso non è registrato, l’azione è disabilitata.
3. Si apre WhatsApp con un testo precompilato. Rileggilo e invialo manualmente solo se corretto e autorizzato.

L’app non invia messaggi, non verifica la consegna e non programma invii automatici. Il conteggio **Promemoria da preparare** segnala appuntamenti confermati e consenzienti del giorno successivo alla data selezionata: non è una coda d’invio.

**Modificare il testo del promemoria**

1. In **Impostazioni** scegli **Crea o modifica il promemoria**.
2. Scrivi il testo e usa i pulsanti per inserire i dati nel punto in cui si trova il cursore: nome cliente (`{nome}`), data (`{data}`), ora (`{ora}`), servizio (`{servizio}`) o nome salone (`{salone}`).
3. Controlla l’anteprima di esempio; è solo dimostrativa e non invia messaggi.
4. Scegli **Fatto**, quindi **Salva impostazioni** nel modulo delle impostazioni.

**Cambiare tema**

Usa il controllo del tema per passare tra tema chiaro e scuro. La scelta è conservata nel browser; se la memoria locale del browser viene cancellata, la preferenza può andare persa.

<a id="risoluzione-dei-problemi"></a>
## 6. Risoluzione dei problemi

### Non riesco a registrarmi o non arriva l’email

- Verifica di aver inserito username, email e password nei formati richiesti.
- La registrazione autonoma può essere disattivata nelle impostazioni dell’istanza. Se il form rifiuta la richiesta, chiedi al gestore di verificare la configurazione.
- Controlla posta indesiderata e indirizzo email. L’app non può confermare la consegna del messaggio.

### Non riesco ad accedere

Verifica username e password. Se hai appena creato l’account, completa prima la conferma email quando richiesta. Se il problema continua, contatta il gestore senza inviare la password in chat o email.

### Il salvataggio dell’appuntamento non riesce

Controlla i campi obbligatori e che la data e l’ora siano corrette. Per un appuntamento confermato, verifica anche il limite di tre appuntamenti nello stesso slot e che la stessa persona non sia già assegnata. Se compare un errore di salvataggio, annota il messaggio visualizzato e contatta il gestore.

### Il pulsante WhatsApp non è disponibile

L’azione richiede il consenso WhatsApp registrato per il cliente. Verifica o aggiorna il consenso prima di preparare il messaggio.

### Le impostazioni o il tema non compaiono su un altro dispositivo

Le preferenze del salone e del tema sono conservate nel browser. Non sono indicate come sincronizzate tra dispositivi; controlla il browser in cui sono state salvate e contatta il gestore se necessario.

<a id="informazioni-di-supporto"></a>
## 7. Informazioni di supporto

I recapiti e gli orari di assistenza non sono stati forniti. Il gestore deve completare i campi prima di distribuire il manuale.

| Informazione | Valore |
|---|---|
| Referente | Da definire dal gestore del salone |
| Email o telefono | Da fornire |
| Orari di assistenza | Da definire |

---

**Nota editoriale:** completare la versione software, i recapiti e gli screenshot verificati prima di considerare il manuale pronto per la pubblicazione.
