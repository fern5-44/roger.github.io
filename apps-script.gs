/* Google Tabelle -> Erweiterungen -> Apps Script.
   Bereitstellen -> Web-App, "Ausführen als: Ich", "Zugriff: Jeder".
   Nach JEDER Änderung eine neue Bereitstellung erzeugen. */

const SHEET_NAME = 'Anmeldungen';
const TOKEN = '544061287'; // nur für den Export in admin.html

/* Die Kontingente gehören hierher, nicht ins JavaScript der Seite:
   dort könnte sie jeder in der Konsole hochsetzen.
   total: null = unbegrenzt. Eine id niemals nachträglich ändern, sonst passen
   die schon gespeicherten Zeilen nicht mehr zur Zählung. */
const ITEMS = [
  { id: 'kuchen', label: 'Kuchen', total: 3 },
  { id: 'salat', label: 'Salat', note: 'gern etwas Grünes', total: 2 },
  { id: 'getraenke', label: 'Getränke', total: 4 },
  { id: 'nichts', label: 'Ich bringe nichts mit', total: null },
];

const COLUMNS = ['sentAt', 'name', 'email', 'choices', 'choiceText', 'remarks'];
const CHOICE_INDEX = 3; // Spalte "choices", 0-basiert – wird zum Zählen gebraucht

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'stock') return json(e, { ok: true, items: stock() });
  if (p.action === 'submit') return submit(e, p);
  if (p.action === 'export') return exportRows(e, p);
  return json(e, { ok: false, error: 'unbekannte action' });
}

/* Was ist noch frei? Quelle der Wahrheit ist die Tabelle selbst. */
function stock() {
  const rows = sheet().getDataRange().getValues().slice(1);
  const used = {};
  rows.forEach(function (r) {
    String(r[CHOICE_INDEX] || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(String)
      .forEach(function (id) { used[id] = (used[id] || 0) + 1; });
  });
  return ITEMS.map(function (i) {
    return {
      id: i.id,
      label: i.label,
      note: i.note || '',
      left: i.total == null ? null : Math.max(0, i.total - (used[i.id] || 0)),
    };
  });
}

/* Anmeldung eintragen – aber erst nach erneuter Prüfung. Der Lock serialisiert
   gleichzeitige Zugriffe, sonst wird dasselbe letzte Stück zweimal vergeben. */
function submit(e, p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const name = String(p.name || '').trim();
    if (!name) return json(e, { ok: false, error: 'name' });

    const wanted = String(p.choices || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(String);

    const s = stock();
    const conflict = wanted.filter(function (id) {
      const item = s.filter(function (x) { return x.id === id; })[0];
      return !item || (item.left !== null && item.left < 1);
    });
    if (conflict.length) return json(e, { ok: false, conflict: conflict, items: s });

    const text = wanted
      .map(function (id) {
        const item = s.filter(function (x) { return x.id === id; })[0];
        return item ? item.label : id;
      })
      .join('; ');

    sheet().appendRow([
      new Date(),
      name,
      String(p.email || '').trim(),
      wanted.join(','),
      text,
      String(p.remarks || '').trim(),
    ]);

    return json(e, { ok: true, items: stock() });
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
    sh.appendRow(COLUMNS);
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json(e, obj) {
  const body = JSON.stringify(obj);
  const cb = e && e.parameter ? e.parameter.callback : null;
  return cb
    ? ContentService.createTextOutput(cb + '(' + body + ')').setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
