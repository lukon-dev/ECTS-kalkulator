"serviceWorker" in navigator &&
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {})
  );

const $ = (s) => document.querySelector(s);

const e = {
  formularz: $("#formularz"),
  poleNazwy: $("#f-nazwa"),
  poleOceny: $("#f-ocena"),
  poleEcts: $("#f-ects"),
  poleSemestru: $("#f-sem"),
  podgladFormularza: $("#podglad-formularza"),
  listaPrzedmiotow: $("#lista-przedmiotow"),
  komunikatPusty: $("#pusty"),
  znaczekLiczby: $("#znaczek-liczby"),
  przyciskWyczyszczenia: $("#btn-wyczysc"),
  owijkaFiltrow: $("#filtry-owijka"),
  filtry: $("#filtry"),
  statystykaSredniej: $("#stat-srednia"),
  statystykaEcts: $("#stat-ects"),
  statystykaLiczby: $("#stat-liczba"),
  statystykaDokladna: $("#stat-dokladna"),
  checkboxDokladna: $("#checkbox-dokladna"),
  wykres: $("#wykres"),
  chipySemestrow: $("#chipy-semestrow"),
  wykresLinii: $("#wykres-linii"),
  wejsciaCoJesli: $("#co-jesli-wejscia"),
  przyciskDodajCoJesli: $("#co-jesli-dodaj"),
  wynikCoJesli: $("#co-jesli-wynik"),
  terazCoJesli: $("#co-jesli-teraz"),
  potemCoJesli: $("#co-jesli-potem"),
  roznicaCoJesli: $("#co-jesli-roznica"),
  pustyCoJesli: $("#co-jesli-pusty"),
  progStypendium: $("#stypendium-prog"),
  osobyStypendium: $("#stypendium-osoby"),
  procentStypendium: $("#stypendium-proc"),
  wynikStypendium: $("#stypendium-wynik"),
  pustyStypendium: $("#stypendium-pusty"),
  markerStypendium: $("#stypendium-marker"),
  tyStypendium: $("#stypendium-ty"),
  twojaStypendium: $("#stypendium-twoja"),
  progWartoscStypendium: $("#stypendium-prog-wartosc"),
  roznicaStypendium: $("#stypendium-roznica"),
  miejsceStypendium: $("#stypendium-miejsce"),
  przedStypendium: $("#stypendium-przed"),
  podobniStypendium: $("#stypendium-podobni"),
  szansaBadge: $("#stypendium-szansa-badge"),
  komunikatStypendium: $("#stypendium-komunikat"),
  bohater: $("#hero"),
  wzorLicznik: $("#wzor-licznik"),
  wzorMianownik: $("#wzor-mianownik"),
  przyciskPokazInfo: $("#btn-pokaz-info"),
  przyciskUdostepnij: $("#btn-udostepnij"),
  celWejscie: $("#cel-wejscie"),
  celInfo: $("#cel-info"),
  celPasek: $("#cel-pasek"),
  celWypelnienie: $("#cel-wypelnienie"),
  celEtykiety: $("#cel-etykiety"),
  celEtykietaPrawa: $("#cel-etykieta-prawa"),
  kontenerPowiadomien: $("#kontener-powiadomien"),
  konfettiCanvas: $("#konfetti-canvas"),
  modalEdycji: $("#modal-edycji"),
  modalNazwa: $("#e-nazwa"),
  modalOcena: $("#e-ocena"),
  modalEcts: $("#e-ects"),
  modalSemestr: $("#e-sem"),
  modalZapisz: $("#modal-zapisz"),
  modalAnuluj: $("#modal-anuluj"),
  modalImport: $("#modal-import"),
  modalImportAnuluj: $("#modal-import-anuluj"),
  modalImportZaladuj: $("#modal-import-zaladuj"),
  segmentedWazona: $("#seg-wazona"),
  segmentedArytmetyczna: $("#seg-arytmetyczna"),
  segmentedThumb: $("#seg-thumb"),
};

const DOSTEPNE_OCENY = [2, 3, 3.5, 4, 4.5, 5];
const KLASY_OCEN = Object.freeze({ 2:"g2", 3:"g3", 3.5:"g35", 4:"g4", 4.5:"g45", 5:"g5" });
const KLUCZ_DANYCH    = "ectscalc";
const KLUCZ_BOHATERA  = "ectscalc_hero";
const KLUCZ_SEMESTRU  = "ectscalc_sem";
const KLUCZ_CELU      = "ectscalc_cel";
const KLUCZ_TRYBU     = "ectscalc_tryb";

let przedmioty       = JSON.parse(localStorage.getItem(KLUCZ_DANYCH)) || [];
let bohaterWidoczny  = localStorage.getItem(KLUCZ_BOHATERA) !== "0";
let trybDokladny     = false;
let trybSredniej     = localStorage.getItem(KLUCZ_TRYBU) || "wazona"; // "wazona" | "arytmetyczna"
let aktywneFiltery   = new Set();
let wierszeCoJesli   = [{ ocena: 4.5, ects: 5 }];
let ostatnioUsuniety = null;
let celOsiagniety    = false;
let trybInicjalizacji = true;
let edytowanyId      = null;
let pendingImportData = null;

// ---------- helpers ----------

const klasaOceny    = (ocena) => KLASY_OCEN[ocena] ?? "";
const zaokraglOcene = (s) => Math.round(s * 2) / 2;
const zapiszDane    = () => localStorage.setItem(KLUCZ_DANYCH, JSON.stringify(przedmioty));

function sumaEctsLista(lista) {
  return lista.reduce((s, p) => s + p.ects, 0);
}

function sumaWazonychLista(lista) {
  return lista.reduce((s, p) => s + p.ocena * p.ects, 0);
}

// Centralna funkcja obliczania średniej – obsługuje oba tryby
function obliczSrednia(lista, tryb) {
  tryb = tryb || trybSredniej;
  if (!lista || !lista.length) return null;
  if (tryb === "arytmetyczna") {
    return lista.reduce((s, p) => s + p.ocena, 0) / lista.length;
  }
  const se = sumaEctsLista(lista);
  return se ? sumaWazonychLista(lista) / se : null;
}

