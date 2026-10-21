// ------------------------------------------------------------------
// Kamera im Video: feste Ansichten, Fahrten und Schwenks (in Videozeit)
// ------------------------------------------------------------------
import * as THREE from 'three';
import { camera } from '../szene.js';
import { animiere } from './ablauf.js';

export const ANSICHTEN = {
  gesamt: { pos: [32, 21, 42], ziel: [4.5, -2, 0] },
  vorne: { pos: [-8, 8, 32], ziel: [3, -0.5, 0] },          // schräg von vorne, rechts Platz für die Skizze
  handA: { pos: [-17, 15, 24], ziel: [2.5, 1.5, 2] },       // Hand an der rechten Leiterseite
  handB: { pos: [-6, 13, 24], ziel: [-3, -2, 3] },          // Hand an der linken Leiterseite
  umbau: { pos: [4, 16, 40], ziel: [0, -3, 3] },
  aufbauNah: { pos: [6, 22, 34], ziel: [0, -1, 0] },        // von oben in den Magneten: Schleife sichtbar
  zuleitung: { pos: [12, 8, 32], ziel: [0, -1.5, 8] },      // Schleifringe/Kommutator und Schleifkontakte
  strom: { pos: [6, 30, 44], ziel: [7, -4, 2] },            // Netzgerät, Kabel und Schleife
  handOben: { pos: [-18, 17, 16], ziel: [-1, 3, 1.5] },           // Hand an der oberen Leiterseite (Szene 7)
};
const blickZiel = new THREE.Vector3();
export function kameraSetzen(name) {
  const a = ANSICHTEN[name];
  camera.position.set(...a.pos);
  blickZiel.set(...a.ziel);
}
export function kameraFahrt(name, sek = 2) {
  const a = ANSICHTEN[name];
  const p0 = camera.position.clone(), z0 = blickZiel.clone();
  const p1 = new THREE.Vector3(...a.pos), z1 = new THREE.Vector3(...a.ziel);
  return animiere(sek, p => {
    camera.position.lerpVectors(p0, p1, p);
    blickZiel.lerpVectors(z0, z1, p);
  });
}
/** Kamera langsam um die senkrechte Achse durch das Blickziel schwenken (Winkel in Grad) */
export function kameraSchwenk(grad, sek) {
  const start = camera.position.clone().sub(blickZiel);
  return animiere(sek, p => {
    const r = start.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(grad) * p);
    camera.position.copy(blickZiel).add(r);
  });
}

/** Jedes Bild: Kamera auf das Blickziel richten */
export function kameraAusrichten() {
  camera.lookAt(blickZiel);
  camera.updateMatrixWorld();   // Beschriftungen werden vor dem Rendern projiziert
}
