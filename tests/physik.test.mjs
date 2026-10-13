// Tests der Physik (ohne Browser): npm test  bzw.  node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL } from '../js/config.js';
import { sideCurrents, torque, step, forceY } from '../js/physik.js';

const deg = d => d * Math.PI / 180;
const base = () => ({ powerOn: true, current: 3, polarity: 1, magnet: 1, mode: 'kommutator', phi: deg(30), omega: 0 });

test('Kommutator: rechte Seite ⊙, linke Seite ⊗; Umpolen an der senkrechten Stellung', () => {
  const s = base();
  let i = sideCurrents(deg(20), s);
  assert.equal(i.rightBrush, 'A');
  assert.ok(i.a > 0 && i.b < 0, 'A rechts: zum Betrachter');
  i = sideCurrents(deg(160), s);
  assert.equal(i.rightBrush, 'B');
  assert.ok(i.a < 0 && i.b > 0, 'nach der halben Drehung ist A links: Strom umgepolt');
  i = sideCurrents(deg(90), s);
  assert.equal(i.gap, true);
  assert.equal(i.a, 0, 'auf der Lücke kein Strom');
});

test('Kraft: Strom zum Betrachter, Feld nach rechts → Kraft nach oben', () => {
  assert.ok(forceY(1, { magnet: 1 }) > 0);
  assert.ok(forceY(1, { magnet: -1 }) < 0, 'Magnet umgedreht');
  assert.ok(Math.abs(forceY(3, { magnet: 1 }) - 3 * MODEL.sideLength * MODEL.field) < 1e-12, 'F = I·L·B');
});

test('Kommutator: Drehmoment hat in jeder Stellung dasselbe Vorzeichen (außer auf der Lücke)', () => {
  const s = base();
  for (let d = 0; d < 360; d += 5) {
    const t = torque(deg(d), s);
    if (sideCurrents(deg(d), s).gap) assert.equal(t, 0);
    else assert.ok(t > 0, `${d}°: gegen den Uhrzeigersinn`);
  }
  assert.ok(torque(deg(30), { ...s, polarity: -1 }) < 0, 'Polung umgekehrt: andere Drehrichtung');
  assert.ok(torque(deg(30), { ...s, magnet: -1 }) < 0, 'Magnet umgedreht: andere Drehrichtung');
});

test('Kommutator: Schleife dreht sich dauerhaft in eine Richtung', () => {
  const s = base();
  for (let k = 0; k < 600; k++) step(s, 1 / 60);      // 10 s
  let turned = 0;
  for (let k = 0; k < 300; k++) { const before = s.phi; step(s, 1 / 60); turned += ((s.phi - before + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; }
  assert.ok(s.omega > 1, `dreht sich (ω = ${s.omega.toFixed(2)} rad/s)`);
  assert.ok(turned > 2 * Math.PI, 'in 5 s mehr als eine Umdrehung');
});

test('Schleifringe: Schleife pendelt und bleibt senkrecht stehen', () => {
  const s = { ...base(), mode: 'schleifringe' };
  for (let k = 0; k < 60 * 40; k++) step(s, 1 / 60);   // 40 s
  assert.ok(Math.abs(s.omega) < 0.05, 'kommt zur Ruhe');
  assert.ok(Math.abs(s.phi - deg(90)) < deg(6), `steht senkrecht (${(s.phi * 180 / Math.PI).toFixed(1)}°)`);
});

test('ohne Strom: keine Kraft, die Schleife läuft aus und bleibt stehen', () => {
  const s = { ...base(), powerOn: false, omega: 3 };
  assert.equal(torque(s.phi, s), 0);
  for (let k = 0; k < 60 * 20; k++) step(s, 1 / 60);
  assert.equal(s.omega, 0);
});

test('Totpunkt: Schleife steht genau senkrecht und läuft mit Kommutator nicht von selbst an', () => {
  const s = { ...base(), phi: deg(90) };
  for (let k = 0; k < 120; k++) step(s, 1 / 60);
  assert.ok(Math.abs(s.phi - deg(90)) < 1e-9, 'bleibt stehen');
});

test('Kommutator: stromlose Phase (Lücke 40°, Bürste 20° → je ±10° um die senkrechte Stellung)', () => {
  const s = base();
  let without = 0;
  for (let d = 0; d < 360; d++) if (sideCurrents(deg(d + 0.5), s).gap) without++;
  assert.equal(without, 40, '2 × 20° pro Umdrehung ohne Strom');
  assert.equal(sideCurrents(deg(85), s).gap, true, '5° vor der Senkrechten: kein Strom');
  assert.equal(sideCurrents(deg(75), s).gap, false, '15° vor der Senkrechten: Strom fließt');
});

test('Kommutator bzw. Schleifringe abgenommen: kein Strom, keine Kraft, keine Drehung', () => {
  for (const mode of ['kommutator', 'schleifringe']) {
    const s = { ...base(), mode, commutatorOn: false };
    const i = sideCurrents(deg(30), s);
    assert.equal(i.a, 0);
    assert.equal(i.b, 0);
    assert.equal(i.removed, true);
    step(s, 1);
    assert.equal(s.omega, 0);
  }
});
