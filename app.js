// rejestracja service workera (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("SW rejestracja nie powiodla sie:", err);
    });
  });
}

const znajdzElement = (selektor) => document.querySelector(selektor);

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
  przyciskEksportu: znajdzElement("#btn-eksport"),
  przyciskZainstaluj: znajdzElement("#btn-zainstaluj"),
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

// PWA install prompt
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  elementy.przyciskZainstaluj.classList.remove("ukryty");
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  elementy.przyciskZainstaluj.classList.add("ukryty");
  pokazPowiadomienie("Aplikacja zainstalowana!");
});
elementy.przyciskZainstaluj.addEventListener("click", async () => {
  if (!installPrompt) return;
  const result = await installPrompt.prompt();
  if (result.outcome === "accepted") {
    installPrompt = null;
    elementy.przyciskZainstaluj.classList.add("ukryty");
  }
});

function klasaOceny(ocena) {
  return KLASY_OCEN[ocena] ?? "";
}

function obliczSredniaWazona(listaPrzedmiotow) {
  if (!listaPrzedmiotow.length) return null;
  const sumaEcts = listaPrzedmiotow.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  if (!sumaEcts) return null;
  return (
    listaPrzedmiotow.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    ) / sumaEcts
  );
}

function zaokraglOcene(srednia) {
  return Math.round(srednia * 2) / 2;
}

function zapiszDane() {
  localStorage.setItem(KLUCZ_DANYCH, JSON.stringify(przedmioty));
}

function grupujPoSemestrach() {
  return przedmioty.reduce((grupy, przedmiot) => {
    const klucz = przedmiot.semestr || "brak";
    if (!grupy[klucz]) grupy[klucz] = [];
    grupy[klucz].push(przedmiot);
    return grupy;
  }, {});
}

function sortujKlucze(klucze) {
  return [...klucze].sort((klucz1, klucz2) => {
    if (klucz1 === "brak") return 1;
    if (klucz2 === "brak") return -1;
    return +klucz1 - +klucz2;
  });
}

function pokazPowiadomienie(tekst, rodzaj = "ok") {
  const powiadomienie = document.createElement("div");
  powiadomienie.className = `powiadomienie ${rodzaj}`;
  powiadomienie.textContent = tekst;
  elementy.kontenerPowiadomien.appendChild(powiadomienie);
  setTimeout(() => {
    powiadomienie.classList.add("znikanie");
    setTimeout(() => powiadomienie.remove(), 250);
  }, 2400);
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
  elementy.przyciskEksportu.classList.toggle("ukryty", !liczba);
  elementy.znaczekLiczby.classList.toggle("ukryty", !liczba);
  if (liczba) elementy.znaczekLiczby.textContent = liczba;

  if (!liczba) {
    elementy.statystykaSredniej.textContent = "-";
    elementy.statystykaSredniej.className = "statystyka-glowna";
    elementy.statystykaEcts.textContent = "0";
    elementy.statystykaDokladna.classList.add("ukryty");
    ukryjCel();
    return;
  }

  const sumaEcts = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  const srednia =
    przedmioty.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    ) / sumaEcts;

  elementy.statystykaEcts.textContent = sumaEcts;
  elementy.statystykaSredniej.textContent = srednia.toFixed(2);
  elementy.statystykaSredniej.className =
    "statystyka-glowna " + klasaOceny(zaokraglOcene(srednia));

  if (trybDokladny) {
    elementy.statystykaDokladna.textContent = "= " + srednia.toFixed(8);
    elementy.statystykaDokladna.classList.remove("ukryty");
  } else {
    elementy.statystykaDokladna.classList.add("ukryty");
  }

  obliczCelSredniej();
}

function ukryjCel() {
  elementy.celInfo.classList.add("ukryty");
  elementy.celPasek.classList.add("ukryty");
  elementy.celEtykiety.classList.add("ukryty");
}