function obliczSredniaWazona(lista) {
  return obliczSrednia(lista, "wazona");
}

function grupujPoSemestrach() {
  return przedmioty.reduce((g, p) => {
    const k = p.semestr || "brak";
    (g[k] = g[k] || []).push(p);
    return g;
  }, {});
}

function sortujKlucze(klucze) {
  return [...klucze].sort((a, b) => {
    if (a === "brak") return 1;
    if (b === "brak") return -1;
    return +a - +b;
  });
}

function parsujSemestr(val) {
  const n = parseInt(val, 10);
  return !isNaN(n) && n >= 1 && n <= 14 ? String(n) : null;
}

function idPrzedmiotu(p) {
  return p.identyfikator ?? p.id;
}

// ---------- rozkład normalny (przybliżenie) ----------

function normalCDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf  = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf  = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

// ---------- animacje ----------

const animowaneLiczniki = new Map();

function animujLiczbe(el, nowaWartosc, miejsca = 2, czas = 420) {
  const stara = parseFloat(el.textContent) || 0;
  const nowa  = parseFloat(nowaWartosc);
  if (isNaN(nowa)) { el.textContent = nowaWartosc; return; }
  if (Math.abs(nowa - stara) < 0.001) { el.textContent = nowa.toFixed(miejsca); return; }
  if (animowaneLiczniki.has(el)) cancelAnimationFrame(animowaneLiczniki.get(el));
  const start = performance.now();
  const krok = (t) => {
    const p = Math.min((t - start) / czas, 1);
    el.textContent = (stara + (nowa - stara) * (1 - Math.pow(1 - p, 3))).toFixed(miejsca);
    if (p < 1) animowaneLiczniki.set(el, requestAnimationFrame(krok));
    else { el.textContent = nowa.toFixed(miejsca); animowaneLiczniki.delete(el); }
  };
  animowaneLiczniki.set(el, requestAnimationFrame(krok));
}

let konfettiAktywne = false;

function uruchomKonfetti() {
  if (konfettiAktywne) return;
  konfettiAktywne = true;
  const canvas = e.konfettiCanvas;
  canvas.style.display = "block";
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  const kolory = ["#00e5a0","#06b6d4","#f59e0b","#e5484d","#7cc443","#38bdf8"];
  const czastki = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    promien: Math.random() * 6 + 3,
    kolor: kolory[Math.floor(Math.random() * kolory.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    kat: Math.random() * 360,
    obrot: (Math.random() - 0.5) * 8,
    alpha: 1,
  }));
  const rysuj = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let zywe = 0;
    czastki.forEach((c) => {
      c.x += c.vx; c.y += c.vy; c.vy += 0.08; c.kat += c.obrot;
      if (c.y > canvas.height * 0.7) c.alpha -= 0.02;
      if (c.alpha <= 0) return;
      zywe++;
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.alpha);
      ctx.fillStyle = c.kolor;
      ctx.translate(c.x, c.y);
      ctx.rotate((c.kat * Math.PI) / 180);
      ctx.fillRect(-c.promien / 2, -c.promien / 2, c.promien, c.promien * 0.5);
      ctx.restore();
    });
    if (zywe > 0) requestAnimationFrame(rysuj);
    else { canvas.style.display = "none"; konfettiAktywne = false; }
  };
  rysuj();
}

// ---------- powiadomienia ----------

function pokazPowiadomienie(tekst, rodzaj = "ok", akcja = null) {
  const el = document.createElement("div");
  el.className = `powiadomienie ${rodzaj}`;
  const span = document.createElement("span");
  span.textContent = tekst;
  el.appendChild(span);
  if (akcja) {
    const btn = document.createElement("button");
    btn.className = "powiadomienie-akcja";
    btn.textContent = akcja.etykieta;
    btn.addEventListener("click", () => {
      akcja.fn();
      el.classList.add("znikanie");
      setTimeout(() => el.remove(), 250);
    });
    el.appendChild(btn);
  }
  e.kontenerPowiadomien.appendChild(el);
  setTimeout(() => {
    el.classList.add("znikanie");
    setTimeout(() => el.remove(), 250);
  }, akcja ? 4500 : 2400);
}

function cofnijUsuniecie() {
  if (!ostatnioUsuniety) return;
  przedmioty.splice(ostatnioUsuniety.indeks, 0, ostatnioUsuniety.przedmiot);
  zapiszDane();
  renderujWszystko();
  ostatnioUsuniety = null;
  pokazPowiadomienie("Przywrócono przedmiot");
}

// ---------- bohater ----------

function ustawBohatera(widoczny) {
  bohaterWidoczny = widoczny;
  e.bohater.classList.toggle("ukryty", !widoczny);
  e.przyciskPokazInfo.classList.toggle("aktywny", widoczny);
  e.przyciskPokazInfo.title = widoczny ? "Zamknij" : "Jak to działa?";
  localStorage.setItem(KLUCZ_BOHATERA, widoczny ? "1" : "0");
}

// ---------- tryb średniej (segmented control) ----------

function ustawTrybSredniej(tryb, zapiszLS = true) {
  trybSredniej = tryb;
  if (zapiszLS) localStorage.setItem(KLUCZ_TRYBU, tryb);

  // segmented control – przesuń thumb
  if (tryb === "arytmetyczna") {
    e.segmentedThumb.style.transform = "translateX(100%)";
    e.segmentedWazona.classList.remove("seg-aktywny");
    e.segmentedArytmetyczna.classList.add("seg-aktywny");
    // wzór hero
    if (e.wzorLicznik) e.wzorLicznik.innerHTML = "&#x2211; ocena<sub>i</sub>";
    if (e.wzorMianownik) e.wzorMianownik.textContent = "n";
  } else {
    e.segmentedThumb.style.transform = "translateX(0%)";
    e.segmentedArytmetyczna.classList.remove("seg-aktywny");
    e.segmentedWazona.classList.add("seg-aktywny");
    if (e.wzorLicznik) e.wzorLicznik.innerHTML = "&#x2211; (ocena<sub>i</sub> &times; ECTS<sub>i</sub>)";
    if (e.wzorMianownik) e.wzorMianownik.innerHTML = "&#x2211; ECTS<sub>i</sub>";
  }

  renderujWszystko();
}

