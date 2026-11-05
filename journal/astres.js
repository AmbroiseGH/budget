"use strict";

/* =========================================================
   Les astres du Journal : quatre lunes, l'aube, quatre soleils.
   Tout est dessiné en SVG (net à toutes les tailles, animable).
   La lumière vient toujours de la droite, du côté des soleils.
   ========================================================= */

const HUMEURS = [
  { nom: "Insupportable", astre: "Lune de sang" },
  { nom: "Très désagréable", astre: "Lune d'orage" },
  { nom: "Désagréable", astre: "Croissant de lune" },
  { nom: "Moyen", astre: "Demi-lune" },
  { nom: "Neutre", astre: "Aube" },
  { nom: "Sympathique", astre: "Soleil doux" },
  { nom: "Belle", astre: "Beau soleil" },
  { nom: "Superbe", astre: "Grand soleil" },
  { nom: "Incroyable", astre: "Soleil radieux" },
];

// Le ciel de chaque humeur : haut, milieu, bas de l'écran
const CIELS_CLAIR = [
  ["#0a0306", "#2a0710", "#5c1020"],
  ["#0b0e18", "#1c2234", "#3a4258"],
  ["#060c26", "#122150", "#2b4282"],
  ["#0f1036", "#2c2a6a", "#5a4f97"],
  ["#1c1f55", "#6c5a99", "#e39a8f"],
  ["#3a78c2", "#8fbde9", "#fbe0c0"],
  ["#2468c4", "#72b2ee", "#d6ecff"],
  ["#b8456a", "#f59a63", "#ffe0a3"],
  ["#b8560a", "#ffbf3a", "#fff3cc"],
];
// En mode sombre, les soleils brillent dans un ciel plus profond (pas d'éblouissement le soir)
const CIELS_SOMBRE = CIELS_CLAIR.slice(0, 5).concat([
  ["#0d2142", "#23507d", "#b9895f"],
  ["#0a2752", "#1d5a99", "#d4a055"],
  ["#2a1238", "#86354f", "#e98a45"],
  ["#3a1806", "#a5520c", "#f3b33d"],
]);
const ACCENTS = ["#ff4d4f", "#9aaad0", "#7ea6ff", "#b9a9ff", "#ffb39b", "#ffd36b", "#ffc83d", "#ff9f43", "#ffb000"];
const ETOILES = [0.55, 0.22, 0.95, 1, 0.4, 0, 0, 0, 0];
const POUSSIERE = [0, 0, 0, 0, 0.12, 0.35, 0.5, 0.75, 1];

// Couleurs des graphiques : échelle divergente (lunes = indigo, soleils = or, neutre = gris)
const DIVERGENT = {
  clair: ["#3b3a9e", "#5656c4", "#7779d8", "#9ea0e6", "#b8b4c6", "#e0a32e", "#dc8419", "#d2650f", "#bb460b"],
  sombre: ["#a5a8ff", "#7f83f0", "#6266d6", "#4b4fb0", "#5e5a70", "#a86f1c", "#cf8a22", "#eda332", "#ffc14d"],
};

/* ---------- Petits outils de dessin ---------- */

const svgAstre = (contenu) => `<svg class="astre-svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false">${contenu}</svg>`;
const arrets = (stops) => stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a !== 1 ? ` stop-opacity="${a}"` : ""}/>`).join("");
const radial = (id, stops, attrs = "") => `<radialGradient id="${id}" ${attrs}>${arrets(stops)}</radialGradient>`;
const lineaire = (id, stops, attrs = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${attrs}>${arrets(stops)}</linearGradient>`;
const repete = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");

// Étoile à quatre branches
function etoile4(x, y, s) {
  const c = s * 0.16;
  return `M${x} ${y - s}Q${x + c} ${y - c} ${x + s} ${y}Q${x + c} ${y + c} ${x} ${y + s}Q${x - c} ${y + c} ${x - s} ${y}Q${x - c} ${y - c} ${x} ${y - s}Z`;
}

