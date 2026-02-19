const FORM = document.querySelector("#ects-form");
const SREDNIA_EL = document.querySelector("#srednia");
const SUMA_EL = document.querySelector("#suma-ects");
const LICZBA_EL = document.querySelector("#liczba-przedmiotow");
const LISTA_EL = document.querySelector("#przedmioty-lista");
const SEMESTR_INPUT = document.querySelector("#semestr");
const SEMESTR_DISPLAY = document.querySelector("#semestr-display");
const BTN_WYCZYSC = document.querySelector("#btn-wyczysc");
const BTN_MOTYW = document.querySelector("#btn-motyw");
const WYKRES_EL = document.querySelector("#wykres-ocen");
const EMPTY_STATE = document.querySelector("#empty-state");
const BTN_INFO = document.querySelector("#btn-info-toggle");
const BTN_INFO_SHOW = document.querySelector("#btn-info-show");
const HERO = document.querySelector("#hero-section");
const FILTRY_EL = document.querySelector("#filtry");
const SEMESTR_SREDNIE_EL = document.querySelector("#semestr-srednie");

let aktywnySemestr = localStorage.getItem("semestr") || "";
let przedmioty = JSON.parse(localStorage.getItem("przedmioty")) || [];
let motyw = localStorage.getItem("motyw") || "noc";
let heroVisible = localStorage.getItem("heroVisible") !== "false";
let aktywnyFiltr = "all";

function ustawMotyw(nowy) {
  motyw = nowy;
  document.documentElement.setAttribute("data-motyw", motyw);
  BTN_MOTYW.textContent = motyw === "noc" ? "☀️" : "🌙";
  localStorage.setItem("motyw", motyw);
}

BTN_MOTYW.addEventListener("click", () =>
  ustawMotyw(motyw === "noc" ? "dzien" : "noc"),
);
ustawMotyw(motyw);

function ustawHero(widoczny) {
  heroVisible = widoczny;
  HERO.classList.toggle("hero-ukryty", !widoczny);
  BTN_INFO_SHOW.style.display = widoczny ? "none" : "flex";
  localStorage.setItem("heroVisible", widoczny);
}

BTN_INFO.addEventListener("click", () => ustawHero(false));
BTN_INFO_SHOW.addEventListener("click", () => ustawHero(true));
ustawHero(heroVisible);

if (aktywnySemestr) {
  SEMESTR_INPUT.value = aktywnySemestr;
  SEMESTR_DISPLAY.textContent = `sem. ${aktywnySemestr}`;
}

SEMESTR_INPUT.addEventListener("change", () => {
  aktywnySemestr = SEMESTR_INPUT.value;
  localStorage.setItem("semestr", aktywnySemestr);
  SEMESTR_DISPLAY.textContent = aktywnySemestr ? `sem. ${aktywnySemestr}` : "";
});

function zapiszDane() {
  localStorage.setItem("przedmioty", JSON.stringify(przedmioty));
}

function klasaOceny(ocena) {
  return `ocena-${ocena.toFixed(1).replace(".", "-")}`;
}

function grupujPoSemestrze() {
  const grupy = {};
  przedmioty.forEach((p) => {
    const k = p.semestr || "brak";
    if (!grupy[k]) grupy[k] = [];
    grupy[k].push(p);
  });
  return grupy;
}

function sredniaPrzedstem(lista) {
  if (!lista.length) return null;
  const ects = lista.reduce((a, p) => a + p.ects, 0);
  if (!ects) return null;
  return lista.reduce((a, p) => a + p.ocena * p.ects, 0) / ects;
}

function obliczSrednia(lista) {
  if (!lista.length) return null;
  const ects = lista.reduce((a, p) => a + p.ects, 0);
  if (!ects) return null;
  return lista.reduce((a, p) => a + p.ocena * p.ects, 0) / ects;
}

