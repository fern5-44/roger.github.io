/* =========================================================
   EVENT
   ========================================================= */

const EVENT = {
  title: 'Särli feiert Geburtstag',
  date: 'Sa 09 - So 10, Januar 2027',
  time: '14:00 Uhr',
  place: 'St.Gallen Bahnhof (47.42325928890625, 9.370972681293138)',
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
  'https://script.google.com/macros/s/AKfycbzXwd0mBFNSOh1666upWrSf84h3yzWjc5Avk7XohSTVmhBGYC5G5sulDuYiQCexkRqM/exec';


/* =========================================================
   AUSWAHL – SCHRITT 3
   ========================================================= */

const CHOICE_TITLE = 'Wie lange bist du dabei?';
const CHOICE_MODE = 'single';      // 'single' = ankreuzen, nur eine Option
const CHOICE_REQUIRED = true;

const OPTIONS = [
  {
    id: 'openend',
    label: 'Samstig - Open End',
    note: 'Nachem Znacht gits no en Spili- / Bastelobig + en Film. Es git kein offizielle Schluss, du dörfsch frei sege bis wenn du magsch blibe.'
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
  'Sportkleider (Indoorsport)',
  'Falls häsch, Kletterschuhe',
  'Zugticket',
  'Wetter entsprechendi Kleidig (Bi Schnee chunt dSarah uf lustigi Idee)',
  'Fall übernachtisch snöstigste zum Schlofe (Decki & Chüssi hemmer)'
];


/* =========================================================
   KOMMENTAR UNTER DER CHECKLISTE (steht fest auf dem Bild)
   ---------------------------------------------------------
   Hier deinen eigenen Text eintragen. Er wird automatisch auf
   bis zu 3 Zeilen umgebrochen. Leer lassen ('') = kein Kommentar.
   ========================================================= */

const CHECKLIST_NOTE =
  'Bezüglich Gschenkli, fühl dich nöd verpflichtet was zschenke. SGrösste Gschänk für mi isch wenn du as Feschtli chunsch :). I schenke amel au mega gern öppis, falls dir glich goht aber du nöd weisch was, den chasch au gern öppis für de Zmorge biistüre. Schrib mo denn doch gschwind, was bringe möchtisch, nöd das mo denn dSache doppelt hend ;)';


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

      if (!$('#funfact').value.trim()) {
        return 'En Funfact über dich:';
      }

      if (!$('#zutat').value.trim()) {
        return 'Dini Lieblingszuetat uf de Pizza:';
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

        funfact:
          $('#funfact').value.trim(),

        zutat:
          $('#zutat').value.trim(),

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

    /* Der Flyer ist ein fertiges Bild (flyer.png im Repo). */
    const img = new Image();
    img.src = (data.choiceText || '').includes('Open End')
      ? 'flyer-ohne-uebernachten.png'
      : 'flyer.png';

    /* Kalender: ohne Übernachten nur bis 23 Uhr */
    if ((data.choiceText || '').includes('Open End')) {
      const cal = document.querySelector('a[href*="Meine_Termine"]');
      cal.href = cal.href.replace('Meine_Termine.ics', 'Meine_Termine_ohne_uebernachten.ics');
    }
    await img.decode();

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);

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