// Silhouette de nuage dans une boîte de 100 × 40 (bas plat)
const NUAGE = "M10 40C3 40 0 33 4 28C1 20 8 13 17 15C19 5 31 0 41 5C47-2 62-1 67 9C75 5 87 9 88 19C96 19 101 27 98 34C97 38 94 40 90 40Z";
const nuage = (x, y, l, attrs) => `<path transform="translate(${x} ${y}) scale(${l / 100})" d="${NUAGE}" ${attrs}/>`;

/* ---------- Lunes ---------- */

// c = [reflet, clair, moyen, bord, mers, liseré]
function defsLune(p, c) {
  return radial(`${p}-corps`, [[0, c[0]], [0.34, c[1]], [0.74, c[2]], [1, c[3]]], 'cx="50%" cy="50%" r="50%" fx="70%" fy="28%"') +
    radial(`${p}-mer`, [[0, c[4], 0.55], [0.6, c[4], 0.24], [1, c[4], 0]]) +
    lineaire(`${p}-limbe`, [[0, c[5], 0.9], [0.42, c[5], 0]], 'x1="1" y1="0" x2="0" y2="1"');
}
const MERS = [[-16, -22, 22, 15, -18], [20, -28, 13, 10, 0], [12, 8, 26, 16, 12], [-26, 18, 14, 10, 0], [-6, 36, 10, 6, 0]];
const CRATERES = [[30, -8, 5], [-36, -2, 4], [2, -36, 3.2], [20, 36, 4.4], [-20, 42, 2.6], [40, 20, 2.4], [-10, -8, 2.2]];
function mers(fill, cx, cy, s) {
  return MERS.map(([dx, dy, rx, ry, a]) => {
    const x = cx + dx * s, y = cy + dy * s;
    return `<ellipse cx="${x}" cy="${y}" rx="${rx * s}" ry="${ry * s}"${a ? ` transform="rotate(${a} ${x} ${y})"` : ""} fill="${fill}"/>`;
  }).join("");
}
function crateres(fonce, clair, cx, cy, s) {
  return CRATERES.map(([dx, dy, r]) => {
    const x = cx + dx * s, y = cy + dy * s, rr = r * s;
    return `<circle cx="${x}" cy="${y}" r="${rr}" fill="${clair}" opacity=".18"/><circle cx="${x + rr * 0.15}" cy="${y - rr * 0.15}" r="${rr * 0.84}" fill="${fonce}" opacity=".34"/>`;
  }).join("");
}
function surfaceLune(p, c, cx = 120, cy = 120, s = 1, fonce = "#000", clair = "#fff") {
  const r = 62 * s;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}-corps)"/>` + mers(`url(#${p}-mer)`, cx, cy, s) +
    crateres(fonce, clair, cx, cy, s) +
    `<circle cx="${cx}" cy="${cy}" r="${r - 0.8}" fill="none" stroke="url(#${p}-limbe)" stroke-width="1.6"/>`;
}

