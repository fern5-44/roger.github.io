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
   APPS SCRIPT
   ========================================================= */

const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwpiKI0KTew2TdgcO1_k4WA1-syOZBT309YuQTD4ibTVxJvJa4UPaV-6vRhhEE4tAdU/exec';


/* =========================================================
   AUSWAHL
   ========================================================= */

const CHOICE_TITLE = 'Was bringst du mit?';
const CHOICE_MODE = 'multi';
const CHOICE_REQUIRED = true;

const DEMO_ITEMS = [
  {
    id: 'kuchen',
    label: 'Kuchen',
    note: 'Schoko',
    left: 3
  },
  {
    id: 'salat',
    label: 'Salat',
    note: 'GusGus',
    left: 2
  },
  {
    id: 'Sauce',
    label: 'Sauce',
    note: '',
    left: 2
  },
  {
    id: 'nichts',
    label: 'Überraschung',
    note: 'Es befindet sich nicht auf der Liste aber muss unbedingt mit!',
    left: null
  }
];


/* =========================================================
   ELEMENTE
   ========================================================= */

const $ = (sel) => document.querySelector(sel);

const form = $('#rsvp');

const stepEls = [
  ...document.querySelectorAll('[data-step]')
];

let items = [];
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
    return 'Bitte beantworte alle drei Fragen.';
  }


  if (q1.value !== SECURITY_ANSWERS.question1) {
    return 'Frage 1 ist falsch. Versuch es noch einmal.';
  }


  if (q2.value !== SECURITY_ANSWERS.question2) {
    return 'Frage 2 ist falsch. Versuch es noch einmal.';
  }


  if (q3.value !== SECURITY_ANSWERS.question3) {
    return 'Frage 3 ist falsch. Versuch es noch einmal.';
  }


  return null;
}


/* =========================================================
   INITIALISIERUNG
   ========================================================= */