function renderujWykres() {
  WYKRES_EL.innerHTML = "";
  const oceny = [2.0, 3.0, 3.5, 4.0, 4.5, 5.0];
  const liczniki = {};
  oceny.forEach((o) => (liczniki[o] = 0));
  przedmioty.forEach((p) => liczniki[p.ocena]++);
  const max = Math.max(...Object.values(liczniki), 1);

  oceny.forEach((ocena) => {
    const count = liczniki[ocena];
    const procent = (count / max) * 100;
    const kolumna = document.createElement("div");
    kolumna.className = "wykres-kolumna";

    const liczbaEl = document.createElement("span");
    liczbaEl.className = "wykres-liczba";
    liczbaEl.textContent = count > 0 ? count : "";

    const slupek = document.createElement("div");
    slupek.className = `wykres-slupek ${klasaOceny(ocena)}`;
    slupek.style.height = `${Math.max(procent, count > 0 ? 8 : 0)}%`;
    slupek.title = `${ocena}: ${count} szt.`;

    const etykieta = document.createElement("span");
    etykieta.className = "wykres-etykieta";
    etykieta.textContent = ocena;

    kolumna.appendChild(liczbaEl);
    kolumna.appendChild(slupek);
    kolumna.appendChild(etykieta);
    WYKRES_EL.appendChild(kolumna);
  });
}

function renderujSemestrSrednie() {
  SEMESTR_SREDNIE_EL.innerHTML = "";
  if (przedmioty.length === 0) return;

  const grupy = grupujPoSemestrze();
  const klucze = Object.keys(grupy).sort((a, b) => {
    if (a === "brak") return 1;
    if (b === "brak") return -1;
    return Number(a) - Number(b);
  });

  if (klucze.length <= 1 && klucze[0] === "brak") return;

  const wrapper = document.createElement("div");
  wrapper.id = "semestr-srednie-inner";

  klucze.forEach((sem) => {
    const sr = sredniaPrzedstem(grupy[sem]);
    if (!sr) return;
    const ects = grupy[sem].reduce((a, p) => a + p.ects, 0);
    const klasa = klasaOceny(Math.round(sr * 2) / 2);
    const chip = document.createElement("div");
    chip.className = `sem-chip ${klasa}`;
    chip.innerHTML = `
      <span class="sem-chip-label">${sem === "brak" ? "bez sem." : `sem. ${sem}`}</span>
      <strong class="sem-chip-sr">${sr.toFixed(2)}</strong>
      <span class="sem-chip-ects">${ects} ECTS</span>
    `;
    wrapper.appendChild(chip);
  });

  if (wrapper.children.length > 0) {
    SEMESTR_SREDNIE_EL.appendChild(wrapper);
  }
}

function renderujFiltry() {
  FILTRY_EL.innerHTML = "";
  if (przedmioty.length === 0) return;

  const grupy = grupujPoSemestrze();
  const klucze = Object.keys(grupy).sort((a, b) => {
    if (a === "brak") return 1;
    if (b === "brak") return -1;
    return Number(a) - Number(b);
  });

  if (klucze.length <= 1) return;

  const stworzPigulke = (label, wartosc) => {
    const btn = document.createElement("button");
    btn.className = "filtr-btn" + (aktywnyFiltr === wartosc ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      aktywnyFiltr = wartosc;
      renderujFiltry();
      renderujListe();
    });
    return btn;
  };

  FILTRY_EL.appendChild(stworzPigulke("Wszystkie", "all"));
  klucze.forEach((sem) => {
    const label = sem === "brak" ? "Bez sem." : `Sem. ${sem}`;
    FILTRY_EL.appendChild(stworzPigulke(label, sem));
  });
}