// 0 · Insupportable : la lune de sang
function astre0(p) {
  const c = ["#ffc4a0", "#f0603c", "#a8211c", "#3a0507", "#560a0e", "#ffd2b4"];
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#ff4436", 0.62], [0.36, "#e0283c", 0.26], [0.7, "#9c1030", 0.08], [1, "#6a0820", 0]])}
    ${defsLune(p, c)}
    ${radial(`${p}-brume`, [[0, "#ff5b4a", 0.4], [1, "#ff5b4a", 0]])}
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="119" fill="url(#${p}-halo)"/></g>
  <g>${surfaceLune(p, c, 120, 120, 1, "#3a0406", "#ff9a7a")}</g>
  <g class="a-derive"><ellipse cx="80" cy="166" rx="76" ry="9" fill="url(#${p}-brume)"/><ellipse cx="168" cy="186" rx="62" ry="7" fill="url(#${p}-brume)"/></g>`);
}

// 1 · Très désagréable : la lune d'orage
function astre1(p) {
  const c = ["#f6f8fc", "#c5ccdc", "#7f89a2", "#2f3647", "#4b5369", "#ffffff"];
  const gouttes = [[64, 200], [84, 210], [104, 198], [124, 212], [144, 200], [164, 210], [184, 198], [94, 222], [154, 224]];
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#a9bcdf", 0.42], [0.45, "#6f82aa", 0.15], [1, "#3b4a6e", 0]])}
    ${defsLune(p, c)}
    ${lineaire(`${p}-nuage`, [[0, "#858fa8"], [0.35, "#4d566e"], [1, "#222837"]])}
    ${lineaire(`${p}-nuage2`, [[0, "#6c7690", 0.92], [1, "#2d3446", 0.92]])}
  </defs>
  <g class="a-pulse"><circle cx="120" cy="114" r="112" fill="url(#${p}-halo)"/></g>
  <g>${surfaceLune(p, c, 126, 104, 0.92, "#2a3040")}</g>
  <g class="a-derive-lente">${nuage(26, 66, 78, `fill="url(#${p}-nuage2)"`)}</g>
  <g class="a-pluie" stroke="#b9c7e4" stroke-width="1.7" stroke-linecap="round">${gouttes.map(([x, y], i) => `<line x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 12}" style="animation-delay:${(-i * 0.19).toFixed(2)}s"/>`).join("")}</g>
  <g class="a-derive">${nuage(26, 128, 186, `fill="url(#${p}-nuage)"`)}</g>`);
}

// 2 · Désagréable : le fin croissant, et la lumière cendrée
function astre2(p) {
  const c = ["#ffffff", "#e4eafb", "#a0b2dd", "#41548f", "#8193c4", "#ffffff"];
  const scint = [[46, 64, 7], [192, 54, 4.5], [198, 178, 6], [38, 172, 3.5], [170, 22, 3]];
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#86a9ff", 0.42], [0.45, "#5a78d6", 0.14], [1, "#2a3c88", 0]])}
    ${defsLune(p, c)}
    ${radial(`${p}-term`, [[0, "#000"], [0.87, "#000"], [1, "#fff"]])}
    <mask id="${p}-masque" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
      <circle cx="120" cy="120" r="62.5" fill="#fff"/><circle cx="93" cy="111" r="62" fill="url(#${p}-term)"/>
    </mask>
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="112" fill="url(#${p}-halo)"/></g>
  <g class="a-berce">
    <circle cx="120" cy="120" r="62" fill="#1a2552"/>
    <g opacity=".22">${mers("#2a3a78", 120, 120, 1)}</g>
    <g mask="url(#${p}-masque)">${surfaceLune(p, c, 120, 120, 1, "#3c4d86")}</g>
  </g>
  <g class="a-scintille" fill="#fff">${scint.map(([x, y, s], i) => `<path d="${etoile4(x, y, s)}" style="animation-delay:${(-i * 0.8).toFixed(1)}s"/>`).join("")}</g>`);
}

