if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

const znajdzElement = (s) => document.querySelector(s);

const elementy = {
  formularz: znajdzElement("#formularz"),
  polaNazwy: znajdzElement("#f-nazwa"),
  poleOceny: znajdzElement("#f-ocena"),
  poleEcts: znajdzElement("#f-ects"),
  poleSemestru: znajdzElement("#f-sem"),
  podgladFormularza: znajdzElement("#podglad-formularza"),
  listaPrzedmiotow: znajdzElement("#lista-przedmiotow"),
  komunikatPusty: znajdzElement("#pusty"),
  znaczekLiczby: znajdzElement("#znaczek-liczby"),
  przyciskWyczyszczenia: znajdzElement("#btn-wyczysc"),
  owijkaFiltrow: znajdzElement("#filtry-owijka"),
  filtry: znajdzElement("#filtry"),
  statystykaSredniej: znajdzElement("#stat-srednia"),
  statystykaEcts: znajdzElement("#stat-ects"),
  statystykaLiczby: znajdzElement("#stat-liczba"),
  statystykaDokladna: znajdzElement("#stat-dokladna"),
  checkboxDokladna: znajdzElement("#checkbox-dokladna"),
  wykres: znajdzElement("#wykres"),
  chipySemestrow: znajdzElement("#chipy-semestrow"),
  wejsciaCj: znajdzElement("#cj-wejscia"),
  przyciskDodajCj: znajdzElement("#cj-dodaj"),
  wynikCj: znajdzElement("#cj-wynik"),
  terazCj: znajdzElement("#cj-teraz"),
  potemCj: znajdzElement("#cj-potem"),
  roznicaCj: znajdzElement("#cj-roznica"),
  pustyCj: znajdzElement("#cj-pusty"),
  progStypendium: znajdzElement("#sty-prog"),
  osobyStypendium: znajdzElement("#sty-osoby"),
  procentStypendium: znajdzElement("#sty-proc"),
  wynikStypendium: znajdzElement("#sty-wynik"),
  pustyStypendium: znajdzElement("#sty-pusty"),
  wypelnienieStypendium: znajdzElement("#sty-wypelnienie"),
  markerStypendium: znajdzElement("#sty-marker"),
  tyStypendium: znajdzElement("#sty-ty"),
  twojaStypendium: znajdzElement("#sty-twoja"),
  progWartoscStypendium: znajdzElement("#sty-prog-wartosc"),
  roznicaStypendium: znajdzElement("#sty-roznica"),
  miejsceStypendium: znajdzElement("#sty-miejsce"),
  przedStypendium: znajdzElement("#sty-przed"),
  komunikatStypendium: znajdzElement("#sty-komunikat"),
  bohater: znajdzElement("#hero"),
  przyciskZamknijInfo: znajdzElement("#btn-zamknij-info"),
  przyciskPokazInfo: znajdzElement("#btn-pokaz-info"),
  przyciskMotywu: znajdzElement("#btn-motyw"),
  celWejscie: znajdzElement("#cel-wejscie"),
  celInfo: znajdzElement("#cel-info"),
  celPasek: znajdzElement("#cel-pasek"),
  celWypelnienie: znajdzElement("#cel-wypelnienie"),
  celEtykiety: znajdzElement("#cel-etykiety"),
  celEtykietaPrawa: znajdzElement("#cel-etykieta-prawa"),
  kontenerPowiadomien: znajdzElement("#kontener-powiadomien"),
  konfettiCanvas: znajdzElement("#konfetti-canvas"),
  modalEdycji: znajdzElement("#modal-edycji"),
  modalNazwa: znajdzElement("#e-nazwa"),
  modalOcena: znajdzElement("#e-ocena"),
  modalEcts: znajdzElement("#e-ects"),
  modalSemestr: znajdzElement("#e-sem"),
  modalZapisz: znajdzElement("#modal-zapisz"),
  modalAnuluj: znajdzElement("#modal-anuluj"),
};

const DOSTEPNE_OCENY = [2, 3, 3.5, 4, 4.5, 5];
const KLASY_OCEN = Object.freeze({
  2: "g2",
  3: "g3",
  3.5: "g35",
  4: "g4",
  4.5: "g45",
  5: "g5",
});