// ---------- statystyki ----------

function ukryjCel() {
  e.celInfo.classList.add("ukryty");
  e.celPasek.classList.add("ukryty");
  e.celEtykiety.classList.add("ukryty");
}

function obliczCelSredniej(srednia, sumaEcts, pozwolKonfetti = false) {
  if (srednia === undefined) {
    if (!przedmioty.length) { ukryjCel(); return; }
    srednia = obliczSrednia(przedmioty);
    sumaEcts = sumaEctsLista(przedmioty);
  }
  const cel = parseFloat(e.celWejscie.value);
  if (!cel || cel < 2 || cel > 5) { ukryjCel(); return; }

  const roznica = srednia - cel;
  e.celInfo.classList.remove("ukryty");
  e.celPasek.classList.remove("ukryty");
  e.celEtykiety.classList.remove("ukryty");

  if (srednia >= cel) {
    e.celInfo.innerHTML = `<strong>Cel osiągnięty!</strong> Zapas: ${roznica.toFixed(3)} pkt powyżej ${cel.toFixed(2)}.`;
    e.celWypelnienie.style.width = "100%";
    e.celWypelnienie.className = "cel-wypelnienie ok";
    if (!celOsiagniety && pozwolKonfetti && !trybInicjalizacji) uruchomKonfetti();
    celOsiagniety = true;
  } else {
    celOsiagniety = false;
    const sw = sumaWazonychLista(przedmioty);
    const potrzebaEcts = trybSredniej === "wazona"
      ? Math.max(0, (cel * sumaEcts - sw) / (5 - cel))
      : Math.max(0, (cel * (przedmioty.length + 1) - przedmioty.reduce((s,p)=>s+p.ocena,0)) / (5 - cel));
    e.celInfo.innerHTML = `Brakuje <strong>${Math.abs(roznica).toFixed(3)} pkt</strong>. Potrzebujesz ok. <strong>${potrzebaEcts.toFixed(1)} ECTS</strong> z oceną 5.0.`;
    const procent = Math.min(Math.max(0, (srednia - 2.0) / (cel - 2.0)) * 100, 99);
    e.celWypelnienie.style.width = procent + "%";
    e.celWypelnienie.className = procent >= 70 ? "cel-wypelnienie ostrzezenie" : "cel-wypelnienie nie";
  }
  e.celEtykietaPrawa.textContent = cel.toFixed(2);
}

function odswiezStatystyki() {
  const liczba = przedmioty.length;
  e.statystykaLiczby.textContent = liczba;
  e.komunikatPusty.style.display = liczba ? "none" : "flex";
  e.przyciskWyczyszczenia.classList.toggle("ukryty", !liczba);
  e.znaczekLiczby.classList.toggle("ukryty", !liczba);
  if (liczba) e.znaczekLiczby.textContent = liczba;

  if (!liczba) {
    e.statystykaSredniej.textContent = "-";
    e.statystykaSredniej.className = "statystyka-glowna";
    e.statystykaEcts.textContent = "0";
    e.statystykaDokladna.classList.add("ukryty");
    ukryjCel();
    celOsiagniety = false;
    return;
  }

  const sumaEcts = sumaEctsLista(przedmioty);
  const srednia  = obliczSrednia(przedmioty);

  animujLiczbe(e.statystykaSredniej, srednia.toFixed(2), 2);
  animujLiczbe(e.statystykaEcts, sumaEcts, 0);
  e.statystykaSredniej.className = "statystyka-glowna " + klasaOceny(zaokraglOcene(srednia));

  if (trybDokladny) {
    e.statystykaDokladna.textContent = "= " + srednia.toFixed(8);
    e.statystykaDokladna.classList.remove("ukryty");
  } else {
    e.statystykaDokladna.classList.add("ukryty");
  }

  obliczCelSredniej(srednia, sumaEcts, true);
}

// ---------- wykres słupkowy ----------

function renderujWykres() {
  e.wykres.innerHTML = "";
  const licznik = Object.fromEntries(DOSTEPNE_OCENY.map((o) => [o, 0]));
  przedmioty.forEach((p) => licznik[p.ocena]++);
  const max = Math.max(...Object.values(licznik), 1);
  DOSTEPNE_OCENY.forEach((ocena) => {
    const n = licznik[ocena];
    const kol = document.createElement("div");
    kol.className = "wykres-kolumna";
    kol.innerHTML = `
      <span class="wykres-liczba">${n || ""}</span>
      <div class="wykres-slupek ${KLASY_OCEN[ocena]}" style="height:${Math.max((n / max) * 100, n ? 8 : 0)}%" title="${ocena}: ${n}"></div>
      <span class="wykres-podpis">${ocena}</span>`;
    e.wykres.appendChild(kol);
  });
}

// ---------- wykres liniowy trendu semestrów ----------