// 3 · Moyen : la demi-lune
function astre3(p) {
  const c = ["#fffbf2", "#e8e2f7", "#aba3d4", "#4a4384", "#8f86c0", "#ffffff"];
  const scint = [[44, 80, 5], [196, 70, 6.5], [186, 186, 4], [56, 182, 5.5], [120, 24, 3.5]];
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#c4b8ff", 0.5], [0.42, "#8c7de6", 0.18], [1, "#4b3fa0", 0]])}
    ${defsLune(p, c)}
    ${lineaire(`${p}-demi`, [[0, "#000"], [0.46, "#000"], [0.56, "#fff"], [1, "#fff"]], 'x1="0" y1="0" x2="1" y2="0"')}
    <mask id="${p}-masque" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
      <circle cx="120" cy="120" r="62.5" fill="url(#${p}-demi)"/>
    </mask>
    ${radial(`${p}-voile`, [[0, "#ffffff", 0.2], [1, "#ffffff", 0]])}
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="116" fill="url(#${p}-halo)"/></g>
  <g transform="rotate(-16 120 120)">
    <circle cx="120" cy="120" r="62" fill="#252259"/>
    <g opacity=".28">${mers("#36327a", 120, 120, 1)}</g>
    <g mask="url(#${p}-masque)">${surfaceLune(p, c, 120, 120, 1, "#4d4590")}</g>
  </g>
  <g class="a-scintille" fill="#fff">${scint.map(([x, y, s], i) => `<path d="${etoile4(x, y, s)}" style="animation-delay:${(-i * 0.7).toFixed(1)}s"/>`).join("")}</g>
  <g class="a-derive" fill="url(#${p}-voile)"><ellipse cx="94" cy="158" rx="82" ry="7"/><ellipse cx="160" cy="98" rx="58" ry="5"/><ellipse cx="66" cy="112" rx="40" ry="3.5"/></g>`);
}

// 4 · Neutre : l'aube, entre la nuit et le jour
function astre4(p) {
  const reflets = [[160, 100, 3.2], [168, 78, 2.8], [176, 58, 2.4], [184, 40, 2], [192, 24, 1.6], [200, 12, 1.4]];
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#ffc6a3", 0.8], [0.34, "#ff9f8f", 0.34], [0.7, "#c97aa8", 0.08], [1, "#8a5aa0", 0]])}
    ${radial(`${p}-soleil`, [[0, "#fff9f0"], [0.42, "#ffdcc2"], [0.8, "#ffae95"], [1, "#f28a8c"]], 'cx="50%" cy="76%" r="64%"')}
    <clipPath id="${p}-horizon"><rect x="0" y="0" width="240" height="150"/></clipPath>
    ${lineaire(`${p}-ligne`, [[0, "#ffe2cf", 0], [0.5, "#fff0e4", 1], [1, "#ffe2cf", 0]], 'x1="0" y1="0" x2="1" y2="0"')}
    ${lineaire(`${p}-reflet`, [[0, "#ffcfb6", 0], [0.5, "#ffdcc8", 0.9], [1, "#ffcfb6", 0]], 'x1="0" y1="0" x2="1" y2="0"')}
    ${radial(`${p}-lune`, [[0, "#ffffff"], [1, "#d9d6f0"]], 'fx="70%" fy="30%"')}
    <mask id="${p}-croiss" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240"><circle cx="64" cy="64" r="13" fill="#fff"/><circle cx="58" cy="60" r="12.5" fill="#000"/></mask>
  </defs>
  <g class="a-pulse"><circle cx="120" cy="142" r="118" fill="url(#${p}-halo)"/></g>
  <g class="a-scintille" fill="#fff"><path d="${etoile4(186, 46, 4)}"/><path d="${etoile4(34, 112, 3)}" style="animation-delay:-1.2s"/></g>
  <circle cx="64" cy="64" r="13" fill="url(#${p}-lune)" mask="url(#${p}-croiss)" opacity=".75"/>
  <g clip-path="url(#${p}-horizon)"><g class="a-leve"><circle cx="120" cy="153" r="58" fill="url(#${p}-soleil)"/></g></g>
  <rect x="6" y="149.2" width="228" height="1.6" rx=".8" fill="url(#${p}-ligne)"/>
  <g class="a-reflets">${reflets.map(([y, l, h], i) => `<rect x="${120 - l / 2}" y="${y}" width="${l}" height="${h}" rx="${h / 2}" fill="url(#${p}-reflet)" style="animation-delay:${(-i * 0.45).toFixed(2)}s"/>`).join("")}</g>`);
}

