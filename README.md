# Leiterschleife im Magnetfeld – Kommutator

Interaktive 3D-Simulation für den Physikunterricht (Tablet geeignet): Eine drehbar gelagerte
Leiterschleife liegt im homogenen Feld eines Hufeisenmagneten. Fließt Strom, wirken auf die beiden
Leiterseiten Kräfte, und die Schleife dreht sich. Der **Kommutator** (Stromwender) polt den Strom bei
jeder halben Umdrehung um, sodass sich die Schleife dauerhaft weiterdreht – das Prinzip des
Gleichstrommotors.

Die Simulation hat bewusst **Simulationscharakter**: Bedient wird über Regler und einblendbare Hilfen,
der Stromkreis ist zusätzlich als **Schaltskizze** dargestellt. Damit der Versuchsaufbau vollständig ist,
steht im 3D-Bild ein **Netzgerät**: Es zeigt den tatsächlich fließenden Strom (beim Kommutator 0 A,
solange die Bürsten auf der Lücke liegen), der Knopf folgt der eingestellten Stromstärke, die Lampe
leuchtet bei eingeschaltetem Strom, und „Polung umkehren“ steckt die Kabel an den Buchsen um.

## Funktionen

- **Stromkreis:** Strom ein/aus (Schalter in der Schaltskizze), Stromstärke 0–5 A, Polung umkehren
- **Hufeisenmagnet umdrehen** (N ↔ S)
- **Stromzuführung:** Kommutator oder **„Ohne Kommutator“** (Schleifringe) zum Vergleich. Mit Schleifringen wird der
  Strom nie umgepolt: Die Schleife pendelt nur hin und her und bleibt senkrecht stehen. So wird
  sichtbar, wozu der Kommutator nötig ist.
- **Kommutator bzw. Schleifringe abnehmen:** Das Teil wird von der Welle gezogen und auf den Holzsockel
  neben den Südpol gelegt. Bürsten und vorderer Lagerbock bleiben aufgeklappt, damit die Leiterschleife
  frei zu sehen ist; es fließt kein Strom. Beim Aufsetzen schließt sich der Aufbau wieder.
- **Bewegung:** Anhalten/Weiter, Zeitlupe, Anstoßen (z. B. aus dem Totpunkt), Zurücksetzen.
  Angehalten lässt sich die Schleife mit dem Regler „Drehwinkel“ in jede Stellung drehen, um das
  Umpolen Schritt für Schritt anzusehen.
- **Anzeigen (einzeln schaltbar):** Magnetfeld (Feldlinien von N nach S, anfangs ausgeblendet), Stromrichtung (wandernde
  Spitzen auf den Leiterseiten), Kräfte auf die Leiterseiten, Schaltskizze
- **Schaltskizze** (Blick entlang der Achse, dreht synchron mit): Pole, Leiterseiten mit ⊙/⊗,
  Kommutatorhälften bzw. Schleifringe, Bürsten, Schalter, Batterie und Stromrichtung im Stromkreis.
  Liegen die Bürsten auf den Lücken, ist das markiert und der Stromkreis unterbrochen. Die
  Kommutatorhälften und die zugehörigen Leiterseiten sind gold bzw. türkis markiert – in 3D und in
  der Skizze. Mit „Größer“ lässt sich die Skizze vergrößern (zum Besprechen am Beamer oder Tablet).
- **Blick von vorne:** Kamera entlang der Achse, passend zur Schaltskizze
- Hochformat (Tablet, Handy): Bedienfeld unten, Schaltskizze oben rechts

## Physikalisches Modell

- Kraft auf eine Leiterseite: F = I · L · B, Richtung nach der Drei-Finger-Regel der rechten Hand
  (technische Stromrichtung). Das Feld ist homogen und waagrecht, die Kräfte wirken daher immer
  senkrecht.
- Drehmoment M = 2 · r · F · |cos φ| mit Kommutator (immer dieselbe Drehrichtung), mit
  Schleifringen M = 2 · r · F · cos φ (Rückstellmoment zur senkrechten Stellung).
- Die Lücken zwischen den Kommutatorhälften sind je 40° breit, die Bürsten 20°. Solange eine
  Bürste ganz über einer Lücke liegt – je ±10° um die senkrechte Stellung (Totpunkt), also 20°
  jeder halben Umdrehung –, fließt kein Strom; die Schleife dreht durch ihren Schwung weiter.
  Die Maße stehen gemeinsam für 3D, Schaltskizze und Physik in `js/config.js` (`COMMUTATOR`).
- Trägheit, Reibung proportional zur Drehgeschwindigkeit und Haftreibung; die Induktion
  (Gegenspannung) wird nicht berücksichtigt.
- Modellgrößen (B = 0,1 T, L = 10 cm, r = 4 cm, …) in `js/config.js`; sie sind so gewählt, dass die
  Bewegung gut zu beobachten ist.

## Starten

Die Simulation lädt [three.js](https://threejs.org) aus dem Internet und muss über einen Webserver
geöffnet werden:

- **VS Code:** Erweiterung „Live Server“ → Rechtsklick auf `index.html` → „Open with Live Server“
- **Terminal:** im Projektordner `python3 -m http.server` und <http://localhost:8000> öffnen

## Projektstruktur

```text
leiterschleife-kommutator/
├── index.html          # Seitengerüst, Bedienfeld, Schaltskizze
├── css/style.css
├── js/
│   ├── main.js         # Start und Render-Schleife
│   ├── config.js       # Modellgrößen, Reglerbereiche, 3D-Maße
│   ├── state.js        # Zustand (Strom, Polung, Magnet, Kommutator/Schleifringe, Winkel, …)
│   ├── physik.js       # Ströme, Kräfte, Drehmoment, Bewegung (ohne 3D, testbar)
│   ├── szene.js        # Renderer, Kamera, Licht, Tisch
│   ├── aufbau.js       # Magnet, Schleife, Kommutator, Bürsten, Feldlinien, Strom, Kräfte
│   ├── abnehmen.js     # Kommutator bzw. Schleifringe abnehmen und aufsetzen (Animation)
│   ├── netzgeraet.js   # Netzgerät mit Stromanzeige und Kabeln zu den Bürsten
│   ├── schaltskizze.js # 2D-Schaltskizze im Blick entlang der Achse
│   ├── bedienfeld.js   # Regler, Knöpfe, Statusanzeigen
│   ├── hilfen.js       # Hilfsfunktionen
│   └── materialien.js  # Materialien und Farben
├── tests/physik.test.mjs
└── package.json
```

## Tests

```bash
npm test
```
