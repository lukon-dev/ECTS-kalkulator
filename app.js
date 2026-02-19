const $ = (s) => document.querySelector(s);

const el = {
  form: $("#form"),
  fNazwa: $("#f-nazwa"),
  fOcena: $("#f-ocena"),
  fEcts: $("#f-ects"),
  fSem: $("#f-sem"),
  preview: $("#form-preview"),
  lista: $("#lista"),
  empty: $("#empty"),
  badge: $("#badge"),
  btnClear: $("#btn-clear"),
  filtryWrap: $("#filtry-wrap"),
  filtry: $("#filtry"),
  statSr: $("#stat-sr"),
  statEcts: $("#stat-ects"),
  statCount: $("#stat-count"),
  statPrecise: $("#stat-precise"),
  btnPrecise: $("#btn-precise"),
  wykres: $("#wykres"),
  semChips: $("#sem-chips"),
  cjInputs: $("#cj-inputs"),
  cjAdd: $("#cj-add"),
  cjResult: $("#cj-result"),
  cjNow: $("#cj-now"),
  cjNext: $("#cj-next"),
  cjDelta: $("#cj-delta"),
  cjEmpty: $("#cj-empty"),
  styProg: $("#sty-prog"),
  styOsoby: $("#sty-osoby"),
  styProc: $("#sty-proc"),
  styResult: $("#sty-result"),
  styEmpty: $("#sty-empty"),
  styFill: $("#sty-fill"),
  styMarker: $("#sty-marker"),
  styTy: $("#sty-ty"),
  styTwoja: $("#sty-twoja"),
  styProgVal: $("#sty-prog-val"),
  styDiff: $("#sty-diff"),
  styPlace: $("#sty-place"),
  styBefore: $("#sty-before"),
  styMsg: $("#sty-msg"),
  hero: $("#hero"),
  heroClose: $("#btn-hero-close"),
  infoShow: $("#btn-info-show"),
  btnTheme: $("#btn-theme"),
};

let data = JSON.parse(localStorage.getItem("ectscalc")) || [];
let motyw = localStorage.getItem("ectscalc_motyw") || "noc";
let heroOpen = localStorage.getItem("ectscalc_hero") !== "0";
let precise = false;
let activeFilters = new Set();
let cjRows = [{ id: 0, ocena: 4.5, ects: 5 }];

const GRADES = [2, 3, 3.5, 4, 4.5, 5];
const GRADE_CLASS = {
  2: "g2",
  3: "g3",
  3.5: "g35",
  4: "g4",
  4.5: "g45",
  5: "g5",
};
const CHART_CLASS = {
  2: "g2",
  3: "g3",
  3.5: "g35",
  4: "g4",
  4.5: "g45",
  5: "g5",
};

function gc(g) {
  return GRADE_CLASS[g] || "";
}

function wAvg(list) {
  if (!list.length) return null;
  const se = list.reduce((a, p) => a + p.ects, 0);
  if (!se) return null;
  return list.reduce((a, p) => a + p.ocena * p.ects, 0) / se;
}

function roundGrade(sr) {
  return Math.round(sr * 2) / 2;
}

function save() {
  localStorage.setItem("ectscalc", JSON.stringify(data));
}

function setMotyw(m) {
  motyw = m;
  document.documentElement.setAttribute("data-motyw", m);
  localStorage.setItem("ectscalc_motyw", m);
}
el.btnTheme.addEventListener("click", () =>
  setMotyw(motyw === "noc" ? "dzien" : "noc"),
);
setMotyw(motyw);

function setHero(open) {
  heroOpen = open;
  el.hero.classList.toggle("hidden", !open);
  el.infoShow.style.display = open ? "none" : "";
  localStorage.setItem("ectscalc_hero", open ? "1" : "0");
}
el.heroClose.addEventListener("click", () => setHero(false));
el.infoShow.addEventListener("click", () => setHero(true));
setHero(heroOpen);

el.btnPrecise.addEventListener("click", () => {
  precise = !precise;
  el.btnPrecise.classList.toggle("on", precise);
  refreshStats();
});

const savedSem = localStorage.getItem("ectscalc_sem");
if (savedSem) el.fSem.value = savedSem;
el.fSem.addEventListener("change", () =>
  localStorage.setItem("ectscalc_sem", el.fSem.value),
);

function grupuj() {
  const g = {};
  data.forEach((p) => {
    const k = p.semestr || "brak";
    if (!g[k]) g[k] = [];
    g[k].push(p);
  });
  return g;
}