function obliczCelSredniej() {
  const cel = parseFloat(elementy.celWejscie.value);
  if (!cel || cel < 2 || cel > 5 || !przedmioty.length) {
    ukryjCel();
    return;
  }

  const sumaEcts = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  const srednia =
    przedmioty.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    ) / sumaEcts;
  const roznica = srednia - cel;

  elementy.celInfo.classList.remove("ukryty");
  elementy.celPasek.classList.remove("ukryty");
  elementy.celEtykiety.classList.remove("ukryty");

  if (srednia >= cel) {
    elementy.celInfo.innerHTML = `<strong>Cel osiagniety!</strong> Zapas: ${roznica.toFixed(3)} pkt powyzej ${cel.toFixed(2)}.`;
    elementy.celWypelnienie.style.width = "100%";
    elementy.celWypelnienie.className = "cel-wypelnienie ok";
  } else {
    const sumaWazna = przedmioty.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    );
    const potrzebaEcts = Math.max(0, (cel * sumaEcts - sumaWazna) / (5 - cel));
    elementy.celInfo.innerHTML = `Brakuje <strong>${Math.abs(roznica).toFixed(3)} pkt</strong>. Potrzebujesz ok. <strong>${potrzebaEcts.toFixed(1)} ECTS</strong> z ocena 5.0 do celu ${cel.toFixed(2)}.`;
    const zakres = cel - 2.0;
    const postep = zakres > 0 ? Math.max(0, (srednia - 2.0) / zakres) : 0;
    const procent = Math.min(postep * 100, 99);
    elementy.celWypelnienie.style.width = procent + "%";
    elementy.celWypelnienie.className =
      procent >= 70 ? "cel-wypelnienie warn" : "cel-wypelnienie nie";
  }
  elementy.celEtykietaPrawa.textContent = cel.toFixed(2);
}

function pobierzZawartoscCSV() {
  const naglowek = "Nazwa,Ocena,ECTS,Semestr";
  const wiersze = przedmioty.map(
    (przedmiot) =>
      `"${przedmiot.nazwa.replace(/"/g, '""')}",${przedmiot.ocena},${przedmiot.ects},${przedmiot.semestr || ""}`,
  );
  const sumaEcts = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  const srednia =
    przedmioty.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    ) / sumaEcts;
  const podsumowanie = `"Srednia wazona",${srednia.toFixed(4)},${sumaEcts}`;
  return [naglowek, ...wiersze, "", podsumowanie].join("\n");
}

