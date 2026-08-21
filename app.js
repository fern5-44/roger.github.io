/* =========================================================
   EVENT
   ========================================================= */

const EVENT = {
  title: 'Särli feiert Geburtstag',
  date: 'Sa, Januar 2027',
  time: '19:00 Uhr',
  place: 'Gartenhaus',
};


/* =========================================================
   APPS SCRIPT  ***HIER DIE VERBINDUNG ZUM SHEET***
   ---------------------------------------------------------
   Diese URL muss die AKTUELLE Bereitstellung der Web-App sein.
   Google vergibt bei JEDER neuen Bereitstellung eine neue URL –
   deshalb reisst die Verbindung ab, wenn man am Skript etwas
   aendert und die alte URL stehen laesst.

   So kommst du an eine frische URL:
   1. Google-Tabelle oeffnen -> Erweiterungen -> Apps Script
   2. Inhalt von apps-script.gs komplett hineinkopieren, speichern
   3. Bereitstellen -> Neue Bereitstellung -> Typ: Web-App
      Ausfuehren als: Ich   |   Zugriff: Jeder
   4. Die angezeigte URL (endet auf /exec) hier unten einsetzen
   5. Zum Testen im Browser aufrufen:  <URL>?action=ping
      Es muss  {"ok":true, ...}  erscheinen.
   ========================================================= */

const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwpiKI0KTew2TdgcO1_k4WA1-syOZBT309YuQTD4ibTVxJvJa4UPaV-6vRhhEE4tAdU/exec';


/* =========================================================
   AUSWAHL – SCHRITT 3
   ========================================================= */

const CHOICE_TITLE = 'Wie lange bist du dabei?';
const CHOICE_MODE = 'single';      // 'single' = ankreuzen, nur eine Option
const CHOICE_REQUIRED = true;

const OPTIONS = [
  {
    id: 'openend',
    label: 'Samstigobig - Open End',
    note: 'Nachem Znacht gits no en Spili- / Bastelobig. Es git kein offizielle Schluss, du dörfsch frei sege bis wenn du magsch blibe.'
  },
  {
    id: 'uebernachten',
    label: 'Mit Übernachte',
    note: 'Du derfsch au sehr gern no bi mir übernachte. Am Sunntig gits au no es feins Zmorge.'
  },
  {
    id: 'anderes',
    label: 'Anderes',
    note: 'Falls gern würsch cho, aber nonig sicher isch öbs passt, denn schribs uf de nächste Siite doch gschwind id Bemerkige.'
  }
];


/* =========================================================
   CHECKLISTE FÜR DAS BILD
   ========================================================= */

const CHECKLIST = [
  'Schlittschuhe',
  'Zugticket (bis is Lerchefeld und den zu mir hei)',
  'Wetter entsprechendi Kleidig (Bi Schnee chunt dSarah uf lustigi Idee)',
  'Fall übernachtisch snöstigste zum Schlofe (Decki & Chüssi hemmer)'
];


/* =========================================================
   HTML-ELEMENTE
   ========================================================= */

const $ = (sel) => document.querySelector(sel);

const form = $('#rsvp');

const stepEls = [
  ...document.querySelectorAll('[data-step]')
];

let items = OPTIONS.slice();
let blob = null;


/* =========================================================
   SICHERHEITSFRAGEN
   ========================================================= */

const SECURITY_ANSWERS = {
  question1: '10011',
  question2: 'salami',
  question3: 'gaensebluemchen'
};


function validateSecurityQuestions() {

  const q1 = form.querySelector(
    'input[name="question1"]:checked'
  );

  const q2 = form.querySelector(
    'input[name="question2"]:checked'
  );

  const q3 = form.querySelector(
    'input[name="question3"]:checked'
  );


  if (!q1 || !q2 || !q3) {
    return 'Beantworte alle drü Frage richtig zum witer cho.';
  }


  if (q1.value !== SECURITY_ANSWERS.question1) {
    return 'Frage 1 ist falsch. Tipp: Vo Rechts nach Links lese.';
  }


  if (q2.value !== SECURITY_ANSWERS.question2) {
    return 'Frage 2 ist falsch. Probiers nomol.';
  }


  if (q3.value !== SECURITY_ANSWERS.question3) {
    return 'Frage 3 ist falsch. Für die meiste eher chli und unscheinbar.';
  }


  return null;
}


