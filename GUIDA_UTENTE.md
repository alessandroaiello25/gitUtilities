# Git Utilities — guida utente

## 1. A cosa serve

Git Utilities supporta la preparazione di una release Salesforce ospitata su Azure DevOps.

Il percorso principale è la CLI avviata da `script.js`. Il tool può:

- ricavare da un Work Item di release il branch di destinazione e i branch da integrare;
- creare in sequenza le Pull Request verso il branch di release;
- unire sul branch di release le classi di test dichiarate nei file `manifest/sfdc_test_classes.json` dei branch sorgente;
- unire i file `manifest/package.xml` dei branch sorgente;
- suddividere una release numerosa in gruppi di branch.

La web app/Electron ha funzionalità più limitate: gestisce le credenziali e offre un wizard per individuare o selezionare i branch, ma al momento non esegue la release.

> **Attenzione:** il tool cambia ripetutamente il branch Git del progetto, modifica file, crea commit, esegue push e apre Pull Request. Usarlo solo con una working tree pulita e senza operazioni Git parallele sullo stesso clone.

## 2. Prerequisiti

Per la CLI servono:

- Windows e PowerShell, che sono l'ambiente principalmente previsto dal progetto;
- Node.js e npm;
- Git, con accesso al remote `origin`;
- un clone locale del progetto Salesforce;
- Visual Studio Code con il comando `code` disponibile nel `PATH`;
- Microsoft Edge per l'apertura automatica delle Pull Request;
- accesso ad Azure DevOps e un PAT autorizzato a leggere Work Item e repository e a creare Pull Request;
- nel progetto Salesforce, i file `manifest/package.xml` e `manifest/sfdc_test_classes.json` sui branch coinvolti.