if (!form) {
  console.error(
    'FEHLER: Das Formular #rsvp wurde nicht gefunden.'
  );
} else {

  $('#title').textContent = EVENT.title;

  $('#meta').textContent =
    `${EVENT.date}, ${EVENT.time} · ${EVENT.place}`;

  $('#choice-title').textContent = CHOICE_TITLE;


  /* =======================================================
     JSONP API
     ======================================================= */

  function api(params) {

    return new Promise((resolve, reject) => {

      const cb =
        'cb_' + Math.random().toString(36).slice(2);

      const script =
        document.createElement('script');

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
        reject(
          new Error('Keine Verbindung')
        );
      };


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
     BESTAND
     ======================================================= */

  async function loadStock() {

    status('Lade die Auswahl …');

    try {

      const res = ENDPOINT
        ? await api({ action: 'stock' })
        : {
            ok: true,
            items: DEMO_ITEMS
          };


      if (!res.ok) {
        throw new Error(
          res.error || 'Unbekannter Fehler'
        );
      }


      items = res.items || [];

      status('');

    } catch (err) {

      console.error(err);

      status(
        'Die Auswahl konnte nicht geladen werden. Bitte die Seite neu laden.'
      );
    }


    renderChoices();
  }


  function renderChoices() {

    const keep = getChoices();

    const free = items.filter(
      (i) =>
        i.left === null ||
        i.left > 0
    );


    if (!free.length) {

      $('#choices').innerHTML =
        '<p>Es ist schon alles vergeben – einfach weiterklicken.</p>';

      return;
    }


    const type =
      CHOICE_MODE === 'single'
        ? 'radio'
        : 'checkbox';


    $('#choices').innerHTML =
      free
        .map((i) => {

          const rest =
            i.left === null
              ? ''
              : ` <small>noch ${i.left} frei</small>`;


          return `
            <label class="choice">
              <input
                type="${type}"
                name="choice"
                value="${i.id}"
                ${keep.includes(i.id) ? 'checked' : ''}
              >
              <span>
                ${escapeHtml(i.label)}
                ${rest}
                ${
                  i.note
                    ? ` <small>${escapeHtml(i.note)}</small>`
                    : ''
                }
              </span>
            </label>
          `;
        })
        .join('');
  }


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


  function getChoices() {

    return [
      ...form.querySelectorAll(
        'input[name="choice"]:checked'
      )
    ].map(
      (el) => el.value
    );
  }


  function labelsFor(ids) {

    return ids
      .map(
        (id) =>
          (
            items.find(
              (i) => i.id === id
            ) || { label: id }
          ).label
      )
      .join('; ');
  }


  /* =======================================================
     SCHRITTE
     ======================================================= */

  let step = 0;


  function show(i) {

    console.log(
      'Wechsle zu Schritt:',
      i
    );


    if (
      i < 0 ||
      i >= stepEls.length
    ) {
      console.error(
        'Ungültiger Schritt:',
        i,
        'Anzahl Schritte:',
        stepEls.length
      );

      return;
    }


    step = i;


    stepEls.forEach(
      (el, index) => {
        el.hidden = index !== i;
      }
    );


    $('#progress').textContent =
      `Schritt ${i + 1} von ${stepEls.length}`;


    error('');


    /*
      Schritt 2 = Auswahl
    */

    if (i === 2) {
      loadStock();
    }


    const first =
      stepEls[i].querySelector(
        'input:not([type="radio"]):not([type="checkbox"]), textarea, select'
      );


    if (first) {
      first.focus();
    }
  }


  function error(msg) {
    $('#error').textContent = msg;
  }


  function status(msg) {
    $('#status').textContent = msg;
  }


  /* =======================================================
     VALIDIERUNG
     ======================================================= */

  function validate(i) {


    /* -----------------------------------------------
       SCHRITT 0
       Sicherheitsfragen
       ----------------------------------------------- */

    if (i === 0) {
      return validateSecurityQuestions();
    }


    /* -----------------------------------------------
       SCHRITT 1
       Name / E-Mail
       ----------------------------------------------- */

    if (i === 1) {

      const name =
        $('#name').value.trim();


      if (!name) {
        return 'Bitte den Namen eintragen.';
      }


      const mail =
        $('#email').value.trim();


      if (
        mail &&
        !$('#email').checkValidity()
      ) {
        return 'Diese E-Mail-Adresse sieht unvollständig aus.';
      }


      return null;
    }


    /* -----------------------------------------------
       SCHRITT 2
       Auswahl
       ----------------------------------------------- */

    if (i === 2) {

      const available =
        items.some(
          (x) =>
            x.left === null ||
            x.left > 0
        );


      if (
        CHOICE_REQUIRED &&
        available &&
        !getChoices().length
      ) {
        return 'Bitte mindestens eine Option wählen.';
      }


      return null;
    }


    return null;
  }


  /* =======================================================
     BUTTONS
     ======================================================= */

  form.addEventListener(
    'click',
    (e) => {

      const next =
        e.target.closest('[data-next]');

      const back =
        e.target.closest('[data-back]');


      if (next) {

        console.log(
          'Weiter geklickt. Aktueller Schritt:',
          step
        );


        const problem =
          validate(step);


        if (problem) {

          console.log(
            'Validierung fehlgeschlagen:',
            problem
          );

          error(problem);

          return;
        }


        console.log(
          'Validierung erfolgreich.'
        );


        show(step + 1);

        return;
      }


      if (back) {

        show(step - 1);

        return;
      }
    }
  );


  /* =======================================================
     START
     ======================================================= */

  show(0);


  /* =======================================================
     ABSENDEN
     ======================================================= */

  form.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      const ids =
        getChoices();


      const data = {

        name:
          $('#name').value.trim(),

        email:
          $('#email').value.trim(),

        remarks:
          $('#remarks').value.trim(),

        choices:
          ids.join(',')
      };


      button.disabled = true;

      error('');


      let res;


      try {

        res = ENDPOINT
          ? await api({
              action: 'submit',
              ...data
            })
          : {
              ok: true,
              items: items
            };

      } catch (err) {

        console.error(err);

        error(
          'Senden hat nicht geklappt. Bitte nochmal versuchen.'
        );

        button.disabled = false;

        return;
      }


      if (!res.ok) {

        button.disabled = false;


        if (res.conflict) {

          items =
            res.items || items;

          renderChoices();

          show(2);

          return error(
            `${labelsFor(res.conflict)} ist inzwischen vergeben. Bitte neu wählen.`
          );
        }


        return error(
          'Senden hat nicht geklappt: ' +
          (res.error || 'unbekannt')
        );
      }


      form.hidden = true;

      $('#progress').hidden = true;

      $('#step-done').hidden = false;


      await drawTicket(
        $('#ticket'),
        {
          name: data.name,
          choiceText: labelsFor(ids)
        }
      );


      blob =
        await new Promise(
          (done) =>
            $('#ticket').toBlob(
              done,
              'image/png'
            )
        );


      if (canShareFiles()) {
        $('#share').hidden = false;
      }
    }
  );


  /* =======================================================
     BILD
     ======================================================= */

  async function drawTicket(canvas, data) {

    try {
      await document.fonts.ready;
    } catch (e) {}


    const ctx =
      canvas.getContext('2d');

    const M = 90;


    ctx.fillStyle = '#f5f2ec';

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    ctx.fillStyle = '#16181d';

    ctx.textBaseline =
      'alphabetic';


    ctx.font =
      '700 80px system-ui, sans-serif';

    ctx.fillText(
      EVENT.title,
      M,
      220
    );


    ctx.font =
      '400 40px system-ui, sans-serif';

    ctx.fillText(
      data.name || 'Gast',
      M,
      340
    );


    const rows = [

      ['Datum', EVENT.date],

      ['Uhrzeit', EVENT.time],

      ['Ort', EVENT.place],

      ['Du bringst mit', data.choiceText]

    ];


    let y = 480;


    for (const [label, value] of rows) {

      ctx.font =
        '400 24px system-ui, sans-serif';

      ctx.fillStyle =
        '#6b7078';

      ctx.fillText(
        label.toUpperCase(),
        M,
        y
      );


      ctx.font =
        '500 36px system-ui, sans-serif';

      ctx.fillStyle =
        '#16181d';

      ctx.fillText(
        String(value || '–'),
        M,
        y + 48
      );


      y += 120;
    }
  }


  /* =======================================================
     DOWNLOAD
     ======================================================= */

  $('#download').addEventListener(
    'click',
    () => {

      if (!blob) return;


      const url =
        URL.createObjectURL(blob);


      const a =
        document.createElement('a');


      a.href = url;

      a.download =
        'einladung.png';


      a.click();


      setTimeout(
        () =>
          URL.revokeObjectURL(url),
        4000
      );
    }
  );


  /* =======================================================
     TEILEN
     ======================================================= */

  $('#share').addEventListener(
    'click',
    async () => {

      try {

        await navigator.share({
          title: EVENT.title,
          files: [file()]
        });

      } catch (err) {

        if (
          err.name !== 'AbortError'
        ) {
          console.error(err);
        }
      }
    }
  );


  function file() {

    return new File(
      [blob],
      'einladung.png',
      {
        type: 'image/png'
      }
    );
  }


  function canShareFiles() {

    try {

      return !!navigator.canShare &&
        navigator.canShare({
          files: [file()]
        });

    } catch (e) {

      return false;
    }
  }

}
