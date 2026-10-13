// ------------------------------------------------------------------
// 3D-Aufbau: Hufeisenmagnet, Leiterschleife mit Kommutator bzw. Schleifringen,
// Bürsten sowie die einblendbaren Feldlinien, Stromrichtung und Kräfte
// Koordinaten in cm: Drehachse = z-Achse (zum Betrachter), Feld in x-Richtung
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO, MODEL, COMMUTATOR } from './config.js';
import { state } from './state.js';
import { sideCurrents, forceY } from './physik.js';
import { addMesh, makeTextPlane } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const A = GEO.loopRadius, HL = GEO.loopHalfLength, W = GEO.wire;
const POLE_IN = GEO.poleGap, POLE_OUT = GEO.poleGap + GEO.poleWidth, PH = GEO.poleHeight;
const BASE_TOP = -PH / 2;

// Zylinder von p nach q
function rod(p, q, radius, material, parent) {
  const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q);
  const len = a.distanceTo(b);
  const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, len, 16), material, parent);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

// Pfeil (Schaft + Spitze) entlang +y, Länge 1; wird über scale.y gestreckt
function makeArrow(material, radius = 0.18) {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
  shaft.position.y = 0.5;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(radius * 3, 1, 16), material);
  group.add(shaft, tip);
  group.userData = { shaft, tip };
  return group;
}
function setArrow(arrow, length, headLength = 1.2) {
  const { shaft, tip } = arrow.userData;
  const shaftLen = Math.max(0.01, length - headLength);
  shaft.scale.y = shaftLen;
  shaft.position.y = shaftLen / 2;
  tip.scale.y = headLength;
  tip.position.y = shaftLen + headLength / 2;
}

// ---------------- Holzsockel und Hufeisenmagnet
const block = addMesh(new THREE.BoxGeometry(2 * POLE_OUT + 4, BASE_TOP - GEO.tableY, GEO.magnetFront - GEO.magnetBack + 6), mat.wood, scene);
block.position.set(0, (BASE_TOP + GEO.tableY) / 2, (GEO.magnetFront + GEO.magnetBack - 3.4) / 2);

const armLen = GEO.magnetFront - GEO.magnetBack;
const arms = [];
for (const side of [-1, 1]) {
  const arm = addMesh(new THREE.BoxGeometry(GEO.poleWidth, PH, armLen), mat.north, scene);
  arm.position.set(side * (POLE_IN + GEO.poleWidth / 2), 0, (GEO.magnetFront + GEO.magnetBack) / 2);
  const label = makeTextPlane('N', 2.4, { color: '#ffffff' });
  label.rotation.x = -Math.PI / 2;
  label.position.set(arm.position.x, PH / 2 + 0.02, GEO.magnetFront - 2);
  const front = makeTextPlane('N', 2.4, { color: '#ffffff' });
  front.position.set(arm.position.x, 0, GEO.magnetFront + 0.02);
  scene.add(label, front);
  arms.push({ side, arm, labels: [label, front] });
}
const bend = addMesh(new THREE.BoxGeometry(2 * POLE_OUT, PH, 3.4), mat.yoke, scene);
bend.position.set(0, 0, GEO.magnetBack - 1.7);

// Beschriftung N/S und Farben nach der Lage des Magneten (magnet = +1: Nordpol links)
let shownMagnet = null;
function syncMagnet() {
  if (shownMagnet === state.magnet) return;
  shownMagnet = state.magnet;
  for (const { side, arm, labels } of arms) {
    const north = side === -state.magnet;              // magnet +1 → linker Schenkel (side −1) ist N
    arm.material = north ? mat.north : mat.south;
    for (const label of labels) {
      label.material.map.dispose();
      const fresh = makeTextPlane(north ? 'N' : 'S', 2.4, { color: '#ffffff' });
      label.material = fresh.material;
    }
  }
}