function renderujWykresLinii() {
  const kontener = e.wykresLinii;
  if (!kontener) return;

  const grupy  = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy)).filter(k => k !== "brak");

  if (klucze.length < 2) {
    kontener.style.display = "none";
    return;
  }

  kontener.style.display = "";

  const dane = klucze.map(k => ({
    sem: +k,
    sr: obliczSrednia(grupy[k])
  })).filter(d => d.sr !== null);

  if (dane.length < 2) { kontener.style.display = "none"; return; }

  const ostatniSem = dane[dane.length - 1].sem;
  const W = 320, H = 90;
  const PAD = { t: 16, r: 18, b: 24, l: 28 };
  const minY = Math.max(2, Math.min(...dane.map(d => d.sr)) - 0.2);
  const maxY = Math.min(5, Math.max(...dane.map(d => d.sr)) + 0.2);
  const rangeY = maxY - minY || 0.5;
  const rangeX = dane.length > 1 ? dane.length - 1 : 1;

  const toX = (i) => PAD.l + (i / rangeX) * (W - PAD.l - PAD.r);
  const toY = (v) => PAD.t + (1 - (v - minY) / rangeY) * (H - PAD.t - PAD.b);

  const points = dane.map((d, i) => `${toX(i).toFixed(1)},${toY(d.sr).toFixed(1)}`).join(" ");
  const areaPoints = [
    `${toX(0).toFixed(1)},${(H - PAD.b).toFixed(1)}`,
    ...dane.map((d, i) => `${toX(i).toFixed(1)},${toY(d.sr).toFixed(1)}`),
    `${toX(dane.length - 1).toFixed(1)},${(H - PAD.b).toFixed(1)}`
  ].join(" ");

  let tooltips = "";
  let pointsHtml = "";
  let labelHtml = "";

  dane.forEach((d, i) => {
    const cx = toX(i).toFixed(1);
    const cy = toY(d.sr).toFixed(1);
    const isLast = d.sem === ostatniSem;
    const cls = klasaOceny(zaokraglOcene(d.sr));
    const kolor = getComputedStyle(document.documentElement).getPropertyValue(`--${cls}`).trim() || "#4ca6ff";

    pointsHtml += `
      <circle class="wykres-trend-punkt ${isLast ? "aktualny" : ""}"
        cx="${cx}" cy="${cy}" r="${isLast ? 5 : 4}"
        fill="${kolor}" stroke="rgba(2,4,9,0.9)" stroke-width="2"
        data-sem="${d.sem}" data-sr="${d.sr.toFixed(3)}"/>`;

    tooltips += `
      <g class="wykres-trend-tooltip-g" transform="translate(${cx},${cy})">
        <rect class="wykres-trend-tooltip-bg" x="-28" y="-34" width="56" height="22" rx="6"/>
        <text class="wykres-trend-tooltip-tekst" x="0" y="-18">${d.sr.toFixed(2)}</text>
      </g>`;

    labelHtml += `
      <text class="wykres-trend-etykieta-x" x="${cx}" y="${H - 6}" text-anchor="middle">sem ${d.sem}</text>`;
  });

  // Linie siatki Y
  let gridHtml = "";
  [3, 3.5, 4, 4.5, 5].forEach(v => {
    if (v < minY - 0.05 || v > maxY + 0.05) return;
    const y = toY(v).toFixed(1);
    gridHtml += `<line class="wykres-trend-siatka" x1="${PAD.l}" y1="${y}" x2="${W - PAD.r}" y2="${y}"/>`;
    gridHtml += `<text class="wykres-trend-etykieta-y" x="${PAD.l - 4}" y="${y}" text-anchor="end" dominant-baseline="middle">${v}</text>`;
  });

  kontener.innerHTML = `
    <div class="wykres-linii-naglowek">
      <span class="wykres-linii-tytul">Trend semestralny</span>
      <span class="wykres-linii-opis">${trybSredniej === "arytmetyczna" ? "śr. arytmetyczna" : "śr. ważona ECTS"}</span>
    </div>
    <svg class="wykres-linii-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4ca6ff" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#4ca6ff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridHtml}
      <polygon class="wykres-trend-area" points="${areaPoints}" fill="url(#gradTrend)"/>
      <polyline class="wykres-trend-linia" points="${points}"/>
      ${labelHtml}
      ${pointsHtml}
      ${tooltips}
    </svg>`;
}

// ---------- chipy i filtry ----------

function renderujChipySemestrow() {
  e.chipySemestrow.innerHTML = "";
  const grupy  = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  if (klucze.length <= 1 && klucze[0] === "brak") return;
  klucze.forEach((sem) => {
    const srednia = obliczSrednia(grupy[sem]);
    if (!srednia) return;
    const se  = sumaEctsLista(grupy[sem]);
    const cls = klasaOceny(zaokraglOcene(srednia));
    const chip = document.createElement("div");
    chip.className = "chip-semestru " + cls;
    chip.innerHTML = `
      <span class="chip-etykieta">${sem === "brak" ? "bez semestru" : "semestr " + sem}</span>
      <span class="chip-wartosc ${cls}">${srednia.toFixed(2)}</span>
      <span class="chip-pod">${se} ECTS &middot; ${grupy[sem].length} przedm.</span>`;
    e.chipySemestrow.appendChild(chip);
  });
}

function renderujFiltry() {
  e.filtry.innerHTML = "";
  const grupy  = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  if (klucze.length <= 1) { e.owijkaFiltrow.classList.add("ukryty"); return; }
  e.owijkaFiltrow.classList.remove("ukryty");

  const tworzBtn = (etykieta, wartosc) => {
    const wszystkie = wartosc === "wszystkie";
    const aktywny   = wszystkie ? aktywneFiltery.size === 0 : aktywneFiltery.has(wartosc);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filtr" + (aktywny ? " aktywny" : "");
    btn.textContent = etykieta;
    btn.addEventListener("click", () => {
      if (wszystkie) aktywneFiltery.clear();
      else aktywneFiltery.has(wartosc) ? aktywneFiltery.delete(wartosc) : aktywneFiltery.add(wartosc);
      renderujFiltry();
      renderujListe();
    });
    return btn;
  };

  e.filtry.appendChild(tworzBtn("Wszystkie", "wszystkie"));
  klucze.forEach((k) => e.filtry.appendChild(tworzBtn(k === "brak" ? "bez sem." : "sem. " + k, k)));
}

// ---------- lista ----------

function dodajSwipe(el, przedmiot) {
  let sx = 0, sy = 0;
  const PROG = 72;
  el.addEventListener("touchstart", (ev) => {
    if (ev.touches.length !== 1) return;
    sx = ev.touches[0].clientX;
    sy = ev.touches[0].clientY;
    el.style.transition = "none";
  }, { passive: false });
  el.addEventListener("touchmove", (ev) => {
    if (ev.touches.length !== 1) return;
    const dx = ev.touches[0].clientX - sx;
    const dy = ev.touches[0].clientY - sy;
    if (Math.abs(dy) > Math.abs(dx) + 5) return;
    if (dx < 0) {
      el.style.transform = `translateX(${Math.max(dx, -PROG * 1.6)}px)`;
      el.style.opacity   = `${1 + dx / (PROG * 2.2)}`;
    }
  }, { passive: true });
  el.addEventListener("touchend", () => {
    const dx = parseFloat(el.style.transform.replace(/[^\-\d.]/g, "")) || 0;
    el.style.transition = "transform 0.25s ease, opacity 0.25s ease";
    if (dx < -PROG) {
      el.style.transform = "translateX(-110%)";
      el.style.opacity   = "0";
      setTimeout(() => usunPrzedmiot(przedmiot, el), 240);
    } else {
      el.style.transform = "";
      el.style.opacity   = "";
    }
  });
}