function sortKeys(keys) {
  return [...keys].sort((a, b) => {
    if (a === "brak") return 1;
    if (b === "brak") return -1;
    return +a - +b;
  });
}

function refreshStats() {
  const n = data.length;
  el.statCount.textContent = n;
  el.empty.style.display = n ? "none" : "flex";
  el.btnClear.classList.toggle("hidden", !n);
  el.badge.classList.toggle("hidden", !n);
  if (n) el.badge.textContent = n;

  if (!n) {
    el.statSr.textContent = "\u2014";
    el.statSr.className = "stat-main";
    el.statEcts.textContent = "0";
    el.statPrecise.classList.add("hidden");
    return;
  }

  const se = data.reduce((a, p) => a + p.ects, 0);
  const sr = data.reduce((a, p) => a + p.ocena * p.ects, 0) / se;

  el.statEcts.textContent = se;
  el.statSr.textContent = sr.toFixed(2);
  el.statSr.className = "stat-main " + gc(roundGrade(sr));

  if (precise) {
    el.statPrecise.textContent = "= " + sr.toFixed(8);
    el.statPrecise.classList.remove("hidden");
  } else {
    el.statPrecise.classList.add("hidden");
  }
}

function renderWykres() {
  el.wykres.innerHTML = "";
  const counts = {};
  GRADES.forEach((g) => (counts[g] = 0));
  data.forEach((p) => counts[p.ocena]++);
  const max = Math.max(...Object.values(counts), 1);

  GRADES.forEach((grade) => {
    const n = counts[grade];
    const pct = (n / max) * 100;
    const col = document.createElement("div");
    col.className = "wykres-col";
    col.innerHTML = `
      <span class="wykres-n">${n || ""}</span>
      <div class="wykres-bar ${CHART_CLASS[grade]}" style="height:${Math.max(pct, n ? 8 : 0)}%" title="${grade}: ${n}"></div>
      <span class="wykres-etk">${grade}</span>
    `;
    el.wykres.appendChild(col);
  });
}

function renderSemChips() {
  el.semChips.innerHTML = "";
  const g = grupuj();
  const keys = sortKeys(Object.keys(g));
  if (keys.length <= 1 && keys[0] === "brak") return;

  keys.forEach((sem) => {
    const sr = wAvg(g[sem]);
    if (!sr) return;
    const ects = g[sem].reduce((a, p) => a + p.ects, 0);
    const chip = document.createElement("div");
    chip.className = "sem-chip";
    chip.innerHTML = `
      <span class="sem-chip-label">${sem === "brak" ? "bez semestru" : "semestr " + sem}</span>
      <span class="sem-chip-val ${gc(roundGrade(sr))}">${sr.toFixed(2)}</span>
      <span class="sem-chip-sub">${ects} ECTS &middot; ${g[sem].length} przedm.</span>
    `;
    el.semChips.appendChild(chip);
  });
}

function renderFiltry() {
  el.filtry.innerHTML = "";
  const g = grupuj();
  const keys = sortKeys(Object.keys(g));

  if (keys.length <= 1) {
    el.filtryWrap.classList.add("hidden");
    return;
  }
  el.filtryWrap.classList.remove("hidden");

  const mk = (label, val) => {
    const isAll = val === "all";
    const on = isAll ? activeFilters.size === 0 : activeFilters.has(val);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filtr" + (on ? " on" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (isAll) activeFilters.clear();
      else
        activeFilters.has(val)
          ? activeFilters.delete(val)
          : activeFilters.add(val);
      renderFiltry();
      renderLista();
    });
    return btn;
  };

  el.filtry.appendChild(mk("Wszystkie", "all"));
  keys.forEach((k) =>
    el.filtry.appendChild(mk(k === "brak" ? "bez sem." : "sem. " + k, k)),
  );
}