// ---------------- Lager und Achse
// Der vordere Lagerbock lässt sich zur Seite schieben (zum Abnehmen von Kommutator bzw. Schleifringen)
export const frontBearing = new THREE.Group();
scene.add(frontBearing);
for (const z of [GEO.magnetBack + 2, GEO.commZ + 3.2]) {
  const bottom = z > GEO.magnetFront ? GEO.tableY : BASE_TOP;
  const parent = z > GEO.magnetFront ? frontBearing : scene;
  const post = addMesh(new THREE.BoxGeometry(1.2, -bottom - 0.6, 1.2), mat.plastic, parent);
  post.position.set(0, (bottom - 0.6) / 2, z);
  const eye = addMesh(new THREE.TorusGeometry(0.45, 0.18, 10, 24), mat.plastic, parent);
  eye.position.set(0, 0, z);
}

// ---------------- Drehbarer Teil: Leiterschleife, Achse, Kommutator / Schleifringe
export const rotor = new THREE.Group();
scene.add(rotor);
rod([0, 0, GEO.magnetBack + 1.2], [0, 0, GEO.commZ + 3.8], 0.2, mat.steel, rotor);

// Leiterseiten A (bei phi = 0 rechts) und B, hintere Querseite
rod([A, 0, -HL], [A, 0, HL], W, mat.copper, rotor);
rod([-A, 0, -HL], [-A, 0, HL], W, mat.copper, rotor);
rod([A, 0, -HL], [-A, 0, -HL], W, mat.copper, rotor);
// Markierungsringe in den Farben der Kommutatorhälften
for (const [x, material] of [[A, mat.halfA], [-A, mat.halfB]]) {
  const ring = addMesh(new THREE.CylinderGeometry(W * 1.9, W * 1.9, 0.9, 16), material, rotor);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0, HL - 1.2);
}

// Kommutator und Schleifringe lassen sich abnehmen; ihre Zuleitungen bleiben an der Schleife
export const commutator = new THREE.Group();
export const sliprings = new THREE.Group();
const commLeads = new THREE.Group();
const ringLeads = new THREE.Group();
rotor.add(commutator, sliprings, commLeads, ringLeads);
const CZ = GEO.commZ, CR = GEO.commRadius, CL = GEO.commLength;

// Kommutator: zwei Halbschalen; Hälfte A liegt bei phi = 0 rechts (Richtung +x)
function halfShell(centerDeg, material) {
  const gap = COMMUTATOR.gapHalf * 180 / Math.PI;                   // halbe sichtbare Lücke in Grad
  // CylinderGeometry: Winkel θ liegt nach Drehung um x bei der Richtung θ − 90° in der xy-Ebene
  const start = THREE.MathUtils.degToRad(centerDeg + 90 - (90 - gap));
  const geo = new THREE.CylinderGeometry(CR, CR, CL, 32, 1, false, start, THREE.MathUtils.degToRad(180 - 2 * gap));
  geo.rotateX(Math.PI / 2);
  const mesh = addMesh(geo, material, commutator);
  mesh.position.z = CZ;
  return mesh;
}
halfShell(0, mat.halfA);
halfShell(180, mat.halfB);
const commCore = addMesh(new THREE.CylinderGeometry(CR * 0.55, CR * 0.55, CL, 20), mat.plastic, commutator);
commCore.rotation.x = Math.PI / 2;
commCore.position.z = CZ;
// Zuleitungen von den Leiterseiten zu den Hälften
rod([A, 0, HL], [CR * 0.8, 0, CZ - CL / 2], W * 0.8, mat.copper, commLeads);
rod([-A, 0, HL], [-CR * 0.8, 0, CZ - CL / 2], W * 0.8, mat.copper, commLeads);

