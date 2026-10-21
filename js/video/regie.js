// ------------------------------------------------------------------
// Regie des Erklärvideos (Drehbuch: videos/physik/leiterschleife_kommutator/drehbuch.md).
// Jede Szene ist eine Folge aus Sprechertext (sprich) und Aktionen in der Simulation.
// sprich() wartet, bis der Abschnitt gesprochen ist; was gleichzeitig passieren soll,
// wird ohne await gestartet.
// ------------------------------------------------------------------
import { GEO, START_ANGLE } from '../config.js';
import { state } from '../state.js';
import { removePart, busy } from '../abnehmen.js';
import { stromwegDeckkraft } from '../stromweg.js';
import { jetzt, warte, bis, animiere } from './ablauf.js';
import { kameraSetzen, kameraFahrt, kameraSchwenk } from './kamera.js';
import { handDeckkraft, fingerZeigen, handLage } from './hand.js';
import { blende, untertitel, kapitel, marke, bogenPfeil, strichLinie } from './einblendungen.js';
import { kommutatorBereitlegen, aufKommutatorUmstellen, kommutatorAufsetzen } from './umbau.js';

const PAUSE = 0.35;                      // Pause nach jedem gesprochenen Abschnitt
const grad = g => g * Math.PI / 180;
const R = GEO.loopRadius;
const RING_Z = { A: GEO.commZ - 1.25, B: GEO.commZ + 1.25 };   // Schleifringe wie in aufbau.js
const $ = id => document.getElementById(id);

/** Lage einer Leiterseite (A oder B) beim aktuellen Winkel, z frei wählbar */
const seite = (key, z = 0) => () => {
  const s = key === 'A' ? 1 : -1;
  return { x: s * R * Math.cos(state.phi), y: s * R * Math.sin(state.phi), z };
};