function renderLista() {
  el.lista.innerHTML = "";
  if (!data.length) return;

  const g = grupuj();
  const keys = sortKeys(Object.keys(g));
  const show =
    activeFilters.size === 0 ? keys : keys.filter((k) => activeFilters.has(k));

  show.forEach((sem) => {
    if (keys.length > 1) {
      const sr = wAvg(g[sem]);
      const li = document.createElement("li");
      li.className = "sem-header";
      const ects = g[sem].reduce((a, p) => a + p.ects, 0);
      li.innerHTML = `
        <span>${sem === "brak" ? "bez semestru" : "semestr " + sem}</span>
        <span class="sem-meta">
          ${sr ? `<span class="sem-sr">${sr.toFixed(2)}</span>` : ""}
          <span class="sem-info">${ects} ECTS</span>
        </span>
      `;
      el.lista.appendChild(li);
    }

    g[sem].forEach((p) => {
      const li = document.createElement("li");
      li.className = "item " + gc(p.ocena);
      li.innerHTML = `
        <span class="item-grade">${p.ocena.toFixed(1)}</span>
        <div class="item-info">
          <div class="item-name" title="${p.nazwa}">${p.nazwa}</div>
          <div class="item-sub">${p.ects} ECTS${p.semestr ? " &middot; sem. " + p.semestr : ""}</div>
        </div>
        <button class="item-del" type="button" aria-label="usun">&#10005;</button>
      `;
      li.querySelector(".item-del").addEventListener("click", () => {
        li.classList.add("going");
        setTimeout(() => {
          data = data.filter((x) => x.id !== p.id);
          const g2 = grupuj();
          activeFilters.forEach((f) => {
            if (!g2[f]) activeFilters.delete(f);
          });
          save();
          render();
        }, 220);
      });
      el.lista.appendChild(li);
    });
  });
}

function updatePreview() {
  const ocena = parseFloat(el.fOcena.value);
  const ects = parseFloat(el.fEcts.value);
  if (!ocena || !ects || ects <= 0 || !data.length) {
    el.preview.classList.add("hidden");
    return;
  }
  const se = data.reduce((a, p) => a + p.ects, 0);
  const sw = data.reduce((a, p) => a + p.ocena * p.ects, 0);
  const now = sw / se;
  const next = (sw + ocena * ects) / (se + ects);
  const d = next - now;
  const sign = d >= 0 ? "+" : "";
  const col = d >= 0 ? "var(--g5)" : d >= -0.05 ? "var(--g35)" : "var(--g2)";
  el.preview.classList.remove("hidden");
  el.preview.innerHTML = `po dodaniu: <strong>${next.toFixed(2)}</strong>&nbsp;<span style="color:${col}">(${sign}${d.toFixed(3)})</span>`;
}

el.fOcena.addEventListener("change", updatePreview);
el.fEcts.addEventListener("input", updatePreview);

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nazwa = el.fNazwa.value.trim();
  const ocena = parseFloat(el.fOcena.value);
  const ects = parseFloat(el.fEcts.value);
  const semestr = el.fSem.value.trim() || null;
  if (!ocena) {
    alert("Wybierz ocene!");
    return;
  }
  if (!ects || ects <= 0) {
    alert("Wpisz poprawne ECTS!");
    return;
  }

  data.push({ id: Date.now(), nazwa, ocena, ects, semestr });
  save();

  el.fNazwa.value = "";
  el.fOcena.value = "";
  el.fEcts.value = "";
  el.preview.classList.add("hidden");

  render();
  el.fNazwa.focus();
});

el.btnClear.addEventListener("click", () => {
  if (!confirm("Usunac wszystkie przedmioty?")) return;
  data = [];
  activeFilters.clear();
  save();
  render();
});

