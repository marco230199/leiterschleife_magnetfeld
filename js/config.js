// ------------------------------------------------------------------
// Modellgrößen und Maße
// Simulationscharakter: Die Werte sind so gewählt, dass die Bewegung gut zu beobachten ist.
// ------------------------------------------------------------------

// Physikalisches Modell (SI)
export const MODEL = {
  field: 0.1,              // Magnetfeld B des Hufeisenmagneten in T (homogen)
  sideLength: 0.10,        // Länge einer Leiterseite (parallel zur Drehachse) in m
  radius: 0.04,            // Abstand der Leiterseiten von der Drehachse in m
  inertia: 6e-4,           // Trägheitsmoment der Schleife in kg·m²
  damping: 4e-4,           // Reibung proportional zur Drehgeschwindigkeit in N·m·s
  staticFriction: 6e-5,    // Haftreibung (Mindestdrehmoment zum Anlaufen) in N·m
};

// Kommutator: Lücken zwischen den Hälften und Breite der Bürsten (Winkel um die Achse).
// Kein Strom, solange eine Bürste ganz über einer Lücke liegt:
// |Abstand zur Lückenmitte| < halbe Lücke − halbe Bürstenbreite.
export const COMMUTATOR = {
  gapHalf: 20 * Math.PI / 180,     // halbe Breite einer Lücke (Lücke insgesamt 40°)
  brushHalf: 10 * Math.PI / 180,   // halbe Breite einer Bürste
};
MODEL.gapAngle = COMMUTATOR.gapHalf - COMMUTATOR.brushHalf;   // 10°: stromlos je ±10° um die Senkrechte

// Regler
export const RANGES = {
  current: { min: 0, max: 5, step: 0.1, start: 3 },    // Stromstärke in A
  angle: { min: 0, max: 360, step: 1 },               // Drehwinkel in Grad (nur angehalten)
};
export const START_ANGLE = 30 * Math.PI / 180;         // Startstellung der Schleife
export const PUSH_SPEED = 2.5;                        // „Anstoßen“: Winkelgeschwindigkeit in rad/s

// 3D-Maße in cm (1 Einheit = 1 cm); Drehachse = z-Achse (zum Betrachter), Feld in x-Richtung
export const GEO = {
  loopRadius: MODEL.radius * 100,        // 4 cm
  loopHalfLength: MODEL.sideLength * 50, // 5 cm
  wire: 0.28,                            // Drahtradius
  poleGap: 6.2,                          // Polschuhe bei x = ±poleGap
  poleWidth: 3.2,                        // Dicke eines Schenkels in x
  poleHeight: 8.5,                       // Höhe der Schenkel
  magnetFront: 6.2,                      // vordere Kante der Schenkel (z)
  magnetBack: -11,                       // hintere Kante der Schenkel (z), dahinter der Bogen
  commZ: 9,                              // Mitte des Kommutators auf der Achse (z)
  commRadius: 1.1,
  commLength: 2.2,
  tableY: -10,                           // Oberkante des Tischs
};