const KLUCZ_DANYCH = "ectscalc";
const KLUCZ_MOTYWU = "ectscalc_motyw";
const KLUCZ_BOHATERA = "ectscalc_hero";
const KLUCZ_SEMESTRU = "ectscalc_sem";
const KLUCZ_CELU = "ectscalc_cel";

let przedmioty = JSON.parse(localStorage.getItem(KLUCZ_DANYCH)) || [];
let aktywnyMotyw = localStorage.getItem(KLUCZ_MOTYWU) || "noc";
let bohaterWidoczny = localStorage.getItem(KLUCZ_BOHATERA) !== "0";
let trybDokladny = false;
let aktywneFiltery = new Set();
let wierszeCj = [{ identyfikator: 0, ocena: 4.5, ects: 5 }];
let ostatnioUsuniety = null;
let celOsiagniety = false;
let edytowanyId = null;

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!elementy.modalEdycji.classList.contains("ukryty")) {
      zamknijModal();
      return;
    }
    elementy.polaNazwy.value = "";
    elementy.poleOceny.value = "";
    elementy.poleEcts.value = "";
    elementy.podgladFormularza.classList.add("ukryty");
    elementy.polaNazwy.blur();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "z") cofnijUsuniecie();
});

const animowaneLiczniki = new Map();

function animujLiczbe(element, nowaWartosc, miejsca = 2, czas = 420) {
  const stara = parseFloat(element.textContent) || 0;
  const nowa = parseFloat(nowaWartosc);
  if (isNaN(nowa)) {
    element.textContent = nowaWartosc;
    return;
  }
  if (Math.abs(nowa - stara) < 0.001) {
    element.textContent = nowa.toFixed(miejsca);
    return;
  }

  if (animowaneLiczniki.has(element))
    cancelAnimationFrame(animowaneLiczniki.get(element));

  const start = performance.now();
  const krok = (teraz) => {
    const p = Math.min((teraz - start) / czas, 1);
    const t = 1 - Math.pow(1 - p, 3);
    element.textContent = (stara + (nowa - stara) * t).toFixed(miejsca);
    if (p < 1) animowaneLiczniki.set(element, requestAnimationFrame(krok));
    else {
      element.textContent = nowa.toFixed(miejsca);
      animowaneLiczniki.delete(element);
    }
  };
  animowaneLiczniki.set(element, requestAnimationFrame(krok));
}

let konfettiAktywne = false;

function uruchomKonfetti() {
  if (konfettiAktywne) return;
  konfettiAktywne = true;
  const canvas = elementy.konfettiCanvas;
  canvas.style.display = "block";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  const kolory = [
    "#00e5a0",
    "#06b6d4",
    "#f59e0b",
    "#e5484d",
    "#7cc443",
    "#38bdf8",
  ];

  const czastki = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 3,
    kolor: kolory[Math.floor(Math.random() * kolory.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: Math.random() * 3 + 2,
    kat: Math.random() * 360,
    obrot: (Math.random() - 0.5) * 8,
    opac: 1,
  }));

  const rysuj = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let zywe = 0;
    czastki.forEach((c) => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.08;
      c.kat += c.obrot;
      if (c.y > canvas.height * 0.7) c.opac -= 0.02;
      if (c.opac <= 0) return;
      zywe++;
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.opac);
      ctx.fillStyle = c.kolor;
      ctx.translate(c.x, c.y);
      ctx.rotate((c.kat * Math.PI) / 180);
      ctx.fillRect(-c.r / 2, -c.r / 2, c.r, c.r * 0.5);
      ctx.restore();
    });
    if (zywe > 0) requestAnimationFrame(rysuj);
    else {
      canvas.style.display = "none";
      konfettiAktywne = false;
    }
  };
  rysuj();
}

function klasaOceny(o) {
  return KLASY_OCEN[o] ?? "";
}

function zaokraglOcene(s) {
  return Math.round(s * 2) / 2;
}

function zapiszDane() {
  localStorage.setItem(KLUCZ_DANYCH, JSON.stringify(przedmioty));
}

function obliczSredniaWazona(lista) {
  if (!lista.length) return null;
  const se = lista.reduce((s, p) => s + p.ects, 0);
  if (!se) return null;
  return lista.reduce((s, p) => s + p.ocena * p.ects, 0) / se;
}

