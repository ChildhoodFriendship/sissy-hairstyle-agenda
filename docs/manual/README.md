# Manuale utente italiano: generazione

`user-manual-it.md` è un artefatto generato, non un file da modificare a mano. Le formulazioni italiane canoniche sono nei blocchi HTML `user-manual-it` delle pagine Wiki elencate in `scripts/generate_user_manual.py`; lo script li concatena in ordine e non copia altro testo della Wiki.

## Comandi

Con Python 3.10+ e un ambiente virtuale attivo:

```bash
python -m pip install -r docs/manual/requirements.txt
python scripts/generate_user_manual.py --create-template
python scripts/generate_user_manual.py --markdown-only
python scripts/generate_user_manual.py
python scripts/generate_user_manual.py --check
python scripts/test_generate_user_manual.py
```

`--create-template` crea `templates/user-manual-template.dotx`. Il template è sostituibile: passare un altro `.dotx` con `--template percorso/al/template.dotx`. È usato per stili e impaginazione DOCX; il corpo del template è intenzionalmente sostituito dal contenuto Markdown, quindi il template non può aggiungere o cambiare il testo del manuale. Il PDF è composto dallo stesso Markdown con ReportLab.

L’esecuzione predefinita rigenera, nell’ordine, `user-manual-it.md`, `generated/user-manual-it.docx` e `generated/user-manual-it.pdf`. Le verifiche interrompono la generazione se il testo estratto da DOCX o PDF differisce dal contenuto Markdown. `--check` confronta il Markdown che verrebbe generato con il file presente, senza scrivere output.

Aggiornare il manuale modificando i blocchi sorgente nella Wiki e rilanciando lo script. Non ritoccare manualmente gli output generati: le modifiche al testo vanno riportate nei blocchi Wiki.