function usunPrzedmiot(przedmiot, elListy) {
  const indeks = przedmioty.findIndex((p) => idPrzedmiotu(p) === idPrzedmiotu(przedmiot));
  if (indeks === -1) return;
  ostatnioUsuniety = { przedmiot: { ...przedmiot }, indeks };
  elListy.classList.add("znikanie-element");
  setTimeout(() => {
    przedmioty.splice(indeks, 1);
    const noweGrupy = grupujPoSemestrach();
    aktywneFiltery.forEach((f) => { if (!noweGrupy[f]) aktywneFiltery.delete(f); });
    zapiszDane();
    renderujWszystko();
    pokazPowiadomienie(`Usunięto "${przedmiot.nazwa}"`, "ok", { etykieta: "Cofnij", fn: cofnijUsuniecie });
  }, 220);
}

function renderujListe() {
  e.listaPrzedmiotow.innerHTML = "";
  if (!przedmioty.length) return;
  const grupy   = grupujPoSemestrach();
  const klucze  = sortujKlucze(Object.keys(grupy));
  const widoczne = aktywneFiltery.size === 0 ? klucze : klucze.filter((k) => aktywneFiltery.has(k));

  widoczne.forEach((sem) => {
    if (klucze.length > 1) {
      const srednia = obliczSrednia(grupy[sem]);
      const se      = sumaEctsLista(grupy[sem]);
      const nag = document.createElement("li");
      nag.className = "naglowek-semestru";
      nag.innerHTML = `
        <span>${sem === "brak" ? "bez semestru" : "semestr " + sem}</span>
        <span class="meta-semestru">
          ${srednia ? `<span class="srednia-semestru">${srednia.toFixed(2)}</span>` : ""}
          <span class="info-semestru">${se} ECTS</span>
        </span>`;
      e.listaPrzedmiotow.appendChild(nag);
    }

    grupy[sem].forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "element-listy " + klasaOceny(p.ocena);
      li.style.animationDelay = `${i * 30}ms`;
      li.innerHTML = `
        <span class="element-ocena">${p.ocena.toFixed(1)}</span>
        <div class="element-info">
          <div class="element-nazwa" title="${p.nazwa}">${p.nazwa}</div>
          <div class="element-pod">${p.ects} ECTS${p.semestr ? " &middot; sem. " + p.semestr : ""}</div>
        </div>
        <div class="element-akcje">
          <button class="element-edytuj" type="button" aria-label="Edytuj przedmiot">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" width="13" height="13">
              <path d="M11.5 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13.2l-2.8.7.7-2.8L11.5 2.5z" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="element-usun" type="button" aria-label="Usuń przedmiot">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" width="13" height="13">
              <path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l.8 9.5a.5.5 0 0 0 .5.5h7.4a.5.5 0 0 0 .5-.5L13 4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>`;
      li.querySelector(".element-edytuj").addEventListener("click", () => otworzModal(p));
      li.querySelector(".element-usun").addEventListener("click",  () => usunPrzedmiot(p, li));
      dodajSwipe(li, p);
      e.listaPrzedmiotow.appendChild(li);
    });
  });
}

// ---------- podgląd formularza ----------

function zaktualizujPodgladFormularza() {
  const ocena = parseFloat(e.poleOceny.value);
  const ects  = parseFloat(e.poleEcts.value);
  if (!ocena || !ects || ects <= 0 || !przedmioty.length) {
    e.podgladFormularza.classList.add("ukryty");
    return;
  }
  const sredniaPrzed = obliczSrednia(przedmioty);
  const nowaLista    = [...przedmioty, { ocena, ects, semestr: null }];
  const potem        = obliczSrednia(nowaLista);
  const roznica      = potem - sredniaPrzed;
  const znak         = roznica >= 0 ? "+" : "";
  const kolor        = roznica >= 0 ? "var(--g5)" : roznica >= -0.05 ? "var(--g35)" : "var(--g2)";
  e.podgladFormularza.classList.remove("ukryty");
  e.podgladFormularza.innerHTML = `po dodaniu: <strong>${potem.toFixed(2)}</strong>&nbsp;<span style="color:${kolor}">(${znak}${roznica.toFixed(3)})</span>`;
}

// ---------- co jeśli ----------

function renderujWierszeCoJesli() {
  e.wejsciaCoJesli.innerHTML = "";
  wierszeCoJesli.forEach((w, i) => {
    const div = document.createElement("div");
    div.className = "co-jesli-rzad";
    div.innerHTML = `
      <div class="pole"><label>Ocena</label>
        <select class="co-jesli-ocena">
          ${DOSTEPNE_OCENY.map((v) => `<option value="${v}"${w.ocena == v ? " selected" : ""}>${v.toFixed(1)}</option>`).join("")}
        </select>
      </div>
      <div class="pole"><label>ECTS</label>
        <input type="number" class="co-jesli-ects" min="0.5" max="30" step="0.5" inputmode="decimal" value="${w.ects}"/>
      </div>
      ${wierszeCoJesli.length > 1 ? `<button type="button" class="co-jesli-usun">&#10005;</button>` : `<div></div>`}`;
    div.querySelector(".co-jesli-ocena").addEventListener("change", (ev) => { wierszeCoJesli[i].ocena = +ev.target.value; obliczCoJesli(); });
    div.querySelector(".co-jesli-ects").addEventListener("input",  (ev) => { wierszeCoJesli[i].ects  = +ev.target.value; obliczCoJesli(); });
    if (wierszeCoJesli.length > 1)
      div.querySelector(".co-jesli-usun").addEventListener("click", () => { wierszeCoJesli.splice(i, 1); renderujWierszeCoJesli(); obliczCoJesli(); });
    e.wejsciaCoJesli.appendChild(div);
  });
}