function grupujPoSemestrach() {
  return przedmioty.reduce((g, p) => {
    const k = p.semestr || "brak";
    if (!g[k]) g[k] = [];
    g[k].push(p);
    return g;
  }, {});
}

function sortujKlucze(k) {
  return [...k].sort((a, b) => {
    if (a === "brak") return 1;
    if (b === "brak") return -1;
    return +a - +b;
  });
}

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

  elementy.kontenerPowiadomien.appendChild(el);
  setTimeout(
    () => {
      el.classList.add("znikanie");
      setTimeout(() => el.remove(), 250);
    },
    akcja ? 4500 : 2400,
  );
}

function cofnijUsuniecie() {
  if (!ostatnioUsuniety) return;
  przedmioty.splice(ostatnioUsuniety.indeks, 0, ostatnioUsuniety.przedmiot);
  zapiszDane();
  renderujWszystko();
  ostatnioUsuniety = null;
  pokazPowiadomienie("Przywrocono przedmiot");
}

function ustawMotyw(motyw) {
  aktywnyMotyw = motyw;
  document.documentElement.setAttribute("data-motyw", motyw);
  localStorage.setItem(KLUCZ_MOTYWU, motyw);
}

function ustawBohatera(widoczny) {
  bohaterWidoczny = widoczny;
  elementy.bohater.classList.toggle("ukryty", !widoczny);
  elementy.przyciskPokazInfo.style.display = widoczny ? "none" : "";
  localStorage.setItem(KLUCZ_BOHATERA, widoczny ? "1" : "0");
}

function odswiezStatystyki() {
  const liczba = przedmioty.length;
  elementy.statystykaLiczby.textContent = liczba;
  elementy.komunikatPusty.style.display = liczba ? "none" : "flex";
  elementy.przyciskWyczyszczenia.classList.toggle("ukryty", !liczba);
  elementy.znaczekLiczby.classList.toggle("ukryty", !liczba);
  if (liczba) elementy.znaczekLiczby.textContent = liczba;

  if (!liczba) {
    elementy.statystykaSredniej.textContent = "-";
    elementy.statystykaSredniej.className = "statystyka-glowna";
    elementy.statystykaEcts.textContent = "0";
    elementy.statystykaDokladna.classList.add("ukryty");
    ukryjCel();
    celOsiagniety = false;
    return;
  }

  const se = przedmioty.reduce((s, p) => s + p.ects, 0);
  const srednia = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0) / se;

  animujLiczbe(elementy.statystykaSredniej, srednia.toFixed(2), 2);
  animujLiczbe(elementy.statystykaEcts, se, 0);
  elementy.statystykaSredniej.className =
    "statystyka-glowna " + klasaOceny(zaokraglOcene(srednia));

  if (trybDokladny) {
    elementy.statystykaDokladna.textContent = "= " + srednia.toFixed(8);
    elementy.statystykaDokladna.classList.remove("ukryty");
  } else {
    elementy.statystykaDokladna.classList.add("ukryty");
  }

  obliczCelSredniej(srednia, se);
}

function ukryjCel() {
  elementy.celInfo.classList.add("ukryty");
  elementy.celPasek.classList.add("ukryty");
  elementy.celEtykiety.classList.add("ukryty");
}

function obliczCelSredniej(srednia, sumaEcts) {
  if (srednia === undefined) {
    if (!przedmioty.length) {
      ukryjCel();
      return;
    }
    sumaEcts = przedmioty.reduce((s, p) => s + p.ects, 0);
    srednia = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0) / sumaEcts;
  }
  const cel = parseFloat(elementy.celWejscie.value);
  if (!cel || cel < 2 || cel > 5) {
    ukryjCel();
    return;
  }

  const roznica = srednia - cel;
  elementy.celInfo.classList.remove("ukryty");
  elementy.celPasek.classList.remove("ukryty");
  elementy.celEtykiety.classList.remove("ukryty");

  if (srednia >= cel) {
    elementy.celInfo.innerHTML = `<strong>Cel osiagniety!</strong> Zapas: ${roznica.toFixed(3)} pkt powyzej ${cel.toFixed(2)}.`;
    elementy.celWypelnienie.style.width = "100%";
    elementy.celWypelnienie.className = "cel-wypelnienie ok";
    if (!celOsiagniety) {
      celOsiagniety = true;
      uruchomKonfetti();
    }
  } else {
    celOsiagniety = false;
    const sw = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0);
    const potrzebaEcts = Math.max(0, (cel * sumaEcts - sw) / (5 - cel));
    elementy.celInfo.innerHTML = `Brakuje <strong>${Math.abs(roznica).toFixed(3)} pkt</strong>. Potrzebujesz ok. <strong>${potrzebaEcts.toFixed(1)} ECTS</strong> z ocena 5.0.`;
    const zakres = cel - 2.0;
    const postep = zakres > 0 ? Math.max(0, (srednia - 2.0) / zakres) : 0;
    const procent = Math.min(postep * 100, 99);
    elementy.celWypelnienie.style.width = procent + "%";
    elementy.celWypelnienie.className =
      procent >= 70 ? "cel-wypelnienie warn" : "cel-wypelnienie nie";
  }
  elementy.celEtykietaPrawa.textContent = cel.toFixed(2);
}

