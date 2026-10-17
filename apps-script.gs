/* =========================================================
   ANMELDUNGEN -> GOOGLE TABELLE + MAIL

   Einrichten:
   1. Google-Tabelle oeffnen -> Erweiterungen -> Apps Script
   2. Diesen Code komplett hineinkopieren (alten ersetzen), speichern
   3. Oben die Funktion  testMail  auswaehlen und auf "Ausfuehren"
      klicken. Google fragt einmalig nach der Erlaubnis zum
      Mailversand -> bestaetigen. Du bekommst eine Testmail.
   4. Bereitstellen -> Bereitstellungen verwalten -> Stift beim
      bestehenden Eintrag -> Version: "Neue Version" -> Bereitstellen
      (so bleibt die URL gleich und app.js muss nicht geaendert werden)
      ODER: Neue Bereitstellung -> Typ: Web-App
        Ausfuehren als: Ich   |   Zugriff: Jeder
      und die neue URL (endet auf /exec) in app.js bei ENDPOINT eintragen
   5. Test im Browser:  <URL>?action=ping   ->  muss {"ok":true,...} zeigen
   ========================================================= */

const SHEET_NAME = 'Anmeldungen';
const TOKEN = '544061287'; // nur fuer den Export in admin.html

/* An diese Adresse geht bei jeder Anmeldung eine Mail. */
const MAIL_EMPFAENGER = 'serni4333@gmail.com';

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
  'zutat',
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

    const name = String(p.name || (vorname + ' ' + nachname)).trim();
    const lieblingslied = String(p.lieblingslied || '').trim();
    const zutat = String(p.zutat || '').trim();
    const remarks = String(p.remarks || '').trim();

    sheet().appendRow([
      new Date(),
      vorname,
      nachname,
      name,
      lieblingslied,
      zutat,
      wanted.join(','),
      text,
      remarks,
    ]);

    /* Mail an dich. Ein Fehler hier darf die Anmeldung nicht
       kaputt machen – sie ist ja schon gespeichert. */
    try {
      sendeMail_({
        name: name,
        choiceText: text,
        lieblingslied: lieblingslied,
        zutat: zutat,
        remarks: remarks,
      });
    } catch (mailErr) {
      console.error('Mail fehlgeschlagen: ' + mailErr);
    }

    return json(e, { ok: true });
  } catch (err) {
    return json(e, { ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* Mail bei neuer Anmeldung */
function sendeMail_(d) {
  const text =
    'Neue Anmeldung\n\n' +
    'Name: '          + (d.name          || '-') + '\n' +
    'Bleibt: '        + (d.choiceText    || '-') + '\n' +
    'Lieblingslied: ' + (d.lieblingslied || '-') + '\n' +
    'Pizza-Zutat: '   + (d.zutat         || '-') + '\n' +
    'Bemerkung: '     + (d.remarks       || '-') + '\n';

  MailApp.sendEmail(
    MAIL_EMPFAENGER,
    'Neue Anmeldung: ' + (d.name || 'Unbekannt'),
    text
  );
}

/* Einmal im Editor ausfuehren, um die Mail-Berechtigung zu erteilen */
function testMail() {
  sendeMail_({
    name: 'Test Person',
    choiceText: 'Mit Übernachten bis Sonntag',
    lieblingslied: 'Testlied – Testinterpret',
    zutat: 'Ananas',
    remarks: 'Das ist nur ein Test.',
  });
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
