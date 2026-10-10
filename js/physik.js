// ------------------------------------------------------------------
// Physik der Leiterschleife (ohne 3D, testbar mit node --test)
//
// Blick von vorne entlang der Drehachse (z zeigt zum Betrachter), Magnetfeld in x-Richtung.
// Leiterseite A liegt beim Winkel phi, Leiterseite B gegenüber (phi + 180°).
// Strom in einer Leiterseite: positiv = zum Betrachter (⊙), negativ = vom Betrachter weg (⊗).
// Technische Stromrichtung; Kraft F = I · L × B (Drei-Finger-Regel der rechten Hand).
// ------------------------------------------------------------------
import { MODEL } from './config.js';

/**
 * Ströme in den Leiterseiten A und B und Kontakt der Bürsten.
 * Kommutator: Die Hälfte A ist mit Seite A verbunden und liegt bei phi = 0 an der rechten Bürste.
 * Die linke Bürste ist bei polarity = +1 der Pluspol. Liegen die Bürsten auf der Lücke
 * (Schleife fast senkrecht), ist der Stromkreis unterbrochen.
 * Schleifringe: Seite A ist immer mit der rechten Bürste verbunden.
 * @returns {{ a: number, b: number, gap: boolean, rightBrush: 'A'|'B'|null }}
 */
export function sideCurrents(phi, s) {
  const on = s.powerOn && s.current > 0;
  if (s.mode === 'schleifringe') {
    const i = on ? s.polarity * s.current : 0;
    return { a: i, b: -i, gap: false, rightBrush: 'A' };
  }
  const c = Math.cos(phi);
  if (Math.abs(c) < Math.sin(MODEL.gapAngle)) return { a: 0, b: 0, gap: true, rightBrush: null };
  // Strom kommt über die linke Bürste in die Seite, die gerade links liegt, und fließt dort
  // vom Betrachter weg; in der rechten Seite fließt er zum Betrachter hin.
  const i = on ? s.polarity * s.current * Math.sign(c) : 0;
  return { a: i, b: -i, gap: false, rightBrush: c > 0 ? 'A' : 'B' };
}

/** Lage der Leiterseiten (in m) beim Winkel phi */
export function sidePositions(phi) {
  const x = MODEL.radius * Math.cos(phi), y = MODEL.radius * Math.sin(phi);
  return { a: { x, y }, b: { x: -x, y: -y } };
}

/** Kraft in y-Richtung auf eine Leiterseite mit Strom iz: F = I · L · B (z × x = y) */
export function forceY(iz, s) {
  return iz * MODEL.sideLength * MODEL.field * s.magnet;
}

/** Drehmoment der Magnetkräfte (positiv: gegen den Uhrzeigersinn, Blick von vorne) */
export function torque(phi, s) {
  const i = sideCurrents(phi, s);
  const p = sidePositions(phi);
  return p.a.x * forceY(i.a, s) + p.b.x * forceY(i.b, s);
}

/**
 * Bewegung um dt weiterrechnen (Trägheit, Reibung, Haftreibung).
 * Verändert s.phi und s.omega.
 */
export function step(s, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.002));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    const tau = torque(s.phi, s);
    if (s.omega === 0 && Math.abs(tau) <= MODEL.staticFriction) continue;   // haftet
    let alpha = (tau - MODEL.damping * s.omega - Math.sign(s.omega || tau) * MODEL.staticFriction) / MODEL.inertia;
    const before = s.omega;
    s.omega += alpha * h;
    // Haftreibung lässt die Drehung zur Ruhe kommen, statt sie umzukehren
    if (before !== 0 && Math.sign(s.omega) !== Math.sign(before) && Math.abs(tau) <= MODEL.staticFriction) s.omega = 0;
    s.phi += s.omega * h;
  }
  s.phi = ((s.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}