function renderujWykres() {
  elementy.wykres.innerHTML = "";
  const licznik = Object.fromEntries(DOSTEPNE_OCENY.map((o) => [o, 0]));
  przedmioty.forEach((p) => licznik[p.ocena]++);
  const maks = Math.max(...Object.values(licznik), 1);
  DOSTEPNE_OCENY.forEach((ocena) => {
    const l = licznik[ocena];
    const pct = (l / maks) * 100;
    const kol = document.createElement("div");
    kol.className = "wykres-kolumna";
    kol.innerHTML = `
      <span class="wykres-liczba">${l || ""}</span>
      <div class="wykres-slupek ${KLASY_OCEN[ocena]}" style="height:${Math.max(pct, l ? 8 : 0)}%" title="${ocena}: ${l}"></div>
      <span class="wykres-podpis">${ocena}</span>`;
    elementy.wykres.appendChild(kol);
  });
}

function renderujChipySemestrow() {
  elementy.chipySemestrow.innerHTML = "";
  const grupy = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  if (klucze.length <= 1 && klucze[0] === "brak") return;
  klucze.forEach((sem) => {
    const sr = obliczSredniaWazona(grupy[sem]);
    if (!sr) return;
    const se = grupy[sem].reduce((s, p) => s + p.ects, 0);
    const chip = document.createElement("div");
    chip.className = "chip-semestru";
    chip.innerHTML = `
      <span class="chip-etykieta">${sem === "brak" ? "bez semestru" : "semestr " + sem}</span>
      <span class="chip-wartosc ${klasaOceny(zaokraglOcene(sr))}">${sr.toFixed(2)}</span>
      <span class="chip-pod">${se} ECTS &middot; ${grupy[sem].length} przedm.</span>`;
    elementy.chipySemestrow.appendChild(chip);
  });
}

function renderujFiltry() {
  elementy.filtry.innerHTML = "";
  const grupy = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  if (klucze.length <= 1) {
    elementy.owijkaFiltrow.classList.add("ukryty");
    return;
  }
  elementy.owijkaFiltrow.classList.remove("ukryty");

  const tworzBtn = (etykieta, wartosc) => {
    const czyAll = wartosc === "wszystkie";
    const czyAkt = czyAll
      ? aktywneFiltery.size === 0
      : aktywneFiltery.has(wartosc);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filtr" + (czyAkt ? " aktywny" : "");
    btn.textContent = etykieta;
    btn.addEventListener("click", () => {
      if (czyAll) aktywneFiltery.clear();
      else
        aktywneFiltery.has(wartosc)
          ? aktywneFiltery.delete(wartosc)
          : aktywneFiltery.add(wartosc);
      renderujFiltry();
      renderujListe();
    });
    return btn;
  };

  elementy.filtry.appendChild(tworzBtn("Wszystkie", "wszystkie"));
  klucze.forEach((k) =>
    elementy.filtry.appendChild(
      tworzBtn(k === "brak" ? "bez sem." : "sem. " + k, k),
    ),
  );
}