function klasaDeltaRoznicy(r) {
  if (r > 0.001)   return "delta-wzrost";
  if (r >= -0.015) return "delta-neutralna";
  if (r >= -0.06)  return "delta-cieplo";
  if (r >= -0.15)  return "delta-pomarancz";
  return "delta-spadek";
}

function obliczCoJesli() {
  if (!przedmioty.length) {
    e.wynikCoJesli.classList.add("ukryty");
    e.pustyCoJesli.style.display = "";
    return;
  }
  e.pustyCoJesli.style.display = "none";
  let dEcts = 0, dWaz = 0, ok = true;
  wierszeCoJesli.forEach((w) => {
    if (!w.ects || w.ects <= 0) { ok = false; return; }
    dEcts += w.ects;
    dWaz  += w.ocena * w.ects;
  });
  if (!ok || !dEcts) { e.wynikCoJesli.classList.add("ukryty"); return; }

  const teraz = obliczSrednia(przedmioty);
  const noweEkstra = Array.from({ length: wierszeCoJesli.length }, (_, i) => ({
    ocena: wierszeCoJesli[i].ocena,
    ects: wierszeCoJesli[i].ects,
    semestr: null,
  }));
  const potem = obliczSrednia([...przedmioty, ...noweEkstra.filter(w => w.ects > 0)]);
  const roznica = potem - teraz;
  const znak = roznica >= 0 ? "+" : "";

  e.wynikCoJesli.classList.remove("ukryty");
  e.terazCoJesli.textContent = teraz.toFixed(2);
  e.terazCoJesli.className   = klasaOceny(zaokraglOcene(teraz));
  animujLiczbe(e.potemCoJesli, potem.toFixed(2), 2);
  e.potemCoJesli.className    = klasaOceny(zaokraglOcene(potem));
  e.roznicaCoJesli.textContent = znak + roznica.toFixed(3);
  e.roznicaCoJesli.className   = "co-jesli-roznica " + klasaDeltaRoznicy(roznica);
}

// ---------- stypendium ----------

function obliczStypendium() {
  const prog    = parseFloat(e.progStypendium.value);
  const osoby   = parseInt(e.osobyStypendium.value, 10);
  const procent = parseFloat(e.procentStypendium.value);
  if (!prog || !osoby || !procent || !przedmioty.length) {
    e.wynikStypendium.classList.add("ukryty");
    e.pustyStypendium.style.display = "";
    return;
  }
  e.wynikStypendium.classList.remove("ukryty");
  e.pustyStypendium.style.display = "none";

  const srednia  = obliczSrednia(przedmioty);
  const sumaEcts = sumaEctsLista(przedmioty);
  const sw       = sumaWazonychLista(przedmioty);
  const styp     = Math.ceil(osoby * (procent / 100));
  const zakres   = 3.0;
  const roznica  = srednia - prog;

  // --- pasek z trzema strefami ---
  const pasBefore = document.getElementById("stypendium-pasek");
  if (pasBefore) {
    // Wyczyść poprzednie strefy gradientowe
    const stare = pasBefore.querySelectorAll(".stypendium-strefa");
    stare.forEach(s => s.remove());

    // Trzy strefy: czerwona (2–prog-0.15), żółta (±0.15 od progu), zielona (prog-0.15–5)
    const strefaProg = Math.min(Math.max((prog - 2) / zakres, 0), 1) * 100;
    const strefaRyzykaMin = Math.max(0, ((prog - 0.15) - 2) / zakres) * 100;
    const strefaRyzykaMax = Math.min(100, ((prog + 0.15) - 2) / zakres) * 100;
    pasBefore.style.background = `linear-gradient(to right,
      var(--g2) 0%,
      var(--g2) ${strefaRyzykaMin.toFixed(1)}%,
      var(--g35) ${strefaRyzykaMin.toFixed(1)}%,
      var(--g35) ${strefaRyzykaMax.toFixed(1)}%,
      var(--g4) ${strefaRyzykaMax.toFixed(1)}%,
      var(--g4) 100%
    )`;
    pasBefore.style.opacity = "0.28";
    pasBefore.style.borderRadius = "9px";
  }

  // Wskaźnik pozycji
  e.markerStypendium.style.left = Math.min(Math.max((prog - 2) / zakres, 0), 1) * 100 + "%";
  e.tyStypendium.style.left     = Math.min(Math.max((srednia - 2) / zakres, 0), 1) * 100 + "%";

  // Wskaźnik Ty – kolor wypełnienia
  const tyKls = srednia >= prog + 0.15 ? "ok" : srednia >= prog - 0.15 ? "ryzyko" : "nie";
  e.tyStypendium.className = "stypendium-ty stypendium-ty-" + tyKls;

  e.twojaStypendium.textContent       = srednia.toFixed(2);
  e.twojaStypendium.className         = klasaOceny(zaokraglOcene(srednia));
  e.progWartoscStypendium.textContent = prog.toFixed(2);
  e.roznicaStypendium.textContent     = (roznica >= 0 ? "+" : "") + roznica.toFixed(3);
  e.roznicaStypendium.style.color     = roznica >= 0 ? "var(--g5)" : "var(--g2)";

  // --- Szacowanie miejsca (liniowe) ---
  const szac    = srednia >= prog
    ? Math.max(1, Math.round((1 - ((srednia - prog) / zakres) * 3) * styp))
    : Math.round(styp + ((prog - srednia) / zakres) * (osoby - styp) * 2);
  const miejsce = Math.min(szac, osoby);
  const przed   = Math.max(0, miejsce - 1);

  e.miejsceStypendium.textContent = "~" + miejsce + " / " + osoby;
  e.przedStypendium.textContent   = "~" + przed;
  e.przedStypendium.style.color   = przed < styp ? "var(--g5)" : "var(--g2)";

  // --- Osoby z podobnym wynikiem (rozkład normalny, σ=0.35) ---
  const mu    = 3.5, sigma = 0.35;
  const pPlus = normalCDF(srednia + 0.10, mu, sigma);
  const pMin  = normalCDF(srednia - 0.10, mu, sigma);
  const podobni = Math.round((pPlus - pMin) * osoby);
  if (e.podobniStypendium) {
    e.podobniStypendium.textContent = "~" + Math.max(1, podobni);
  }

  // --- Szansa % na stypendium ---
  const progCDF = normalCDF(prog, mu, sigma);
  const szansaRaw = (1 - progCDF) / Math.max(1 - progCDF, 0.01);
  // uproszczone: procent osób ze średnią >= prog to (1-CDF(prog)), szansa = czy jesteś w górnych X%
  const procentPowyżejProgu = (1 - normalCDF(prog, mu, sigma)) * 100;
  const procentPowyżejMojej = (1 - normalCDF(srednia, mu, sigma)) * 100;
  const szansaProc = Math.min(99, Math.max(1,
    srednia >= prog
      ? Math.round(Math.min(95, 50 + ((srednia - prog) / 0.5) * 45))
      : Math.round(Math.max(5, 50 - ((prog - srednia) / 0.5) * 45))
  ));

  if (e.szansaBadge) {
    const badgeCls = szansaProc >= 70 ? "badge-ok" : szansaProc >= 40 ? "badge-ryzyko" : "badge-nie";
    e.szansaBadge.className = "szansa-badge " + badgeCls;
    e.szansaBadge.textContent = "~" + szansaProc + "%";
  }

  // --- komunikat ---
  const strefaRyzyka = Math.abs(roznica) <= 0.15;
  if (srednia >= prog) {
    const rodzajKom = strefaRyzyka ? "ryzyko" : "ok";
    e.komunikatStypendium.className = "stypendium-komunikat " + rodzajKom;
    if (strefaRyzyka) {
      const potrzebaEcts = Math.max(0, (prog * sumaEcts - sw) / (5 - prog));
      e.komunikatStypendium.innerHTML = `<strong>Strefa ryzyka!</strong> Jesteś tylko ${roznica.toFixed(3)} pkt powyżej progu. Jedno złe zaliczenie może Cię wypchnąć. <em>~${Math.ceil(potrzebaEcts)} ECTS z 5.0 buduje bezpieczny zapas.</em>`;
    } else {
      e.komunikatStypendium.innerHTML = `<strong>Jesteś powyżej progu.</strong> Zapas: ${roznica.toFixed(3)} pkt. Szacunkowo ${przed} ${przed === 1 ? "osoba ma" : "osoby mają"} lepszą średnią.`;
    }
  } else {
    const rodzajKom = strefaRyzyka ? "ryzyko" : "nie";
    e.komunikatStypendium.className = "stypendium-komunikat " + rodzajKom;
    const potrzebaEcts = Math.max(0, (prog * sumaEcts - sw) / (5 - prog));
    if (strefaRyzyka) {
      e.komunikatStypendium.innerHTML = `<strong>Strefa ryzyka!</strong> Brakuje zaledwie ${Math.abs(roznica).toFixed(3)} pkt. <em>~${Math.ceil(potrzebaEcts)} ECTS z oceną 5.0</em> może przesunąć Cię powyżej progu ${prog.toFixed(2)}.`;
    } else {
      e.komunikatStypendium.innerHTML = `<strong>Brakuje: ${Math.abs(roznica).toFixed(3)} pkt.</strong> Szacunkowo ${przed} ${przed === 1 ? "osoba jest" : "osoby są"} przed Tobą. Do progu ${prog.toFixed(2)} potrzebujesz ok. <em>${potrzebaEcts.toFixed(1)} ECTS</em> z oceną 5.0.`;
    }
  }
}

