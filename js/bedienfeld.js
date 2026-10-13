// ------------------------------------------------------------------
// Bedienfeld: Regler, Knöpfe, Statusanzeigen
// ------------------------------------------------------------------
import { RANGES, START_ANGLE, PUSH_SPEED } from './config.js';
import { state } from './state.js';
import { sideCurrents } from './physik.js';
import { formatNumber } from './hilfen.js';
import { busy, removePart, attachPart } from './abnehmen.js';
import { sketchStatus } from './schaltskizze.js';

const $ = id => document.getElementById(id);
const deg = rad => Math.round(rad * 180 / Math.PI) % 360;

export function refresh() {
  const power = $('powerBtn');
  power.classList.toggle('on', state.powerOn);
  power.textContent = state.powerOn ? 'Strom ausschalten' : 'Strom einschalten';
  power.setAttribute('aria-pressed', String(state.powerOn));
  $('currentSlider').value = state.current;
  $('currentOut').textContent = `${formatNumber(state.current, 1)} A`;
  $('polarityStatus').textContent = state.polarity > 0 ? 'Pluspol an der linken Bürste' : 'Pluspol an der rechten Bürste';
  $('magnetStatus').textContent = state.magnet > 0
    ? 'Nordpol links: Das Feld zeigt nach rechts.'
    : 'Nordpol rechts: Das Feld zeigt nach links.';
  refreshPart();
  const play = $('playBtn');
  play.textContent = state.playing ? 'Anhalten' : 'Weiter';
  play.classList.toggle('on', state.playing);
  $('slowCheck').checked = state.slowMotion;
  $('angleSlider').disabled = state.playing;
  $('angleBox').classList.toggle('disabled', state.playing);
  for (const [id, key] of [['fieldCheck', 'showField'], ['currentCheck', 'showCurrent'], ['forceCheck', 'showForces'], ['sketchCheck', 'showSketch']]) {
    $(id).checked = state[key];
  }
  $('sketch').hidden = !state.showSketch;
  $('sketch').classList.toggle('large', state.sketchLarge);
  $('sketchSizeBtn').textContent = state.sketchLarge ? 'Kleiner' : 'Größer';
  $('sketchSizeBtn').setAttribute('aria-pressed', String(state.sketchLarge));
}

// Laufend aktualisierte Texte (Winkel, Status)
export function updateLive() {
  $('angleSlider').value = deg(state.phi);
  $('angleOut').textContent = `${deg(state.phi)}°`;
  $('sketchStatus').textContent = sketchStatus();
  $('motionStatus').textContent = motionText();
  $('motionStatus').classList.toggle('warn', motionWarn());
  refreshPart();
}

/** Stromzuführung: Umschalten, Abnehmen/Aufsetzen (auch während des Umbaus aktualisiert) */
function refreshPart() {
  const moving = busy();
  const name = state.mode === 'kommutator' ? 'Kommutator' : 'Schleifringe';
  for (const button of document.querySelectorAll('[data-mode]')) {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = moving || !state.commutatorOn;
  }
  const comm = $('commBtn');
  comm.textContent = `${name} ${state.commutatorOn ? 'abnehmen' : 'aufsetzen'}`;
  comm.disabled = moving;
  let text;
  if (moving) text = 'Umbau läuft …';
  else if (!state.commutatorOn) {
    text = `${name} abgenommen: Die Bürsten berühren nichts, in der Schleife fließt kein Strom. So ist die Leiterschleife gut zu sehen. Zum Umschalten erst wieder aufsetzen.`;
  } else {
    text = state.mode === 'kommutator'
      ? 'Der Kommutator (Stromwender) polt den Strom in der Schleife bei jeder halben Umdrehung um.'
      : 'Ohne Kommutator (Schleifringe): Der Strom in der Schleife behält immer dieselbe Richtung.';
  }
  if ($('modeStatus').textContent !== text) $('modeStatus').textContent = text;
}

function motionWarn() {
  return state.playing && state.powerOn && state.current > 0 && state.omega === 0 && !busy()
    && sideCurrents(state.phi, state).gap;
}

function motionText() {
  const w = state.omega;
  if (busy()) return 'Umbau läuft …';
  if (!state.playing) return 'Angehalten: Mit dem Regler „Drehwinkel“ kannst du die Schleife in jede Stellung drehen.';
  if (!state.commutatorOn && Math.abs(w) < 0.05) {
    return `${state.mode === 'kommutator' ? 'Kommutator' : 'Schleifringe'} abgenommen: Es fließt kein Strom, die Schleife steht still.`;
  }
  if (motionWarn()) {
    return 'Totpunkt: Die Bürsten liegen auf den Lücken, es fließt kein Strom. Stoße die Schleife an!';
  }
  if (Math.abs(w) < 0.05) {
    if (state.powerOn && state.mode === 'schleifringe') return 'Die Schleife steht senkrecht still: Die Kräfte ziehen sie nur noch auseinander.';
    return state.powerOn ? 'Die Schleife steht still.' : 'Kein Strom: Die Schleife steht still.';
  }
  const dir = w > 0 ? 'gegen den Uhrzeigersinn' : 'im Uhrzeigersinn';
  return `Die Schleife dreht sich ${dir} (Blick von vorne).`;
}

export function initUi() {
  const slider = $('currentSlider');
  Object.assign(slider, RANGES.current);
  slider.value = state.current;
  slider.addEventListener('input', () => { state.current = Number(slider.value); refresh(); });
  for (const button of document.querySelectorAll('.stepper button[data-dir]')) {
    const step = () => {
      const r = RANGES.current;
      state.current = Math.min(r.max, Math.max(r.min, Math.round((state.current + Number(button.dataset.dir) * r.step) * 10) / 10));
      refresh();
    };
    let timer = null;
    const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      step();
      timer = setTimeout(() => { timer = setInterval(step, 80); }, 400);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, stop);
    button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') step(); });
  }
  $('powerBtn').addEventListener('click', () => { state.powerOn = !state.powerOn; refresh(); });
  $('polarityBtn').addEventListener('click', () => { state.polarity *= -1; refresh(); });
  $('magnetBtn').addEventListener('click', () => { state.magnet *= -1; refresh(); });
  for (const button of document.querySelectorAll('[data-mode]')) {
    button.addEventListener('click', () => { state.mode = button.dataset.mode; refresh(); });
  }
  $('commBtn').addEventListener('click', () => {
    if (state.commutatorOn) removePart(); else attachPart();
    refresh();
  });
  $('playBtn').addEventListener('click', () => { state.playing = !state.playing; refresh(); });
  $('slowCheck').addEventListener('change', e => { state.slowMotion = e.target.checked; });
  $('pushBtn').addEventListener('click', () => {
    state.omega += (state.polarity * state.magnet || 1) * PUSH_SPEED;
    state.playing = true;
    refresh();
  });
  $('resetBtn').addEventListener('click', () => {
    state.phi = START_ANGLE;
    state.omega = 0;
    refresh();
  });
  const angle = $('angleSlider');
  Object.assign(angle, RANGES.angle);
  angle.addEventListener('input', () => {
    state.phi = Number(angle.value) * Math.PI / 180;
    state.omega = 0;
  });
  $('sketchSizeBtn').addEventListener('click', () => { state.sketchLarge = !state.sketchLarge; refresh(); });
  for (const [id, key] of [['fieldCheck', 'showField'], ['currentCheck', 'showCurrent'], ['forceCheck', 'showForces'], ['sketchCheck', 'showSketch']]) {
    $(id).addEventListener('change', e => { state[key] = e.target.checked; refresh(); });
  }
}