function dodajSwipe(el, przedmiot) {
  let startX = 0,
    startY = 0;
  const PROG = 72;

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      el.style.transition = "none";
    },
    { passive: false },
  );

  el.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) + 5) return;
      if (dx < 0) {
        el.style.transform = `translateX(${Math.max(dx, -PROG * 1.6)}px)`;
        el.style.opacity = `${1 + dx / (PROG * 2.2)}`;
      }
    },
    { passive: true },
  );

  el.addEventListener("touchend", () => {
    const dx = parseFloat(el.style.transform.replace(/[^-\d.]/g, "")) || 0;
    el.style.transition = "transform 0.25s ease, opacity 0.25s ease";
    if (dx < -PROG) {
      el.style.transform = "translateX(-110%)";
      el.style.opacity = "0";
      setTimeout(() => usunPrzedmiot(przedmiot, el), 240);
    } else {
      el.style.transform = "";
      el.style.opacity = "";
    }
  });
}

function usunPrzedmiot(przedmiot, el) {
  const indeks = przedmioty.findIndex(
    (p) =>
      (p.identyfikator ?? p.id) === (przedmiot.identyfikator ?? przedmiot.id),
  );
  if (indeks === -1) return;
  ostatnioUsuniety = { przedmiot: { ...przedmiot }, indeks };
  el.classList.add("znikanie-element");
  setTimeout(() => {
    przedmioty.splice(indeks, 1);
    const noweGrupy = grupujPoSemestrach();
    aktywneFiltery.forEach((f) => {
      if (!noweGrupy[f]) aktywneFiltery.delete(f);
    });
    zapiszDane();
    renderujWszystko();
    pokazPowiadomienie(`Usunieto "${przedmiot.nazwa}"`, "ok", {
      etykieta: "Cofnij",
      fn: cofnijUsuniecie,
    });
  }, 220);
}

function otworzModal(przedmiot) {
  edytowanyId = przedmiot.identyfikator ?? przedmiot.id;
  elementy.modalNazwa.value = przedmiot.nazwa;
  elementy.modalOcena.value = przedmiot.ocena;
  elementy.modalEcts.value = przedmiot.ects;
  elementy.modalSemestr.value = przedmiot.semestr || "";
  elementy.modalEdycji.classList.remove("ukryty");
  elementy.modalNazwa.focus();
}

function zamknijModal() {
  elementy.modalEdycji.classList.add("ukryty");
  edytowanyId = null;
}

function zapiszEdycje() {
  const nazwa = elementy.modalNazwa.value.trim();
  const ocena = parseFloat(elementy.modalOcena.value);
  const ects = parseFloat(elementy.modalEcts.value);
  const semestr = elementy.modalSemestr.value.trim() || null;

  if (!nazwa) {
    elementy.modalNazwa.focus();
    return;
  }
  if (!ocena) return;
  if (!ects || ects <= 0) return;

  const indeks = przedmioty.findIndex(
    (p) => (p.identyfikator ?? p.id) === edytowanyId,
  );
  if (indeks === -1) {
    zamknijModal();
    return;
  }

  przedmioty[indeks] = { ...przedmioty[indeks], nazwa, ocena, ects, semestr };
  zapiszDane();
  renderujWszystko();
  zamknijModal();
  pokazPowiadomienie("Zaktualizowano: " + nazwa);
}

