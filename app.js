/* 3 Schritte -> senden -> Bild. Kontingente kommen vom Server.
   Alles mit TODO ist deine Baustelle. */

const EVENT = {
  title: 'Mein 30. Geburtstag',
  date: 'Sa, 26. September 2026',
  time: '19:00 Uhr',
  place: 'Gartenhaus Lindenhof, Lindenweg 7',
};

// Web-App-URL des Apps Script (/exec). Leer = Testbetrieb mit DEMO_ITEMS,
// dann zählt nur dieser Browser mit und nichts wird gespeichert.
const ENDPOINT = '';

const CHOICE_TITLE = 'Was bringst du mit?';
const CHOICE_MODE = 'multi'; // 'single' = nur eine Antwort
const CHOICE_REQUIRED = true;

// Nur für den Testbetrieb. Die echten Mengen stehen im Apps Script.
const DEMO_ITEMS = [
  { id: 'kuchen', label: 'Kuchen', note: 'Schoko', left: 3 },
  { id: 'salat', label: 'Salat', note: 'GusGus', left: 2 },
  { id: 'Sauce', label: 'Sauce', note: '', left: 2 },
  { id: 'nichts', label: 'Überraschung', note: 'Es befindet sich nicht auf der Liste aber muss unbedingt mit!', left: null }
];

const $ = (sel) => document.querySelector(sel);
const form = $('#rsvp');
const stepEls = [...document.querySelectorAll('[data-step]')];

$('#title').textContent = EVENT.title;
$('#meta').textContent = `${EVENT.date}, ${EVENT.time} · ${EVENT.place}`;
$('#choice-title').textContent = CHOICE_TITLE;

let items = []; // aktueller Bestand, kommt vom Server
let blob = null;

/* ---------- Verbindung ----------
   JSONP statt fetch: Apps Script beantwortet keinen CORS-Preflight und leitet
   /exec auf eine andere Domain um. Über ein <script>-Tag greift das nicht.
   Nebenwirkung: alles läuft über die URL, deshalb ist das Bemerkungsfeld
   in index.html auf 400 Zeichen begrenzt (maxlength). */
function api(params) {
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const cleanup = () => {
      delete window[cb];
      script.remove();
    };
    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('keine Verbindung'));
    };
    script.src = ENDPOINT + '?' + new URLSearchParams({ ...params, callback: cb });
    document.body.appendChild(script);
  });
}

/* ---------- Bestand laden und anzeigen ---------- */

async function loadStock() {
  status('Lade die Auswahl …');
  try {
    const res = ENDPOINT ? await api({ action: 'stock' }) : { ok: true, items: DEMO_ITEMS };
    if (!res.ok) throw new Error(res.error || 'unbekannter Fehler');
    items = res.items;
    status('');
  } catch (err) {
    console.error(err);
    status('Die Auswahl konnte nicht geladen werden. Bitte die Seite neu laden.');
  }
  renderChoices();
}