Solo per l'opzione di validazione Salesforce servirebbe anche Salesforce CLI (`sf`) e un'org già autenticata. Questa funzione è però indicata come non affidabile nella sezione [Limitazioni note](#10-limitazioni-note).

## 3. Installazione e primo avvio

### Installazione dai sorgenti

Dalla cartella di Git Utilities:

```powershell
npm install
npm --prefix .\client install
npm --prefix .\client run build
```

Per avviare insieme server locale e app Electron:

```powershell
node .\run.js
```

In alternativa, in due terminali separati:

```powershell
node .\server.js
```

```powershell
npm --prefix .\client run electron:run
```

`run.js` presuppone che il client Angular sia già stato compilato.

### Installazione tramite eseguibili

Nel repository sono presenti `installer.exe` e `run.exe`. `installer.exe` installa le dipendenze e compila il client; al termine si può avviare `run.exe`.

Se l'installazione tramite eseguibile non riesce, usare la procedura dai sorgenti per vedere con chiarezza l'errore restituito da npm o Angular.

## 4. Configurare le credenziali

La CLI usa la credenziale marcata come **Active** nel database locale. La configurazione più semplice passa dalla web app:

1. Avviare l'app con `node .\run.js` o `run.exe`.
2. Aprire **Insert New**.
3. Compilare:
   - **Azure Org URL**: URL dell'organizzazione, per esempio `https://dev.azure.com/nome-organizzazione`;
   - **Project**: nome del progetto Azure DevOps;
   - **Repository**: nome del repository Azure DevOps;
   - **Local Salesforce Project Path**: percorso assoluto del clone locale;
   - **PAT**: Personal Access Token Azure DevOps.
4. Salvare la credenziale.
5. Nella lista, attivare l'interruttore **Active** sulla credenziale da usare.

È possibile memorizzare più configurazioni, ma la CLI richiede che ce ne sia una attiva. Se nessuna credenziale è attiva, termina con `Non ci sono connessioni attive su Azure`.

I dati sono salvati localmente in `data.db`. Il PAT è cifrato usando la chiave locale di `settings.json`: i due file devono essere protetti e non vanno condivisi.

## 5. Preparare Azure DevOps e i Work Item

La modalità `-w` si aspetta una struttura precisa:

1. Il Work Item di release contiene nella descrizione i riferimenti ai Work Item da includere, nel formato `#12345`.
2. Il Work Item di release ha un branch Azure DevOps collegato: questo diventa il branch di destinazione.
3. Ogni Work Item citato ha almeno un branch collegato: questi diventano i branch sorgente.
4. Se un Work Item ha più branch collegati, la CLI chiede di digitare il nome esatto del branch da usare.

La scansione genera due file locali, ignorati da Git:

- `branches`: un branch sorgente per riga;
- `branch2wi.json`: associa ciascun branch al relativo Work Item, così la PR può essere collegata al Work Item.

Per eseguire solo questa preparazione:

```powershell
node .\script.js -w 12345 -c -d "C:\Progetti\salesforce-project"
```

Controllare il contenuto di `branches` prima di proseguire. In alternativa, il file può essere preparato manualmente, con un nome branch per riga.

## 6. Flusso completo consigliato

Prima dell'avvio:

```powershell
git -C "C:\Progetti\salesforce-project" status
git -C "C:\Progetti\salesforce-project" fetch --all
```

La working tree deve essere pulita e tutti i branch sorgente devono esistere su `origin`.

### Esecuzione in un solo comando

```powershell
node .\script.js -w 12345 -cr -d "C:\Progetti\salesforce-project" -m "Release luglio"
```

`-cr` richiede il flusso completo. Se non si specifica nessuna tra `-cr`, `-r`, `-t` e `-p`, il flusso completo è comunque il comportamento predefinito.

### Cosa accade durante il flusso

1. La CLI legge il Work Item di release e costruisce la lista dei branch.
2. Per ogni branch crea una PR verso il target e la apre in Edge.
3. L'utente deve controllare eventuali conflitti e completare la PR in Azure DevOps.
4. La CLI controlla ogni 5 secondi il branch remoto e prosegue quando ne rileva la modifica.
5. Al termine delle PR, esegue checkout/pull del branch target.
6. Unisce le classi di test in `manifest/sfdc_test_classes.json`, apre il file in VS Code e chiede `Confermi le classi di test? Y/N`.
7. Unisce `manifest/package.xml`, apre il file in VS Code e chiede `Confermi le modifiche al package.xml? Y/N`.
8. A ogni conferma `Y`, crea un commit dedicato e lo invia al remote. Con una risposta diversa ripristina quel file.

Per la conferma delle classi di test usare la `Y` maiuscola.

### Riprendere usando file già preparati

Se `branches` è già corretto:

```powershell
node .\script.js -b PROD_RELEASE_20072026 -cr -d "C:\Progetti\salesforce-project"
```

È consigliato indicare sempre il target con `-b` oppure ricavarlo con `-w`. L'esecuzione senza entrambi ha un limite nel calcolo interno del target.

## 7. Operazioni singole

### Creare soltanto le Pull Request

```powershell
node .\script.js -b PROD_RELEASE_20072026 -r -d "C:\Progetti\salesforce-project" -m "Release luglio"
```

Richiede un file `branches` già valorizzato.

### Unire soltanto le classi di test

```powershell
node .\script.js -b PROD_RELEASE_20072026 -t -d "C:\Progetti\salesforce-project"
```

Il merge elimina duplicati, ordina i nomi e produce un JSON con la chiave `key1`.

### Unire soltanto `package.xml`

```powershell
node .\script.js -b PROD_RELEASE_20072026 -p -d "C:\Progetti\salesforce-project"
```

Il merge elimina i membri duplicati, ordina tipi e membri e conserva la versione API più alta incontrata.

### Aprire una singola PR

```powershell
node .\script.js -r -o -b PROD_RELEASE_20072026 -s feature/ABC-123 -sw 12345 -d "C:\Progetti\salesforce-project" -m "Correzione ABC"
```

In questa modalità:

- `-s` indica il branch sorgente; se omesso viene usato il branch Git corrente;
- `-sw` associa il branch al Work Item indicato;
- `-r` va mantenuto insieme a `-o` per evitare che entri in funzione il flusso completo predefinito.

## 8. Elaborare i branch a gruppi

Per release numerose si possono elaborare blocchi di branch:

```powershell
node .\script.js -b PROD_RELEASE_20072026 -cr -g 2 -n 3 -d "C:\Progetti\salesforce-project"
```

- `-g` è il numero del gruppo, a partire da 1;
- `-n` è la dimensione del gruppo; il valore predefinito è 3.

Nell'esempio viene elaborato il secondo gruppo da tre elementi, cioè gli elementi 4–6 dell'elenco `branches`. Mantenere invariati ordine del file e valore di `-n` tra un'esecuzione e l'altra.

## 9. Riferimento opzioni CLI

| Opzione | Valore | Funzione |
|---|---|---|
| `-w` | ID Work Item | Ricava target, branch sorgente e associazioni Work Item da Azure DevOps. |
| `-c` | — | Si ferma dopo la preparazione di `branches` e `branch2wi.json`; usarla normalmente con `-w`. |
| `-b` | branch | Imposta esplicitamente il branch target. |
| `-d` | percorso | Imposta il clone Git da elaborare. Se omesso, usa il percorso della credenziale attiva quando diverso dalla cartella corrente. |
| `-cr` | — | Esegue il flusso completo: PR, classi di test e `package.xml`. |
| `-r` | — | Crea e gestisce soltanto le PR. |
| `-t` | — | Unisce soltanto `sfdc_test_classes.json`. |
| `-p` | — | Unisce soltanto `package.xml`. |
| `-g` | numero | Seleziona un gruppo di branch, con indice a partire da 1. |
| `-n` | numero | Imposta quanti branch contiene ogni gruppo; default 3. |
| `-m` | testo | Aggiunge un testo alla descrizione delle PR. Racchiuderlo tra virgolette se contiene spazi. |
| `-o` | — | Attiva la modalità singola PR; nell'uso corrente va abbinata a `-r`. |
| `-s` | branch | Branch sorgente della singola PR. |
| `-sw` | ID Work Item | Work Item da collegare alla singola PR. |
| `-sf` | alias org | Tenta una validazione Salesforce; funzione attualmente non affidabile. |
| `-val` | valore | Non produce effetti nell'implementazione corrente. |

Le opzioni non hanno una validazione completa: controllare sempre che ogni opzione che richiede un valore sia seguita dal valore corretto.

## 10. Limitazioni note

- La web app non crea PR, non esegue merge e non avvia deploy: **Finish** mostra soltanto un riepilogo.
- La modalità Work Item del wizard web si aspetta una risposta strutturata, mentre l'endpoint corrente restituisce il solo branch target; può quindi non arrivare al secondo passo. La CLI `-w` resta il percorso supportato.
- `-sf` costruisce attualmente un comando Salesforce non valido in alcuni percorsi; non usarlo come controllo di release finché l'implementazione non viene corretta e collaudata.
- `-val` viene letto ma non è utilizzato.
- Senza `-w` o `-b`, il branch corrente viene rilevato ma non viene propagato correttamente a tutte le operazioni: specificare sempre uno dei due.
- La gestione PR considera completata una PR quando cambia la cronologia remota del target; qualunque altro push contemporaneo sul target può far avanzare la CLI.
- I comandi Git costruiscono argomenti senza quoting interno: evitare percorsi o nomi branch anomali e passare sempre `-d` tra virgolette quando il percorso contiene spazi.
- Non esiste una suite di test automatica configurata nel package root.

## 11. Web app ridotta

La web app consente di:

- inserire configurazioni Azure DevOps e il percorso del progetto locale;
- scegliere una sola credenziale attiva;
- aggiornare il PAT;
- eliminare una configurazione;
- avviare un wizard che accetta target e branch manuali oppure tenta di ricavarli da un Work Item;
- selezionare i branch e visualizzare un riepilogo finale.

Uso consigliato:

1. Usare la web app per configurare e attivare le credenziali.
2. Usare eventualmente il wizard manuale come controllo visivo dell'elenco.
3. Eseguire le operazioni reali dalla CLI con `script.js`.

## 12. Risoluzione problemi

### `Non ci sono connessioni attive su Azure`

Aprire la web app e attivare una credenziale dalla lista.

### `UNABLE TO FIND BRANCHES`

Eseguire prima la scansione con `-w ... -c`, oppure creare/verificare il file `branches` nella cartella di Git Utilities.

### La CLI resta in attesa dopo aver aperto una PR

È il comportamento previsto: completare la PR aperta in Azure DevOps. La CLI prosegue dopo aver rilevato una modifica sul branch target remoto.

### `code` non è riconosciuto

Installare Visual Studio Code e abilitare il comando `code` nel `PATH`. Il tool lo usa per mostrare i file uniti prima della conferma.

### Checkout, commit o push falliscono

Verificare:

- working tree pulita;
- branch presenti su `origin`;
- permessi Git e Azure DevOps;
- assenza di lock o altre operazioni Git nello stesso clone;
- target branch esistente e aggiornabile.

### Il Work Item non restituisce branch

Controllare che la descrizione contenga riferimenti `#numero` e che i Work Item coinvolti abbiano collegamenti Azure DevOps di tipo Branch.

## 13. Checklist rapida

- [ ] Credenziale corretta e attiva.
- [ ] PAT valido.
- [ ] Percorso del clone Salesforce corretto.
- [ ] Working tree pulita.
- [ ] `git fetch --all` completato.
- [ ] Branch target e sorgente presenti su Azure DevOps.
- [ ] `manifest/package.xml` e `manifest/sfdc_test_classes.json` verificati sui branch sorgente.
- [ ] File `branches` controllato.
- [ ] Nessun altro utente/processo sta aggiornando il target durante l'attesa delle PR.
- [ ] File uniti verificati in VS Code prima di rispondere `Y`.