function renderujListe() {
  elementy.listaPrzedmiotow.innerHTML = "";
  if (!przedmioty.length) return;
  const grupy = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  const widoczne =
    aktywneFiltery.size === 0
      ? klucze
      : klucze.filter((k) => aktywneFiltery.has(k));

  widoczne.forEach((sem) => {
    if (klucze.length > 1) {
      const sr = obliczSredniaWazona(grupy[sem]);
      const se = grupy[sem].reduce((s, p) => s + p.ects, 0);
      const nag = document.createElement("li");
      nag.className = "naglowek-semestru";
      nag.innerHTML = `
        <span>${sem === "brak" ? "bez semestru" : "semestr " + sem}</span>
        <span class="meta-semestru">
          ${sr ? `<span class="srednia-semestru">${sr.toFixed(2)}</span>` : ""}
          <span class="info-semestru">${se} ECTS</span>
        </span>`;
      elementy.listaPrzedmiotow.appendChild(nag);
    }

    grupy[sem].forEach((przedmiot, i) => {
      const el = document.createElement("li");
      el.className = "element-listy " + klasaOceny(przedmiot.ocena);
      el.style.animationDelay = `${i * 30}ms`;
      el.innerHTML = `
        <span class="element-ocena">${przedmiot.ocena.toFixed(1)}</span>
        <div class="element-info">
          <div class="element-nazwa" title="${przedmiot.nazwa}">${przedmiot.nazwa}</div>
          <div class="element-pod">${przedmiot.ects} ECTS${przedmiot.semestr ? " &middot; sem. " + przedmiot.semestr : ""}</div>
        </div>
        <div class="element-akcje">
          <button class="element-edytuj" type="button" aria-label="edytuj">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" width="13" height="13">
              <path d="M11.5 2.5a1.5 1.5 0 0 1 2.1 2.1L5 13.2l-2.8.7.7-2.8L11.5 2.5z" stroke-linejoin="round" />
            </svg>
          </button>
          <button class="element-usun" type="button" aria-label="usun">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" width="13" height="13">
              <path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l.8 9.5a.5.5 0 0 0 .5.5h7.4a.5.5 0 0 0 .5-.5L13 4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>`;
      el.querySelector(".element-edytuj").addEventListener("click", () =>
        otworzModal(przedmiot),
      );
      el.querySelector(".element-usun").addEventListener("click", () =>
        usunPrzedmiot(przedmiot, el),
      );
      dodajSwipe(el, przedmiot);
      elementy.listaPrzedmiotow.appendChild(el);
    });
  });
}

function zaktualizujPodgladFormularza() {
  const ocena = parseFloat(elementy.poleOceny.value);
  const ects = parseFloat(elementy.poleEcts.value);
  if (!ocena || !ects || ects <= 0 || !przedmioty.length) {
    elementy.podgladFormularza.classList.add("ukryty");
    return;
  }
  const se = przedmioty.reduce((s, p) => s + p.ects, 0);
  const sw = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0);
  const sr = sw / se;
  const po = (sw + ocena * ects) / (se + ects);
  const dz = po - sr;
  const znak = dz >= 0 ? "+" : "";
  const kolor =
    dz >= 0 ? "var(--g5)" : dz >= -0.05 ? "var(--g35)" : "var(--g2)";
  elementy.podgladFormularza.classList.remove("ukryty");
  elementy.podgladFormularza.innerHTML = `po dodaniu: <strong>${po.toFixed(2)}</strong>&nbsp;<span style="color:${kolor}">(${znak}${dz.toFixed(3)})</span>`;
}

function renderujWierszeCj() {
  elementy.wejsciaCj.innerHTML = "";
  wierszeCj.forEach((wiersz, i) => {
    const k = document.createElement("div");
    k.className = "cj-rzad";
    k.innerHTML = `
      <div class="pole"><label>Ocena</label>
        <select class="cj-ocena">
          ${DOSTEPNE_OCENY.map((v) => `<option value="${v}"${wiersz.ocena == v ? " selected" : ""}>${v.toFixed(1)}</option>`).join("")}
        </select>
      </div>
      <div class="pole"><label>ECTS</label>
        <input type="number" class="cj-ects" min="0.5" max="30" step="0.5" value="${wiersz.ects}" />
      </div>
      ${wierszeCj.length > 1 ? `<button type="button" class="cj-usun">&#10005;</button>` : `<div></div>`}`;
    k.querySelector(".cj-ocena").addEventListener("change", (e) => {
      wierszeCj[i].ocena = +e.target.value;
      obliczCoJesli();
    });
    k.querySelector(".cj-ects").addEventListener("input", (e) => {
      wierszeCj[i].ects = +e.target.value;
      obliczCoJesli();
    });
    if (wierszeCj.length > 1)
      k.querySelector(".cj-usun").addEventListener("click", () => {
        wierszeCj.splice(i, 1);
        renderujWierszeCj();
        obliczCoJesli();
      });
    elementy.wejsciaCj.appendChild(k);
  });
}

function klasaDeltaRoznicy(d) {
  if (d > 0.001) return "delta-wzrost";
  if (d >= -0.015) return "delta-neutralna";
  if (d >= -0.06) return "delta-cieplo";
  if (d >= -0.15) return "delta-pomarancz";
  return "delta-spadek";
}

