"use strict";

/* =========================================================
   Sons (synthétisés, aucun fichier) et vibrations.
   Sur iPhone, les sons suivent le bouton silencieux.
   ========================================================= */

const Sons = (() => {
  let ctx = null, sortie = null;
  let actif = true;

  function audio() {
    if (!actif) return null;
    // Avant le premier geste, le navigateur bloquerait le son : inutile de créer le contexte.
    if (!ctx && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      sortie = ctx.createGain(); sortie.gain.value = 0.85;
      sortie.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  // Une note avec enveloppe : attaque courte, décroissance exponentielle.
  function note(f, quand, duree, { type = "sine", vol = 0.18, glisse = 0, attaque = 0.006 } = {}) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + quand;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glisse) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * glisse), t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attaque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g); g.connect(sortie);
    o.start(t); o.stop(t + duree + 0.05);
  }

  function bruit(quand, duree, { vol = 0.2, filtre = 1800, q = 0.8, type = "bandpass" } = {}) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + quand;
    const n = Math.floor(c.sampleRate * duree);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filtre, t); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    s.connect(f); f.connect(g); g.connect(sortie);
    s.start(t); s.stop(t + duree);
  }

  // Gamme pentatonique : chaque série en progrès de la séance sonne un peu plus haut.
  const GAMME = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

  return {
    regler(v) { actif = !!v; },
    get actif() { return actif; },
    debloquer() { audio(); },
    // Série validée : « plus » monte d'une note à chaque progrès, « egal » est neutre, « moins » descend doucement.
    serie(verdict, rang = 0) {
      if (verdict === "plus") {
        const f = GAMME[Math.min(rang, GAMME.length - 1)];
        note(f, 0, 0.3, { vol: 0.2 });
        note(f * 1.5, 0.07, 0.34, { vol: 0.09 });
        note(f * 2, 0.01, 0.16, { vol: 0.04 });
        bruit(0, 0.025, { vol: 0.05, filtre: 4500 });
      } else if (verdict === "moins") {
        note(330, 0, 0.22, { type: "triangle", vol: 0.12, glisse: 0.75 });
      } else {
        note(660, 0, 0.12, { vol: 0.12 });
        bruit(0, 0.02, { vol: 0.04, filtre: 3800 });
      }
    },
    record() {
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
        note(f, i * 0.075, 0.6, { type: "triangle", vol: 0.12 });
        note(f * 2, i * 0.075 + 0.02, 0.3, { vol: 0.03 });
      });
      [1046.5, 1318.51, 1567.98].forEach((f) => note(f, 0.42, 1.3, { vol: 0.05 }));
      bruit(0.38, 0.9, { vol: 0.045, filtre: 7000, type: "highpass" });
    },
    // Fin du repos : trois bips, comme un chrono de salle.
    repos() {
      note(880, 0, 0.16, { type: "square", vol: 0.07 });
      note(880, 0.26, 0.16, { type: "square", vol: 0.07 });
      note(1318.51, 0.52, 0.42, { type: "square", vol: 0.08 });
    },
    fin() {
      [[523.25, 659.25, 783.99], [587.33, 739.99, 880], [659.25, 830.61, 987.77, 1318.51]].forEach((acc, i) =>
        acc.forEach((f) => note(f, i * 0.16, i === 2 ? 1.5 : 0.32, { type: "triangle", vol: 0.08 })));
      bruit(0.32, 1, { vol: 0.04, filtre: 6500, type: "highpass" });
    },
    touche() {
      bruit(0, 0.018, { vol: 0.035, filtre: 3200 });
    },
    // Chrono : un bip par seconde du décompte, puis un bip plus haut au départ.
    bip(depart) {
      if (depart) { note(1318.51, 0, 0.32, { type: "square", vol: 0.08 }); note(1760, 0.02, 0.22, { vol: 0.04 }); }
      else note(880, 0, 0.12, { type: "square", vol: 0.06 });
    },
    // Appui long puis glissé : un petit cran à chaque série gagnée (de plus en plus haut)…
    cran(n = 0) {
      note(GAMME[Math.min(n, GAMME.length - 1)] * 0.75, 0, 0.07, { type: "square", vol: 0.035 });
      bruit(0, 0.012, { vol: 0.03, filtre: 5200 });
    },
    // … et une petite montée quand la valeur est copiée.
    remplir(n = 1) {
      for (let k = 0; k <= Math.min(n, 5); k++) note(GAMME[k + 1], k * 0.045, 0.2, { type: "triangle", vol: 0.08 });
      bruit(0, 0.03, { vol: 0.04, filtre: 6000, type: "highpass" });
    },
    erreur() {
      note(220, 0, 0.12, { type: "triangle", vol: 0.1 });
      note(196, 0.1, 0.16, { type: "triangle", vol: 0.1 });
    },
  };
})();

// Petite vibration : navigator.vibrate là où il existe, sinon l'astuce de l'interrupteur iOS (iOS 18 et plus).
function vibrer(ms = 12) {
  try {
    if (!Sons.actif) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    const l = document.createElement("label");
    l.ariaHidden = "true"; l.style.display = "none";
    const i = document.createElement("input");
    i.type = "checkbox"; i.setAttribute("switch", "");
    l.append(i); document.head.append(l);
    l.click(); l.remove();
  } catch (e) {}
}
