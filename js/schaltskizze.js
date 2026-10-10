// ------------------------------------------------------------------
// Schaltskizze: Blick entlang der Drehachse (von vorne, wie die Kamera „Von vorne“)
// Pole, Leiterschleife mit ⊙/⊗, mitdrehender Kommutator (oder Schleifringe), Bürsten,
// Schalter und Batterie. Dreht synchron mit der 3D-Schleife.
// ------------------------------------------------------------------
import { state } from './state.js';
import { sideCurrents, forceY } from './physik.js';
import { COMMUTATOR } from './config.js';
import { COLOR_A, COLOR_B } from './materialien.js';

const $ = id => document.getElementById(id);
const INK = '#33404d', COPPER = '#c46a2b', CURRENT = '#f57c00', FORCE = '#d32f2f';

function arrowHead(ctx, x, y, angle, size = 9) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

// Strompfeil auf einer Strecke von p nach q (Spitze in der Mitte)
function currentOnLine(ctx, p, q) {
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
  ctx.fillStyle = CURRENT;
  arrowHead(ctx, mx + (q.x - p.x) * 0.06, my + (q.y - p.y) * 0.06, Math.atan2(q.y - p.y, q.x - p.x), 11);
}

export function drawSketch() {
  const cv = $('sketchCanvas');
  const W = cv.clientWidth, H = cv.clientHeight;
  if (W === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const u = W / 100;                              // Zeichnungseinheit
  const cx = W / 2, cy = 40 * u;                  // Drehachse (Platz oben für Kraftpfeile)
  const R = 22 * u;                               // Abstand der Leiterseiten
  const rc = 6.5 * u;                             // Kommutator
  const i = sideCurrents(state.phi, state);
  const ring = state.mode === 'schleifringe';

  // Pole und Feld
  const northLeft = state.magnet > 0;
  for (const side of [-1, 1]) {
    const north = (side < 0) === northLeft;
    ctx.fillStyle = north ? '#d32f2f' : '#2e7d32';
    const x = side < 0 ? 0 : W - 9 * u;
    ctx.fillRect(x, cy - 24 * u, 9 * u, 48 * u);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${7 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(north ? 'N' : 'S', x + 4.5 * u, cy);
  }
  if (state.showField) {
    ctx.strokeStyle = ctx.fillStyle = 'rgba(30, 136, 229, 0.35)';
    ctx.lineWidth = 1.5;
    for (const dy of [-17, -6, 6, 17]) {
      const y = cy + dy * u;
      ctx.beginPath(); ctx.moveTo(10 * u, y); ctx.lineTo(W - 10 * u, y); ctx.stroke();
      const dir = northLeft ? 0 : Math.PI;
      arrowHead(ctx, northLeft ? W - 14 * u : 14 * u, y, dir, 8);
    }
  }

  // Bahn der Leiterseiten
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = '#9aa5b1';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
  ctx.setLineDash([]);

  // Leiterschleife (von vorne gesehen eine Linie) mit den beiden Seiten
  const ang = -state.phi;                          // Canvas: y nach unten
  const pa = { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  const pb = { x: cx - R * Math.cos(ang), y: cy - R * Math.sin(ang) };
  ctx.strokeStyle = COPPER;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();

  // Bürsten, Leitungen, Schalter, Batterie
  const brushX = rc + 3.5 * u;
  const yb = cy + 41 * u;                           // Höhe der Batterie: knapp unter den Kraftpfeilen
  const leftX = 18 * u, rightX = W - 18 * u;
  const flowing = i.a !== 0;
  const plusLeft = state.polarity > 0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  // linke Leitung mit Schalter
  const swY = cy + 29 * u;
  ctx.beginPath();
  ctx.moveTo(cx - brushX - 3 * u, cy); ctx.lineTo(leftX, cy); ctx.lineTo(leftX, swY - 5 * u);
  ctx.moveTo(leftX, swY + 5 * u); ctx.lineTo(leftX, yb); ctx.lineTo(cx - 6 * u, yb);
  // rechte Leitung
  ctx.moveTo(cx + brushX + 3 * u, cy); ctx.lineTo(rightX, cy); ctx.lineTo(rightX, yb); ctx.lineTo(cx + 6 * u, yb);
  ctx.stroke();
  // Schalter
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(leftX, swY + 5 * u, 2, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(leftX, swY - 5 * u, 2, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(leftX, swY + 5 * u);
  if (state.powerOn) ctx.lineTo(leftX, swY - 5 * u);
  else ctx.lineTo(leftX - 7 * u, swY - 4 * u);
  ctx.stroke();
  // Batterie: langer Strich = Pluspol
  const plusX = plusLeft ? cx - 2 * u : cx + 2 * u, minusX = plusLeft ? cx + 2 * u : cx - 2 * u;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(plusX, yb - 6 * u); ctx.lineTo(plusX, yb + 6 * u); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(minusX, yb - 4 * u); ctx.lineTo(minusX, yb + 4 * u); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 6 * u, yb); ctx.lineTo(cx - 2 * u, yb); ctx.moveTo(cx + 2 * u, yb); ctx.lineTo(cx + 6 * u, yb); ctx.stroke();
  ctx.font = `bold ${5.5 * u}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#c62828';
  ctx.fillText('+', plusX + (plusLeft ? -4 : 4) * u, yb - 6 * u);
  ctx.fillStyle = '#1e5bc6';
  ctx.fillText('−', minusX + (plusLeft ? 4 : -4) * u, yb - 6 * u);

  // Stromrichtung (technisch, von + nach −) auf den Leitungen
  if (flowing && state.showCurrent) {
    const up = plusLeft;   // links fließt der Strom vom Pluspol hinauf zur Bürste
    currentOnLine(ctx, { x: leftX, y: up ? yb : swY - 5 * u }, { x: leftX, y: up ? swY - 5 * u : yb });
    const atBrush = { x: cx - brushX, y: cy }, atCorner = { x: leftX, y: cy };
    currentOnLine(ctx, up ? atCorner : atBrush, up ? atBrush : atCorner);
    currentOnLine(ctx, { x: rightX, y: up ? cy : yb }, { x: rightX, y: up ? yb : cy });
  }

  // Kommutator bzw. Schleifringe
  if (!ring) {
    const gap = COMMUTATOR.gapHalf;
    for (const [center, color] of [[ang, COLOR_A], [ang + Math.PI, COLOR_B]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.5 * u;
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(cx, cy, rc - 2 * u, center - Math.PI / 2 + gap, center + Math.PI / 2 - gap); ctx.stroke();
    }
    ctx.lineCap = 'round';
  } else {
    for (const [r, color] of [[rc - 3.5 * u, COLOR_A], [rc + 1.5 * u, COLOR_B]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5 * u;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
    }
  }
  // Verbindung Leiterseite → Kommutatorhälfte bzw. Ring
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = COLOR_A;
  ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(cx + (rc - 1 * u) * Math.cos(ang), cy + (rc - 1 * u) * Math.sin(ang)); ctx.stroke();
  ctx.strokeStyle = COLOR_B;
  ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(cx - (rc - 1 * u) * Math.cos(ang), cy - (rc - 1 * u) * Math.sin(ang)); ctx.stroke();
  ctx.setLineDash([]);
  // Achse
  ctx.fillStyle = '#5b636c';
  ctx.beginPath(); ctx.arc(cx, cy, 1.6 * u, 0, 2 * Math.PI); ctx.fill();
  // Bürsten
  ctx.fillStyle = '#333';
  const bw = 4 * u, bh = 2 * rc * Math.tan(COMMUTATOR.brushHalf);   // Bürste so breit wie im Modell
  if (!ring) {
    ctx.fillRect(cx - rc - bw + 0.5 * u, cy - bh / 2, bw, bh);
    ctx.fillRect(cx + rc - 0.5 * u, cy - bh / 2, bw, bh);
  } else {
    // links berührt den äußeren Ring (B), rechts den inneren Ring (A)
    ctx.fillRect(cx - rc - 3 * u - bw + 0.5 * u, cy - bh / 2, bw, bh);
    ctx.fillRect(cx + rc + 3 * u - 0.5 * u, cy - bh / 2, bw, bh);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + rc + 3 * u, cy); ctx.lineTo(cx + rc - 3.5 * u + 1.75 * u, cy); ctx.stroke();
  }
  // Lücke unter einer Bürste markieren
  if (i.gap && state.powerOn && state.showCurrent) {
    ctx.strokeStyle = FORCE;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(cx + side * rc, cy, 4.5 * u, 0, 2 * Math.PI); ctx.stroke();
    }
  }

  // Leiterseiten mit Stromsymbol ⊙ / ⊗
  for (const [p, iz, color] of [[pa, i.a, COLOR_A], [pb, i.b, COLOR_B]]) {
    ctx.fillStyle = COPPER;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5.5 * u, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    if (iz !== 0 && state.showCurrent) {
      ctx.fillStyle = ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      if (iz > 0) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4 * u, 0, 2 * Math.PI); ctx.fill();
      } else {
        const d = 2.6 * u;
        ctx.beginPath(); ctx.moveTo(p.x - d, p.y - d); ctx.lineTo(p.x + d, p.y + d);
        ctx.moveTo(p.x - d, p.y + d); ctx.lineTo(p.x + d, p.y - d); ctx.stroke();
      }
    }
    // Kraft (senkrecht)
    const f = forceY(iz, state);
    if (f !== 0 && state.showForces) {
      const len = 9 * u;
      const dir = f > 0 ? -1 : 1;
      ctx.strokeStyle = ctx.fillStyle = FORCE;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y + dir * 6 * u); ctx.lineTo(p.x, p.y + dir * (6 * u + len)); ctx.stroke();
      arrowHead(ctx, p.x, p.y + dir * (6 * u + len + 4), dir > 0 ? Math.PI / 2 : -Math.PI / 2, 10);
    }
  }
}

/** Kurzer Text zum Kontakt der Bürsten */
export function sketchStatus() {
  const i = sideCurrents(state.phi, state);
  if (!state.powerOn) return 'Schalter offen: Es fließt kein Strom.';
  if (state.current === 0) return 'Die Stromstärke ist null.';
  if (state.mode === 'schleifringe') {
    return 'Schleifringe: Jede Bürste berührt immer denselben Ring. Der Strom in der Schleife wird nie umgepolt.';
  }
  if (i.gap) return 'Die Bürsten liegen auf den Lücken: Der Stromkreis ist kurz unterbrochen. Die Schleife dreht durch ihren Schwung weiter.';
  const left = i.rightBrush === 'A' ? 'türkisen' : 'goldenen';
  const right = i.rightBrush === 'A' ? 'goldenen' : 'türkisen';
  return `Linke Bürste an der ${left} Hälfte, rechte Bürste an der ${right} Hälfte.`;
}