function obliczCoJesli() {
  if (!przedmioty.length) {
    elementy.wynikCj.classList.add("ukryty");
    elementy.pustyCj.style.display = "";
    return;
  }
  elementy.pustyCj.style.display = "none";
  const se = przedmioty.reduce((s, p) => s + p.ects, 0);
  const sw = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0);
  const sr = sw / se;
  let dEcts = 0,
    dWaz = 0,
    ok = true;
  wierszeCj.forEach((w) => {
    if (!w.ects || w.ects <= 0) {
      ok = false;
      return;
    }
    dEcts += w.ects;
    dWaz += w.ocena * w.ects;
  });
  if (!ok || !dEcts) {
    elementy.wynikCj.classList.add("ukryty");
    return;
  }
  const srPo = (sw + dWaz) / (se + dEcts);
  const rozn = srPo - sr;
  const znak = rozn >= 0 ? "+" : "";
  elementy.wynikCj.classList.remove("ukryty");
  elementy.terazCj.textContent = sr.toFixed(2);
  elementy.terazCj.className = klasaOceny(zaokraglOcene(sr));
  animujLiczbe(elementy.potemCj, srPo.toFixed(2), 2);
  elementy.potemCj.className = klasaOceny(zaokraglOcene(srPo));
  elementy.roznicaCj.textContent = znak + rozn.toFixed(3);
  elementy.roznicaCj.className = "cj-roznica " + klasaDeltaRoznicy(rozn);
}

function obliczStypendium() {
  const prog = parseFloat(elementy.progStypendium.value);
  const osoby = parseInt(elementy.osobyStypendium.value, 10);
  const procent = parseFloat(elementy.procentStypendium.value);
  if (!prog || !osoby || !procent || !przedmioty.length) {
    elementy.wynikStypendium.classList.add("ukryty");
    elementy.pustyStypendium.style.display = "";
    return;
  }
  elementy.wynikStypendium.classList.remove("ukryty");
  elementy.pustyStypendium.style.display = "none";
  const se = przedmioty.reduce((s, p) => s + p.ects, 0);
  const srednia = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0) / se;
  const stypL = Math.ceil(osoby * (procent / 100));
  const zakres = 3.0;
  const posTy = Math.min(Math.max((srednia - 2) / zakres, 0), 1) * 100;
  const posProgu = Math.min(Math.max((prog - 2) / zakres, 0), 1) * 100;
  const roznica = srednia - prog;

  elementy.wypelnienieStypendium.style.width = posTy + "%";
  elementy.wypelnienieStypendium.className =
    "sty-wypelnienie " + (srednia >= prog ? "ok" : "nie");
  elementy.markerStypendium.style.left = posProgu + "%";
  elementy.tyStypendium.style.left = posTy + "%";
  elementy.twojaStypendium.textContent = srednia.toFixed(2);
  elementy.twojaStypendium.className = klasaOceny(zaokraglOcene(srednia));
  elementy.progWartoscStypendium.textContent = prog.toFixed(2);

  const znak = roznica >= 0 ? "+" : "";
  elementy.roznicaStypendium.textContent = znak + roznica.toFixed(3);
  elementy.roznicaStypendium.style.color =
    roznica >= 0 ? "var(--g5)" : "var(--g2)";

  const szacMiejsce =
    srednia >= prog
      ? Math.max(1, Math.round((1 - ((srednia - prog) / zakres) * 3) * stypL))
      : Math.round(stypL + ((prog - srednia) / zakres) * (osoby - stypL) * 2);
  const miejsce = Math.min(szacMiejsce, osoby);
  const przed = Math.max(0, miejsce - 1);

  elementy.miejsceStypendium.textContent = "~" + miejsce + " / " + osoby;
  elementy.przedStypendium.textContent = "~" + przed;
  elementy.przedStypendium.style.color =
    przed < stypL ? "var(--g5)" : "var(--g2)";

  if (srednia >= prog) {
    elementy.komunikatStypendium.className = "sty-komunikat ok";
    elementy.komunikatStypendium.innerHTML = `<strong>Jesteś powyżej progu.</strong> Zapas: ${roznica.toFixed(3)} pkt. Szacunkowo ${przed} ${przed === 1 ? "osoba ma" : "osoby mają"} lepszą średnia.`;
  } else {
    const sw = przedmioty.reduce((s, p) => s + p.ocena * p.ects, 0);
    const potrzebaEcts = Math.max(0, (prog * se - sw) / (5 - prog));
    elementy.komunikatStypendium.className = "sty-komunikat nie";
    elementy.komunikatStypendium.innerHTML = `<strong>Brakuje: ${Math.abs(roznica).toFixed(3)} pkt.</strong> Szacunkowo ${przed} ${przed === 1 ? "osoba jest" : "osoby sa"} przed Toba. Do progu ${prog.toFixed(2)} potrzebujesz ok. <em>${potrzebaEcts.toFixed(1)} ECTS</em> z ocena 5.0.`;
  }
}