// ---------- eksport / udostępnianie ----------

function eksportujDane() {
  if (!przedmioty.length) {
    pokazPowiadomienie("Brak przedmiotów do udostępnienia", "blad");
    return;
  }
  try {
    const json   = JSON.stringify(przedmioty);
    const b64    = btoa(encodeURIComponent(json));
    const url    = location.href.split("#")[0] + "#d=" + b64;
    navigator.clipboard.writeText(url).then(() => {
      pokazPowiadomienie("Link skopiowany do schowka! 🔗");
    }).catch(() => {
      prompt("Skopiuj ten link:", url);
    });
    history.replaceState(null, "", url);
  } catch (err) {
    pokazPowiadomienie("Błąd eksportu", "blad");
  }
}

function sprawdzHash() {
  const hash = location.hash;
  if (!hash.startsWith("#d=")) return;
  try {
    const b64  = hash.slice(3);
    const json = decodeURIComponent(atob(b64));
    const dane = JSON.parse(json);
    if (!Array.isArray(dane) || !dane.length) return;
    pendingImportData = dane;
    e.modalImport.classList.remove("ukryty");
  } catch (e) {
    // niepoprawny hash – ignoruj
  }
}

function zaladujImport() {
  if (!pendingImportData) return;
  przedmioty = pendingImportData;
  pendingImportData = null;
  zapiszDane();
  renderujWszystko();
  zamknijModalImport();
  history.replaceState(null, "", location.href.split("#")[0]);
  pokazPowiadomienie(`Wczytano ${przedmioty.length} przedmiotów`);
}

function zamknijModalImport() {
  e.modalImport.classList.add("ukryty");
  pendingImportData = null;
  history.replaceState(null, "", location.href.split("#")[0]);
}

// ---------- modal edycji ----------

function otworzModal(p) {
  edytowanyId = idPrzedmiotu(p);
  e.modalNazwa.value   = p.nazwa;
  e.modalOcena.value   = p.ocena;
  e.modalEcts.value    = p.ects;
  e.modalSemestr.value = p.semestr || "";
  e.modalEdycji.classList.remove("ukryty");
  e.modalNazwa.focus();
}

function zamknijModal() {
  e.modalEdycji.classList.add("ukryty");
  edytowanyId = null;
}

