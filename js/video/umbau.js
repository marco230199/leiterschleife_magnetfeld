// ------------------------------------------------------------------
// Umbau im Video: Schleifringe abnehmen (wie in der Simulation, abnehmen.js) und danach
// einen bereitliegenden Kommutator vom linken Sockel auf die Welle setzen.
// In der Simulation selbst gibt es nur ein Teil auf einmal; im Video liegen beide sichtbar.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO } from '../config.js';
import { state } from '../state.js';
import { addMesh, makeTextPlane } from '../hilfen.js';
import { mat } from '../materialien.js';
import { scene } from '../szene.js';
import { rotor, commutator, sliprings, frontBearing, brushes } from '../aufbau.js';
import { animiere, glatt } from './ablauf.js';

const CZ = GEO.commZ, CR = GEO.commRadius;
const BASE_TOP = -GEO.poleHeight / 2;
const LINKS = new THREE.Vector3(-(GEO.poleGap + GEO.poleWidth + 1.2), BASE_TOP + 0.3 + CR, 1.5);
const BEARING_ASIDE = -4.5, BRUSH_SWING = 15 * Math.PI / 180;   // wie in abnehmen.js

const ablage = addMesh(new THREE.BoxGeometry(1.8, 0.3, 4.4), mat.plastic, scene);
ablage.position.set(LINKS.x, BASE_TOP + 0.15, LINKS.z);
const schild = makeTextPlane('Kommutator', 0.6, { color: '#1d2733' });
schild.rotation.x = -Math.PI / 2;
schild.position.set(LINKS.x, BASE_TOP + 0.02, LINKS.z + 3.6);
scene.add(schild);
ablage.visible = schild.visible = false;

let kommutatorLiegt = false, ringeLiegen = false;

/** Kommutator auf den linken Sockel legen (vor dem Umbau, solange noch die Schleifringe drauf sind) */
export function kommutatorBereitlegen() {
  scene.attach(commutator);
  commutator.position.set(LINKS.x, LINKS.y, LINKS.z - CZ);   // Teile des Kommutators liegen bei z = CZ
  commutator.rotation.set(0, 0, 0);
  ablage.visible = schild.visible = true;
  kommutatorLiegt = true;
}

/** Nach dem Abnehmen der Schleifringe: auf Kommutator umstellen, die Ringe bleiben auf ihrer Ablage */
export function aufKommutatorUmstellen() {
  ringeLiegen = true;
  state.mode = 'kommutator';
}

/** Kommutator vom Sockel nehmen, vor dem Magneten vorbei auf die Welle schieben, Aufbau schließen */
export async function kommutatorAufsetzen() {
  const ziel = rotor.rotation.z;
  const weg = new THREE.CatmullRomCurve3([
    LINKS.clone(),
    new THREE.Vector3(LINKS.x, 2.5, LINKS.z + 3),
    new THREE.Vector3(LINKS.x + 1, 3.5, GEO.magnetFront + 6),
    new THREE.Vector3(-1.5, 2.5, CZ + 7),
    new THREE.Vector3(0, 0, CZ + 6),
  ], false, 'centripetal');
  schild.visible = false;
  await animiere(2.4, p => {
    commutator.position.copy(weg.getPoint(p)).setZ(weg.getPoint(p).z - CZ);
    commutator.rotation.z = ziel * p;
  });
  await animiere(0.8, p => { commutator.position.set(0, 0, 6 * (1 - p)); });
  rotor.attach(commutator);
  commutator.position.set(0, 0, 0);
  commutator.rotation.set(0, 0, 0);
  kommutatorLiegt = false;
  state.commutatorOn = true;
  await animiere(0.7, p => {
    const e = 1 - p;
    for (const side of [-1, 1]) brushes[side].rotation.z = -side * BRUSH_SWING * e;
    frontBearing.position.x = BEARING_ASIDE * e;
  }, glatt);
}

/** Jedes Bild nach syncApparatus: Sichtbarkeit der abgelegten Teile */
export function umbauAktualisieren() {
  if (kommutatorLiegt) commutator.visible = true;
  if (ringeLiegen) sliprings.visible = true;
}
