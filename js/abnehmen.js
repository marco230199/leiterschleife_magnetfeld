// ------------------------------------------------------------------
// Kommutator bzw. Schleifringe abnehmen und wieder aufsetzen (mit Animation).
// Beim Abnehmen schwenken die Bürsten nach außen und der vordere Lagerbock fährt zur Seite;
// beides bleibt so, solange das Teil abgenommen ist: freie Sicht auf die Leiterschleife.
// Abgenommen liegt das Teil auf dem Holzsockel rechts neben dem Südpol (gut sichtbar, abseits der
// drehenden Schleife und der Kabel); die Bürsten berühren nichts, es fließt kein Strom.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO } from './config.js';
import { state } from './state.js';
import { addMesh, makeTextPlane } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { rotor, commutator, sliprings, frontBearing, brushes } from './aufbau.js';

const CZ = GEO.commZ, CR = GEO.commRadius;
const BASE_TOP = -GEO.poleHeight / 2;                          // Oberseite des Holzsockels
const SLOT_X = GEO.poleGap + GEO.poleWidth + 1.2;                // zwischen Südpol-Schenkel und Sockelkante
const SLOT = new THREE.Vector3(SLOT_X, BASE_TOP + 0.3 + CR, 1.5);  // Mitte des abgenommenen Teils
const PULL_Z = CZ + 6;                                           // hier ist das Teil ganz von der Welle herunter
// Zwischenpunkt vor dem Magneten, neben der Ablage: von hier aus geht es am Schenkel vorbei nach hinten
const BESIDE = new THREE.Vector3(SLOT_X, BASE_TOP + 0.3 + CR + 1.5, GEO.magnetFront + 3);
const BEARING_ASIDE = -4.5, BRUSH_SWING = 15 * Math.PI / 180;

// Ablage: flache Unterlage mit Schild
const stand = addMesh(new THREE.BoxGeometry(1.8, 0.3, 4.4), mat.plastic, scene);
stand.position.set(SLOT.x, BASE_TOP + 0.15, SLOT.z);
const tags = { kommutator: makeTextPlane('Kommutator', 0.6, { color: '#1d2733' }), schleifringe: makeTextPlane('Schleifringe', 0.6, { color: '#1d2733' }) };
for (const tag of Object.values(tags)) {
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(SLOT.x, BASE_TOP + 0.02, SLOT.z + 3.6);
  tag.visible = false;
  scene.add(tag);
}
const part = () => (state.mode === 'schleifringe' ? sliprings : commutator);

// ---------------- Ablaufsteuerung: Schritte nacheinander, je mit Dauer und Verlauf
const queue = [];
let current = null, elapsed = 0;
const ease = t => t * t * (3 - 2 * t);
function addStep(duration, { begin, tick, end } = {}) { queue.push({ duration, begin, tick, end }); }
function moveTo(obj, getTarget, duration, arc = 0) {
  let from, to;
  addStep(duration, {
    begin: () => { from = { p: obj.position.clone(), r: obj.rotation.z }; to = getTarget(); },
    tick: t => {
      const e = ease(t);
      obj.position.lerpVectors(from.p, to.p, e);
      obj.position.y += arc * Math.sin(Math.PI * e);
      obj.rotation.z = from.r + (to.r - from.r) * e;
    },
  });
}
function setOpen(open, duration) {
  addStep(duration, {
    tick: t => {
      const e = open ? ease(t) : 1 - ease(t);
      for (const side of [-1, 1]) brushes[side].rotation.z = -side * BRUSH_SWING * e;
      frontBearing.position.x = BEARING_ASIDE * e;
    },
  });
}

export const busy = () => current !== null || queue.length > 0;

/** Kommutator bzw. Schleifringe abnehmen und vorne auf den Tisch legen (der Aufbau bleibt geöffnet) */
export function removePart() {
  if (busy() || !state.commutatorOn) return false;
  const obj = part();
  state.omega = 0;
  setOpen(true, 0.7);
  addStep(0, { begin: () => { state.commutatorOn = false; scene.attach(obj); } });
  moveTo(obj, () => ({ p: new THREE.Vector3(0, 0, PULL_Z - CZ), r: obj.rotation.z }), 0.8);
  moveTo(obj, () => ({ p: BESIDE.clone().setZ(BESIDE.z - CZ), r: 0 }), 0.9, 2);
  moveTo(obj, () => ({ p: SLOT.clone().setZ(SLOT.z - CZ), r: 0 }), 0.7);
  addStep(0, { end: () => { tags[state.mode].visible = true; } });
  return true;
}

/** Kommutator bzw. Schleifringe wieder auf die Welle setzen und den Aufbau schließen */
export function attachPart() {
  if (busy() || state.commutatorOn) return false;
  const obj = part();
  state.omega = 0;
  addStep(0, { begin: () => { tags[state.mode].visible = false; } });
  moveTo(obj, () => ({ p: BESIDE.clone().setZ(BESIDE.z - CZ), r: 0 }), 0.7);
  moveTo(obj, () => ({ p: new THREE.Vector3(0, 0, PULL_Z - CZ), r: rotor.rotation.z }), 0.9, 2);
  moveTo(obj, () => ({ p: new THREE.Vector3(0, 0, 0), r: rotor.rotation.z }), 0.8);
  addStep(0, {
    end: () => {
      rotor.attach(obj);
      obj.position.set(0, 0, 0);
      obj.rotation.set(0, 0, 0);
      state.commutatorOn = true;
    },
  });
  setOpen(false, 0.7);
  return true;
}

/** Jedes Bild: Ablauf weiterführen */
export function updateParts(dt) {
  if (!current && queue.length) {
    current = queue.shift();
    elapsed = 0;
    current.begin?.();
  }
  if (!current) return;
  elapsed += dt;
  const t = current.duration > 0 ? Math.min(1, elapsed / current.duration) : 1;
  current.tick?.(t);
  if (t >= 1) {
    current.end?.();
    current = null;
    if (queue.length) updateParts(0);
  }
}