function zapiszEdycje() {
  const nazwa = e.modalNazwa.value.trim();
  const ocena = parseFloat(e.modalOcena.value);
  const ects  = parseFloat(e.modalEcts.value);
  const semestr = parsujSemestr(e.modalSemestr.value);
  if (!nazwa)             { e.modalNazwa.focus(); pokazPowiadomienie("Wpisz nazwę przedmiotu!", "blad"); return; }
  if (!ocena)             { pokazPowiadomienie("Wybierz ocenę!", "blad"); return; }
  if (!ects || ects <= 0) { pokazPowiadomienie("Wpisz poprawne ECTS!", "blad"); return; }
  const indeks = przedmioty.findIndex((p) => idPrzedmiotu(p) === edytowanyId);
  if (indeks === -1) { zamknijModal(); return; }
  przedmioty[indeks] = { ...przedmioty[indeks], nazwa, ocena, ects, semestr };
  zapiszDane();
  renderujWszystko();
  zamknijModal();
  pokazPowiadomienie("Zaktualizowano: " + nazwa);
}

// ---------- render all ----------

function renderujWszystko() {
  odswiezStatystyki();
  renderujWykres();
  renderujChipySemestrow();
  renderujWykresLinii();
  renderujFiltry();
  renderujListe();
  obliczCoJesli();
  obliczStypendium();
}

// ---------- event listeners ----------

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    if (!e.modalEdycji.classList.contains("ukryty"))  { zamknijModal(); return; }
    if (!e.modalImport.classList.contains("ukryty"))  { zamknijModalImport(); return; }
    e.poleNazwy.value = e.poleOceny.value = e.poleEcts.value = "";
    e.podgladFormularza.classList.add("ukryty");
    e.poleNazwy.blur();
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") cofnijUsuniecie();
});

e.przyciskPokazInfo.addEventListener("click", () => ustawBohatera(!bohaterWidoczny));
ustawBohatera(bohaterWidoczny);

if (e.przyciskUdostepnij) {
  e.przyciskUdostepnij.addEventListener("click", eksportujDane);
}

e.checkboxDokladna.addEventListener("change", (ev) => { trybDokladny = ev.target.checked; odswiezStatystyki(); });

// Segmented control – tryb liczenia
if (e.segmentedWazona) {
  e.segmentedWazona.addEventListener("click", () => ustawTrybSredniej("wazona"));
}
if (e.segmentedArytmetyczna) {
  e.segmentedArytmetyczna.addEventListener("click", () => ustawTrybSredniej("arytmetyczna"));
}

const zapisanySemestr = localStorage.getItem(KLUCZ_SEMESTRU);
if (zapisanySemestr) e.poleSemestru.value = zapisanySemestr;
e.poleSemestru.addEventListener("change", () => localStorage.setItem(KLUCZ_SEMESTRU, e.poleSemestru.value));

e.poleOceny.addEventListener("change", zaktualizujPodgladFormularza);
e.poleEcts.addEventListener("input",  zaktualizujPodgladFormularza);

e.formularz.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const nazwa   = e.poleNazwy.value.trim();
  const ocena   = parseFloat(e.poleOceny.value);
  const ects    = parseFloat(e.poleEcts.value);
  const semestr = parsujSemestr(e.poleSemestru.value);
  if (!ocena)             { pokazPowiadomienie("Wybierz ocenę!", "blad"); e.poleOceny.focus(); return; }
  if (!ects || ects <= 0) { pokazPowiadomienie("Wpisz poprawne ECTS!", "blad"); e.poleEcts.focus(); return; }
  przedmioty.push({ identyfikator: Date.now(), nazwa, ocena, ects, semestr });
  zapiszDane();
  e.poleNazwy.value = e.poleOceny.value = e.poleEcts.value = "";
  e.podgladFormularza.classList.add("ukryty");
  renderujWszystko();
  e.poleNazwy.focus();
  pokazPowiadomienie("Dodano: " + nazwa);
});

e.przyciskWyczyszczenia.addEventListener("click", () => {
  const kopia = [...przedmioty];
  przedmioty = [];
  aktywneFiltery.clear();
  celOsiagniety = false;
  zapiszDane();
  renderujWszystko();
  pokazPowiadomienie("Wyczyszczono wszystkie przedmioty", "ok", {
    etykieta: "Cofnij",
    fn: () => { przedmioty = kopia; zapiszDane(); renderujWszystko(); },
  });
});

e.przyciskDodajCoJesli.addEventListener("click", () => {
  wierszeCoJesli.push({ ocena: 4.5, ects: 5 });
  renderujWierszeCoJesli();
  obliczCoJesli();
});

[e.progStypendium, e.osobyStypendium, e.procentStypendium]
  .forEach((el) => el.addEventListener("input", obliczStypendium));

const zapisanyCel = localStorage.getItem(KLUCZ_CELU);
if (zapisanyCel) e.celWejscie.value = zapisanyCel;

e.celWejscie.addEventListener("input", () => {
  localStorage.setItem(KLUCZ_CELU, e.celWejscie.value);
  celOsiagniety = false;
  obliczCelSredniej(undefined, undefined, false);
});
e.celWejscie.addEventListener("change", () => {
  celOsiagniety = false;
  obliczCelSredniej(undefined, undefined, true);
});

e.modalZapisz.addEventListener("click", zapiszEdycje);
e.modalAnuluj.addEventListener("click", zamknijModal);
e.modalEdycji.addEventListener("click", (ev) => { if (ev.target === e.modalEdycji) zamknijModal(); });
e.modalNazwa.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && edytowanyId !== null) zapiszEdycje(); });

if (e.modalImportAnuluj) e.modalImportAnuluj.addEventListener("click", zamknijModalImport);
if (e.modalImportZaladuj) e.modalImportZaladuj.addEventListener("click", zaladujImport);
if (e.modalImport) e.modalImport.addEventListener("click", (ev) => { if (ev.target === e.modalImport) zamknijModalImport(); });

// Inicjalizacja trybu średniej
ustawTrybSredniej(trybSredniej, false);

renderujWierszeCoJesli();
renderujWszystko();
trybInicjalizacji = false;

// Sprawdź hash przy załadowaniu (import)
sprawdzHash();

window.addEventListener("resize", () => {
  const c = e.konfettiCanvas;
  if (c.style.display !== "none") { c.width = window.innerWidth; c.height = window.innerHeight; }
});