/* ---------- Soleils ---------- */

// 5 · Sympathique : un soleil doux, un petit nuage
function astre5(p) {
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#fff2bf", 0.9], [0.38, "#ffe08a", 0.4], [0.74, "#ffd27a", 0.1], [1, "#ffd27a", 0]])}
    ${radial(`${p}-soleil`, [[0, "#fffef6"], [0.5, "#fff1b8"], [0.86, "#ffd978"], [1, "#f9c25a"]], 'cx="50%" cy="50%" r="50%" fx="62%" fy="36%"')}
    ${lineaire(`${p}-nuage`, [[0, "#ffffff"], [1, "#e2ecfb"]])}
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="118" fill="url(#${p}-halo)"/></g>
  <circle class="a-pulse-lent" cx="120" cy="120" r="74" fill="none" stroke="#fff6d2" stroke-opacity=".5" stroke-width="10"/>
  <circle cx="120" cy="120" r="88" fill="none" stroke="#fff6d2" stroke-opacity=".22" stroke-width="5"/>
  <circle cx="120" cy="120" r="54" fill="url(#${p}-soleil)"/>
  <ellipse cx="136" cy="98" rx="15" ry="9" transform="rotate(-32 136 98)" fill="#fff" opacity=".45"/>
  <g class="a-derive">${nuage(116, 143, 104, 'fill="#7f9dc9" opacity=".22"')}${nuage(113, 139, 104, `fill="url(#${p}-nuage)"`)}</g>`);
}

// 6 · Belle : le beau soleil
function astre6(p) {
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#ffe27a", 0.85], [0.4, "#ffd166", 0.38], [0.75, "#ffc247", 0.1], [1, "#ffc247", 0]])}
    ${radial(`${p}-soleil`, [[0, "#fffef4"], [0.45, "#fff0a0"], [0.82, "#ffd23f"], [1, "#ffb300"]], 'cx="50%" cy="50%" r="50%" fx="62%" fy="36%"')}
    ${lineaire(`${p}-rayon`, [[0, "#ffe88f"], [1, "#ffbe2e"]])}
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="118" fill="url(#${p}-halo)"/></g>
  <g class="a-tourne" fill="url(#${p}-rayon)">${repete(12, (i) => `<rect x="115.5" y="28" width="9" height="24" rx="4.5" transform="rotate(${i * 30} 120 120)"/>`)}</g>
  <circle cx="120" cy="120" r="52" fill="url(#${p}-soleil)"/>
  <ellipse cx="136" cy="99" rx="14" ry="8.5" transform="rotate(-32 136 99)" fill="#fff" opacity=".42"/>`);
}

// 7 · Superbe : le grand soleil doré
function astre7(p) {
  return svgAstre(`<defs>
    ${radial(`${p}-halo`, [[0, "#ffc25c", 0.9], [0.4, "#ffae42", 0.42], [0.75, "#ff9a3c", 0.12], [1, "#ff9a3c", 0]])}
    ${radial(`${p}-soleil`, [[0, "#fffbe8"], [0.42, "#ffe07a"], [0.8, "#ffb02e"], [1, "#f78c1a"]], 'cx="50%" cy="50%" r="50%" fx="62%" fy="36%"')}
    <radialGradient id="${p}-rayon" gradientUnits="userSpaceOnUse" cx="120" cy="120" r="114">${arrets([[0.5, "#fff3c0", 0.95], [0.72, "#ffd27a", 0.8], [1, "#ffb347", 0]])}</radialGradient>
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="119" fill="url(#${p}-halo)"/></g>
  <g class="a-tourne" fill="url(#${p}-rayon)">
    ${repete(16, (i) => `<path d="M114.5 60L120 6L125.5 60Z" transform="rotate(${i * 22.5} 120 120)"/>`)}
    ${repete(16, (i) => `<path d="M116.5 60L120 32L123.5 60Z" transform="rotate(${i * 22.5 + 11.25} 120 120)"/>`)}
  </g>
  <circle cx="120" cy="120" r="60" fill="none" stroke="#fff2c2" stroke-opacity=".55" stroke-width="1.2"/>
  <circle cx="120" cy="120" r="50" fill="url(#${p}-soleil)"/>
  <ellipse cx="134" cy="101" rx="13" ry="8" transform="rotate(-32 134 101)" fill="#fff" opacity=".4"/>`);
}