export async function regie({ texte, sprechdauer, variante, protokoll }) {
  const sprich = async (key, nachher = PAUSE) => {
    protokoll.ton.push({ key, t: jetzt() });
    untertitel(texte[key]);
    await warte(sprechdauer[key]);
    untertitel('');
    await warte(nachher);
  };
  const neuesKapitel = async text => {
    await blende('kapitel', 0, 0.3);
    kapitel(text);
    await blende('kapitel', 1, 0.4);
  };

  // ---------------- Ausgangslage: ohne Kommutator, Strom aus, Schleife bei 30°
  Object.assign(state, {
    powerOn: false, current: 3, polarity: 1, magnet: 1, mode: 'schleifringe', commutatorOn: true,
    playing: true, slowMotion: true, phi: START_ANGLE, omega: 0,
    showField: false, showCurrent: false, showForces: false, showSketch: true,
  });
  kameraSetzen('gesamt');
  kameraSchwenk(-25, 0.01);
  $('titelkarte').style.opacity = 1;

  // ---------------- Titel
  kameraSchwenk(25, 3.8);
  await warte(3);
  await blende('titelkarte', 0, 0.8);

  // ---------------- Szene 1: Aufbau und Stromkreis
  neuesKapitel('1  Aufbau und Stromkreis');
  kameraFahrt('aufbauNah', 2.5);
  const magnetMarke = marke('Hufeisenmagnet', [-7.8, GEO.poleHeight / 2, -4], [-80, -110]);
  const schleifeMarke = marke('Leiterschleife', () => seite('A', 2.5)(), [160, -160]);
  warte(2.2).then(() => magnetMarke.zeigen());
  warte(3.2).then(() => schleifeMarke.zeigen());
  await sprich('aufbau1');
  state.showField = true;
  magnetMarke.weg(); schleifeMarke.weg();
  const feldMarke = marke('Magnetfeld B', [2, 3.6, 3.6], [120, -120], { farbe: '#1e88e5' });
  feldMarke.zeigen();
  await sprich('aufbau2');
  feldMarke.weg();
  // Schleifringe und Schleifkontakte aus der Nähe; die Striche zeigen auf beide Ringe bzw. beide Kontakte
  kameraFahrt('zuleitung', 2);
  const ringMarke = marke('Schleifringe', [0, GEO.commRadius, RING_Z.A], [-180, -200], { weitere: [[0, GEO.commRadius, RING_Z.B]] });
  const kontaktMarke = marke('Schleifkontakte', [2.0, 0.3, RING_Z.A + 0.45], [-140, 250],
    { weitere: [[-2.0, 0.3, RING_Z.B + 0.45]] });
  warte(1.6).then(() => ringMarke.zeigen());
  warte(2.6).then(() => kontaktMarke.zeigen());
  await sprich('aufbau3');
  ringMarke.weg(); kontaktMarke.weg();

  // Stromkreis ohne Kommutator: Punkte zeigen den Weg des Stroms (Schleife festgehalten)
  kameraFahrt('strom', 2.5);
  state.playing = false;
  state.powerOn = true;
  state.showCurrent = true;
  await sprich('strom1');
  animiere(0.8, stromwegDeckkraft);
  const netzMarke = marke('Netzgerät', [20, 0.5, -3], [0, -80]);
  netzMarke.zeigen();
  await sprich('strom2');
  netzMarke.weg();
  kameraFahrt('zuleitung', 2.5);
  await sprich('strom3');
  kameraFahrt('aufbauNah', 2.5);
  await sprich('strom4');
  kameraFahrt('strom', 2.5);
  await sprich('strom5');
  await sprich('strom6');
  animiere(0.8, p => stromwegDeckkraft(1 - p));
  await sprich('aufbau4');

  // ---------------- Szene 2: Lorentzkraft und Drei-Finger-Regel
  neuesKapitel('2  Warum dreht sich die Schleife?');
  kameraFahrt('vorne', 2.5);
  blende('sketch', 1, 1);
  await sprich('regel1');
  await sprich('regel2');
  await sprich('regel3');

  protokoll.marken.manimStart = jetzt();
  if (variante === 'a') {
    blende('sketch', 0, 0.6);
    kameraFahrt('handA', 2.5);
    const handA = [R * Math.cos(START_ANGLE) - 0.2, R * Math.sin(START_ANGLE) + 0.6, 1.8];   // über der Leiterseite A
    const handB = [-R * Math.cos(START_ANGLE) - 0.2, -R * Math.sin(START_ANGLE) - 0.6, 4.8]; // unter der Leiterseite B
    handLage(handA, [0, 0, 1], [1, 0, 0]);
    animiere(1, handDeckkraft);
    blende('regelkasten', 1, 0.6);
    await sprich('regel4');
    const zeile = name => blende(document.querySelector(`[data-finger="${name}"]`), 1, 0.4);
    zeile('daumen'); animiere(0.8, p => fingerZeigen('daumen', p));
    await sprich('regel5');
    zeile('zeige'); animiere(0.8, p => fingerZeigen('zeige', p));
    await sprich('regel6');
    zeile('mittel'); animiere(0.8, p => fingerZeigen('mittel', p));
    await sprich('regel7');
    await sprich('regel8');
    // Hand wandert zur linken Leiterseite und dreht sich (Daumen nach hinten, Mittelfinger nach unten)
    kameraFahrt('handB', 2.5);
    animiere(2.5, p => {
      const w = Math.PI * p;          // Drehung um die Feldrichtung (x-Achse)
      handLage(handA.map((v, k) => v + (handB[k] - v) * p), [0, -Math.sin(w), Math.cos(w)], [1, 0, 0]);
    });
    await sprich('regel9');
    animiere(0.6, p => handDeckkraft(1 - p));
    blende('regelkasten', 0, 0.6);
  } else {
    // Variante B: Hier wird der Manim-Teil eingesetzt; die Simulation wartet so lange.
    for (const key of ['regel4', 'regel5', 'regel6', 'regel7', 'regel8', 'regel9']) await sprich(key);
  }
  protokoll.marken.manimEnde = jetzt();

  kameraFahrt('vorne', 2);
  blende('sketch', 1, 0.6);
  state.showForces = true;
  // Bewegung startet beim zweiten Satz und hält kurz hinter der Senkrechten an (Szene 3)
  warte(2.8).then(async () => {
    state.playing = true;
    await bis(() => state.phi >= grad(108), 12);
    state.playing = false;
  });
  await sprich('regel10');

  // ---------------- Szene 3: Die Schleife wird abgebremst
  neuesKapitel('3  Die Schleife wird abgebremst');
  await sprich('bremsen1', 0);
  await bis(() => !state.playing, 6);
  await warte(0.4);
  await sprich('bremsen2');
  await sprich('bremsen3');
  const obenMarke = marke('nach oben', () => { const p = seite('A')(); return [p.x, p.y + 4.5, 0]; }, [-110, 0]);
  obenMarke.zeigen();
  const dreh = bogenPfeil(6.5, 60, 150, '#546e7a');
  dreh.zeigen();
  await sprich('bremsen4');
  const bremse = bogenPfeil(8.3, 150, 60, '#d32f2f');
  bremse.zeigen();
  await sprich('bremsen5');
  obenMarke.weg(); dreh.weg(); bremse.weg();

  // ---------------- Szene 4: Der Totpunkt
  neuesKapitel('4  Der Totpunkt');
  state.slowMotion = false;
  state.playing = true;
  await sprich('tot1', 0);
  await bis(() => state.omega === 0, 14);
  await warte(0.5);
  const linie = strichLinie([0, -9, 0.6], [0, 9, 0.6]);
  linie.zeigen();
  await sprich('tot2');
  await sprich('tot3');
  const totMarke = marke('Totpunkt', [0, 0, 0.6], [-330, -40], { gross: true });
  totMarke.zeigen();
  await sprich('tot4');
  await sprich('tot5');
  totMarke.weg(); linie.weg();

  // ---------------- Szene 5: Der Kommutator wird eingebaut
  neuesKapitel('5  Der Kommutator');
  state.powerOn = false;
  state.playing = false;
  state.showForces = false;
  blende('sketch', 0, 0.6);
  kommutatorBereitlegen();
  kameraFahrt('umbau', 2.5);
  const umbau = (async () => {
    await warte(1.5);
    removePart();
    await bis(() => !busy());
    aufKommutatorUmstellen();
    await kommutatorAufsetzen();
  })();
  await sprich('komm1');
  await umbau;
  const haelfte = (s, text) => marke(text, () => {
    const w = state.phi + (s > 0 ? 0 : Math.PI);
    return [GEO.commRadius * Math.cos(w), GEO.commRadius * Math.sin(w), GEO.commZ];
  }, [s * 190, -120]);
  const hA = haelfte(1, 'Halbring'), hB = haelfte(-1, 'Halbring');
  hA.zeigen(); hB.zeigen();
  await sprich('komm2');
  hA.weg(); hB.weg();
  const kontakte = marke('Schleifkontakte', [2.0, 0.3, GEO.commZ + 0.45], [-120, 230],
    { weitere: [[-2.0, 0.3, GEO.commZ + 0.45]] });
  kontakte.zeigen();
  await sprich('komm3');
  kontakte.weg();

  // Stromkreis mit Kommutator: Schleife zurück in die Startstellung, Strom ein, Weg verfolgen
  state.playing = false;
  const von = state.phi;
  kameraFahrt('zuleitung', 2.5);
  await animiere(2.5, p => { state.phi = von + (START_ANGLE - von) * p; });
  state.omega = 0;
  state.powerOn = true;
  state.showCurrent = true;
  animiere(0.8, stromwegDeckkraft);
  await sprich('kstrom1');
  await sprich('kstrom2');
  kameraFahrt('aufbauNah', 2.5);
  await sprich('kstrom3');
  animiere(0.8, p => stromwegDeckkraft(1 - p));

  // ---------------- Szene 6: Jetzt dreht sich die Schleife ganz herum
  neuesKapitel('6  Mit Kommutator');
  kameraFahrt('vorne', 2.5);
  blende('sketch', 1, 0.8);
  Object.assign(state, { slowMotion: false, showForces: true });
  await sprich('dreh1', 0);
  state.playing = true;
  await warte(1);
  await sprich('dreh2');
  await warte(3);

  // ---------------- Szene 7: Was macht der Kommutator?
  neuesKapitel('7  Was macht der Kommutator?');
  state.slowMotion = true;
  const sprechen = sprich('wende1');
  // anhalten, kurz bevor eine Leiterseite oben ankommt (A oben bei 90°, B oben bei 270°)
  let vorher = state.phi;
  await bis(() => {
    const p = state.phi, kreuzt = g => vorher < grad(g) && p >= grad(g);
    const ja = kreuzt(76) || kreuzt(256);
    vorher = p;
    return ja;
  }, 30);
  state.playing = false;
  await sprechen;
  const start = state.phi;
  animiere(2.5, p => { state.phi = start + grad(14) * p; });
  const luecke = marke('kein Strom', [-GEO.commRadius - 0.6, 0, GEO.commZ], [-220, 130], { farbe: '#d32f2f' });
  luecke.zeigen();
  await sprich('wende2');
  luecke.weg();
  await animiere(2.5, p => { state.phi = start + grad(14) + grad(14) * p; });
  await sprich('wende3');
  await sprich('wende4');

  // Drei-Finger-Regel an der oberen Leiterseite nach dem Umpolen: Strom von uns weg → Kraft nach unten
  const oben = Math.sin(state.phi) > 0 ? state.phi : state.phi + Math.PI;
  const handOben = [R * Math.cos(oben), R * Math.sin(oben) + 0.3, 4.5];
  for (const name of ['daumen', 'zeige', 'mittel']) {
    fingerZeigen(name, 0);
    document.querySelector(`[data-finger="${name}"]`).style.opacity = 0.25;
  }
  handLage(handOben, [0, 0, -1], [1, 0, 0]);
  kameraFahrt('handOben', 2.5);
  animiere(1, handDeckkraft);
  blende('regelkasten', 1, 0.6);
  await sprich('hand1');
  const finger = async (name, key) => {
    blende(document.querySelector(`[data-finger="${name}"]`), 1, 0.4);
    animiere(0.8, p => fingerZeigen(name, p));
    await sprich(key);
  };
  await finger('daumen', 'hand2');
  await finger('zeige', 'hand3');
  await finger('mittel', 'hand4');
  animiere(0.6, p => handDeckkraft(1 - p));
  blende('regelkasten', 0, 0.6);
  kameraFahrt('vorne', 2);
  await sprich('wende5');
  const antrieb = bogenPfeil(7, 70, 160, '#2e7d32');
  antrieb.zeigen();
  await sprich('wende6');
  await sprich('wende7');
  antrieb.weg();
  state.slowMotion = false;
  state.playing = true;
  await sprich('wende8');
  await sprich('wende9');
  await sprich('wende10');
  await warte(1);
  await blende('kapitel', 0, 0.4);
  await blende('schlusskarte', 1, 0.8);
  await warte(7);
}
