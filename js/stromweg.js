// ------------------------------------------------------------------
// Stromweg (Simulation: Knopf „Stromfluss zeigen“, Erklärvideo):
// leuchtende Punkte wandern (technische Stromrichtung) vom Pluspol des
// Netzgeräts über Kabel, Schleifkontakt und Schleifring bzw. Kommutatorhälfte durch die
// Leiterschleife und zurück zum Minuspol. Der Weg wird jedes Bild neu bestimmt, weil sich
// die Schleife (und mit ihr Zuleitungen, Ringe, Kommutator) drehen kann.
// Maße wie in aufbau.js (Schleifringe, Zuleitungen, Kommutator).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO } from './config.js';
import { state } from './state.js';
import { sideCurrents } from './physik.js';
import { scene, camera } from './szene.js';
import { rotor, brushes } from './aufbau.js';
import { cableCurve } from './netzgeraet.js';

const A = GEO.loopRadius, HL = GEO.loopHalfLength, CZ = GEO.commZ, CR = GEO.commRadius, CL = GEO.commLength;
const RING_W = 0.8, RING_Z = { A: CZ - 1.25, B: CZ + 1.25 };
const HUB_R = CR * 0.35, HOLE_R = CR * 0.74, PASS_R = (HUB_R + HOLE_R) / 2, LUG_R = CR * 0.87;
const backA = RING_Z.A - RING_W / 2, backB = RING_Z.B - RING_W / 2;

// Zuleitungen in Koordinaten der Schleife (vom Ring bzw. von der Kommutatorhälfte zur Leiterseite)
const ZULEITUNG_RING = {
  A: [[LUG_R, 0, backA], [LUG_R, 0, backA - 0.5], [A, 0, HL]],
  B: [[-LUG_R, 0, backB], [-LUG_R, 0, backB - 0.2], [-PASS_R, 0, CZ], [-PASS_R, 0, backA - 0.6], [-A, 0, HL]],
};
const ZULEITUNG_KOMM = {
  A: [[CR * 0.8, 0, CZ - CL / 2], [A, 0, HL]],
  B: [[-CR * 0.8, 0, CZ - CL / 2], [-A, 0, HL]],
};
const SEITE_X = { A, B: -A };

const v3 = p => new THREE.Vector3(...p);

/** Weg als Punktliste in Weltkoordinaten, vom Pluspol zum Minuspol */
function weg() {
  rotor.updateMatrixWorld(true);
  const lokal = p => v3(p).applyMatrix4(rotor.matrixWorld);
  const ring = state.mode === 'schleifringe';
  // Welche Leiterseite hängt am linken Schleifkontakt?
  const links = ring ? 'B' : (Math.cos(state.phi) > 0 ? 'B' : 'A');
  const rechts = links === 'A' ? 'B' : 'A';
  const zL = brushes[-1].position.z, zR = brushes[1].position.z;
  const zu = ring ? ZULEITUNG_RING : ZULEITUNG_KOMM;
  const punkte = [];
  const plus = cableCurve(-1), minus = cableCurve(1);   // Kabel zum linken bzw. rechten Schleifkontakt
  if (!plus || !minus) return punkte;
  punkte.push(...plus.getPoints(60));
  // Halter hinauf, Schleifkontakt, Schleifring bzw. Kommutatorhälfte
  punkte.push(v3([-(CR + 1.4), 0, zL]), v3([-CR, 0, zL]));
  // Zuleitung zur ersten Leiterseite, Leiterseite nach hinten, Querstück, zweite Leiterseite nach vorne
  punkte.push(...zu[links].map(lokal));
  punkte.push(lokal([SEITE_X[links], 0, -HL]), lokal([SEITE_X[rechts], 0, -HL]), lokal([SEITE_X[rechts], 0, HL]));
  punkte.push(...[...zu[rechts]].reverse().map(lokal));
  punkte.push(v3([CR, 0, zR]), v3([CR + 1.4, 0, zR]));
  punkte.push(...minus.getPoints(60).reverse());
  // Bis hier von links nach rechts; bei umgekehrter Polung liegt der Pluspol rechts
  return state.polarity > 0 ? punkte : punkte.reverse();
}

// ---------------- Punkte
const ANZAHL = 90;
// Mit Tiefenprüfung: Was vor dem Stromweg liegt (Schleifringe, Kommutator, Magnet), verdeckt die Punkte.
const material = new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0 });
const VOR_DEM_DRAHT = 0.4;   // cm zur Kamera hin: Die Punkte liegen sonst im Draht (dicker als die Punkte)
const kugeln = [];
for (let k = 0; k < ANZAHL; k++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), material);
  scene.add(m);
  kugeln.push(m);
}
let deckkraft = 0, laufweg = 0;
const zurKamera = new THREE.Vector3();

export function stromwegDeckkraft(d) { deckkraft = d; }

/** Jedes Bild: Punkte weiterbewegen (je größer die Stromstärke, desto schneller) */
export function stromwegAktualisieren(dt) {
  const tempo = 3 * state.current;                     // cm/s; bei 3 A: 9 cm/s
  const fliesst = sideCurrents(state.phi, state).a !== 0;   // kein Strom: aus, Lücke, abgenommen
  material.opacity = deckkraft;
  if (material.transparent !== deckkraft < 1) {   // ganz eingeblendet: undurchsichtig
    material.transparent = deckkraft < 1;
    material.needsUpdate = true;
  }
  const sichtbar = deckkraft > 0.001 && fliesst;
  for (const k of kugeln) k.visible = sichtbar;
  if (!sichtbar) return;
  const p = weg();
  if (p.length < 2) return;
  // Längen der Teilstrecken
  const laengen = [0];
  for (let i = 1; i < p.length; i++) laengen.push(laengen[i - 1] + p[i].distanceTo(p[i - 1]));
  const gesamt = laengen[laengen.length - 1];
  laufweg = (laufweg + dt * tempo) % gesamt;
  const abstand = gesamt / ANZAHL;
  let i = 1;
  const positionen = kugeln.map((_, k) => (laufweg + k * abstand) % gesamt).sort((a, b) => a - b);
  positionen.forEach((s, k) => {
    while (i < p.length - 1 && laengen[i] < s) i++;
    const t = (s - laengen[i - 1]) / (laengen[i] - laengen[i - 1] || 1);
    const kugel = kugeln[k];
    kugel.position.lerpVectors(p[i - 1], p[i], t);
    kugel.position.add(zurKamera.subVectors(camera.position, kugel.position).setLength(VOR_DEM_DRAHT));
  });
}
