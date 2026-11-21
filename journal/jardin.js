"use strict";

/* =========================================================
   Le jardin intérieur : une pousse sous un dôme d'énergie.
   La pousse grandit à chaque pensée encapsulée (son âge est
   le nombre de pensées). Sa forme est fixée par une graine :
   elle se révèle peu à peu, sans jamais changer d'allure.
   Tout est dessiné en SVG. La lumière vient du dôme et du
   haut à droite, comme pour les astres.
   ========================================================= */

const JARDIN = (() => {
  const W = 360, H = 300;
  const CX = 180, SOL = 206, RX = 140, RY = 178, BRY = 19;   // le dôme et sa base (vue en perspective)
  const HAUT = -Math.PI / 2, PAS = 3;
  const f = (n) => String(Math.round(n * 10) / 10);
  // Phase d'une animation CSS d'après l'horloge : redessiner un élément ne le fait pas sauter
  const phase = (periode, decalage = 0) => f(-((performance.now() / 1000 + decalage) % periode));
  let dLueur = "0";
  const lim = (v, a, b) => Math.min(b, Math.max(a, v));
  const lisse = (a, b, x) => { const t = lim((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hsl = (h, s, l, a = 1) => a < 1 ? `hsla(${f(h)},${f(s)}%,${f(l)}%,${a})` : `hsl(${f(h)},${f(s)}%,${f(l)}%)`;
  const melange = (a, b, t) => "#" + [1, 3, 5].map((i) => {
    const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  }).join("");

  // Hasard reproductible : la même graine donne toujours le même arbre
  function hasard(graine) {
    let s = graine >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dansDome = (x, y, m) => ((x - CX) / (RX - m)) ** 2 + (Math.min(0, y - SOL) / (RY - m)) ** 2 < 1;
  // Jeune, la pousse est dessinée un peu plus grande (on la voit mieux), puis l'échelle revient à 1
  const PIED = SOL + 6;
  const echelle = (A) => 1 + 0.55 * Math.max(0, 1 - A / 60) ** 2;

  // Ligne médiane d'une tige : un point tous les PAS, avec sa direction
  function ligne(x, y, angle, longueur) {
    const pts = [{ x, y, a: angle(0) }];
    for (let s = PAS; s <= longueur + 1e-6; s += PAS) {
      const a = angle(s - PAS / 2);
      x += Math.cos(a) * PAS; y += Math.sin(a) * PAS;
      pts.push({ x, y, a: angle(s) });
    }
    return pts;
  }
  function point(pts, s) {
    const i = lim(Math.floor(s / PAS), 0, pts.length - 2);
    const t = lim(s / PAS - i, 0, 1), a = pts[i], b = pts[i + 1] || a;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, a: a.a + (b.a - a.a) * t };
  }
  // Jusqu'où la tige reste sous le dôme (avec une marge pour ses feuilles)
  function coupe(pts, m, e = 1) {
    for (let i = 0; i < pts.length; i++) {
      if (!dansDome(CX + (pts[i].x - CX) * e, PIED + (pts[i].y - PIED) * e, m)) return Math.max(0, (i - 1) * PAS);
    }
    return (pts.length - 1) * PAS;
  }

  /* ---------- La forme de l'arbre, une fois pour toutes ---------- */

  const P = (() => {
    const r = hasard(1121);
    const entre = (a, b) => a + (b - a) * r();
    const toutes = [];
    const branche = (o) => { o.enfants = []; o.feuilles = []; toutes.push(o); return o; };

    const ph = entre(0, 6);
    const tronc = branche({
      niveau: 0, naissance: 0, sA: 0, parent: null,
      pts: ligne(CX, SOL + 6, (s) => HAUT + 0.085 * Math.sin(s / 44 + 0.7) + 0.04 * Math.sin(s / 13 + ph), 190),
    });
    tronc.longMax = Math.min(186, coupe(tronc.pts, 30));

    // Branches maîtresses : position sur le tronc, côté, naissance (en pensées), longueur, écart, courbure, durée de pousse
    const MAITRESSES = [
      [36, 1, 6, 98, 66, 0.42, 30], [48, -1, 9, 104, 68, 0.4, 32], [61, 1, 13, 98, 62, 0.4, 34],
      [75, -1, 19, 90, 58, 0.38, 36], [89, 1, 26, 80, 52, 0.36, 36], [102, -1, 34, 66, 46, 0.34, 36],
      [115, 1, 44, 52, 40, 0.3, 34], [127, -1, 56, 40, 34, 0.28, 32],
    ];
    for (const [sA, cote, naissance, long, ecart, courbe, duree] of MAITRESSES) {
      if (sA > tronc.longMax - 12) continue;
      const p0 = point(tronc.pts, sA);
      const a0 = p0.a + cote * ecart * Math.PI / 180, phb = entre(0, 6);
      const pts = ligne(p0.x, p0.y, (s) => a0 + (HAUT - a0) * courbe * (s / long) ** 1.3 + 0.07 * Math.sin(s / 9 + phb), long);
      const b = branche({ niveau: 1, parent: tronc, sA, naissance, duree, pts });
      b.longMax = Math.min(long, coupe(pts, 20, echelle(naissance + duree * 0.7)));
      tronc.enfants.push(b);
      // Deux rameaux par branche, qui évitent de pointer vers le sol
      for (const [k, dn, fl, c] of [[0.4, 10, 0.42, -1], [0.62, 16, 0.36, 1], [0.82, 23, 0.26, -1]]) {
        if (b.longMax < 30) break;
        const sB = b.longMax * k, q = point(pts, sB);
        let c2 = c * cote, a1 = q.a + c2 * 0.72;
        if (Math.sin(a1) > 0.25) { c2 = -c2; a1 = q.a + c2 * 0.72; }
        const lg = b.longMax * fl, ph2 = entre(0, 6);
        const pts2 = ligne(q.x, q.y, (s) => a1 + (HAUT - a1) * 0.35 * (s / lg) + 0.08 * Math.sin(s / 7 + ph2), lg);
        const e = branche({ niveau: 2, parent: b, sA: sB, naissance: naissance + dn, duree: 26, pts: pts2 });
        e.longMax = Math.min(lg, coupe(pts2, 16, echelle(naissance + dn + 18)));
        if (e.longMax > 6) b.enfants.push(e); else toutes.pop();
      }
    }

    // Les feuilles, alternées le long de chaque tige
    for (const b of toutes) {
      const [ecartF, debut, taille] = b.niveau === 0 ? [9, 22, 18] : b.niveau === 1 ? [8.2, 6, 16.5] : [7.2, 4, 13.5];
      let cote = r() < 0.5 ? 1 : -1;
      for (let s = debut; s < b.longMax - 1; s += ecartF * entre(0.88, 1.12)) {
        b.feuilles.push({ s, cote, long: taille * entre(0.84, 1.14), ecart: entre(46, 64), dh: entre(-6, 6), dl: entre(-4, 4) });
        cote = -cote;
      }
    }

    // Fleurs et fruits de lumière : ils viennent plus tard, un toutes les 2 ou 3 pensées
    const places = [];
    for (const b of toutes) if (b.niveau > 0) for (const fe of b.feuilles) if (fe.s > b.longMax * 0.3) places.push({ b, fe });
    for (let i = places.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [places[i], places[j]] = [places[j], places[i]]; }
    const ornements = places.slice(0, 110).map((p, k) => {
      const naissance = 32 + k * 3.1;
      return { ...p, naissance, type: naissance > 62 && r() < 0.4 ? "fruit" : "fleur", taille: entre(0.62, 0.9), rot: entre(0, 72) };
    });

    // Le tapis de mousse : fleurettes et champignons lumineux, dès la première pensée
    const fleursSol = [];
    for (let k = 0; k < 18; k++) {
      let x, y;
      do {
        const t = entre(0, Math.PI * 2), rr = Math.sqrt(entre(0.1, 1));
        x = CX + Math.cos(t) * 152 * rr; y = SOL + 6 + Math.sin(t) * 22 * rr;
      } while (Math.abs(x - CX) < 22 && Math.abs(y - SOL - 6) < 10);
      fleursSol.push({ x, y, naissance: 1 + k * 3, type: k % 5 === 3 ? "champi" : k % 2 ? "bleue" : "blanche", t: entre(0.85, 1.2) });
    }
    const herbes = [];
    for (let k = 0; k < 46; k++) {
      const t = entre(0, Math.PI * 2), rr = entre(0.5, 1);
      herbes.push({ x: CX + Math.cos(t) * 160 * rr, y: SOL + 6 + Math.sin(t) * 26 * rr, h: entre(5, 11), n: 2 + Math.floor(r() * 3), seuil: k < 20 ? -1 : (k - 20) * 2.4, inc: entre(-0.35, 0.35) });
    }
    const lucioles = [];
    while (lucioles.length < 14) {
      const x = CX + entre(-110, 110), y = SOL - entre(24, 150);
      if (dansDome(x, y, 26)) lucioles.push({ x, y, dx: entre(-14, 14), dy: entre(6, 14), d: entre(7, 13), del: entre(0, 9), seuil: lucioles.length * 8 - 2 });
    }
    return { tronc, toutes, ornements, fleursSol, herbes, lucioles };
  })();

  /* ---------- Croissance ---------- */

  function longueur(b, A, Lp) {
    if (b.niveau === 0) return Math.min(b.longMax, 46 + 116 * (1 - Math.exp(-A / 30)));
    if (A <= b.naissance || Lp < b.sA + 3) return 0;
    const t = lim((A - b.naissance) / b.duree, 0, 1);
    return b.longMax * (1 - (1 - t) ** 2.2);
  }
  // Âge auquel une tige a fini de pousser (ses dernières feuilles mûrissent ensuite)
  function finPousse(b) {
    if (b.niveau > 0) return b.naissance + b.duree * 0.8;
    const q = (b.longMax - 46) / 116;
    return q >= 1 ? Infinity : -30 * Math.log(1 - q);
  }
  const largeur = (wb, s, L) => { const t = L > 0 ? lim(s / L, 0, 1) : 1; return Math.max(0.9, wb * (1 - t) ** 0.75 + 0.9 * t); };

  /* ---------- Dessin ---------- */

  function lisser(pts, debut) {
    let d = `${debut ? "M" : "L"}${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
    }
    const z = pts[pts.length - 1];
    return d + `L${f(z[0])} ${f(z[1])}`;
  }

  // Une tige effilée, plus claire du côté de la lumière
  function tige(b, L, wb, A, id) {
    const n = Math.max(2, Math.ceil(L / PAS));
    const g = [], d = [], reflet = [];
    for (let i = 0; i <= n; i++) {
      const s = (L * i) / n, p = point(b.pts, s);
      let w = largeur(wb, s, L);
      if (b.niveau === 0) w *= 1 + 0.7 * Math.exp(-s / 5) * lisse(8, 60, A);   // le pied s'évase
      const nx = Math.sin(p.a), ny = -Math.cos(p.a);
      g.push([p.x + nx * w / 2, p.y + ny * w / 2]);
      d.push([p.x - nx * w / 2, p.y - ny * w / 2]);
      reflet.push([p.x - nx * w * 0.2, p.y - ny * w * 0.2]);
    }
    const bout = point(b.pts, L), wb2 = largeur(wb, L, L);
    const pointe = `Q${f(bout.x + Math.cos(bout.a) * wb2 * 0.9)} ${f(bout.y + Math.sin(bout.a) * wb2 * 0.9)} ${f(d[n][0])} ${f(d[n][1])}`;
    const bois = b.niveau === 0 ? lisse(12, 80, A) : b.niveau === 1 ? 0.6 * lisse(34, 120, A) : 0;
    const base = melange("#3d9a48", "#6a4932", bois), milieu = melange("#56b653", "#7b6a3e", bois * 0.7);
    const p0 = b.pts[0];
    let s = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(p0.x)}" y1="${f(p0.y)}" x2="${f(bout.x)}" y2="${f(bout.y)}">` +
      `<stop offset="0" stop-color="${base}"/><stop offset=".55" stop-color="${milieu}"/><stop offset="1" stop-color="#9de86f"/></linearGradient>`;
    s += `<path d="${lisser(g, true)}${pointe}${lisser(d.reverse(), false)}Z" fill="url(#${id})"/>`;
    if (wb > 1.7) s += `<path d="${lisser(reflet.slice(0, Math.max(2, n - 1)), true)}" fill="none" stroke="${bois > 0.4 ? "#e8c99b" : "#e9ffc4"}" stroke-opacity="${bois > 0.4 ? 0.3 : 0.42}" stroke-width="${f(Math.max(0.5, wb * 0.22))}" stroke-linecap="round"/>`;
    return s;
  }

  // Une feuille en deux moitiés : la plus claire regarde le ciel
  function feuille(x, y, a, long, m, fe) {
    const h1 = 86 + 26 * m + fe.dh, h2 = 94 + 40 * m + fe.dh;
    const clair = hsl(h1, 74 - 14 * m, 64 - 11 * m + fe.dl), fonce = hsl(h2, 62 - 4 * m, 45 - 13 * m + fe.dl * 0.6);
    const haut = Math.cos(a) > 0;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a * 180 / Math.PI)}) scale(${(long / 20).toFixed(3)})">` +
      `<path d="M0 0C3.6-6.2 12-7.4 20 0Z" fill="${haut ? clair : fonce}"/><path d="M0 0C4.6 5.4 13.4 5.8 20 0Z" fill="${haut ? fonce : clair}"/>` +
      `<path d="M.8 0Q10-.4 18.6 0" fill="none" stroke="${hsl(80, 80, 84)}" stroke-opacity=".45" stroke-width=".6"/></g>`;
  }
  const cotyledon = (x, y, a, k, miroir) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a * 180 / Math.PI)}) scale(${k.toFixed(3)} ${(miroir ? -k : k).toFixed(3)})">` +
    `<path d="M0 0C1.5-5.6 8.6-7.6 13.4-4.2C16.4-2 15.6 1.4 12 2.6Z" fill="${hsl(92, 66, 58)}"/><path d="M0 0C3 2.8 8 4 12 2.6C14 2 15.6 .6 15.2-1.6C13 1 6 2 0 0Z" fill="${hsl(104, 56, 38)}"/></g>`;

  const fleur = (x, y, k, rot) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${k.toFixed(3)})"><circle r="6.5" fill="url(#j-aura-fleur)"/>` +
    [0, 72, 144, 216, 288].map((r) => `<ellipse cy="-2.5" rx="1.8" ry="2.7" transform="rotate(${r})" fill="url(#j-petale)"/>`).join("") +
    `<circle r="1.2" fill="#ffd56b"/></g>`;
  const fruit = (x, y, k) => `<g transform="translate(${f(x)} ${f(y)}) scale(${k.toFixed(3)})"><path d="M0 0Q.8 2.4 0 4.6" fill="none" stroke="#cfeab0" stroke-opacity=".7" stroke-width=".55"/>` +
    `<circle cy="7.4" r="9.5" fill="url(#j-aura-fruit)" class="j-lueur" style="animation-delay:${dLueur}s"/><circle cy="7.4" r="2.9" fill="url(#j-fruit)"/><circle cx="-.8" cy="6.5" r=".8" fill="#fff" opacity=".85"/></g>`;

  // La plante entière à l'âge A
  function plante(A) {
    let defs = "", corps = "", fleurs = "", bourgeons = "";
    const t0 = performance.now() / 1000;
    dLueur = phase(6);
    let k = 0;
    const longueurs = new Map();
    function dessiner(b, Lp, wParent) {
      const L = longueur(b, A, Lp);
      longueurs.set(b, L);
      if (L < 1.2) return "";
      const id = `j-t${k++}`;
      const wb = b.niveau === 0 ? 2.8 + 9.4 * (1 - Math.exp(-A / 55))
        : Math.min(wParent * 0.7, (b.niveau === 1 ? 1.1 + 4.3 : 0.9 + 2.2) * Math.sqrt(L / b.longMax));
      let s = "";
      // Cotylédons du début, qui tombent quand l'arbre prend forme
      if (b.niveau === 0) {
        const kc = 1 - lisse(6, 14, A);
        if (kc > 0.02) {
          const p = point(b.pts, 11);
          s += cotyledon(p.x, p.y, p.a - 1.02, kc * 0.98, true) + cotyledon(p.x, p.y, p.a + 1.02, kc * 0.98, false);
        }
      }
      s += tige(b, L, wb, A, id);
      for (const e of b.enfants) s += dessiner(e, L, largeur(wb, e.sA, L));
      // Feuilles
      const fin = L >= b.longMax - 0.5 ? lim((A - finPousse(b)) / 10, 0, 1) : 0;
      const nu = b.niveau === 0 ? L * 0.42 * lisse(20, 70, A) : b.niveau === 1 ? b.longMax * 0.22 * lisse(50, 130, A) : 0;
      for (const fe of b.feuilles) {
        if (L < fe.s + 0.8) break;
        const tombe = nu > 0 ? lisse(nu - 7, nu + 5, fe.s) : 1;
        if (tombe < 0.03) continue;
        const m = Math.max(lim((L - fe.s) / 13, 0, 1), fin);
        const p = point(b.pts, fe.s);
        const ecart = (18 + (fe.ecart - 18) * m) * Math.PI / 180;
        let a = p.a + fe.cote * ecart;
        // Les feuilles mûres s'inclinent un peu sous leur poids
        const vx = Math.cos(a), vy = Math.sin(a) + 0.14 * m, nn = Math.hypot(vx, vy);
        a = Math.atan2(vy / nn, vx / nn);
        const long = fe.long * (0.18 + 0.82 * m ** 0.8) * tombe;
        s += feuille(p.x + Math.cos(a) * 0.8, p.y + Math.sin(a) * 0.8, a, long, m, fe);
      }
      // Bourgeon lumineux au bout des tiges qui poussent encore
      if (L < b.longMax - 0.4) {
        const p = point(b.pts, L);
        const g = b.niveau === 0 ? 1 : 0.7;
        bourgeons += `<g transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a * 180 / Math.PI)}) scale(${g})"${b.niveau === 0 ? ' class="j-bourgeon"' : ""}><circle r="7" fill="url(#j-aura-bourgeon)" style="animation-delay:${dLueur}s"/><ellipse cx="1.4" rx="3.1" ry="1.6" fill="#dcffa6"/></g>`;
      }
      // Chaque branche se balance autour de son attache
      if (b.niveau > 0) {
        const p0 = b.pts[0], dur = 5 + (k % 5) * 0.9;
        return `<g class="j-balance" style="transform-origin:${f(p0.x)}px ${f(p0.y)}px;animation-duration:${f(dur)}s;animation-delay:${f(-(t0 + k * 1.7) % (dur * 2))}s">${s}</g>`;
      }
      return s;
    }
    corps = dessiner(P.tronc, Infinity, 99);
    for (const o of P.ornements) {
      if (o.naissance > A) break;
      const L = longueurs.get(o.b) || 0;
      if (L < o.fe.s + 2) continue;
      const k2 = lisse(o.naissance, o.naissance + 2.2, A + 0.6) * o.taille;
      if (k2 < 0.04) continue;
      const p = point(o.b.pts, o.fe.s), a = p.a + o.fe.cote * 0.5;
      fleurs += o.type === "fleur" ? fleur(p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3, k2, o.rot) : fruit(p.x, p.y + 1, k2);
    }
    const sommet = point(P.tronc.pts, longueurs.get(P.tronc));
    const hauteur = SOL + 6 - sommet.y;
    const lueur = `<ellipse cx="${CX}" cy="${f(SOL - hauteur * 0.55)}" rx="${f(36 + hauteur * 0.62)}" ry="${f(30 + hauteur * 0.66)}" fill="url(#j-aura-plante)"/>`;
    const e = echelle(A);
    const zoom = e > 1.001 ? ` transform="translate(${CX} ${PIED}) scale(${e.toFixed(4)}) translate(${-CX} ${-PIED})"` : "";
    return `<defs>${defs}</defs><g${zoom}>${lueur}<g class="j-balance j-tronc" style="transform-origin:${CX}px ${PIED}px;animation-delay:${f(-(t0 % 18))}s">${corps}${fleurs}${bourgeons}</g></g>`;
  }

  /* ---------- Le sol : mousse, herbes, fleurettes ---------- */

  const dansBase = (x, y) => ((x - CX) / RX) ** 2 + ((y - SOL) / BRY) ** 2 < 1;
  function brin(x, y, h, inc) {
    const tx = x + inc * h;
    return `M${f(x - 0.9)} ${f(y)}Q${f(x + inc * h * 0.45)} ${f(y - h * 0.55)} ${f(tx)} ${f(y - h)}Q${f(x + inc * h * 0.45 + 0.5)} ${f(y - h * 0.5)} ${f(x + 0.9)} ${f(y)}Z`;
  }
  function sol(A) {
    dLueur = phase(6);
    const couches = { derriere: "", dedans: "", devant: "" };
    const ou = (x, y) => (dansBase(x, y) ? "dedans" : y > SOL ? "devant" : "derriere");
    for (const h of P.herbes) {
      if (h.seuil > A) continue;
      const k = h.seuil < 0 ? 1 : lisse(h.seuil, h.seuil + 2, A + 0.5);
      let d = "";
      for (let i = 0; i < h.n; i++) d += brin(h.x + (i - h.n / 2) * 1.8, h.y, h.h * k * (0.7 + 0.3 * ((i * 7) % 3) / 2), h.inc + (i - h.n / 2) * 0.22);
      couches[ou(h.x, h.y)] += `<path d="${d}" fill="url(#j-herbe)"/>`;
    }
    for (const fl of P.fleursSol) {
      if (fl.naissance > A) continue;
      const k = lisse(fl.naissance, fl.naissance + 1.4, A + 0.5) * fl.t;
      if (k < 0.05) continue;
      const { x, y } = fl;
      let s;
      if (fl.type === "champi") {
        s = `<g transform="translate(${f(x)} ${f(y)}) scale(${k.toFixed(3)})"><circle cy="-4" r="9" fill="url(#j-aura-champi)" class="j-lueur" style="animation-delay:${dLueur}s"/>` +
          `<path d="M-.9 0V-4.4H.9V0Z" fill="#dffcff"/><path d="M-4 -4.2Q-3.6-8.4 0-8.6Q3.6-8.4 4-4.2Z" fill="url(#j-champi)"/>` +
          `<circle cx="-1.4" cy="-6.6" r=".55" fill="#fff" opacity=".8"/><circle cx="1.5" cy="-5.6" r=".45" fill="#fff" opacity=".7"/></g>`;
      } else {
        const coeur = fl.type === "bleue" ? "#fff6c9" : "#ffd25e", petale = fl.type === "bleue" ? "#9fb6ff" : "#fbfbff";
        s = `<g transform="translate(${f(x)} ${f(y)}) scale(${k.toFixed(3)})"><path d="M0 0Q.6-3 0-5.4" fill="none" stroke="#5fc78e" stroke-width=".7"/>` +
          `<g transform="translate(0 -6)"><circle r="4.2" fill="${fl.type === "bleue" ? "url(#j-aura-bleue)" : "url(#j-aura-blanche)"}"/>` +
          [0, 72, 144, 216, 288].map((r) => `<ellipse cy="-1.6" rx="1.05" ry="1.7" transform="rotate(${r})" fill="${petale}"/>`).join("") +
          `<circle r=".85" fill="${coeur}"/></g></g>`;
      }
      couches[ou(x, y)] += s;
    }
    return couches;
  }

  function lucioles(A) {
    return P.lucioles.filter((l) => l.seuil <= A).map((l) =>
      `<g class="j-luciole" style="--dx:${f(l.dx)}px;--dy:${f(l.dy)}px;animation-duration:${f(l.d)}s,${f(l.d * 0.37)}s;animation-delay:${phase(l.d * 2, l.del)}s,${phase(l.d * 0.74, l.del * 1.3)}s">` +
      `<circle cx="${f(l.x)}" cy="${f(l.y)}" r="5.5" fill="url(#j-aura-luciole)"/><circle cx="${f(l.x)}" cy="${f(l.y)}" r="1.25" fill="#fbffd4"/></g>`).join("");
  }

  /* ---------- Le décor : île de mousse, dôme d'énergie ---------- */

  const arcDome = `M${CX - RX} ${SOL}A${RX} ${RY} 0 0 1 ${CX + RX} ${SOL}`;
  const dome = `${arcDome}A${RX} ${BRY} 0 0 1 ${CX - RX} ${SOL}Z`;
  const baseArriere = `M${CX - RX} ${SOL}A${RX} ${BRY} 0 0 1 ${CX + RX} ${SOL}`;
  const baseAvant = `M${CX + RX} ${SOL}A${RX} ${BRY} 0 0 1 ${CX - RX} ${SOL}`;
  const surDome = (t, retrait = 0) => [CX + (RX - retrait) * Math.cos(t), SOL + (RY - retrait) * Math.sin(t)];
  function arc(t1, t2, retrait) {
    const [x1, y1] = surDome(t1, retrait), [x2, y2] = surDome(t2, retrait);
    return `M${f(x1)} ${f(y1)}A${RX - retrait} ${RY - retrait} 0 0 1 ${f(x2)} ${f(y2)}`;
  }
  const rg = (id, stops, attrs = "") => `<radialGradient id="${id}" ${attrs}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a !== 1 ? ` stop-opacity="${a}"` : ""}/>`).join("")}</radialGradient>`;
  const lg = (id, stops, attrs = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${attrs}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a !== 1 ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`;
  const fresnel = `gradientUnits="userSpaceOnUse" cx="${CX}" cy="${SOL}" r="${RX}" gradientTransform="translate(${CX} ${SOL}) scale(1 ${(RY / RX).toFixed(4)}) translate(${-CX} ${-SOL})"`;

  const DEFS = `<defs>
    ${rg("j-halo", [[0, "#7dfbe6", 0.34], [0.42, "#5ccfff", 0.13], [1, "#4a63ff", 0]])}
    ${rg("j-fresnel", [[0, "#c8fff4", 0.03], [0.55, "#8ff5ff", 0.05], [0.8, "#7fe8ff", 0.12], [0.94, "#b6f5ff", 0.3], [1, "#eafdff", 0.55]], fresnel)}
    ${rg("j-fresnel-m", [[0, "#000"], [0.62, "#080808"], [0.88, "#3c3c3c"], [1, "#a0a0a0"]], fresnel)}
    ${lg("j-bord", [[0, "#7ef7ff"], [0.35, "#a9c6ff"], [0.55, "#c4b2ff"], [0.78, "#9fe9ff"], [1, "#8dffd2"]], 'x1="0" y1="0" x2="1" y2="0"')}
    ${lg("j-terre", [[0, "#2c2340"], [0.45, "#1f1830"], [1, "#151022"]])}
    ${rg("j-mousse", [[0, "#4aa877"], [0.5, "#2a6d58"], [0.85, "#1a4a48"], [1, "#143a40"]], 'cx="50%" cy="38%" r="62%"')}
    ${rg("j-flaque", [[0, "#c9fff0", 0.5], [0.5, "#8ef6e0", 0.18], [1, "#6fe7d8", 0]])}
    ${rg("j-aura-plante", [[0, "#d9ffc0", 0.32], [0.5, "#9ff5b8", 0.12], [1, "#7fe8c0", 0]])}
    ${rg("j-aura-bourgeon", [[0, "#f2ffd0", 0.75], [0.45, "#d4ff9a", 0.25], [1, "#c8ff8a", 0]])}
    ${rg("j-aura-luciole", [[0, "#fbffc8", 0.8], [0.4, "#e8ff96", 0.25], [1, "#e8ff96", 0]])}
    ${rg("j-aura-fleur", [[0, "#fff2f7", 0.5], [1, "#ffc8dc", 0]])}
    ${rg("j-petale", [[0, "#ffa3c4"], [0.55, "#ffd9e7"], [1, "#fff8fb"]], 'cx="50%" cy="100%" r="100%"')}
    ${rg("j-aura-fruit", [[0, "#fff3c0", 0.7], [0.45, "#ffd36b", 0.22], [1, "#ffb347", 0]])}
    ${rg("j-fruit", [[0, "#fffdf0"], [0.5, "#ffe08a"], [1, "#ffab3d"]], 'cx="40%" cy="35%" r="70%"')}
    ${rg("j-aura-champi", [[0, "#9ffcff", 0.55], [0.5, "#5fe0ff", 0.16], [1, "#5fe0ff", 0]])}
    ${lg("j-champi", [[0, "#c9feff"], [0.6, "#6fdcf0"], [1, "#3aa7c9"]])}
    ${rg("j-aura-blanche", [[0, "#ffffff", 0.42], [1, "#ffffff", 0]])}
    ${rg("j-aura-bleue", [[0, "#b9c8ff", 0.55], [1, "#8fa6ff", 0]])}
    ${lg("j-herbe", [[0, "#9af0c0"], [0.6, "#4fbf8a"], [1, "#2a8a66"]])}
    ${rg("j-brouillard", [[0, "#e9fffb", 0.7], [0.55, "#bdf6ef", 0.32], [1, "#a6eee8", 0]])}
    ${rg("j-cristal", [[0, "#e6ffff"], [0.5, "#7ff0ff"], [1, "#3aa0d0"]])}
    ${rg("j-aura-cristal", [[0, "#8ff7ff", 0.5], [1, "#8ff7ff", 0]])}
    <pattern id="j-hex" width="13.86" height="24" patternUnits="userSpaceOnUse"><path d="M0 4L6.93 0L13.86 4V12L6.93 16L0 12ZM6.93 16V24" fill="none" stroke="#c9fdff" stroke-width=".45"/></pattern>
    <mask id="j-masque-hex" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><path d="${dome}" fill="url(#j-fresnel-m)"/></mask>
    <clipPath id="j-dans-dome"><path d="${dome}"/></clipPath>
  </defs>`;

  // L'île de mousse qui flotte dans la nuit, ses racines et ses cristaux
  const ILE = (() => {
    const r = hasard(77);
    let racines = "";
    for (let i = 0; i < 9; i++) {
      const x = 70 + i * 26 + r() * 12, y0 = 236 + Math.sin(((x - 70) / 220) * Math.PI) * 30 - 4, l = 8 + r() * 18, c = (r() - 0.5) * 10;
      racines += `<path d="M${f(x)} ${f(y0)}q${f(c)} ${f(l * 0.5)} ${f(c * 0.4)} ${f(l)}" fill="none" stroke="#3a2c45" stroke-width="${f(1 + r() * 0.8)}" stroke-linecap="round"/>` +
        (i % 3 === 1 ? `<circle cx="${f(x + c * 0.4)}" cy="${f(y0 + l)}" r="1.3" fill="#9ffcff" class="j-lueur"/>` : "");
    }
    const cristaux = [[118, 238, 1], [238, 246, 0.8], [186, 262, 0.7], [84, 226, 0.6]].map(([x, y, k]) =>
      `<g transform="translate(${x} ${y}) scale(${k})"><circle r="9" fill="url(#j-aura-cristal)" class="j-lueur"/><path d="M0-5L2.4-.6L1.2 4H-1.2L-2.4-.6Z" fill="url(#j-cristal)"/><path d="M0-5L.6-.6L0 4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".5"/></g>`).join("");
    return `<ellipse cx="${CX}" cy="294" rx="110" ry="6" fill="#7dfbe6" opacity=".06"/>
      <path d="M13 212C20 238 70 258 126 272C150 278 168 283 186 282C206 281 224 274 246 266C296 250 340 236 347 212Z" fill="url(#j-terre)"/>
      <path d="M34 226C80 246 130 256 182 258C232 258 290 246 330 228" fill="none" stroke="#3b3052" stroke-width="1.2" opacity=".7"/>
      <path d="M64 244C110 260 160 268 196 268C236 266 270 258 300 246" fill="none" stroke="#33294a" stroke-width="1" opacity=".6"/>
      ${racines}${cristaux}
      <ellipse cx="${CX}" cy="${SOL + 6}" rx="167" ry="30" fill="url(#j-mousse)"/>
      <path d="M13 214C40 238 120 246 180 246C240 246 320 238 347 214" fill="none" stroke="#35906a" stroke-width="2.4" opacity=".55"/>
      <ellipse cx="${CX}" cy="${SOL + 3}" rx="${RX + 6}" ry="${BRY + 6}" fill="url(#j-flaque)"/>`;
  })();

  // La brume qui cache le jardin tant qu'il est verrouillé
  const BRUME = `<g class="j-brume" clip-path="url(#j-dans-dome)">
    <ellipse cx="150" cy="168" rx="120" ry="58" fill="url(#j-brouillard)" class="j-brume-a"/>
    <ellipse cx="222" cy="120" rx="104" ry="64" fill="url(#j-brouillard)" class="j-brume-b"/>
    <ellipse cx="160" cy="80" rx="96" ry="54" fill="url(#j-brouillard)" class="j-brume-a"/>
    <ellipse cx="200" cy="190" rx="130" ry="34" fill="url(#j-brouillard)" class="j-brume-b"/>
    <ellipse cx="${CX}" cy="132" rx="60" ry="60" fill="url(#j-brouillard)"/>
  </g>`;

  function scene({ age = 0, plante: avecPlante = true } = {}) {
    const s = sol(age);
    return `<svg class="j-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${DEFS}
      <circle cx="${CX}" cy="${SOL - 74}" r="196" fill="url(#j-halo)" class="j-respire"/>
      ${ILE}
      <g id="j-derriere">${s.derriere}</g>
      <path d="${baseArriere}" fill="none" stroke="#8ff6ff" stroke-opacity=".16" stroke-width="5"/>
      <path d="${baseArriere}" fill="none" stroke="#b5fbff" stroke-opacity=".5" stroke-width="1.1"/>
      <path d="${dome}" fill="url(#j-fresnel)"/>
      <path d="${dome}" fill="url(#j-hex)" mask="url(#j-masque-hex)" class="j-hex"/>
      <path d="${arc(Math.PI * 1.04, Math.PI * 1.96, 0)}" fill="none" stroke="#e6fdff" stroke-opacity=".05" stroke-width="22"/>
      <g id="j-dedans">${s.dedans}</g>
      <g id="j-plante">${avecPlante ? plante(age) : ""}</g>
      <g id="j-lucioles">${lucioles(age)}</g>
      ${BRUME}
      <path d="${baseAvant}" fill="none" stroke="#8ff6ff" stroke-opacity=".22" stroke-width="6"/>
      <path d="${baseAvant}" fill="none" stroke="#dcfeff" stroke-opacity=".85" stroke-width="1.3"/>
      <path d="${arcDome}" fill="none" stroke="url(#j-bord)" stroke-opacity=".18" stroke-width="9"/>
      <path d="${arcDome}" fill="none" stroke="url(#j-bord)" stroke-opacity=".35" stroke-width="3.6"/>
      <path d="${arcDome}" fill="none" stroke="url(#j-bord)" stroke-width="1.2"/>
      <path d="${arcDome}" pathLength="100" fill="none" stroke="#f2ffff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="5 95" class="j-flux"/>
      <path d="${arcDome}" pathLength="100" fill="none" stroke="#e5f6ff" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="3 97" class="j-flux j-flux-2"/>
      <path d="${arc(Math.PI * 1.13, Math.PI * 1.34, 9)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.2" stroke-linecap="round"/>
      <path d="${arc(Math.PI * 1.37, Math.PI * 1.41, 9)}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.6" stroke-linecap="round"/>
      <path d="${arc(Math.PI * 1.66, Math.PI * 1.84, 7)}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="5" stroke-linecap="round"/>
      <g id="j-devant">${s.devant}</g>
    </svg>`;
  }

  // Met à jour tout ce qui dépend de l'âge (sans toucher au décor)
  function maj(svg, age, { plante: avecPlante = true } = {}) {
    if (!svg) return;
    const s = sol(age);
    svg.querySelector("#j-derriere").innerHTML = s.derriere;
    svg.querySelector("#j-dedans").innerHTML = s.dedans;
    svg.querySelector("#j-devant").innerHTML = s.devant;
    svg.querySelector("#j-plante").innerHTML = avecPlante ? plante(age) : "";
    svg.querySelector("#j-lucioles").innerHTML = lucioles(age);
  }

  // Où est le bourgeon du tronc (unités du viewBox) ?
  function sommet(age) {
    const p = point(P.tronc.pts, longueur(P.tronc, age, Infinity)), e = echelle(age);
    return { x: CX + (p.x - CX) * e, y: PIED + (p.y - PIED) * e, w: W, h: H };
  }

  const STADES = [
    [0, "Pousse", "Elle grandira à chaque pensée que tu encapsules."],
    [3, "Jeune pousse", "Ses premières feuilles s'ouvrent à la lumière."],
    [8, "Arbrisseau", "Ses branches commencent à s'étendre."],
    [18, "Jeune arbre", "Il prend de la force, pensée après pensée."],
    [35, "Arbre", "Ses racines tiennent bon. Ta paix aussi."],
    [65, "Arbre en fleurs", "Il fleurit de tout ce que tu as déposé ici."],
    [120, "Arbre de lumière", "Ta paix intérieure rayonne sous le dôme."],
  ];
  function stade(n) {
    let i = 0;
    while (i < STADES.length - 1 && n >= STADES[i + 1][0]) i++;
    const [, nom, phrase] = STADES[i];
    return { i, nom, phrase, suivant: STADES[i + 1]?.[0] ?? null, nomSuivant: STADES[i + 1]?.[1] ?? null };
  }

  return { scene, maj, sommet, stade, W, H };
})();
