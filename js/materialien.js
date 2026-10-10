// ------------------------------------------------------------------
// Gemeinsam genutzte Materialien und Farben
// ------------------------------------------------------------------
import * as THREE from 'three';

// Farben der beiden Kommutatorhälften und der zugehörigen Leiterseiten (auch in der Schaltskizze)
export const COLOR_A = '#e0a526';   // gold
export const COLOR_B = '#26a69a';   // türkis

export const mat = {
  table: new THREE.MeshStandardMaterial({ color: 0xc8a27a, roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x9c6b3c, roughness: 0.7 }),
  north: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.45 }),
  south: new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.45 }),
  yoke: new THREE.MeshStandardMaterial({ color: 0x6b7178, metalness: 0.6, roughness: 0.4 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc8733a, metalness: 0.85, roughness: 0.35 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.9, roughness: 0.3 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.5 }),
  carbon: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 }),
  halfA: new THREE.MeshStandardMaterial({ color: COLOR_A, metalness: 0.7, roughness: 0.35 }),
  halfB: new THREE.MeshStandardMaterial({ color: COLOR_B, metalness: 0.5, roughness: 0.35 }),
  cableRed: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.5 }),
  cableBlue: new THREE.MeshStandardMaterial({ color: 0x1e5bc6, roughness: 0.5 }),
  field: new THREE.MeshBasicMaterial({ color: 0x1e88e5, transparent: true, opacity: 0.45, depthWrite: false }),
  current: new THREE.MeshBasicMaterial({ color: 0xffb300 }),
  force: new THREE.MeshBasicMaterial({ color: 0xd32f2f }),
};
