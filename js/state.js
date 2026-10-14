// ------------------------------------------------------------------
// Zustand der Simulation
// ------------------------------------------------------------------
import { RANGES, START_ANGLE } from './config.js';

export const state = {
  powerOn: false,                 // Schalter im Stromkreis
  current: RANGES.current.start,  // Stromstärke in A
  polarity: 1,                    // +1: Pluspol an der linken Bürste
  magnet: 1,                      // +1: Nordpol links (Feld zeigt nach rechts), −1: umgedreht
  mode: 'schleifringe',           // 'kommutator' oder 'schleifringe' (Start: ohne Kommutator)
  commutatorOn: true,             // Kommutator bzw. Schleifringe auf der Welle (sonst abgenommen)
  playing: true,
  slowMotion: false,
  // Bewegung der Schleife: Winkel der Leiterseite A gegen die Waagrechte (gegen den
  // Uhrzeigersinn, Blick von vorne) und Winkelgeschwindigkeit
  phi: START_ANGLE,
  omega: 0,
  // Anzeigen
  showField: false,               // Feldlinien erst auf Wunsch
  showCurrent: false,             // Stromrichtung erst auf Wunsch
  showForces: false,              // Lorentzkraft erst auf Wunsch
  showSketch: true,
  sketchLarge: false,             // Schaltskizze vergrößert
};