/* =========================================================
   GRUNDPRÜFUNG
   ========================================================= */

if (!form) {

  console.error(
    'FEHLER: #rsvp wurde nicht gefunden.'
  );

} else {


  /* =======================================================
     TITEL / META
     ======================================================= */

  if ($('#title')) {
    $('#title').textContent = EVENT.title;
  }

  if ($('#meta')) {
    $('#meta').textContent =
      `${EVENT.date}, ${EVENT.time} · ${EVENT.place}`;
  }

  if ($('#choice-title')) {
    $('#choice-title').textContent = CHOICE_TITLE;
  }


  /* =======================================================
     VERBINDUNG ZUM APPS SCRIPT

     Apps Script beantwortet keinen CORS-Preflight und die
     /exec-Adresse leitet um. Mit JSONP umgeht man beides:
     das Skript ruft unsere Callback-Funktion selbst auf.
     ======================================================= */

  function api(params, timeoutMs) {

    return new Promise((resolve, reject) => {

      const cb =
        'cb_' +
        Math.random()
          .toString(36)
          .slice(2);


      const script =
        document.createElement('script');


      let timer = null;


      const cleanup = () => {

        if (timer) {
          clearTimeout(timer);
        }

        delete window[cb];

        script.remove();

      };


      window[cb] = (data) => {

        cleanup();

        resolve(data);

      };


      script.onerror = () => {

        cleanup();

        reject(
          new Error('Keine Verbindung zum Anmelde-Sheet')
        );

      };


      /* Ohne Zeitlimit haengt die Seite, wenn Google gar
         nicht erst antwortet (z. B. alte Bereitstellung). */

      timer = setTimeout(
        () => {

          cleanup();

          reject(
            new Error('Zeitüberschreitung beim Anmelde-Sheet')
          );

        },
        timeoutMs || 15000
      );


      script.src =
        ENDPOINT +
        '?' +
        new URLSearchParams({
          ...params,
          callback: cb
        });


      document.body.appendChild(script);

    });

  }


  /* =======================================================
     STATUS / FEHLER
     ======================================================= */

  function error(msg) {

    if ($('#error')) {
      $('#error').textContent = msg || '';
    }

  }


  function status(msg) {

    if ($('#status')) {
      $('#status').textContent = msg || '';
    }

  }


  /* =======================================================
     VERBINDUNGSTEST BEIM LADEN

     Meldet sich nur, wenn etwas nicht stimmt – dann weisst du
     sofort, dass die ENDPOINT-URL erneuert werden muss.
     ======================================================= */

  let online = false;


  async function checkConnection() {

    try {

      const res = await api(
        { action: 'ping' },
        10000
      );


      if (res && res.ok) {

        online = true;

        status('');

        console.log(
          'Verbindung zum Anmelde-Sheet steht.',
          res
        );

        return;

      }


      throw new Error(
        (res && res.error) || 'unbekannte Antwort'
      );


    } catch (err) {

      online = false;

      console.error(
        'Verbindung zum Anmelde-Sheet fehlgeschlagen:',
        err
      );

      status(
        'Hinweis: Die Verbindung zur Anmeldeliste antwortet gerade nicht. ' +
        'Du kannst das Formular trotzdem ausfüllen – beim Abschicken wird es erneut versucht.'
      );

    }

  }


  checkConnection();


  /* =======================================================
     AUSWAHL ANZEIGEN
     ======================================================= */

  function renderChoices() {

    if (!$('#choices')) {
      return;
    }


    const keep = getChoices();


    const type =
      CHOICE_MODE === 'single'
        ? 'radio'
        : 'checkbox';


    $('#choices').innerHTML =

      items
        .map((i) => {

          const checked =
            keep.includes(i.id)
              ? ' checked'
              : '';


          return `
            <label class="choice">

              <input
                type="${type}"
                name="choice"
                value="${escapeHtml(i.id)}"${checked}
              >

              <span>
                ${escapeHtml(i.label)}
                ${
                  i.note
                    ? `<small>${escapeHtml(i.note)}</small>`
                    : ''
                }
              </span>

            </label>
          `;

        })
        .join('');


    /* Bei "Anderes" wird die Bemerkung gebraucht. */

    $('#choices')
      .querySelectorAll('input[name="choice"]')
      .forEach(
        (el) => {

          el.addEventListener(
            'change',
            updateRemarksHint
          );

        }
      );


    updateRemarksHint();

  }


  function needsRemarks() {

    return getChoices().includes('anderes');

  }


  function updateRemarksHint() {

    if (!$('#remarks-hint')) {
      return;
    }


    $('#remarks-hint').textContent =
      needsRemarks()
        ? '(bitte ausfüllen)'
        : '(optional)';

  }


  /* =======================================================
     HTML ESCAPEN
     ======================================================= */

  function escapeHtml(s) {

    return String(s).replace(
      /[&<>"]/g,
      (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      }[c])
    );

  }


  /* =======================================================
     AUSWAHL AUSLESEN
     ======================================================= */

  function getChoices() {

    return [
      ...form.querySelectorAll(
        'input[name="choice"]:checked'
      )
    ].map(
      (el) => el.value
    );

  }


  /* =======================================================
     AUSWAHL-NAMEN
     ======================================================= */

  function labelsFor(ids) {

    return ids
      .map(
        (id) => {

          const found =
            items.find(
              (i) => i.id === id
            );


          return found
            ? found.label
            : id;

        }
      )
      .join('; ');

  }


  /* =======================================================
     SCHRITTE
     ======================================================= */

  let step = 0;


  function show(i) {

    if (
      i < 0 ||
      i >= stepEls.length
    ) {

      console.error(
        'Ungültiger Schritt:',
        i
      );

      return;

    }


    step = i;


    stepEls.forEach(
      (el, index) => {

        el.hidden = index !== i;

      }
    );


    if ($('#progress')) {

      $('#progress').textContent =
        `Schritt ${i + 1} von ${stepEls.length}`;

    }


    error('');


    const first =
      stepEls[i].querySelector(
        'input:not([type="radio"]):not([type="checkbox"]), textarea, select'
      );


    if (first) {
      first.focus();
    }

  }


  /* =======================================================
     VALIDIERUNG
     ======================================================= */

  function validate(i) {


    /* -----------------------------------------------------
       SCHRITT 1 – Sicherheitsfragen
       ----------------------------------------------------- */

    if (i === 0) {

      return validateSecurityQuestions();

    }


    /* -----------------------------------------------------
       SCHRITT 2 – Name und Lieblingslied
       ----------------------------------------------------- */

    if (i === 1) {

      if (!$('#vorname').value.trim()) {
        return 'Din Vorname:';
      }


      if (!$('#nachname').value.trim()) {
        return 'Din Nachname:';
      }


      if (!$('#lieblingslied').value.trim()) {
        return 'Din Lieblingssong:';
      }


      return null;

    }


    /* -----------------------------------------------------
       SCHRITT 3 – Auswahl
       ----------------------------------------------------- */

    if (i === 2) {

      if (
        CHOICE_REQUIRED &&
        !getChoices().length
      ) {

        return 'Bitte ankreuze:';

      }


      return null;

    }


    /* -----------------------------------------------------
       SCHRITT 4 – Bemerkung
       ----------------------------------------------------- */

    if (i === 3) {

      if (
        needsRemarks() &&
        !$('#remarks').value.trim()
      ) {

        return 'Du hast "Anderes" gewählt – bitte kurz in die Bemerkung schreiben.';

      }


      return null;

    }


    return null;

  }


  /* =======================================================
     WEITER-BUTTONS
     ======================================================= */

  form.querySelectorAll('[data-next]').forEach(
    (button) => {

      button.addEventListener(
        'click',
        () => {

          const problem = validate(step);


          if (problem) {

            error(problem);

            return;

          }


          show(step + 1);

        }
      );

    }
  );


  /* =======================================================
     ZURÜCK-BUTTONS
     ======================================================= */

  form.querySelectorAll('[data-back]').forEach(
    (button) => {

      button.addEventListener(
        'click',
        () => {

          show(step - 1);

        }
      );

    }
  );


  /* =======================================================
     START
     ======================================================= */

  renderChoices();

  show(0);


  /* =======================================================
     ABSENDEN
     ======================================================= */

  form.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      const problem = validate(3);


      if (problem) {

        error(problem);

        return;

      }


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      const ids = getChoices();


      const vorname =
        $('#vorname').value.trim();

      const nachname =
        $('#nachname').value.trim();


      const data = {

        vorname: vorname,

        nachname: nachname,

        /* zusammengesetzt, damit die Tabelle auch eine
           fertige Namensspalte hat */
        name: (vorname + ' ' + nachname).trim(),

        lieblingslied:
          $('#lieblingslied').value.trim(),

        remarks:
          $('#remarks').value.trim(),

        choices:
          ids.join(','),

        choiceText:
          labelsFor(ids)

      };


      button.disabled = true;

      error('');

      status('Anmeldung wird gesendet …');


      let res;


      try {

        res = await api(
          {
            action: 'submit',
            ...data
          },
          20000
        );


      } catch (err) {

        console.error(err);

        status('');


        error(
          'Senden hat nicht geklappt – die Anmeldeliste ist nicht erreichbar. ' +
          'Bitte nochmal versuchen oder kurz Bescheid geben.'
        );


        button.disabled = false;

        return;

      }


      if (!res || !res.ok) {

        button.disabled = false;

        status('');


        error(
          'Senden hat nicht geklappt: ' +
          ((res && res.error) || 'unbekannt')
        );


        return;

      }


      /* ---------------------------------------------------
         Erfolgreich
         --------------------------------------------------- */

      status('');

      form.hidden = true;


      if ($('#progress')) {
        $('#progress').hidden = true;
      }


      $('#step-done').hidden = false;


      await drawTicket(
        $('#ticket'),
        {
          name: data.name,
          song: data.lieblingslied,
          choiceText: data.choiceText,
          remarks: data.remarks
        }
      );


      blob =
        await new Promise(
          (done) => {

            $('#ticket').toBlob(
              done,
              'image/png'
            );

          }
        );

    }
  );


  /* =======================================================
     TICKET BILD
     ======================================================= */

  /* Schriftgroesse so lange verkleinern, bis der Text passt. */
  function fitFont(ctx, text, maxWidth, size, weight) {

    let s = size;


    while (s > 18) {

      ctx.font =
        `${weight} ${s}px system-ui, sans-serif`;


      if (ctx.measureText(text).width <= maxWidth) {
        break;
      }


      s -= 2;

    }


    return s;

  }


  /* Text auf mehrere Zeilen umbrechen. */
  function wrap(ctx, text, maxWidth, maxLines) {

    const words = String(text).split(/\s+/);

    const lines = [];

    let line = '';


    words.forEach(
      (w) => {

        const test = line ? line + ' ' + w : w;


        if (
          ctx.measureText(test).width > maxWidth &&
          line
        ) {

          lines.push(line);

          line = w;

        } else {

          line = test;

        }

      }
    );


    if (line) {
      lines.push(line);
    }


    if (lines.length > maxLines) {

      const cut = lines.slice(0, maxLines);

      cut[maxLines - 1] =
        cut[maxLines - 1].replace(/\s*\S*$/, '') + ' …';

      return cut;

    }


    return lines;

  }


  async function drawTicket(canvas, data) {

    try {

      await document.fonts.ready;

    } catch (e) {}


    const ctx = canvas.getContext('2d');

    const W = canvas.width;
    const H = canvas.height;

    const M = 100;
    const CW = W - M * 2;


    /* --- Farben, passend zur Seite --- */
    const PAPER = '#faf8f3';
    const INK = '#2c2822';
    const GREEN = '#4f6146';
    const GREEN_DARK = '#3d4c36';
    const BROWN = '#8a7f6a';
    const LINE = '#d9d2c4';


    /* --- Untergrund --- */

    ctx.fillStyle = PAPER;

    ctx.fillRect(0, 0, W, H);


    /* --- Gruener Balken oben --- */

    ctx.fillStyle = GREEN;

    ctx.fillRect(0, 0, W, 16);


    /* --- Feiner Rahmen --- */

    ctx.strokeStyle = LINE;

    ctx.lineWidth = 2;

    ctx.strokeRect(40, 46, W - 80, H - 86);


    ctx.textBaseline = 'alphabetic';


    /* --- Titel --- */

    const titleSize =
      fitFont(ctx, EVENT.title, CW, 78, '700');

    ctx.font =
      `700 ${titleSize}px system-ui, sans-serif`;

    ctx.fillStyle = GREEN_DARK;

    ctx.fillText(EVENT.title, M, 200);


    /* --- Name --- */

    const nameSize =
      fitFont(ctx, data.name || 'Gast', CW, 44, '400');

    ctx.font =
      `400 ${nameSize}px system-ui, sans-serif`;

    ctx.fillStyle = INK;

    ctx.fillText(data.name || 'Gast', M, 262);


    /* --- Trennlinie --- */

    ctx.strokeStyle = LINE;

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(M, 306);

    ctx.lineTo(W - M, 306);

    ctx.stroke();


    /* --- Zusammenfassung --- */

    const rows = [

      [
        'Wann',
        `${EVENT.date} · ${EVENT.time}`
      ],

      [
        'Wo',
        EVENT.place
      ],

      [
        'Du bleibst',
        data.choiceText ||
        '–'
      ],

      [
        'Dein Lieblingslied',
        data.song || '–'
      ]

    ];


    /* Erst messen, dann setzen: so bleibt der Abstand stimmig,
       egal ob ein Liedtitel kurz ist oder ueber zwei Zeilen geht. */

    ctx.font =
      '500 36px system-ui, sans-serif';


    const wrapped =
      rows.map(
        ([, value]) =>
          wrap(ctx, String(value || '–'), CW, 2)
      );


    const TOP = 400;
    const FOOT = 150;
    const CHECK_BLOCK = 106 + CHECKLIST.length * 70;


    const textHeight =
      wrapped.reduce(
        (sum, lines) => sum + 46 + lines.length * 44,
        0
      );


    let gap =
      Math.round(
        (H - FOOT - TOP - textHeight - CHECK_BLOCK) /
        rows.length
      );


    gap = Math.max(22, Math.min(46, gap));


    let y = TOP;


    rows.forEach(
      ([label], index) => {

        ctx.font =
          '600 24px system-ui, sans-serif';

        ctx.fillStyle = BROWN;

        ctx.fillText(
          label.toUpperCase(),
          M,
          y
        );


        ctx.font =
          '500 36px system-ui, sans-serif';

        ctx.fillStyle = INK;


        const lines = wrapped[index];


        lines.forEach(
          (line, idx) => {

            ctx.fillText(
              line,
              M,
              y + 46 + idx * 44
            );

          }
        );


        y += 46 + lines.length * 44 + gap;

      }
    );


    /* --- Trennlinie --- */

    ctx.strokeStyle = LINE;

    ctx.beginPath();

    ctx.moveTo(M, y);

    ctx.lineTo(W - M, y);

    ctx.stroke();


    y += 76;


    /* --- Checkliste --- */

    ctx.font =
      '700 40px system-ui, sans-serif';

    ctx.fillStyle = GREEN_DARK;

    ctx.fillText('Bitte mitbringen', M, y);


    y += 30;


    CHECKLIST.forEach(
      (thing) => {

        /* Kaestchen zum Abhaken */

        ctx.strokeStyle = GREEN;

        ctx.lineWidth = 3;

        ctx.strokeRect(M, y, 34, 34);


        ctx.font =
          '400 34px system-ui, sans-serif';

        ctx.fillStyle = INK;

        ctx.fillText(thing, M + 56, y + 28);


        y += 70;

      }
    );


    /* --- Fusszeile --- */

    ctx.font =
      '400 26px system-ui, sans-serif';

    ctx.fillStyle = BROWN;

    ctx.fillText(
      'Bis bald – ich freue mich auf dich!',
      M,
      H - 96
    );

  }


  /* =======================================================
     DOWNLOAD
     ======================================================= */

  $('#download').addEventListener(
    'click',
    () => {

      if (!blob) {
        return;
      }


      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');


      a.href = url;

      a.download = 'einladung.png';


      a.click();


      setTimeout(
        () => {
          URL.revokeObjectURL(url);
        },
        4000
      );

    }
  );



}
