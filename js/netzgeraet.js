// ------------------------------------------------------------------
// Netzgerät mit Stromanzeige, Drehknopf, Kontrolllampe und Kabeln zu den Bürsten
// Die Anzeige zeigt den tatsächlich fließenden Strom: Beim Kommutator springt sie auf 0,
// solange die Bürsten auf der Lücke liegen. „Polung umkehren“ steckt die Kabel um.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { GEO, RANGES } from './config.js';
import { state } from './state.js';
import { sideCurrents } from './physik.js';
import { addMesh, canvasTexture, makeTextPlane, makeCable, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { brushFoot } from './aufbau.js';

const W = 14, H = 9, D = 11;                     // Gehäuse in cm
const FLOOR = GEO.tableY;
const CORNER = { x: GEO.poleGap + GEO.poleWidth + 2, z: GEO.magnetFront + 1.3 };   // vordere rechte Ecke des Holzsockels

const group = new THREE.Group();
group.position.set(20, FLOOR, -3);              // rechts neben dem Magneten, etwas nach hinten versetzt
group.rotation.y = 0.2;                          // Vorderseite zur Startansicht
scene.add(group);

const housing = addMesh(new THREE.BoxGeometry(W, H, D), mat.housing, group);
housing.position.y = H / 2 + 0.4;
for (const fx of [-W / 2 + 1.5, W / 2 - 1.5]) for (const fz of [-D / 2 + 1.5, D / 2 - 1.5]) {
  const foot = addMesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12), mat.knob, group);
  foot.position.set(fx, 0.2, fz);
}
const panel = addMesh(new THREE.BoxGeometry(W - 1.2, H - 1.2, 0.3), mat.panel, group);
panel.position.set(0, H / 2 + 0.4, D / 2 + 0.1);
const FRONT = D / 2 + 0.27;

const title = makeTextPlane('Netzgerät', 1.1, { color: '#ffffff' });
title.position.set(0, H - 0.9, FRONT);
group.add(title);

// Digitalanzeige (Strom)
const display = canvasTexture(320, 110);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.1), new THREE.MeshBasicMaterial({ map: display.texture }));
screen.position.set(-2.6, H - 3.4, FRONT);
group.add(screen);
let shown = null;
function setDisplay(text) {
  if (text === shown) return;
  shown = text;
  const { ctx } = display;
  ctx.fillStyle = '#0d1a0d';
  ctx.fillRect(0, 0, 320, 110);
  ctx.fillStyle = '#5dff6a';
  ctx.font = 'bold 66px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 304, 58);
  display.texture.needsUpdate = true;
}

// Drehknopf (Stromstärke) mit Markierung
const knob = addMesh(new THREE.CylinderGeometry(1.4, 1.4, 1.1, 32), mat.knob, group);
knob.rotation.x = Math.PI / 2;
knob.position.set(3.9, H - 3.4, FRONT + 0.55);
const mark = addMesh(new THREE.BoxGeometry(0.25, 0.1, 1), mat.housing, knob);
mark.position.set(0, 0.56, -0.8);

// Kontrolllampe: leuchtet, wenn der Strom eingeschaltet ist
const led = addMesh(new THREE.SphereGeometry(0.35, 16, 12), mat.ledOff, group);
led.position.set(-4.8, 2.4, FRONT);
const ledLabel = makeTextPlane('ein', 0.7, { color: '#ffffff', bold: false });
ledLabel.position.set(-4.8, 3.4, FRONT);
group.add(ledLabel);

// Buchsen: Minus (blau) und Plus (rot)
const SOCKETS = { minus: { x: 0.9, material: mat.cableBlue, text: '−' }, plus: { x: 4.1, material: mat.cableRed, text: '+' } };
const socketWorld = {};
for (const [name, { x, material, text }] of Object.entries(SOCKETS)) {
  const socket = addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 20), material, group);
  socket.rotation.x = Math.PI / 2;
  socket.position.set(x, 2.4, FRONT + 0.45);
  const tag = makeTextPlane(text, 0.9, { color: '#ffffff' });
  tag.position.set(x, 3.6, FRONT);
  group.add(tag);
}
group.updateMatrixWorld(true);
for (const [name, { x }] of Object.entries(SOCKETS)) {
  socketWorld[name] = group.localToWorld(new THREE.Vector3(x, 2.4, FRONT + 0.9));
}
const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);   // aus der Frontplatte heraus

// ---------------- Kabel von den Buchsen zu den Fußpunkten der Bürstenhalter
let cables = [];
let cableKey = null;
function buildCables() {
  for (const c of cables) { scene.remove(c); c.geometry.dispose(); }
  cables = [];
  for (const side of [-1, 1]) {
    const plus = side === -state.polarity;                          // polarity +1: linke Bürste am Pluspol
    const s = socketWorld[plus ? 'plus' : 'minus'];
    const foot = brushFoot(side);
    const p1 = s.clone().addScaledVector(outward, 2.2).setY(s.y - 0.8);
    const p2 = s.clone().addScaledVector(outward, 4.5).setY(FLOOR);
    // auf dem Tisch um die vordere rechte Ecke des Holzsockels herum zum Halter;
    // das Kabel zur linken Bürste läuft etwas weiter vorne
    const front = foot.z + (side < 0 ? 6 : 4);
    const pts = [
      s.toArray(), p1.toArray(), p2.toArray(),
      [CORNER.x + 2, FLOOR, CORNER.z + (side < 0 ? 4.5 : 2.5)],
      [(CORNER.x + foot.x) / 2, FLOOR, front + 0.5],
      [foot.x, FLOOR, front],
      [foot.x, FLOOR, foot.z + 1.2],
      [foot.x, FLOOR + 0.9, foot.z + 0.25],
    ];
    cables.push(makeCable(pts, plus ? mat.cableRed : mat.cableBlue, scene, FLOOR, 0.25));
  }
}

/** Kabelverlauf zum Schleifkontakt links (side −1) bzw. rechts (+1), vom Netzgerät aus (für das Erklärvideo) */
export const cableCurve = side => cables[side < 0 ? 0 : 1]?.geometry.parameters.path;

// ---------------- Abgleich mit dem Zustand (jedes Bild)
export function syncSupply() {
  const key = `${state.mode}|${state.polarity}`;
  if (key !== cableKey) { cableKey = key; buildCables(); }
  const i = Math.abs(sideCurrents(state.phi, state).a);
  setDisplay(`${formatNumber(i, 2)} A`);
  led.material = state.powerOn ? mat.ledOn : mat.ledOff;
  // Knopf von −135° (0 A) bis +135° (Höchstwert)
  knob.rotation.y = THREE.MathUtils.degToRad(135 - 270 * state.current / RANGES.current.max);
}
