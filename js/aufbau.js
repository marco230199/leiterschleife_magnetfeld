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
for (const z of [GEO.magnetBack + 2, GEO.commZ + 3.2]) {
  const bottom = z > GEO.magnetFront ? GEO.tableY : BASE_TOP;
  const post = addMesh(new THREE.BoxGeometry(1.2, -bottom - 0.6, 1.2), mat.plastic, scene);
  post.position.set(0, (bottom - 0.6) / 2, z);
  const eye = addMesh(new THREE.TorusGeometry(0.45, 0.18, 10, 24), mat.plastic, scene);
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

const commutator = new THREE.Group();
const sliprings = new THREE.Group();
rotor.add(commutator, sliprings);
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
rod([A, 0, HL], [CR * 0.8, 0, CZ - CL / 2], W * 0.8, mat.copper, commutator);
rod([-A, 0, HL], [-CR * 0.8, 0, CZ - CL / 2], W * 0.8, mat.copper, commutator);

// Schleifringe: Ring A hinten, Ring B vorne
const RING_Z = { A: CZ - 0.75, B: CZ + 0.75 };
for (const [key, material] of [['A', mat.halfA], ['B', mat.halfB]]) {
  const ring = addMesh(new THREE.CylinderGeometry(CR, CR, 1.1, 32), material, sliprings);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = RING_Z[key];
}
const ringCore = addMesh(new THREE.CylinderGeometry(CR * 0.55, CR * 0.55, CL + 0.4, 20), mat.plastic, sliprings);
ringCore.rotation.x = Math.PI / 2;
ringCore.position.z = CZ;
rod([A, 0, HL], [CR * 0.8, 0, RING_Z.A - 0.55], W * 0.8, mat.copper, sliprings);
rod([-A, 0, HL], [-CR * 0.2, 0.6, RING_Z.B - 0.55], W * 0.8, mat.copper, sliprings);

// ---------------- Bürsten (feststehend) mit Haltern und Zuleitungen
const brushes = {};
for (const side of [-1, 1]) {
  const group = new THREE.Group();
  scene.add(group);
  // Bürste so breit wie der Winkel COMMUTATOR.brushHalf am Kommutator
  const brush = addMesh(new THREE.BoxGeometry(1.2, 2 * CR * Math.tan(COMMUTATOR.brushHalf), 0.9), mat.carbon, group);
  brush.position.set(side * (CR + 0.6), 0, 0);
  const holder = addMesh(new THREE.BoxGeometry(0.3, -GEO.tableY, 0.3), mat.steel, group);
  holder.position.set(side * (CR + 1.4), GEO.tableY / 2, 0);
  rod([side * (CR + 1.2), 0, 0], [side * (CR + 1.4), 0, 0], 0.15, mat.steel, group);
  brushes[side] = group;
}
// Zuleitungen vom Fuß der Halter nach vorne (zur Schaltskizze)
const leads = {};
for (const side of [-1, 1]) {
  leads[side] = addMesh(new THREE.BoxGeometry(0.5, 0.5, 1), mat.cableRed, scene);
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
  commutator.visible = !ring;
  sliprings.visible = ring;

  // Bürsten: Kommutator → beide auf derselben Höhe; Schleifringe → links Ring B, rechts Ring A
  brushes[-1].position.z = ring ? RING_Z.B : CZ;
  brushes[1].position.z = ring ? RING_Z.A : CZ;
  // Zuleitung: Pluspol rot, Minuspol blau (Polung)
  for (const side of [-1, 1]) {
    const plus = side === -state.polarity;           // polarity +1: links Plus
    leads[side].material = plus ? mat.cableRed : mat.cableBlue;
    const z = brushes[side].position.z;
    leads[side].scale.z = 17 - z;
    leads[side].position.set(side * (CR + 1.4), GEO.tableY + 0.25, (z + 17) / 2);
  }

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