function pobierzPlikCSV(zawartosc) {
  const blob = new Blob([zawartosc], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ectscalc.csv";
  link.click();
  URL.revokeObjectURL(url);
  pokazPowiadomienie("Pobrano plik ectscalc.csv");
}

function eksportujDoCSV() {
  if (!przedmioty.length) return;
  const zawartosc = pobierzZawartoscCSV();

  if (!navigator.clipboard) {
    pobierzPlikCSV(zawartosc);
    return;
  }

  navigator.clipboard
    .writeText(zawartosc)
    .then(() => pokazPowiadomienie("Skopiowano CSV do schowka"))
    .catch(() => pobierzPlikCSV(zawartosc));
}

function renderujWykres() {
  elementy.wykres.innerHTML = "";
  const licznikOcen = Object.fromEntries(
    DOSTEPNE_OCENY.map((ocena) => [ocena, 0]),
  );
  przedmioty.forEach((przedmiot) => licznikOcen[przedmiot.ocena]++);
  const maksimum = Math.max(...Object.values(licznikOcen), 1);

  DOSTEPNE_OCENY.forEach((ocena) => {
    const liczba = licznikOcen[ocena];
    const procent = (liczba / maksimum) * 100;
    const kolumna = document.createElement("div");
    kolumna.className = "wykres-kolumna";
    kolumna.innerHTML = `
      <span class="wykres-liczba">${liczba || ""}</span>
      <div class="wykres-slupek ${KLASY_OCEN[ocena]}" style="height:${Math.max(procent, liczba ? 8 : 0)}%" title="${ocena}: ${liczba}"></div>
      <span class="wykres-podpis">${ocena}</span>
    `;
    elementy.wykres.appendChild(kolumna);
  });
}

function renderujChipySemestrow() {
  elementy.chipySemestrow.innerHTML = "";
  const grupy = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  if (klucze.length <= 1 && klucze[0] === "brak") return;

  klucze.forEach((semestr) => {
    const srednia = obliczSredniaWazona(grupy[semestr]);
    if (!srednia) return;
    const sumaEcts = grupy[semestr].reduce(
      (suma, przedmiot) => suma + przedmiot.ects,
      0,
    );
    const chip = document.createElement("div");
    chip.className = "chip-semestru";
    chip.innerHTML = `
      <span class="chip-etykieta">${semestr === "brak" ? "bez semestru" : "semestr " + semestr}</span>
      <span class="chip-wartosc ${klasaOceny(zaokraglOcene(srednia))}">${srednia.toFixed(2)}</span>
      <span class="chip-pod">${sumaEcts} ECTS &middot; ${grupy[semestr].length} przedm.</span>
    `;
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

  const tworzPrzyciskFiltru = (etykieta, wartosc) => {
    const czyWszystkie = wartosc === "wszystkie";
    const czyAktywny = czyWszystkie
      ? aktywneFiltery.size === 0
      : aktywneFiltery.has(wartosc);
    const przycisk = document.createElement("button");
    przycisk.type = "button";
    przycisk.className = "filtr" + (czyAktywny ? " aktywny" : "");
    przycisk.textContent = etykieta;
    przycisk.addEventListener("click", () => {
      if (czyWszystkie) {
        aktywneFiltery.clear();
      } else {
        aktywneFiltery.has(wartosc)
          ? aktywneFiltery.delete(wartosc)
          : aktywneFiltery.add(wartosc);
      }
      renderujFiltry();
      renderujListe();
    });
    return przycisk;
  };

  elementy.filtry.appendChild(tworzPrzyciskFiltru("Wszystkie", "wszystkie"));
  klucze.forEach((klucz) =>
    elementy.filtry.appendChild(
      tworzPrzyciskFiltru(
        klucz === "brak" ? "bez sem." : "sem. " + klucz,
        klucz,
      ),
    ),
  );
}

function renderujListe() {
  elementy.listaPrzedmiotow.innerHTML = "";
  if (!przedmioty.length) return;

  const grupy = grupujPoSemestrach();
  const klucze = sortujKlucze(Object.keys(grupy));
  const widoczneSemestry =
    aktywneFiltery.size === 0
      ? klucze
      : klucze.filter((klucz) => aktywneFiltery.has(klucz));

  widoczneSemestry.forEach((semestr) => {
    if (klucze.length > 1) {
      const srednia = obliczSredniaWazona(grupy[semestr]);
      const sumaEcts = grupy[semestr].reduce(
        (suma, przedmiot) => suma + przedmiot.ects,
        0,
      );
      const naglowek = document.createElement("li");
      naglowek.className = "naglowek-semestru";
      naglowek.innerHTML = `
        <span>${semestr === "brak" ? "bez semestru" : "semestr " + semestr}</span>
        <span class="meta-semestru">
          ${srednia ? `<span class="srednia-semestru">${srednia.toFixed(2)}</span>` : ""}
          <span class="info-semestru">${sumaEcts} ECTS</span>
        </span>
      `;
      elementy.listaPrzedmiotow.appendChild(naglowek);
    }

    grupy[semestr].forEach((przedmiot) => {
      const element = document.createElement("li");
      element.className = "element-listy " + klasaOceny(przedmiot.ocena);
      element.innerHTML = `
        <span class="element-ocena">${przedmiot.ocena.toFixed(1)}</span>
        <div class="element-info">
          <div class="element-nazwa" title="${przedmiot.nazwa}">${przedmiot.nazwa}</div>
          <div class="element-pod">${przedmiot.ects} ECTS${przedmiot.semestr ? " &middot; sem. " + przedmiot.semestr : ""}</div>
        </div>
        <button class="element-usun" type="button" aria-label="usun">&#10005;</button>
      `;
      element.querySelector(".element-usun").addEventListener("click", () => {
        element.classList.add("znikanie-element");
        setTimeout(() => {
          przedmioty = przedmioty.filter(
            (pozycja) =>
              (pozycja.identyfikator ?? pozycja.id) !==
              (przedmiot.identyfikator ?? przedmiot.id),
          );
          const noweGrupy = grupujPoSemestrach();
          aktywneFiltery.forEach((filtr) => {
            if (!noweGrupy[filtr]) aktywneFiltery.delete(filtr);
          });
          zapiszDane();
          renderujWszystko();
        }, 220);
      });
      elementy.listaPrzedmiotow.appendChild(element);
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

  const sumaEcts = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  const sumaWazna = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
    0,
  );
  const sredniaObecna = sumaWazna / sumaEcts;
  const sredniaPo = (sumaWazna + ocena * ects) / (sumaEcts + ects);
  const roznica = sredniaPo - sredniaObecna;
  const znak = roznica >= 0 ? "+" : "";
  const kolor =
    roznica >= 0 ? "var(--g5)" : roznica >= -0.05 ? "var(--g35)" : "var(--g2)";

  elementy.podgladFormularza.classList.remove("ukryty");
  elementy.podgladFormularza.innerHTML = `po dodaniu: <strong>${sredniaPo.toFixed(2)}</strong>&nbsp;<span style="color:${kolor}">(${znak}${roznica.toFixed(3)})</span>`;
}

function renderujWierszeCj() {
  elementy.wejsciaCj.innerHTML = "";

  wierszeCj.forEach((wiersz, indeks) => {
    const kontener = document.createElement("div");
    kontener.className = "cj-rzad";
    kontener.innerHTML = `
      <div class="pole">
        <label>Ocena</label>
        <select class="cj-ocena">
          ${DOSTEPNE_OCENY.map((wartosc) => `<option value="${wartosc}"${wiersz.ocena == wartosc ? " selected" : ""}>${wartosc.toFixed(1)}</option>`).join("")}
        </select>
      </div>
      <div class="pole">
        <label>ECTS</label>
        <input type="number" class="cj-ects" min="0.5" max="30" step="0.5" value="${wiersz.ects}" />
      </div>
      ${
        wierszeCj.length > 1
          ? `<button type="button" class="cj-usun">&#10005;</button>`
          : `<div></div>`
      }
    `;
    kontener
      .querySelector(".cj-ocena")
      .addEventListener("change", (zdarzenie) => {
        wierszeCj[indeks].ocena = +zdarzenie.target.value;
        obliczCoJesli();
      });
    kontener
      .querySelector(".cj-ects")
      .addEventListener("input", (zdarzenie) => {
        wierszeCj[indeks].ects = +zdarzenie.target.value;
        obliczCoJesli();
      });
    if (wierszeCj.length > 1) {
      kontener.querySelector(".cj-usun").addEventListener("click", () => {
        wierszeCj.splice(indeks, 1);
        renderujWierszeCj();
        obliczCoJesli();
      });
    }
    elementy.wejsciaCj.appendChild(kontener);
  });
}

function klasaDeltaRoznicy(roznica) {
  if (roznica > 0.001) return "delta-wzrost";
  if (roznica >= -0.015) return "delta-neutralna";
  if (roznica >= -0.06) return "delta-cieplo";
  if (roznica >= -0.15) return "delta-pomarancz";
  return "delta-spadek";
}

function obliczCoJesli() {
  if (!przedmioty.length) {
    elementy.wynikCj.classList.add("ukryty");
    elementy.pustyCj.style.display = "";
    return;
  }

  elementy.pustyCj.style.display = "none";

  const sumaEcts = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  const sumaWazna = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
    0,
  );
  const sredniaObecna = sumaWazna / sumaEcts;

  let dodatkEcts = 0;
  let dodatkWazna = 0;
  let danePoprawne = true;

  wierszeCj.forEach((wiersz) => {
    if (!wiersz.ects || wiersz.ects <= 0) {
      danePoprawne = false;
      return;
    }
    dodatkEcts += wiersz.ects;
    dodatkWazna += wiersz.ocena * wiersz.ects;
  });

  if (!danePoprawne || !dodatkEcts) {
    elementy.wynikCj.classList.add("ukryty");
    return;
  }

  const sredniaPo = (sumaWazna + dodatkWazna) / (sumaEcts + dodatkEcts);
  const roznica = sredniaPo - sredniaObecna;
  const znak = roznica >= 0 ? "+" : "";

  elementy.wynikCj.classList.remove("ukryty");
  elementy.terazCj.textContent = sredniaObecna.toFixed(2);
  elementy.terazCj.className = klasaOceny(zaokraglOcene(sredniaObecna));
  elementy.potemCj.textContent = sredniaPo.toFixed(2);
  elementy.potemCj.className = klasaOceny(zaokraglOcene(sredniaPo));
  elementy.roznicaCj.textContent = znak + roznica.toFixed(3);
  elementy.roznicaCj.className = "cj-roznica " + klasaDeltaRoznicy(roznica);
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

  const sumaEcts = przedmioty.reduce(
    (suma, przedmiot) => suma + przedmiot.ects,
    0,
  );
  const srednia =
    przedmioty.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    ) / sumaEcts;
  const liczbaStypendystow = Math.ceil(osoby * (procent / 100));
  const zakresSkali = 3.0;
  const pozycjaTy = Math.min(Math.max((srednia - 2) / zakresSkali, 0), 1) * 100;
  const pozycjaProgu = Math.min(Math.max((prog - 2) / zakresSkali, 0), 1) * 100;
  const roznica = srednia - prog;

  elementy.wypelnienieStypendium.style.width = pozycjaTy + "%";
  elementy.wypelnienieStypendium.className =
    "sty-wypelnienie " + (srednia >= prog ? "ok" : "nie");
  elementy.markerStypendium.style.left = pozycjaProgu + "%";
  elementy.tyStypendium.style.left = pozycjaTy + "%";
  elementy.twojaStypendium.textContent = srednia.toFixed(2);
  elementy.twojaStypendium.className = klasaOceny(zaokraglOcene(srednia));
  elementy.progWartoscStypendium.textContent = prog.toFixed(2);

  const znak = roznica >= 0 ? "+" : "";
  elementy.roznicaStypendium.textContent = znak + roznica.toFixed(3);
  elementy.roznicaStypendium.style.color =
    roznica >= 0 ? "var(--g5)" : "var(--g2)";

  const szacowaneMiejsce =
    srednia >= prog
      ? Math.max(
          1,
          Math.round(
            (1 - ((srednia - prog) / zakresSkali) * 3) * liczbaStypendystow,
          ),
        )
      : Math.round(
          liczbaStypendystow +
            ((prog - srednia) / zakresSkali) * (osoby - liczbaStypendystow) * 2,
        );

  const miejsce = Math.min(szacowaneMiejsce, osoby);
  const liczbaOsobPrzed = Math.max(0, miejsce - 1);

  elementy.miejsceStypendium.textContent = "~" + miejsce + " / " + osoby;
  elementy.przedStypendium.textContent = "~" + liczbaOsobPrzed;
  elementy.przedStypendium.style.color =
    liczbaOsobPrzed < liczbaStypendystow ? "var(--g5)" : "var(--g2)";

  if (srednia >= prog) {
    elementy.komunikatStypendium.className = "sty-komunikat ok";
    elementy.komunikatStypendium.innerHTML = `<strong>Jestes powyzej progu.</strong> Zapas: ${roznica.toFixed(3)} pkt. Szacunkowo ${liczbaOsobPrzed} ${liczbaOsobPrzed === 1 ? "osoba ma" : "osoby maja"} lepsza srednia.`;
  } else {
    const sumaWazna = przedmioty.reduce(
      (suma, przedmiot) => suma + przedmiot.ocena * przedmiot.ects,
      0,
    );
    const potrzebaEcts = Math.max(
      0,
      (prog * sumaEcts - sumaWazna) / (5 - prog),
    );
    elementy.komunikatStypendium.className = "sty-komunikat nie";
    elementy.komunikatStypendium.innerHTML = `<strong>Brakuje: ${Math.abs(roznica).toFixed(3)} pkt.</strong> Szacunkowo ${liczbaOsobPrzed} ${liczbaOsobPrzed === 1 ? "osoba jest" : "osoby sa"} przed Toba. Do progu ${prog.toFixed(2)} potrzebujesz ok. <em>${potrzebaEcts.toFixed(1)} ECTS</em> z ocena 5.0.`;
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

// eventy
elementy.przyciskMotywu.addEventListener("click", () =>
  ustawMotyw(aktywnyMotyw === "noc" ? "dzien" : "noc"),
);
ustawMotyw(aktywnyMotyw);

elementy.przyciskZamknijInfo.addEventListener("click", () =>
  ustawBohatera(false),
);
elementy.przyciskPokazInfo.addEventListener("click", () => ustawBohatera(true));
ustawBohatera(bohaterWidoczny);

elementy.checkboxDokladna.addEventListener("change", (zdarzenie) => {
  trybDokladny = zdarzenie.target.checked;
  odswiezStatystyki();
});

const zapisanySemestr = localStorage.getItem(KLUCZ_SEMESTRU);
if (zapisanySemestr) elementy.poleSemestru.value = zapisanySemestr;
elementy.poleSemestru.addEventListener("change", () =>
  localStorage.setItem(KLUCZ_SEMESTRU, elementy.poleSemestru.value),
);

elementy.poleOceny.addEventListener("change", zaktualizujPodgladFormularza);
elementy.poleEcts.addEventListener("input", zaktualizujPodgladFormularza);

elementy.formularz.addEventListener("submit", (zdarzenie) => {
  zdarzenie.preventDefault();
  const nazwa = elementy.polaNazwy.value.trim();
  const ocena = parseFloat(elementy.poleOceny.value);
  const ects = parseFloat(elementy.poleEcts.value);
  const semestr = elementy.poleSemestru.value.trim() || null;

  if (!ocena) {
    alert("Wybierzocene!");
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
});

elementy.przyciskWyczyszczenia.addEventListener("click", () => {
  if (!confirm("Usunac wszystkie przedmioty?")) return;
  przedmioty = [];
  aktywneFiltery.clear();
  zapiszDane();
  renderujWszystko();
});

elementy.przyciskEksportu.addEventListener("click", eksportujDoCSV);

elementy.przyciskDodajCj.addEventListener("click", () => {
  wierszeCj.push({ identyfikator: Date.now(), ocena: 4.5, ects: 5 });
  renderujWierszeCj();
  obliczCoJesli();
});

[
  elementy.progStypendium,
  elementy.osobyStypendium,
  elementy.procentStypendium,
].forEach((pole) => pole.addEventListener("input", obliczStypendium));

const zapisanyCel = localStorage.getItem(KLUCZ_CELU);
if (zapisanyCel) elementy.celWejscie.value = zapisanyCel;
elementy.celWejscie.addEventListener("input", () => {
  localStorage.setItem(KLUCZ_CELU, elementy.celWejscie.value);
  obliczCelSredniej();
});

renderujWierszeCj();
renderujWszystko();