function renderujWszystko() {
  odswiezStatystyki();
  renderujWykres();
  renderujChipySemestrow();
  renderujFiltry();
  renderujListe();
  obliczCoJesli();
  obliczStypendium();
}

elementy.przyciskMotywu.addEventListener("click", () =>
  ustawMotyw(aktywnyMotyw === "noc" ? "dzien" : "noc"),
);
ustawMotyw(aktywnyMotyw);

elementy.przyciskZamknijInfo.addEventListener("click", () =>
  ustawBohatera(false),
);
elementy.przyciskPokazInfo.addEventListener("click", () => ustawBohatera(true));
ustawBohatera(bohaterWidoczny);

elementy.checkboxDokladna.addEventListener("change", (e) => {
  trybDokladny = e.target.checked;
  odswiezStatystyki();
});

const zapisanySemestr = localStorage.getItem(KLUCZ_SEMESTRU);
if (zapisanySemestr) elementy.poleSemestru.value = zapisanySemestr;
elementy.poleSemestru.addEventListener("change", () =>
  localStorage.setItem(KLUCZ_SEMESTRU, elementy.poleSemestru.value),
);

elementy.poleOceny.addEventListener("change", zaktualizujPodgladFormularza);
elementy.poleEcts.addEventListener("input", zaktualizujPodgladFormularza);

elementy.formularz.addEventListener("submit", (e) => {
  e.preventDefault();
  const nazwa = elementy.polaNazwy.value.trim();
  const ocena = parseFloat(elementy.poleOceny.value);
  const ects = parseFloat(elementy.poleEcts.value);
  const semestr = elementy.poleSemestru.value.trim() || null;
  if (!ocena) {
    alert("Wybierz ocenę!");
    return;
  }
  if (!ects || ects <= 0) {
    alert("Wpisz poprawne ECTS!");
    return;
  }

  przedmioty.push({ identyfikator: Date.now(), nazwa, ocena, ects, semestr });
  zapiszDane();
  elementy.polaNazwy.value = "";
  elementy.poleOceny.value = "";
  elementy.poleEcts.value = "";
  elementy.podgladFormularza.classList.add("ukryty");
  renderujWszystko();
  elementy.polaNazwy.focus();
  pokazPowiadomienie("Dodano: " + nazwa);
});

elementy.przyciskWyczyszczenia.addEventListener("click", () => {
  if (!confirm("Usunąć wszystkie przedmioty?")) return;
  przedmioty = [];
  aktywneFiltery.clear();
  celOsiagniety = false;
  zapiszDane();
  renderujWszystko();
});

elementy.przyciskDodajCj.addEventListener("click", () => {
  wierszeCj.push({ identyfikator: Date.now(), ocena: 4.5, ects: 5 });
  renderujWierszeCj();
  obliczCoJesli();
});

[
  elementy.progStypendium,
  elementy.osobyStypendium,
  elementy.procentStypendium,
].forEach((p) => p.addEventListener("input", obliczStypendium));

const zapisanyCel = localStorage.getItem(KLUCZ_CELU);
if (zapisanyCel) elementy.celWejscie.value = zapisanyCel;
elementy.celWejscie.addEventListener("input", () => {
  localStorage.setItem(KLUCZ_CELU, elementy.celWejscie.value);
  obliczCelSredniej();
});

elementy.modalZapisz.addEventListener("click", zapiszEdycje);
elementy.modalAnuluj.addEventListener("click", zamknijModal);
elementy.modalEdycji.addEventListener("click", (e) => {
  if (e.target === elementy.modalEdycji) zamknijModal();
});
elementy.modalNazwa.addEventListener("keydown", (e) => {
  if (e.key === "Enter") zapiszEdycje();
});

renderujWierszeCj();
renderujWszystko();