// Schleifringe: Ring A hinten, Ring B vorne, mit deutlichem Abstand auf einer Isoliernabe.
// Jede Leiterseite ist über eine Zuleitung in der Farbe ihres Rings mit genau diesem Ring verbunden;
// die Zuleitung von B läuft isoliert durch die Öffnung von Ring A hindurch.
const RING_W = 0.8, RING_Z = { A: CZ - 1.25, B: CZ + 1.25 };
const HUB_R = CR * 0.35, HOLE_R = CR * 0.74, PASS_R = (HUB_R + HOLE_R) / 2, LUG_R = CR * 0.87;
function ringGeometry(inner) {
  const shape = new THREE.Shape().absarc(0, 0, CR, 0, 2 * Math.PI);
  shape.holes.push(new THREE.Path().absarc(0, 0, inner, 0, 2 * Math.PI, true));
  return new THREE.ExtrudeGeometry(shape, { depth: RING_W, bevelEnabled: false, curveSegments: 48 });
}
for (const [key, material, inner] of [['A', mat.halfA, HOLE_R], ['B', mat.halfB, HUB_R]]) {
  const ring = addMesh(ringGeometry(inner), material, sliprings);
  ring.position.z = RING_Z[key] - RING_W / 2;
}
const ringCore = addMesh(new THREE.CylinderGeometry(HUB_R, HUB_R, RING_Z.B - RING_Z.A + RING_W + 0.6, 20), mat.plastic, sliprings);
ringCore.rotation.x = Math.PI / 2;
ringCore.position.z = CZ - 0.3;
// Isolierstege halten Ring A auf der Nabe (nicht dort, wo die Zuleitung B durchläuft)
for (const deg of [0, 120, 240]) {
  const a = THREE.MathUtils.degToRad(deg);
  rod([HUB_R * Math.cos(a), HUB_R * Math.sin(a), RING_Z.A], [HOLE_R * Math.cos(a), HOLE_R * Math.sin(a), RING_Z.A], 0.12, mat.plastic, sliprings);
}
// Zuleitung A: Leiterseite A → Rückseite von Ring A
const leadW = W * 0.6;
const backA = RING_Z.A - RING_W / 2, backB = RING_Z.B - RING_W / 2;
rod([A, 0, HL], [LUG_R, 0, backA - 0.5], leadW, mat.halfA, ringLeads);
rod([LUG_R, 0, backA - 0.5], [LUG_R, 0, backA], leadW, mat.halfA, ringLeads);
// Zuleitung B: Leiterseite B → durch Ring A hindurch → Rückseite von Ring B (in der Lücke sichtbar)
const pathB = [[-A, 0, HL], [-PASS_R, 0, backA - 0.6], [-PASS_R, 0, CZ], [-LUG_R, 0, backB - 0.2], [-LUG_R, 0, backB]];
for (let k = 1; k < pathB.length; k++) rod(pathB[k - 1], pathB[k], leadW, mat.halfB, ringLeads);
for (const p of pathB.slice(1, -1)) addMesh(new THREE.SphereGeometry(leadW, 12, 8), mat.halfB, ringLeads).position.set(...p);
addMesh(new THREE.SphereGeometry(leadW, 12, 8), mat.halfA, ringLeads).position.set(LUG_R, 0, backA - 0.5);
// Lötstellen auf den Ringen
for (const [x, z] of [[LUG_R, backA], [-LUG_R, backB]]) {
  const lug = addMesh(new THREE.CylinderGeometry(leadW * 1.7, leadW * 1.7, 0.16, 14), mat.steel, sliprings);
  lug.rotation.x = Math.PI / 2;
  lug.position.set(x, 0, z - 0.08);
}

// ---------------- Bürsten (feststehend) mit Haltern; die Kabel zum Netzgerät stehen in netzgeraet.js
// Drehpunkt jeder Gruppe ist der Fuß des Halters auf dem Tisch (dort hängt auch das Kabel):
// rotation.z = −side · Winkel schwenkt die Bürste nach außen.
export const brushes = {};
for (const side of [-1, 1]) {
  const group = new THREE.Group();
  group.position.set(side * (CR + 1.4), GEO.tableY, 0);
  scene.add(group);
  const top = -GEO.tableY;                                   // Höhe der Achse über dem Fuß
  // Bürste so breit wie der Winkel COMMUTATOR.brushHalf am Kommutator
  const brush = addMesh(new THREE.BoxGeometry(1.2, 2 * CR * Math.tan(COMMUTATOR.brushHalf), 0.9), mat.carbon, group);
  brush.position.set(-side * 0.8, top, 0);
  const holder = addMesh(new THREE.BoxGeometry(0.3, top, 0.3), mat.steel, group);
  holder.position.set(0, top / 2, 0);
  rod([-side * 0.2, top, 0], [0, top, 0], 0.15, mat.steel, group);
  brushes[side] = group;
}
/** Fußpunkt des Bürstenhalters auf dem Tisch (Anschluss für das Kabel), side −1 links, +1 rechts */
export function brushFoot(side) {
  return new THREE.Vector3(side * (CR + 1.4), GEO.tableY, brushes[side].position.z);
}

