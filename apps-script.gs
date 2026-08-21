/* =========================================================
   ANMELDUNGEN -> GOOGLE TABELLE

   Einrichten:
   1. Google-Tabelle oeffnen -> Erweiterungen -> Apps Script
   2. Diesen Code komplett hineinkopieren (alten ersetzen), speichern
   3. Bereitstellen -> Neue Bereitstellung -> Typ: Web-App
        Beschreibung : beliebig
        Ausfuehren als: Ich
        Zugriff      : Jeder
   4. Die angezeigte URL (endet auf /exec) in app.js bei ENDPOINT eintragen
   5. Test im Browser:  <URL>?action=ping   ->  muss {"ok":true,...} zeigen

   WICHTIG: Nach JEDER Aenderung am Skript eine NEUE Bereitstellung
   erzeugen und die neue URL in app.js eintragen. Genau daran reisst
   die Verbindung sonst ab.
   ========================================================= */

const SHEET_NAME = 'Anmeldungen';
const TOKEN = '544061287'; // nur fuer den Export in admin.html

/* Die auswaehlbaren Optionen. Die ids muessen mit OPTIONS in app.js
   uebereinstimmen. Eine id niemals nachtraeglich aendern, sonst passen
   die schon gespeicherten Zeilen nicht mehr dazu. */
const OPTIONS = [
  { id: 'openend', label: 'Open End am Samstagabend' },
  { id: 'uebernachten', label: 'Mit Übernachten bis Sonntag' },
  { id: 'anderes', label: 'Anderes' },
];

const COLUMNS = [
  'sentAt',
  'vorname',
  'nachname',
  'name',
  'lieblingslied',
  'zutat'
  'choices',
  'choiceText',
  'remarks',
];

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'ping') return json(e, { ok: true, sheet: SHEET_NAME, time: new Date() });
  if (p.action === 'stock') return json(e, { ok: true, items: OPTIONS });
  if (p.action === 'submit') return submit(e, p);
  if (p.action === 'export') return exportRows(e, p);
  return json(e, { ok: false, error: 'unbekannte action' });
}

/* Anmeldung eintragen. Der Lock serialisiert gleichzeitige Zugriffe,
   damit keine Zeile verloren geht. */
function submit(e, p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const vorname = String(p.vorname || '').trim();
    const nachname = String(p.nachname || '').trim();
    if (!vorname || !nachname) return json(e, { ok: false, error: 'name fehlt' });

    const wanted = String(p.choices || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(String);

    const text = wanted
      .map(function (id) {
        const item = OPTIONS.filter(function (x) { return x.id === id; })[0];
        return item ? item.label : id;
      })
      .join('; ');

    sheet().appendRow([
      new Date(),
      vorname,
      nachname,
      String(p.name || (vorname + ' ' + nachname)).trim(),
      String(p.lieblingslied || '').trim(),
      String(p.zutat || '').trim(),
      wanted.join(','),
      text,
      String(p.remarks || '').trim(),
    ]);

    return json(e, { ok: true });
  } catch (err) {
    return json(e, { ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function exportRows(e, p) {
  if ((p.token || '') !== TOKEN) return json(e, { ok: false, error: 'token' });
  return json(e, { ok: true, rows: sheet().getDataRange().getDisplayValues() });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);

  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    writeHeader(sh);
    return sh;
  }

  /* Solange noch keine Anmeldung drinsteht, darf die Kopfzeile an die
     neuen Spalten angepasst werden. Sind schon Daten da, bleibt sie
     unangetastet – dann lieber ein neues Tabellenblatt anlegen. */
  if (sh.getLastRow() < 2) writeHeader(sh);

  return sh;
}

function writeHeader(sh) {
  sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function json(e, obj) {
  const body = JSON.stringify(obj);
  const cb = e && e.parameter ? e.parameter.callback : null;
  return cb
    ? ContentService.createTextOutput(cb + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