// 8 · Incroyable : le soleil ultra rayonnant
function astre8(p) {
  const scint = [[40, 64, 9], [198, 50, 7], [208, 150, 10], [32, 178, 6], [152, 216, 7], [90, 22, 5]];
  return svgAstre(`<defs>
    ${radial(`${p}-couronne`, [[0, "#fffbe6", 1], [0.3, "#ffe39a", 0.78], [0.56, "#ffc247", 0.3], [1, "#ffa500", 0]])}
    ${radial(`${p}-coeur`, [[0, "#ffffff"], [0.45, "#fffbe3"], [0.78, "#ffe066"], [1, "#ffa600"]])}
    ${radial(`${p}-eclat`, [[0, "#ffffff", 0.95], [0.6, "#ffffff", 0.35], [1, "#ffffff", 0]])}
    <radialGradient id="${p}-rayon" gradientUnits="userSpaceOnUse" cx="120" cy="120" r="118">${arrets([[0.45, "#ffffff", 0.98], [0.7, "#ffe9a0", 0.85], [1, "#ffc247", 0]])}</radialGradient>
    <radialGradient id="${p}-large" gradientUnits="userSpaceOnUse" cx="120" cy="120" r="116">${arrets([[0.4, "#fff1b8", 0.5], [1, "#ffb703", 0]])}</radialGradient>
  </defs>
  <g class="a-pulse"><circle cx="120" cy="120" r="119" fill="url(#${p}-couronne)"/></g>
  <circle cx="120" cy="120" r="101" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="5"/>
  <circle cx="120" cy="120" r="106" fill="none" stroke="#ffd0a0" stroke-opacity=".16" stroke-width="2"/>
  <g class="a-tourne-inverse" fill="url(#${p}-large)">${repete(12, (i) => `<path d="M107 62L120 12L133 62Z" transform="rotate(${i * 30 + 7.5} 120 120)"/>`)}</g>
  <g class="a-tourne" fill="url(#${p}-rayon)">${repete(24, (i) => i % 2
    ? `<path d="M118 62L120 30L122 62Z" transform="rotate(${i * 15} 120 120)"/>`
    : `<path d="M116.8 62L120 2L123.2 62Z" transform="rotate(${i * 15} 120 120)"/>`)}</g>
  <g class="a-respire"><circle cx="120" cy="120" r="47" fill="url(#${p}-coeur)"/><circle cx="120" cy="120" r="40" fill="url(#${p}-eclat)"/></g>
  <g fill="#fff"><circle cx="86" cy="154" r="7" opacity=".22"/><circle cx="66" cy="174" r="12" fill="#ffe9a8" opacity=".14"/><circle cx="49" cy="191" r="4" opacity=".32"/></g>
  <g class="a-scintille" fill="#fff">${scint.map(([x, y, s], i) => `<path d="${etoile4(x, y, s)}" style="animation-delay:${(-i * 0.55).toFixed(2)}s"/>`).join("")}</g>`);
}

const ASTRES = [astre0, astre1, astre2, astre3, astre4, astre5, astre6, astre7, astre8];
const dessinAstre = (i, prefixe = "a" + i) => ASTRES[i](prefixe);

/* ---------- Médaillons : petites vignettes de ciel (calendrier, listes, bilan) ---------- */