// ---------------- Feldlinien zwischen den Polen
export const fieldLines = new THREE.Group();
scene.add(fieldLines);
for (const y of [-2.6, 0, 2.6]) {
  for (const z of [-3.6, 0, 3.6]) {
    const arrow = makeArrow(mat.field, 0.1);
    setArrow(arrow, 2 * POLE_IN - 0.4, 1.0);
    arrow.rotation.z = -Math.PI / 2;                 // +y → +x
    arrow.position.set(-POLE_IN + 0.2, y, z);
    arrow.renderOrder = 5;
    fieldLines.add(arrow);
  }
}
const fieldLabel = makeTextPlane('B', 1.6, { color: '#1e88e5' });
fieldLabel.position.set(POLE_IN - 1.4, 3.6, 3.6);
fieldLines.add(fieldLabel);

// ---------------- Stromrichtung: wandernde Spitzen auf den Leiterseiten
const currentMarks = { a: [], b: [] };
for (const [key, x] of [['a', A], ['b', -A]]) {
  for (let k = 0; k < 3; k++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 14), mat.current);
    cone.position.x = x;
    rotor.add(cone);
    currentMarks[key].push(cone);
  }
}

// ---------------- Kraftpfeile (in Weltkoordinaten, immer senkrecht)
const forceArrows = { a: makeArrow(mat.force, 0.2), b: makeArrow(mat.force, 0.2) };
scene.add(forceArrows.a, forceArrows.b);
const forceLabels = { a: makeTextPlane('F', 1.4, { color: '#d32f2f' }), b: makeTextPlane('F', 1.4, { color: '#d32f2f' }) };
scene.add(forceLabels.a, forceLabels.b);

// ---------------- Abgleich mit dem Zustand (jedes Bild)
let flow = 0;
export function syncApparatus(dt) {
  syncMagnet();
  rotor.rotation.z = state.phi;
  const ring = state.mode === 'schleifringe';
  commutator.visible = commLeads.visible = !ring;
  sliprings.visible = ringLeads.visible = ring;

  // Bürsten: Kommutator → beide auf derselben Höhe; Schleifringe → links Ring B, rechts Ring A
  brushes[-1].position.z = ring ? RING_Z.B : CZ;
  brushes[1].position.z = ring ? RING_Z.A : CZ;

  // Feldlinien: Richtung von N nach S
  fieldLines.visible = state.showField;
  fieldLines.rotation.y = state.magnet > 0 ? 0 : Math.PI;

  // Stromrichtung
  const i = sideCurrents(state.phi, state);
  flow += dt * 4;
  for (const key of ['a', 'b']) {
    const iz = i[key];
    for (const [k, cone] of currentMarks[key].entries()) {
      cone.visible = state.showCurrent && iz !== 0;
      if (!cone.visible) continue;
      const t = ((flow * Math.min(1, Math.abs(iz) / 2 + 0.3) + k / 3) % 1);
      cone.position.z = Math.sign(iz) * (-HL + 1 + t * (2 * HL - 2));
      cone.rotation.x = Math.sign(iz) * Math.PI / 2;    // Spitze in Stromrichtung (±z)
    }
  }

  // Kräfte auf die Leiterseiten
  for (const key of ['a', 'b']) {
    const f = forceY(i[key], state);
    const arrow = forceArrows[key], label = forceLabels[key];
    const visible = state.showForces && f !== 0;
    arrow.visible = label.visible = visible;
    if (!visible) continue;
    const sign = key === 'a' ? 1 : -1;
    const x = sign * A * Math.cos(state.phi), y = sign * A * Math.sin(state.phi);
    const length = 2 + 4.5 * Math.abs(f) / (5 * MODEL.sideLength * MODEL.field);
    setArrow(arrow, length);
    arrow.rotation.z = f > 0 ? 0 : Math.PI;
    arrow.position.set(x, y + Math.sign(f) * 0.5, 0);
    label.position.set(x + 1.1, y + Math.sign(f) * (length + 0.8), 0);
  }
}