function renderChoices() {
  const keep = getChoices(); // vorhandene Häkchen möglichst erhalten
  const free = items.filter((i) => i.left === null || i.left > 0);

  if (!free.length) {
    $('#choices').innerHTML = '<p>Es ist schon alles vergeben – einfach weiterklicken.</p>';
    return;
  }

  const type = CHOICE_MODE === 'single' ? 'radio' : 'checkbox';
  $('#choices').innerHTML = free
    .map((i) => {
      const rest = i.left === null ? '' : ` <small>noch ${i.left} frei</small>`;
      return `<label class="choice">
        <input type="${type}" name="choice" value="${i.id}"${keep.includes(i.id) ? ' checked' : ''}>
        <span>${escapeHtml(i.label)}${rest}${i.note ? ` <small>${escapeHtml(i.note)}</small>` : ''}</span>
      </label>`;
    })
    .join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function getChoices() {
  return [...form.querySelectorAll('input[name=choice]:checked')].map((el) => el.value);
}

function labelsFor(ids) {
  return ids.map((id) => (items.find((i) => i.id === id) || { label: id }).label).join('; ');
}

/* ---------- Schritte ---------- */

let step = 0;

function show(i) {
  step = i;
  stepEls.forEach((el, n) => (el.hidden = n !== i));
  $('#progress').textContent = `Schritt ${i + 1} von ${stepEls.length}`;
  error('');
  // Bestand bei jedem Betreten frisch holen – zwischenzeitlich kann etwas weg sein.
  if (i === 1) loadStock();
  const first = stepEls[i].querySelector('input, textarea, select');
  if (first) first.focus();
}

function error(msg) {
  $('#error').textContent = msg;
}
function status(msg) {
  $('#status').textContent = msg;
}

form.addEventListener('click', (e) => {
  if (e.target.matches('[data-next]')) {
    const problem = validate(step);
    if (problem) return error(problem);
    show(step + 1);
  }
  if (e.target.matches('[data-back]')) show(step - 1);
});

function validate(i) {
  if (i === 0) {
    if (!$('#name').value.trim()) return 'Bitte den Namen eintragen.';
    const mail = $('#email').value.trim();
    if (mail && !$('#email').checkValidity()) return 'Diese E-Mail-Adresse sieht unvollständig aus.';
  }
  if (i === 1 && CHOICE_REQUIRED && items.some((x) => x.left === null || x.left > 0) && !getChoices().length) {
    return 'Bitte mindestens eine Option wählen.';
  }
  return null; // TODO: eigene Regeln
}

show(0);

/* ---------- Absenden ---------- */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = form.querySelector('button[type=submit]');
  const ids = getChoices();
  const data = {
    name: $('#name').value.trim(),
    email: $('#email').value.trim(),
    remarks: $('#remarks').value.trim(),
    choices: ids.join(','),
  };

  button.disabled = true;
  error('');

  let res;
  try {
    res = ENDPOINT ? await api({ action: 'submit', ...data }) : { ok: true, items: items };
  } catch (err) {
    console.error(err);
    error('Senden hat nicht geklappt. Bitte nochmal versuchen.');
    button.disabled = false;
    return;
  }

  // Der Server hat den Bestand erneut geprüft. Wer zu spät kam, wählt neu.
  if (!res.ok) {
    button.disabled = false;
    if (res.conflict) {
      items = res.items || items;
      renderChoices();
      show(1);
      return error(`${labelsFor(res.conflict)} ist inzwischen vergeben. Bitte neu wählen.`);
    }
    return error('Senden hat nicht geklappt: ' + (res.error || 'unbekannt'));
  }

  form.hidden = true;
  $('#progress').hidden = true;
  $('#step-done').hidden = false;
  await drawTicket($('#ticket'), { name: data.name, choiceText: labelsFor(ids) });
  blob = await new Promise((done) => $('#ticket').toBlob(done, 'image/png'));
  if (canShareFiles()) $('#share').hidden = false;
});

/* ---------- Bild ---------- */

async function drawTicket(canvas, data) {
  try {
    await document.fonts.ready; // Canvas nimmt sonst still die Fallback-Schrift
  } catch (e) {}

  const ctx = canvas.getContext('2d');
  const M = 90;

  ctx.fillStyle = '#f5f2ec';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#16181d';
  ctx.textBaseline = 'alphabetic';

  ctx.font = '700 80px system-ui, sans-serif';
  ctx.fillText(EVENT.title, M, 220); // TODO: kein Umbruch, langer Titel läuft raus

  ctx.font = '400 40px system-ui, sans-serif';
  ctx.fillText(data.name || 'Gast', M, 340);

  const rows = [
    ['Datum', EVENT.date],
    ['Uhrzeit', EVENT.time],
    ['Ort', EVENT.place],
    ['Du bringst mit', data.choiceText],
  ];

  let y = 480;
  for (const [label, value] of rows) {
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillStyle = '#6b7078';
    ctx.fillText(label.toUpperCase(), M, y);
    ctx.font = '500 36px system-ui, sans-serif';
    ctx.fillStyle = '#16181d';
    ctx.fillText(String(value || '–'), M, y + 48);
    y += 120;
  }
  // TODO: Umbruch für lange Werte (mehrere Auswahlen werden breiter als die Karte).
}

/* ---------- Download / Teilen ---------- */

$('#download').addEventListener('click', () => {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'einladung.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
});

$('#share').addEventListener('click', async () => {
  try {
    await navigator.share({ title: EVENT.title, files: [file()] });
  } catch (err) {
    if (err.name !== 'AbortError') console.error(err);
  }
});

function file() {
  return new File([blob], 'einladung.png', { type: 'image/png' });
}

function canShareFiles() {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [file()] });
  } catch (e) {
    return false;
  }
}