function spriteMedaillons() {
  const r = (id, stops, a = "") => radial(id, stops, a);
  const l = (id, stops, a) => lineaire(id, stops, a);
  const rond = (fill) => `<circle cx="32" cy="32" r="32" fill="${fill}"/>`;
  const rayons = (n, d, w, len, r0) => repete(n, (i) => `<rect x="${32 - w / 2}" y="${32 - r0 - len}" width="${w}" height="${len}" rx="${w / 2}" transform="rotate(${i * (360 / n) + d} 32 32)"/>`);
  const pointes = (n, d, w, r1, r0) => repete(n, (i) => `<path d="M${32 - w / 2} ${32 - r0}L32 ${32 - r1}L${32 + w / 2} ${32 - r0}Z" transform="rotate(${i * (360 / n) + d} 32 32)"/>`);
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
  ${r("mc0", [[0, "#4a0b14"], [1, "#12030a"]])}${r("ml0", [[0, "#ffc09a"], [0.4, "#e0472f"], [1, "#5e0b0e"]], 'fx="70%" fy="28%"')}${r("mh0", [[0.45, "#ff3b30", 0.55], [1, "#ff3b30", 0]])}
  ${r("mc1", [[0, "#323a52"], [1, "#10141f"]])}${r("ml1", [[0, "#f4f6fb"], [0.5, "#b9c1d4"], [1, "#5d6680"]], 'fx="70%" fy="28%"')}${l("mn1", [[0, "#7a84a0"], [1, "#2a3042"]])}
  ${r("mc2", [[0, "#233a82"], [1, "#070d26"]])}${r("ml2", [[0, "#ffffff"], [0.5, "#dde5fa"], [1, "#8ea2d4"]], 'fx="70%" fy="28%"')}
  ${r("mc3", [[0, "#463f93"], [1, "#12123a"]])}${r("ml3", [[0, "#fffbf2"], [0.55, "#e3dcf6"], [1, "#a39bcf"]], 'fx="70%" fy="28%"')}
  ${l("mc4", [[0, "#2a2c6a"], [0.55, "#8a6aa0"], [1, "#f0a58f"]])}${r("ms4", [[0, "#fff6ea"], [0.6, "#ffcdb0"], [1, "#f4938c"]], 'cy="80%" r="70%"')}
  ${l("mc5", [[0, "#8fc0ee"], [1, "#fde4c4"]])}${r("ms5", [[0, "#fffdf2"], [0.6, "#ffeaa0"], [1, "#fcc85a"]], 'fx="62%" fy="36%"')}
  ${l("mc6", [[0, "#3f8fe0"], [1, "#bfe0ff"]])}${r("ms6", [[0, "#fffef2"], [0.55, "#ffe16a"], [1, "#ffb300"]], 'fx="62%" fy="36%"')}
  ${l("mc7", [[0, "#c24d73"], [0.55, "#f7955e"], [1, "#ffd59a"]])}${r("ms7", [[0, "#fffbe8"], [0.5, "#ffd560"], [1, "#f78c1a"]], 'fx="62%" fy="36%"')}
  ${l("mc8", [[0, "#f08a00"], [1, "#ffe27a"]])}${r("ms8", [[0, "#ffffff"], [0.5, "#fff3b0"], [1, "#ffa600"]])}${r("mh8", [[0.3, "#fff6cf", 0.95], [1, "#fff6cf", 0]])}
  <mask id="mm2" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><circle cx="32" cy="32" r="16.5" fill="#fff"/><circle cx="25" cy="29.5" r="16" fill="#000"/></mask>
  <clipPath id="mk3"><rect x="32" y="0" width="32" height="64"/></clipPath>
  <clipPath id="mk4"><rect x="0" y="0" width="64" height="39"/></clipPath>
  </defs>
  <symbol id="m0" viewBox="0 0 64 64">${rond("url(#mc0)")}<circle cx="32" cy="32" r="25" fill="url(#mh0)"/><circle cx="32" cy="32" r="16" fill="url(#ml0)"/><ellipse cx="28" cy="27" rx="6" ry="4" fill="#5a0a0e" opacity=".35"/><ellipse cx="35" cy="37" rx="7" ry="4.5" fill="#5a0a0e" opacity=".32"/></symbol>
  <symbol id="m1" viewBox="0 0 64 64">${rond("url(#mc1)")}<circle cx="35" cy="27" r="14" fill="url(#ml1)"/><path transform="translate(8 33) scale(.44)" d="${NUAGE}" fill="url(#mn1)"/><g stroke="#b9c7e4" stroke-width="1.8" stroke-linecap="round" opacity=".75"><path d="M22 54l-2 4M31 55l-2 4M40 54l-2 4"/></g></symbol>
  <symbol id="m2" viewBox="0 0 64 64">${rond("url(#mc2)")}<circle cx="32" cy="32" r="16" fill="#1c2756"/><circle cx="32" cy="32" r="16" fill="url(#ml2)" mask="url(#mm2)"/><path d="${etoile4(16, 17, 3)}" fill="#fff" opacity=".85"/><path d="${etoile4(50, 48, 2.2)}" fill="#fff" opacity=".7"/></symbol>
  <symbol id="m3" viewBox="0 0 64 64">${rond("url(#mc3)")}<g transform="rotate(-16 32 32)"><circle cx="32" cy="32" r="16" fill="#28245d"/><circle cx="32" cy="32" r="16" fill="url(#ml3)" clip-path="url(#mk3)"/></g><path d="${etoile4(15, 46, 2.6)}" fill="#fff" opacity=".8"/></symbol>
  <symbol id="m4" viewBox="0 0 64 64">${rond("url(#mc4)")}<circle cx="32" cy="40" r="14" fill="url(#ms4)" clip-path="url(#mk4)"/><rect x="10" y="38.6" width="44" height="1.2" rx=".6" fill="#ffe6d6"/><g fill="#ffd9c4" opacity=".75"><rect x="22" y="43" width="20" height="1.6" rx=".8"/><rect x="26" y="47" width="12" height="1.4" rx=".7"/><rect x="29" y="51" width="6" height="1.2" rx=".6"/></g></symbol>
  <symbol id="m5" viewBox="0 0 64 64">${rond("url(#mc5)")}<g fill="#fff4c4" opacity=".8">${pointes(8, 0, 6, 25, 15)}</g><circle cx="30" cy="30" r="13" fill="url(#ms5)"/><path transform="translate(29 36) scale(.3)" d="${NUAGE}" fill="#fff"/></symbol>
  <symbol id="m6" viewBox="0 0 64 64">${rond("url(#mc6)")}<g fill="#ffd23f">${rayons(10, 0, 3.4, 6.5, 15.5)}</g><circle cx="32" cy="32" r="12" fill="url(#ms6)"/></symbol>
  <symbol id="m7" viewBox="0 0 64 64">${rond("url(#mc7)")}<g fill="#fff1bf">${pointes(12, 0, 4.2, 27, 13)}</g><circle cx="32" cy="32" r="11" fill="url(#ms7)"/></symbol>
  <symbol id="m8" viewBox="0 0 64 64">${rond("url(#mc8)")}<circle cx="32" cy="32" r="30" fill="url(#mh8)"/><g fill="#fff">${pointes(16, 0, 3.2, 29, 12)}</g><g fill="#fff7d6" opacity=".9">${pointes(16, 11.25, 2.4, 21, 12)}</g><circle cx="32" cy="32" r="10.5" fill="url(#ms8)"/><path d="${etoile4(51, 14, 3.4)}" fill="#fff"/><path d="${etoile4(13, 49, 2.6)}" fill="#fff"/></symbol>
  </svg>`;
}

// Un médaillon prêt à poser dans la page
const medaillon = (i, classe = "medaillon") => `<svg class="${classe}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="#m${i}"/></svg>`;
