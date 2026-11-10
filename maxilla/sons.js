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

  function bruit(quand, duree, { vol = 0.2, filtre = 1800, q = 0.8, type = "bandpass", glisse = 0 } = {}) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + quand;
    const n = Math.floor(c.sampleRate * duree);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filtre, t); f.Q.value = q;
    if (glisse) f.frequency.exponentialRampToValueAtTime(filtre * glisse, t + duree);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    s.connect(f); f.connect(g); g.connect(sortie);
    s.start(t); s.stop(t + duree);
  }

  // Gamme pentatonique : chaque exercice coché dans la journée sonne un peu plus haut.
  const GAMME = [587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  return {
    regler(v) { actif = !!v; },
    get actif() { return actif; },
    debloquer() { audio(); },
    coche(rang = 0) {
      const f = GAMME[Math.min(rang, GAMME.length - 1)];
      note(f, 0, 0.28, { vol: 0.2 });
      note(f * 2, 0.01, 0.16, { vol: 0.05 });
      note(f * 1.5, 0.06, 0.3, { vol: 0.06 });
      bruit(0, 0.025, { vol: 0.05, filtre: 4500 });
    },
    decoche() {
      note(392, 0, 0.14, { vol: 0.1, glisse: 0.7 });
    },
    parfait() {
      [587.33, 739.99, 880, 1174.66, 1479.98].forEach((f, i) => {
        note(f, i * 0.09, 0.7, { vol: 0.13 });
        note(f * 2, i * 0.09 + 0.02, 0.35, { vol: 0.03 });
      });
      [1174.66, 1479.98, 1760].forEach((f) => note(f, 0.5, 1.6, { vol: 0.05 }));
      bruit(0.45, 0.9, { vol: 0.04, filtre: 7000, type: "highpass" });
    },
    jalon() {
      [[587.33, 739.99, 880], [659.25, 830.61, 987.77], [880, 1108.73, 1318.51, 1760]].forEach((acc, i) =>
        acc.forEach((f) => note(f, i * 0.17, i === 2 ? 1.6 : 0.35, { type: "triangle", vol: 0.08 })));
      bruit(0.34, 1.1, { vol: 0.04, filtre: 6500, type: "highpass" });
    },
    casse() {
      bruit(0, 0.35, { vol: 0.3, filtre: 2500, q: 0.4 });
      bruit(0.05, 0.6, { vol: 0.2, filtre: 300, type: "lowpass" });
      note(110, 0, 0.6, { type: "sawtooth", vol: 0.06, glisse: 0.4 });
    },
    signature() {
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.12, 0.9, { type: "triangle", vol: 0.1 }));
      bruit(0.5, 1.2, { vol: 0.035, filtre: 6000, type: "highpass" });
    },
  };
})();

// Petite vibration : navigator.vibrate là où il existe, sinon l'astuce de l'interrupteur iOS (iOS 18 et plus).
function vibrer() {
  try {
    if (!Sons.actif) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (navigator.vibrate) { navigator.vibrate(12); return; }
    const l = document.createElement("label");
    l.ariaHidden = "true"; l.style.display = "none";
    const i = document.createElement("input");
    i.type = "checkbox"; i.setAttribute("switch", "");
    l.append(i); document.head.append(l);
    l.click(); l.remove();
  } catch (e) {}
}
