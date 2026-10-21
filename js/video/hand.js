// ------------------------------------------------------------------
// Rechte Hand für die Drei-Finger-Regel (3D, vereinfacht aus Kapseln).
// Eigenes Koordinatensystem der Hand: Daumen +x (Strom I), Zeigefinger +y (Feld B),
// Mittelfinger +z (Kraft F). Das ist rechtshändig: I × B = F.
// Ursprung = Ansatz des Zeigefingers. Längen in cm (vor der Skalierung).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeTextPlane } from '../hilfen.js';
import { scene, camera } from '../szene.js';

const HAUT = new THREE.Color('#f0c4a0');
export const FARBEN = { daumen: '#f5a300', zeige: '#1e88e5', mittel: '#d32f2f' };

function haut() {
  return new THREE.MeshStandardMaterial({ color: HAUT.clone(), roughness: 0.65, transparent: true });
}

// Kapsel von p nach q (mit Gelenkkugeln an den Enden)
function glied(p, q, r, material, parent) {
  const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, a.distanceTo(b), 6, 16), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  mesh.castShadow = true;
  parent.add(mesh);
}
function finger(punkte, r, material, parent) {
  for (let k = 1; k < punkte.length; k++) glied(punkte[k - 1], punkte[k], r, material, parent);
}

// Pfeil entlang +y (Länge 1 + Spitze), über allem gezeichnet
function pfeil(farbe) {
  const m = new THREE.MeshBasicMaterial({ color: farbe, transparent: true, depthTest: false });
  const g = new THREE.Group();
  const schaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 12), m);
  schaft.position.y = 0.5;
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 16), m);
  spitze.position.y = 1.45;
  g.add(schaft, spitze);
  for (const c of g.children) c.renderOrder = 20;
  return { g, m, schaft, spitze };
}

export const hand = new THREE.Group();
hand.visible = false;
scene.add(hand);

const innen = new THREE.Group();          // Hand im eigenen System, skaliert
innen.scale.setScalar(0.9);
hand.add(innen);

const mat = { rest: haut(), daumen: haut(), zeige: haut(), mittel: haut() };
const handflaeche = new THREE.Mesh(new RoundedBoxGeometry(2.8, 3.0, 1.1, 4, 0.45), mat.rest);
handflaeche.position.set(-1.05, -1.45, 0);
handflaeche.castShadow = true;
innen.add(handflaeche);

// Fingerspitzen: hier beginnen die Richtungspfeile
const SPITZE = {
  daumen: { p: [3.3, -1.75, 0.35], dir: [1, 0, 0] },
  zeige: { p: [0, 3.9, 0], dir: [0, 1, 0] },
  mittel: { p: [-0.72, 0.6, 3.6], dir: [0, 0, 1] },
};
finger([[0, -0.1, 0], [0, 1.4, 0], [0, 2.7, 0], SPITZE.zeige.p], 0.36, mat.zeige, innen);
finger([[-0.72, -0.1, 0.1], [-0.72, 0.6, 0.5], [-0.72, 0.6, 2.0], SPITZE.mittel.p], 0.37, mat.mittel, innen);
finger([[-1.42, -0.1, 0.1], [-1.42, 0.45, 0.6], [-1.42, 0.05, 1.35], [-1.42, -0.6, 1.05]], 0.34, mat.rest, innen);
finger([[-2.05, -0.25, 0.1], [-2.05, 0.2, 0.55], [-2.05, -0.15, 1.1], [-2.05, -0.7, 0.85]], 0.29, mat.rest, innen);
finger([[0.05, -2.4, 0.2], [0.9, -1.9, 0.35], [2.1, -1.75, 0.35], SPITZE.daumen.p], 0.42, mat.daumen, innen);

// Richtungspfeile und Buchstaben an den Fingerspitzen
const zusatz = {};
for (const [name, buchstabe] of [['daumen', 'I'], ['zeige', 'B'], ['mittel', 'F']]) {
  const { g, m, schaft, spitze } = pfeil(FARBEN[name]);
  const s = SPITZE[name];
  g.position.set(...s.p).addScaledVector(new THREE.Vector3(...s.dir), 0.5);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...s.dir));
  innen.add(g);
  const label = makeTextPlane(buchstabe, 1.6, { color: FARBEN[name] });
  label.material.depthTest = false;
  label.renderOrder = 21;
  innen.add(label);
  zusatz[name] = { g, m, schaft, spitze, label, s, wert: 0 };
}

let deckkraft = 0;

/** Hand sichtbar machen (0 … 1) */
export function handDeckkraft(d) {
  deckkraft = d;
  hand.visible = d > 0.001;
}

/** Finger hervorheben (0 … 1): Finger färbt sich, Pfeil und Buchstabe erscheinen */
export function fingerZeigen(name, wert) {
  zusatz[name].wert = wert;
}

/**
 * Lage der Hand: Ursprung bei pos, Daumen in Richtung i, Zeigefinger in Richtung b
 * (Mittelfinger ergibt sich als i × b).
 */
export function handLage(pos, i, b) {
  const x = new THREE.Vector3(...i).normalize();
  const y = new THREE.Vector3(...b).normalize();
  const z = x.clone().cross(y);
  hand.position.set(...pos);
  hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Jedes Bild: Farben, Deckkraft, Buchstaben zur Kamera drehen */
export function handAktualisieren() {
  if (!hand.visible) return;
  mat.rest.opacity = deckkraft;
  for (const [name, z] of Object.entries(zusatz)) {
    mat[name].color.copy(HAUT).lerp(new THREE.Color(FARBEN[name]), 0.75 * z.wert);
    mat[name].opacity = deckkraft;
    z.m.opacity = deckkraft * z.wert;
    z.g.visible = z.wert > 0.001;
    const L = 0.2 + 2.3 * z.wert;           // Schaftlänge
    z.schaft.scale.y = L;
    z.schaft.position.y = L / 2;
    z.spitze.position.y = L + 0.45;
    z.label.position.set(...z.s.p).addScaledVector(new THREE.Vector3(...z.s.dir), L + 2.4);
    z.label.visible = z.wert > 0.001;
    z.label.material.opacity = deckkraft * z.wert;
    z.label.quaternion.copy(camera.quaternion).premultiply(innen.getWorldQuaternion(new THREE.Quaternion()).invert());
  }
}