function aktualizujPodsumowanie() {
  LICZBA_EL.textContent = przedmioty.length;
  const brak = przedmioty.length === 0;
  EMPTY_STATE.style.display = brak ? "flex" : "none";
  BTN_WYCZYSC.style.display = brak ? "none" : "block";

  if (brak) {
    SUMA_EL.textContent = "0";
    SREDNIA_EL.textContent = "—";
    SREDNIA_EL.className = "";
    renderujWykres();
    renderujSemestrSrednie();
    aktualizujCoJesli();
    aktualizujStypendium();
    return;
  }

  const sumaEcts = przedmioty.reduce((acc, p) => acc + p.ects, 0);
  const srednia =
    przedmioty.reduce((acc, p) => acc + p.ocena * p.ects, 0) / sumaEcts;

  SUMA_EL.textContent = sumaEcts;
  SREDNIA_EL.textContent = srednia.toFixed(2);
  SREDNIA_EL.className = klasaOceny(Math.round(srednia * 2) / 2);

  renderujWykres();
  renderujSemestrSrednie();
  aktualizujCoJesli();
  aktualizujStypendium();
}

function stworzElementListy(przedmiot) {
  const LI = document.createElement("li");
  const klasa = klasaOceny(przedmiot.ocena);
  LI.classList.add(klasa, "przedmiot-item");
  LI.innerHTML = `
    <div class="li-info">
      <span class="li-nazwa">${przedmiot.nazwa}</span>
      <div class="li-meta">
        <span class="li-ocena ${klasa}">${przedmiot.ocena}</span>
        <span class="li-ects">${przedmiot.ects} ECTS</span>
      </div>
    </div>
    <button class="btn-usun" aria-label="usuń ${przedmiot.nazwa}">✕</button>
  `;
  LI.querySelector(".btn-usun").addEventListener("click", () => {
    LI.classList.add("usuwany");
    setTimeout(() => {
      przedmioty.splice(
        przedmioty.findIndex((p) => p.id === przedmiot.id),
        1,
      );
      zapiszDane();
      if (aktywnyFiltr !== "all") {
        const grupy = grupujPoSemestrze();
        if (!grupy[aktywnyFiltr]) aktywnyFiltr = "all";
      }
      renderujListe();
      renderujFiltry();
      aktualizujPodsumowanie();
    }, 250);
  });
  return LI;
}

function stworzSemestrHeader(sem, lista) {
  const header = document.createElement("li");
  header.className = "semestr-header";
  const tytul = sem === "brak" ? "Bez semestru" : `Semestr ${sem}`;
  const sr = sredniaPrzedstem(lista);
  const srKlasa = sr ? klasaOceny(Math.round(sr * 2) / 2) : "";
  const srHTML = sr
    ? `<span class="semestr-srednia ${srKlasa}">śr. ${sr.toFixed(2)}</span>`
    : "";
  const ects = lista.reduce((a, p) => a + p.ects, 0);
  const lp = lista.length;
  const lpText = lp === 1 ? "przedmiot" : lp < 5 ? "przedmioty" : "przedmiotów";
  header.innerHTML = `
    <span class="semestr-tytul">${tytul}</span>
    <span class="semestr-meta">${srHTML}<span class="semestr-ects">${ects} ECTS · ${lp} ${lpText}</span></span>
  `;
  return header;
}

function renderujListe() {
  LISTA_EL.innerHTML = "";
  if (przedmioty.length === 0) return;

  const grupy = grupujPoSemestrze();
  const klucze = Object.keys(grupy).sort((a, b) => {
    if (a === "brak") return 1;
    if (b === "brak") return -1;
    return Number(a) - Number(b);
  });

  const kluczeFilt =
    aktywnyFiltr === "all" ? klucze : klucze.filter((k) => k === aktywnyFiltr);

  kluczeFilt.forEach((sem) => {
    if (aktywnyFiltr === "all") {
      LISTA_EL.appendChild(stworzSemestrHeader(sem, grupy[sem]));
    }
    grupy[sem].forEach((p) => LISTA_EL.appendChild(stworzElementListy(p)));
  });
}

BTN_WYCZYSC.addEventListener("click", () => {
  if (!confirm("Usunąć wszystkie przedmioty?")) return;
  przedmioty = [];
  aktywnyFiltr = "all";
  zapiszDane();
  renderujListe();
  renderujFiltry();
  aktualizujPodsumowanie();
});

