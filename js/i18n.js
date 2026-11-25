/* TabLab: English lives in the HTML, Croatian here. Strings the script writes at runtime have both. */
(function () {
  var HR = {
    'skip': 'Preskoči na sadržaj',
    'nav.work': 'Radovi',
    'nav.services': 'Usluge',
    'nav.process': 'Proces',
    'nav.contact': 'Kontakt',
    'hero.t1': 'Web stranice koje vrijedi',
    'hero.t2': 'otvoriti.',
    'hero.lede': 'Web stranice po mjeri za vaš posao, od prve skice do objave.',
    'hero.cta': 'Pokrenimo projekt',
    'hero.work': 'Pogledaj radove',
    'hero.index': 'Uživo u mapama ispod:',
    'work.title': 'Otvori karticu. Isprobaj stranicu.',
    'work.lede': 'Tri konceptne stranice koje smo dizajnirali i izradili. Rade uživo u mapama ispod.',
    'work.tablist': 'Konceptne stranice',
    'work.try': 'Isprobaj ovdje',
    'work.built': 'Izrađeno s',
    'work.try-label': 'Probaj',
    'work.open': 'Otvori cijelu stranicu',
    'newtab': ' (otvara se u novoj kartici)',
    'p1.tab': 'Slaganje outfita',
    'p1.alt': 'Slaganje outfita: šest modela u nizu, a u bočnom panelu komadi odabranog izgleda i cijena kompleta.',
    'p1.text': 'Povuci kroz šest izgleda i pogledaj svaki komad odjeće, s cijenom za cijeli komplet.',
    'p1.try': 'Povuci niz modela',
    'p2.tab': 'Kolekcija majica',
    'p2.alt': 'Kolekcija majica: sedam majica na stalku ispod velikog naslova.',
    'p2.text': 'Sedam majica na stalku, svaka u dvije boje. Prijeđi mišem za pregled, klikni da je skineš sa stalka.',
    'p2.try': 'Klikni majicu na stalku',
    'p3.tab': 'Kripto stranica',
    'p3.alt': 'Kripto stranica: veliki naslov na tamnoj mreži sa zelenim česticama.',
    'p3.text': 'Stranica koja izrudari prvi blok prije nego te pusti unutra, a zatim gradi lanac dok skrolaš.',
    'p3.try': 'Klikni staklenu kocku',
    'statement.label': 'U što vjerujemo',
    'statement.text': 'Ljudi u nekoliko sekundi odluče vrijedi li stranica njihova vremena. Mi dizajniramo te sekunde.',
    'services.title': 'Od prve skice do stranice uživo',
    'services.lede': 'Jedan mali tim radi dizajn, kod i animacije.',
    's1.title': 'Web dizajn',
    's1.text': 'Raspored, tipografija i boje oblikovani prema vašem brendu i provjereni na pravim ekranima.',
    's2.title': 'Izrada',
    's2.text': 'Ručno pisan kod koji se brzo učitava i radi na svakom mobitelu.',
    's3.title': 'Animacije',
    's3.text': 'Animacije na skrolanje i prelazak mišem koje ljudima pokazuju kamo dalje gledati.',
    's4.title': 'Web trgovine',
    's4.text': 'Stranice proizvoda, lookbookovi i košarice u kojima je kupnja jednostavna.',
    'process.title': 'Četiri koraka od prvog poziva do objave',
    'p.1.title': 'Upoznavanje',
    'p.1.text': 'Razgovaramo o vašem poslu, vašim kupcima i tome što stranica mora raditi.',
    'p.2.title': 'Dizajn',
    'p.2.text': 'Raspored i animacije isprobate u prototipu prije prve linije koda.',
    'p.3.title': 'Izrada',
    'p.3.text': 'Programiramo, testiramo na mobitelima i laptopima te ubrzavamo učitavanje.',
    'p.4.title': 'Objava',
    'p.4.text': 'Domena, hosting i predaja. Ostajemo uz vas za popravke i nakon objave.',
    'contact.title': 'Opišite nam svoju stranicu',
    'contact.lede': 'Za početak je dovoljno nekoliko rečenica.',
    'contact.email': 'Email',
    'contact.email-soon': 'Adresa stiže uskoro',
    'contact.phone': 'Telefon',
    'contact.phone-soon': 'Broj stiže uskoro',
    'form.name': 'Vaše ime',
    'form.email': 'Email',
    'form.need': 'Što trebate?',
    'form.n1': 'Novu web stranicu',
    'form.n2': 'Redizajn',
    'form.n3': 'Web trgovinu',
    'form.n4': 'Nešto drugo',
    'form.msg': 'O projektu',
    'form.send': 'Pošalji upit',
    'footer.line': 'Web dizajn i izrada.'
  };

  var RUNTIME = {
    en: {
      words: ['opening.', 'visiting.', 'exploring.', 'sharing.'],
      pauseMotion: 'Pause animations', playMotion: 'Play animations',
      tryOn: 'Try it here',
      tryOff: 'Done exploring',
      langLabel: 'Hrvatski', langCode: 'hr', langAria: 'Prebaci na hrvatski',
      iframeTitle: 'Live preview: ',
      top: 'Top',
      errName: 'Add your name so we know who to answer.',
      errEmail: 'That email looks incomplete. Write it as name@example.com.',
      errMsg: 'Write a line or two about the project.',
      notSent: 'Nothing was sent: this form is not connected yet. Until it is, message us on Instagram.',
      sent: 'Thanks. Your brief reached us, and we answer at ',
      failed: 'That did not go through. Try again in a minute, or message us on Instagram.'
    },
    hr: {
      words: ['otvoriti.', 'posjetiti.', 'istražiti.', 'podijeliti.'],
      pauseMotion: 'Zaustavi animacije', playMotion: 'Pokreni animacije',
      tryOn: 'Isprobaj ovdje',
      tryOff: 'Gotovo',
      langLabel: 'English', langCode: 'en', langAria: 'Switch to English',
      iframeTitle: 'Pregled uživo: ',
      top: 'Vrh',
      errName: 'Upišite ime da znamo kome odgovaramo.',
      errEmail: 'Email izgleda nepotpuno. Upišite ga kao ime@primjer.hr.',
      errMsg: 'Napišite rečenicu ili dvije o projektu.',
      notSent: 'Ništa nije poslano: obrazac još nije povezan. Do tada nam pišite na Instagramu.',
      sent: 'Hvala. Upit je stigao, a odgovaramo na ',
      failed: 'Slanje nije uspjelo. Pokušajte ponovno za minutu ili nam pišite na Instagramu.'
    }
  };

  var EN = {};
  var root = document.documentElement;

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  // English comes from the markup, captured once.
  each('[data-i18n]', function (el) { EN[el.getAttribute('data-i18n')] = el.textContent; });
  each('[data-i18n-alt]', function (el) { EN[el.getAttribute('data-i18n-alt')] = el.getAttribute('alt'); });
  each('[data-i18n-aria]', function (el) { EN[el.getAttribute('data-i18n-aria')] = el.getAttribute('aria-label'); });

  // main.js can take over the visible swap (the letters fly out and back in) by setting api.transition.
  // It receives [{ el, text }] and a swap callback, and returns how long the whole change takes in ms.
  var api = { transition: null };

  function swapEvent(lang) {
    document.dispatchEvent(new CustomEvent('tablab:langswap', { detail: { lang: lang } }));
  }

  function apply(lang, animate) {
    var dict = lang === 'hr' ? HR : EN;
    var pick = function (k) { return dict[k] != null ? dict[k] : EN[k]; };
    var t = RUNTIME[lang];
    var pairs = [];
    root.setAttribute('lang', lang);
    if (lang === 'hr') root.setAttribute('data-lang', 'hr'); else root.removeAttribute('data-lang');
    each('[data-i18n]', function (el) {
      var text = pick(el.getAttribute('data-i18n'));
      if (el.textContent !== text) pairs.push({ el: el, text: text });
    });
    each('[data-lang-toggle]', function (b) {
      if (b.textContent !== t.langLabel) pairs.push({ el: b, text: t.langLabel });
      b.setAttribute('lang', t.langCode); b.setAttribute('aria-label', t.langAria);
    });
    each('[data-i18n-alt]', function (el) { el.setAttribute('alt', pick(el.getAttribute('data-i18n-alt'))); });
    each('[data-i18n-aria]', function (el) { el.setAttribute('aria-label', pick(el.getAttribute('data-i18n-aria'))); });
    document.title = lang === 'hr' ? 'TabLab, web stranice koje vrijedi otvoriti' : 'TabLab, websites worth opening';
    if (animate && api.transition) return api.transition(pairs, function () { swapEvent(lang); }) || 0;
    pairs.forEach(function (p) { p.el.textContent = p.text; });
    swapEvent(lang);
    return 0;
  }

  var current = root.getAttribute('data-lang') === 'hr' ? 'hr' : 'en';

  api.t = function (key) { return RUNTIME[current][key]; };
  Object.defineProperty(api, 'lang', { get: function () { return current; } });
  var switching = false;
  api.set = function (lang) {
    if (lang === current || switching) return;
    switching = true;
    current = lang;
    try { localStorage.setItem('tablab-lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('tablab:beforelang', { detail: { lang: lang } }));
    var ms = apply(lang, true);
    setTimeout(function () {
      switching = false;
      document.dispatchEvent(new CustomEvent('tablab:lang', { detail: { lang: lang } }));
    }, ms + 30);
  };
  window.TabLabI18n = api;

  apply(current, false);

  each('[data-lang-toggle]', function (b) {
    b.addEventListener('click', function () { api.set(current === 'hr' ? 'en' : 'hr'); });
  });
})();