function cjRender() {
  el.cjInputs.innerHTML = "";
  cjRows.forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "cj-row";
    div.innerHTML = `
      <div class="field">
        <label>Ocena</label>
        <select class="cj-ocena">
          ${GRADES.map((v) => `<option value="${v}"${row.ocena == v ? " selected" : ""}>${v.toFixed(1)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>ECTS</label>
        <input type="number" class="cj-ects" min="0.5" max="30" step="0.5" value="${row.ects}" />
      </div>
      ${
        cjRows.length > 1
          ? `<button type="button" class="cj-del">&#10005;</button>`
          : `<div></div>`
      }
    `;
    div.querySelector(".cj-ocena").addEventListener("change", (e) => {
      cjRows[i].ocena = +e.target.value;
      cjCalc();
    });
    div.querySelector(".cj-ects").addEventListener("input", (e) => {
      cjRows[i].ects = +e.target.value;
      cjCalc();
    });
    if (cjRows.length > 1) {
      div.querySelector(".cj-del").addEventListener("click", () => {
        cjRows.splice(i, 1);
        cjRender();
        cjCalc();
      });
    }
    el.cjInputs.appendChild(div);
  });
}

el.cjAdd.addEventListener("click", () => {
  cjRows.push({ id: Date.now(), ocena: 4.5, ects: 5 });
  cjRender();
  cjCalc();
});

function deltaClass(d) {
  if (d > 0.001) return "d-up";
  if (d >= -0.015) return "d-neutral";
  if (d >= -0.06) return "d-warm";
  if (d >= -0.15) return "d-orange";
  return "d-down";
}

function cjCalc() {
  if (!data.length) {
    el.cjResult.classList.add("hidden");
    el.cjEmpty.style.display = "";
    return;
  }
  el.cjEmpty.style.display = "none";

  const se = data.reduce((a, p) => a + p.ects, 0);
  const sw = data.reduce((a, p) => a + p.ocena * p.ects, 0);
  const now = sw / se;

  let addE = 0,
    addW = 0,
    ok = true;
  cjRows.forEach((r) => {
    if (!r.ects || r.ects <= 0) {
      ok = false;
      return;
    }
    addE += r.ects;
    addW += r.ocena * r.ects;
  });

  if (!ok || !addE) {
    el.cjResult.classList.add("hidden");
    return;
  }

  const next = (sw + addW) / (se + addE);
  const d = next - now;
  const sign = d >= 0 ? "+" : "";

  el.cjResult.classList.remove("hidden");
  el.cjNow.textContent = now.toFixed(2);
  el.cjNow.className = gc(roundGrade(now));
  el.cjNext.textContent = next.toFixed(2);
  el.cjNext.className = gc(roundGrade(next));
  el.cjDelta.textContent = sign + d.toFixed(3);
  el.cjDelta.className = "cj-delta " + deltaClass(d);
}

cjRender();

function styCalc() {
  const prog = parseFloat(el.styProg.value);
  const osoby = parseInt(el.styOsoby.value);
  const proc = parseFloat(el.styProc.value);

  if (!prog || !osoby || !proc || !data.length) {
    el.styResult.classList.add("hidden");
    el.styEmpty.style.display = "";
    return;
  }

  el.styResult.classList.remove("hidden");
  el.styEmpty.style.display = "none";

  const se = data.reduce((a, p) => a + p.ects, 0);
  const sr = data.reduce((a, p) => a + p.ocena * p.ects, 0) / se;

  const stypN = Math.ceil(osoby * (proc / 100));
  const range = 3.0;
  const posTy = Math.min(Math.max((sr - 2) / range, 0), 1) * 100;
  const posProg = Math.min(Math.max((prog - 2) / range, 0), 1) * 100;
  const diff = sr - prog;

  el.styFill.style.width = posTy + "%";
  el.styFill.className = "sty-fill " + (sr >= prog ? "ok" : "no");
  el.styMarker.style.left = posProg + "%";
  el.styTy.style.left = posTy + "%";

  el.styTwoja.textContent = sr.toFixed(2);
  el.styTwoja.className = gc(roundGrade(sr));
  el.styProgVal.textContent = prog.toFixed(2);

  const sign = diff >= 0 ? "+" : "";
  el.styDiff.textContent = sign + diff.toFixed(3);
  el.styDiff.style.color = diff >= 0 ? "var(--g5)" : "var(--g2)";

  const estPlace =
    sr >= prog
      ? Math.max(1, Math.round((1 - ((sr - prog) / range) * 3) * stypN))
      : Math.round(stypN + ((prog - sr) / range) * (osoby - stypN) * 2);

  const place = Math.min(estPlace, osoby);
  const przed = Math.max(0, place - 1);

  el.styPlace.textContent = "~" + place + " / " + osoby;
  el.styBefore.textContent = "~" + przed;
  el.styBefore.style.color = przed < stypN ? "var(--g5)" : "var(--g2)";

  if (sr >= prog) {
    el.styMsg.className = "sty-msg ok";
    el.styMsg.innerHTML = `<strong>Jestes powyzej progu.</strong> Zapas to ${diff.toFixed(3)} pkt. Szacunkowo ${przed} ${przed === 1 ? "osoba ma" : "osoby maja"} lepsza srednia. Pamietaj, prog moze wzrosnac.`;
  } else {
    const sw2 = data.reduce((a, p) => a + p.ocena * p.ects, 0);
    const need = Math.max(0, (prog * se - sw2) / (5 - prog));
    el.styMsg.className = "sty-msg no";
    el.styMsg.innerHTML = `<strong>Brakuje ${Math.abs(diff).toFixed(3)} pkt.</strong> Szacunkowo ${przed} ${przed === 1 ? "osoba jest" : "osoby sa"} przed Toba. Zeby dobic do ${prog.toFixed(2)} potrzebujesz ok. <em>${need.toFixed(1)} ECTS</em> z ocena 5.0.`;
  }
}

[el.styProg, el.styOsoby, el.styProc].forEach((e) =>
  e.addEventListener("input", styCalc),
);

function render() {
  refreshStats();
  renderWykres();
  renderSemChips();
  renderFiltry();
  renderLista();
  cjCalc();
  styCalc();
}

render();