FORM.addEventListener("submit", (e) => {
  e.preventDefault();
  const nazwa = document.querySelector("#przedmiot").value.trim();
  const ocena = parseFloat(document.querySelector("#ocena").value);
  const ects = parseFloat(document.querySelector("#ects").value);
  if (ects <= 0) {
    alert("Liczba ECTS musi być większa od 0!");
    return;
  }
  przedmioty.push({
    id: Date.now(),
    nazwa,
    ocena,
    ects,
    semestr: aktywnySemestr || null,
  });
  zapiszDane();
  FORM.reset();
  renderujListe();
  renderujFiltry();
  aktualizujPodsumowanie();
});

const CJ_OCENA = document.querySelector("#cj-ocena");
const CJ_ECTS = document.querySelector("#cj-ects");
const CJ_WYNIK = document.querySelector("#cj-wynik");
const CJ_OBECNA = document.querySelector("#cj-obecna");
const CJ_NOWA = document.querySelector("#cj-nowa");
const CJ_DELTA = document.querySelector("#cj-delta");
const CJ_BRAK = document.querySelector("#cj-brak");

function aktualizujCoJesli() {
  if (przedmioty.length === 0) {
    CJ_WYNIK.classList.add("hidden");
    CJ_BRAK.style.display = "block";
    return;
  }
  CJ_BRAK.style.display = "none";
  CJ_WYNIK.classList.remove("hidden");
  obliczCoJesli();
}

function obliczCoJesli() {
  const nowaOcena = parseFloat(CJ_OCENA.value);
  const noweEcts = parseFloat(CJ_ECTS.value);
  if (!nowaOcena || !noweEcts || noweEcts <= 0) return;

  const sumaEcts = przedmioty.reduce((a, p) => a + p.ects, 0);
  const sumaWaz = przedmioty.reduce((a, p) => a + p.ocena * p.ects, 0);
  const obecna = sumaWaz / sumaEcts;
  const nowa = (sumaWaz + nowaOcena * noweEcts) / (sumaEcts + noweEcts);
  const delta = nowa - obecna;

  CJ_OBECNA.textContent = obecna.toFixed(2);
  CJ_OBECNA.className = klasaOceny(Math.round(obecna * 2) / 2);
  CJ_NOWA.textContent = nowa.toFixed(2);
  CJ_NOWA.className = klasaOceny(Math.round(nowa * 2) / 2);

  const znak = delta >= 0 ? "+" : "";
  CJ_DELTA.textContent = `${znak}${delta.toFixed(3)}`;
  CJ_DELTA.className =
    delta > 0.001
      ? "delta-up"
      : delta < -0.001
        ? "delta-down"
        : "delta-neutral";
}

CJ_OCENA.addEventListener("change", obliczCoJesli);
CJ_ECTS.addEventListener("input", obliczCoJesli);

const ST_PROG = document.querySelector("#st-prog");
const ST_OSOBY = document.querySelector("#st-osoby");
const ST_PROCENT = document.querySelector("#st-procent");
const ST_WYNIK = document.querySelector("#st-wynik");
const ST_BRAK = document.querySelector("#st-brak");
const ST_FILL = document.querySelector("#st-ranking-fill");
const ST_MARKER = document.querySelector("#st-ranking-prog-marker");
const ST_TY = document.querySelector("#st-ranking-ty");
const ST_TWOJA = document.querySelector("#st-twoja");
const ST_PROG_DISPLAY = document.querySelector("#st-prog-display");
const ST_ROZNICA = document.querySelector("#st-roznica");
const ST_MIEJSCE = document.querySelector("#st-miejsce");
const ST_KOMUNIKAT = document.querySelector("#st-komunikat");

function aktualizujStypendium() {
  obliczStypendium();
}

function obliczStypendium() {
  const prog = parseFloat(ST_PROG.value);
  const osoby = parseInt(ST_OSOBY.value);
  const procent = parseFloat(ST_PROCENT.value);

  if (!prog || !osoby || !procent || przedmioty.length === 0) {
    ST_WYNIK.classList.add("hidden");
    ST_BRAK.style.display = "block";
    return;
  }

  const sumaEcts = przedmioty.reduce((a, p) => a + p.ects, 0);
  const sredniaOgolna =
    przedmioty.reduce((a, p) => a + p.ocena * p.ects, 0) / sumaEcts;

  ST_WYNIK.classList.remove("hidden");
  ST_BRAK.style.display = "none";

  const roznica = sredniaOgolna - prog;
  const stypMiejsc = Math.ceil(osoby * (procent / 100));

  ST_TWOJA.textContent = sredniaOgolna.toFixed(2);
  ST_TWOJA.className = klasaOceny(Math.round(sredniaOgolna * 2) / 2);
  ST_PROG_DISPLAY.textContent = prog.toFixed(2);

  const roznicaStr = (roznica >= 0 ? "+" : "") + roznica.toFixed(3);
  ST_ROZNICA.textContent = roznicaStr;
  ST_ROZNICA.style.color =
    roznica >= 0 ? "var(--ocena-5-0, #00e5a0)" : "#e5484d";

  const zakresOcen = 5.0 - 2.0;
  const pozycjaPostep =
    Math.min(Math.max((sredniaOgolna - 2.0) / zakresOcen, 0), 1) * 100;
  const pozycjaProg = Math.min(Math.max((prog - 2.0) / zakresOcen, 0), 1) * 100;

  ST_FILL.style.width = `${pozycjaPostep}%`;
  ST_FILL.className =
    sredniaOgolna >= prog ? "ranking-fill-ok" : "ranking-fill-nie";
  ST_MARKER.style.left = `${pozycjaProg}%`;
  ST_TY.style.left = `${pozycjaPostep}%`;

  const szacowaneMiejsce =
    sredniaOgolna >= prog
      ? Math.max(
          1,
          Math.round(
            (1 - ((sredniaOgolna - prog) / zakresOcen) * 3) * stypMiejsc,
          ),
        )
      : Math.round(
          stypMiejsc +
            ((prog - sredniaOgolna) / zakresOcen) * (osoby - stypMiejsc) * 2,
        );

  const szacowaneMiejsceOgr = Math.min(szacowaneMiejsce, osoby);
  ST_MIEJSCE.textContent = `~${szacowaneMiejsceOgr} / ${osoby}`;

  if (sredniaOgolna >= prog) {
    const zapas = roznica;
    ST_KOMUNIKAT.className = "st-msg st-ok";
    ST_KOMUNIKAT.innerHTML = `
      <strong>Twoja średnia jest powyżej progu.</strong> Zapas wynosi ${zapas.toFixed(3)} pkt.
      Pamiętaj, że ranking zależy też od wyników innych studentów, próg może wzrosnąć.
    `;
  } else {
    const brakuje = Math.abs(roznica);
    const sumaWaz = przedmioty.reduce((a, p) => a + p.ocena * p.ects, 0);
    const celowaOcena = 5.0;
    const potrzebneEcts = (prog * sumaEcts - sumaWaz) / (celowaOcena - prog);
    const potrzebneEctsOgr = Math.max(0, potrzebneEcts);

    ST_KOMUNIKAT.className = "st-msg st-nie";
    ST_KOMUNIKAT.innerHTML = `
      <strong>Brakuje Ci ${brakuje.toFixed(3)} pkt do progu.</strong>
      Żeby osiągnąć próg ${prog.toFixed(2)}, potrzebujesz jeszcze ok. <em>${potrzebneEctsOgr.toFixed(1)} ECTS</em> ocenionych na 5.0
      (albo odpowiednio więcej przy niższych ocenach).
    `;
  }
}

[ST_PROG, ST_OSOBY, ST_PROCENT].forEach((el) =>
  el.addEventListener("input", obliczStypendium),
);

renderujListe();
renderujFiltry();
aktualizujPodsumowanie();
