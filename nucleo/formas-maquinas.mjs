// Formas vivas · robots y máquinas. Mismo contrato que formas.mjs: función pura de t, siempre los mismos puntos en el
// mismo orden. Las que tienen cara (el rover) llevan los dos ojos (p 'o') como primeros puntos.
import { pt, TAU, tramo, anillo, p3, tramo3, anillo3, trazo, trazo3, arco, curva, giro, caja3, torno } from './trazos.mjs';

const ojos = (o, x1, y1, x2, y2) => o.push(pt(x1, y1, '0', 'o'), pt(x2, y2, '0', 'o'));
// Rueda vista de lado: llanta de n puntos y `rayos` radios que giran con el ángulo g.
function rueda(o, cx, cy, r, n, g, rayos = 2, a = 1) {
  anillo(o, cx, cy, r, r, n, g, '0', 'n', a);
  for (let k = 0; k < rayos; k++) { const h = g + (k / rayos) * Math.PI; o.push(pt(cx + Math.cos(h) * r * 0.5, cy + Math.sin(h) * r * 0.5, '0', 'n', a * 0.7), pt(cx - Math.cos(h) * r * 0.5, cy - Math.sin(h) * r * 0.5, '0', 'n', a * 0.7)); }
  o.push(pt(cx, cy, 'O', 'x', a));
}

// ── Rover de exploración: la cámara del mástil son sus ojos y mira a los lados; seis ruedas sobre terreno irregular ──
function rover(t) {
  const o = [], mira = Math.sin(t * 0.8) * 0.5, g = t * 2.2;
  ojos(o, 1.6 + mira, -5.4, 2.8 + mira, -5.4);
  trazo(o, [[0.6, -6.4], [3.8, -6.4], [3.8, -4.4], [0.6, -4.4]].map(([x, y]) => [x + mira * 0.4, y]), 10, true);   // la cabeza
  tramo(o, 2.2, -4.4, 2.2, -1.2, 3);                                  // el mástil
  trazo(o, [[-4.4, -1.2], [4.6, -1.2], [4.6, 1.4], [-4.4, 1.4]], 24, true);   // el chasis
  tramo(o, -4.0, -1.8, 0.6, -1.8, 5, '=', 'n', 0.8);                   // el panel solar
  tramo(o, -3.2, -1.8, -3.6, -4.4, 2, '|', 'n', 0.8);                  // antena
  [-4.4, 0, 4.4].forEach((x, k) => {
    const y = 4.2 + Math.sin(t * 2.6 + k * 2.1) * 0.35;                // cada rueda pisa su bache
    tramo(o, x * 0.7, 1.4, x, y, 2, '0', 'n', 0.6);
    rueda(o, x, y, 1.3, 7, g, 1);
  });
  return o;
}

// ── Cohete que gira sobre su eje: el perfil queda, los meridianos y la ventanilla dan la vuelta; la llama tiembla ──
const PERFIL_COHETE = [[0, -8.2], [1.4, -6.0], [2.3, -3.6], [2.5, 0], [2.4, 3.2], [1.9, 4.8]];
function cohete(t) {
  const o = [], tiembla = Math.sin(t * 31) * 0.08, v = [t * 0.8, 0.12, 0.03, 1, -0.6 + tiembla];
  for (const s of [-1, 1]) trazo(o, PERFIL_COHETE.map(([r, y]) => [s * r, y - 0.6 + tiembla]), 13);   // la silueta
  tramo(o, -1.9, 4.2 + tiembla, 1.9, 4.2 + tiembla, 3, '0', 'n', 0.8);
  for (let m = 0; m < 2; m++) {                                       // dos meridianos que giran con el cohete
    const g = (m / 2) * Math.PI + Math.PI / 2, c = Math.cos(g), sn = Math.sin(g);
    trazo3(o, PERFIL_COHETE.slice(1).map(([r, y]) => [r * c, y, r * sn]), 7, v, false, '.', 'n', 0.8);
  }
  anillo3(o, [0, -2.2, 0], 2.45, 10, 'y', v, 0, '-', 'n', 0.6);        // el cinturón
  anillo3(o, [0, -0.4, 2.5], 0.85, 6, 'z', v, 0, '0', 'x');           // la ventanilla
  for (let k = 0; k < 3; k++) {                                       // tres aletas
    const g = (k / 3) * TAU, c = Math.cos(g), sn = Math.sin(g);
    trazo3(o, [[2.4 * c, 1.6, 2.4 * sn], [4.4 * c, 4.6, 4.4 * sn], [4.4 * c, 6.0, 4.4 * sn], [1.9 * c, 4.8, 1.9 * sn]], 6, v);
  }
  for (let i = 0; i < 7; i++) {                                       // la llama
    const u = (t * 6 + i * 0.37) % 1, x = Math.sin(i * 2.3 + t * 9) * (0.4 + u * 0.9);
    o.push(pt(x, 4.8 + u * 4.2, u < 0.4 ? '*' : u < 0.75 ? '^' : '.', 'x', 1 - u * 0.8));
  }
  return o;
}

// ── Satélite: cuerpo, dos paneles solares con su rejilla y la antena que apunta a casa ───────────────────────────
function satelite(t) {
  const o = [], v = [0.5 + Math.sin(t * 0.4) * 0.6, 0.35, 0.035], gp = 0.2 + Math.sin(t * 0.6) * 0.15;
  caja3(o, [0, 0, 0], [1.5, 1.5, 1.5], v, [1, 1, 0]);
  for (const s of [-1, 1]) {
    tramo3(o, [s * 1.5, 0, 0], [s * 2.6, 0, 0], 1, v, '-', 'n', 0.8);
    const P = (x, z) => [s * x, -Math.sin(gp) * z, Math.cos(gp) * z];   // el panel gira buscando el sol
    trazo3(o, [P(2.6, -1.9), P(8.4, -1.9), P(8.4, 1.9), P(2.6, 1.9)], 18, v, true);
    for (const x of [4.5, 6.5]) trazo3(o, [P(x, -1.2), P(x, 1.2)], 2, v, false, '|', 'n', 0.6);
  }
  tramo3(o, [0, -1.5, 0], [0, -2.6, 0], 1, v);                         // la antena parabólica
  anillo3(o, [0, -3.0, 0], 1.7, 9, 'y', v);
  p3(o, 0, -4.2, 0, v, '*', 'x', 0.5 + 0.5 * (Math.sin(t * 5) > 0 ? 1 : 0));
  return o;
}

// ── Submarino: casco, torreta con periscopio que sube y baja, hélice y burbujas ──────────────────────────────────
function submarino(t) {
  const o = [], m = Math.sin(t * 0.9) * 0.35, peri = Math.max(0, Math.sin(t * 0.7)) * 1.6;
  trazo(o, [...curva(4.0, m, 3.0, 2.2, -Math.PI / 2, Math.PI / 2, 10), [-4.6, 2.2 + m], [-6.4, 0.8 + m], [-6.4, -0.8 + m], [-4.6, -2.2 + m]], 34, true);
  trazo(o, [[-1.6, -2.2 + m], [-1.2, -4.6 + m], [1.6, -4.6 + m], [2.2, -2.2 + m]], 7);   // la torreta
  trazo(o, [[0.4, -4.6 + m], [0.4, -6.0 - peri + m], [1.4, -6.0 - peri + m]], 4);       // el periscopio
  for (const x of [-2.4, 0.4, 3.2]) o.push(pt(x, 0 + m, 'o', 'x'));                  // ojos de buey
  const h = Math.sin(t * 12);
  tramo(o, -6.8, -1.8 * h + m, -6.8, 1.8 * h + m, 3, '|', 'n', 0.8);                    // la hélice
  for (let i = 0; i < 4; i++) { const u = (t * 0.6 + i / 4) % 1; o.push(pt(-7.4 - u * 1.2 + Math.sin(u * 8 + i) * 0.4, m - u * 6, u > 0.5 ? 'o' : '.', 'n', 1 - u)); }
  return o;
}

// ── Mano robótica: los dedos se cierran uno tras otro y vuelven a abrirse ─────────────────────────────────────────
function mano_robot(t) {
  const o = [], J = (x, y) => o.push(pt(x, y, 'O', 'x'));
  trazo(o, [[-3.2, -1.6], [3.2, -1.6], [3.4, 3.4], [1.8, 5.2], [-1.8, 5.2], [-3.4, 3.4]], 18, true);   // la palma
  tramo(o, -1.6, 5.2, -1.6, 8.0, 2); tramo(o, 1.6, 5.2, 1.6, 8.0, 2);                                  // la muñeca
  const LARGO = [[2.2, 1.7, 1.3], [2.5, 1.9, 1.4], [2.4, 1.8, 1.3], [1.9, 1.4, 1.1]];
  [-2.4, -0.8, 0.8, 2.4].forEach((x, k) => {
    const cierra = 0.5 - 0.5 * Math.cos(Math.max(0, Math.min(1, (Math.sin(t * 1.2) * 1.4 - 0.1) - k * 0.25)) * Math.PI);
    let py = -1.6, fi = 0;                                            // fi: cuánto se ha doblado ya el dedo hacia la palma
    J(x, py);
    LARGO[k].forEach((l, i) => {
      fi += cierra * (i === 0 ? 1.3 : 1.0);
      const fy = py - l * Math.cos(fi);                               // de frente, el dedo que se dobla se acorta y baja
      tramo(o, x, py, x, fy, 2, '0', 'n', 0.85); J(x, fy); py = fy;
    });
  });
  const pul = 0.6 + 0.4 * Math.sin(t * 1.2 + 1.2);                    // el pulgar
  trazo(o, [[-3.3, 2.6], [-5.0, 1.0 - pul * 0.4], [-5.4 + pul * 0.6, -1.0 - pul * 0.6]], 5);
  return o;
}

// ── Coche de perfil: carrocería, ventanillas, ruedas que giran y la suspensión que rebota ────────────────────────────
function coche(t) {
  const o = [], b = Math.abs(Math.sin(t * 7)) * 0.18, g = t * 6;
  trazo(o, [[-7.4, 1.8], [-7.4, -0.6], [-4.8, -1.4], [-2.8, -4.2], [2.4, -4.2], [4.6, -1.4], [7.4, -0.8], [7.4, 1.8]].map(([x, y]) => [x, y - b]), 30, true);
  trazo(o, [[-4.0, -1.4], [-2.4, -3.4], [-0.3, -3.4], [-0.3, -1.4]].map(([x, y]) => [x, y - b]), 6, false, '0', 'n', 0.5);   // ventanillas
  trazo(o, [[0.4, -1.4], [0.4, -3.4], [2.1, -3.4], [3.6, -1.4]].map(([x, y]) => [x, y - b]), 6, false, '0', 'n', 0.5);
  o.push(pt(7.0, -0.1 - b, '=', 'x'), pt(-7.0, 0.2 - b, '=', 'x', 0.6));   // faros
  rueda(o, -4.4, 2.6, 1.6, 8, g, 0); rueda(o, 4.4, 2.6, 1.6, 8, g, 0);
  for (let i = 0; i < 3; i++) { const u = (t * 1.6 + i / 3) % 1; o.push(pt(-8.6 - u * 2, -1.0 + i * 1.1, '-', 'n', 0.7 * (1 - u))); }
  return o;
}

// ── Locomotora de vapor: caldera, cabina, chimenea que echa humo y la biela que mueve las ruedas ────────────────────
function tren(t) {
  const o = [], g = t * 5;
  trazo(o, [[-6.6, 2.0], [-6.6, -4.6], [-2.4, -4.6], [-2.4, -1.6], [5.4, -1.6], [5.4, 2.0]], 26);   // cabina y caldera
  tramo(o, -2.4, 2.0, 5.4, 2.0, 6, '=', 'n', 0.8);
  trazo(o, [[-5.6, -3.6], [-3.4, -3.6], [-3.4, -1.8], [-5.6, -1.8]], 6, true, '0', 'n', 0.5);   // ventana de la cabina
  trazo(o, [[3.0, -1.6], [2.8, -3.8], [4.4, -3.8], [4.2, -1.6]], 5);                           // chimenea
  trazo(o, [[5.4, 0.4], [7.2, 2.4], [5.4, 2.4]], 3, false, '0', 'n', 0.8);                     // quitapiedras
  for (const x of [-4.6, -0.6, 3.2]) rueda(o, x, 3.0, 1.4, 7, g, 1);
  tramo(o, -4.6 + Math.cos(g) * 0.8, 3.0 + Math.sin(g) * 0.8, 3.2 + Math.cos(g) * 0.8, 3.0 + Math.sin(g) * 0.8, 6, '-', 'x');   // la biela
  for (let i = 0; i < 5; i++) {                                       // el humo sube, crece y se va hacia atrás
    const u = (t * 0.7 + i / 5) % 1;
    o.push(pt(3.6 - u * 5 + Math.sin(u * 6 + i) * 0.5, -4.6 - u * 4.2, u < 0.3 ? 'o' : u < 0.7 ? 'O' : '0', 'n', 1 - u * 0.9));
  }
  return o;
}

// ── Grúa torre: mástil de celosía, pluma con su carro y la carga que sube y baja ─────────────────────────────────────
function grua(t) {
  const o = [], carro = 1.0 + (0.5 + 0.5 * Math.sin(t * 0.6)) * 5.2, cuelga = 2.0 + (0.5 + 0.5 * Math.sin(t * 0.9 + 1)) * 6.0;
  for (const x of [-2.2, -0.6]) tramo(o, x, 9.0, x, -5.6, 11);         // el mástil
  trazo(o, [[-2.2, 8.2], [-0.6, 6.4], [-2.2, 4.6], [-0.6, 2.8], [-2.2, 1.0], [-0.6, -0.8], [-2.2, -2.6], [-0.6, -4.4]], 12, false, '0', 'n', 0.45);
  tramo(o, -7.4, -5.6, 7.6, -5.6, 14);                                // la pluma y la contrapluma
  trazo(o, [[-1.4, -8.4], [7.6, -5.6]], 6, false, '0', 'n', 0.55); trazo(o, [[-1.4, -8.4], [-7.4, -5.6]], 4, false, '0', 'n', 0.55); tramo(o, -1.4, -5.6, -1.4, -8.4, 2);
  trazo(o, [[-7.0, -4.8], [-4.8, -4.8], [-4.8, -3.6], [-7.0, -3.6]], 6, true, '#', 'n', 0.7);   // contrapeso
  o.push(pt(carro, -5.0, 'U', 'x'));
  tramo(o, carro, -5.0, carro, -5.0 + cuelga, 5, '|', 'n', 0.6);
  trazo(o, [[carro - 1.0, -4.6 + cuelga], [carro + 1.0, -4.6 + cuelga], [carro + 1.0, -3.0 + cuelga], [carro - 1.0, -3.0 + cuelga]], 6, true);   // la carga
  return o;
}

// ── Molino de viento: torre de piedra y cuatro aspas de celosía que giran ────────────────────────────────────────────
function molino(t) {
  const o = [], g = t * 0.9, cx = 0, cy = -2.6;
  trazo(o, [[-2.0, -2.0], [-3.4, 8.2], [3.4, 8.2], [2.0, -2.0]], 18);
  trazo(o, [[-2.4, -1.8], [-1.6, -4.0], [1.6, -4.0], [2.4, -1.8]], 6);   // el tejado
  trazo(o, [[-0.8, 8.2], [-0.8, 5.6], [0.8, 5.6], [0.8, 8.2]], 5, false, '0', 'n', 0.6);   // la puerta
  for (let k = 0; k < 4; k++) {
    const h = g + (k / 4) * TAU, c = Math.cos(h), s = Math.sin(h), nx = -s, ny = c;
    tramo(o, cx, cy, cx + c * 7.0, cy + s * 7.0, 6);
    trazo(o, [[cx + c * 2.2 + nx * 1.5, cy + s * 2.2 + ny * 1.5], [cx + c * 7.0 + nx * 1.5, cy + s * 7.0 + ny * 1.5], [cx + c * 7.0, cy + s * 7.0]], 6, false, '0', 'n', 0.7);
  }
  o.push(pt(cx, cy, 'O', 'x'));
  return o;
}

// ── Avión visto desde arriba en 3D: fuselaje, alas, cola y motores; se inclina en las curvas ────────────────────────
function avion(t) {
  const o = [], alabeo = Math.sin(t * 0.8) * 0.5, v = [Math.PI + Math.sin(t * 0.4) * 0.3, 1.05, 0.035, 1.05, 0.4 + Math.sin(t * 1.1) * 0.3];
  const R = (x, y, z) => [x * Math.cos(alabeo) - y * Math.sin(alabeo), x * Math.sin(alabeo) + y * Math.cos(alabeo), z];   // alabeo sobre el eje z
  const L = (P, n, c, a) => trazo3(o, P.map(q => R(...q)), n, v, false, c, 'n', a);
  L([[0, 0, 7.6], [0.9, 0, 5.6], [0.9, 0, -4.4], [0.3, 0, -7.0]], 12);
  L([[0, 0, 7.6], [-0.9, 0, 5.6], [-0.9, 0, -4.4], [-0.3, 0, -7.0]], 12);
  for (const s of [-1, 1]) {
    L([[s * 0.9, 0, 2.4], [s * 8.0, 0, -1.4], [s * 8.0, 0, -2.6], [s * 0.9, 0, -1.4]], 13);
    L([[s * 0.5, 0, -5.0], [s * 3.2, 0, -6.6], [s * 3.2, 0, -7.2], [s * 0.4, 0, -6.8]], 5);
    p3(o, ...R(s * 3.6, 0.5, 0.8), v, 'O', 'x');                      // motores
  }
  return o;
}

// ── Helicóptero: cabina, cola, el rotor que gira de verdad (se acorta al pasar de frente) y el rotor de cola ────────
function helicoptero(t) {
  const o = [], m = Math.sin(t * 1.4) * 0.4, g = t * 9;
  trazo(o, [...curva(1.6, 0.4 + m, 3.4, 2.6, -Math.PI * 0.5, Math.PI * 0.62, 12), [-1.6, 2.4 + m], [-2.0, -0.6 + m], [-1.0, -2.2 + m], [1.6, -2.2 + m]], 24, true);
  trazo(o, curva(2.4, -0.2 + m, 1.8, 1.4, -Math.PI * 0.45, Math.PI * 0.2, 6), 5, false, '0', 'n', 0.5);   // el cristal
  trazo(o, [[-2.0, -0.6 + m], [-7.6, -1.0 + m], [-2.0, 0.8 + m]], 11);   // la cola
  tramo(o, 0.4, -2.2 + m, 0.4, -3.2 + m, 1);
  for (let k = 0; k < 2; k++) {                                       // dos palas del rotor: 3D, vistas de lado
    const h = g + k * Math.PI / 2, largo = 7.2 * Math.cos(h);
    tramo(o, 0.4 - largo, -3.4 + m, 0.4 + largo, -3.4 + m, 10, '-', 'n', 0.85);
  }
  anillo(o, -7.6, -1.0 + m, 1.2, 1.2, 5, -g * 1.6, '0', 'n', 0.7);    // rotor de cola
  tramo(o, -2.4, 4.0 + m, 4.6, 4.0 + m, 7); tramo(o, -0.6, 2.4 + m, -1.0, 4.0 + m, 1); tramo(o, 2.6, 2.6 + m, 2.6, 4.0 + m, 1);   // patines
  return o;
}

// ── Velero: casco, mástil y dos velas; se mece sobre el agua ─────────────────────────────────────────────────────
function velero(t) {
  const o = [], inc = Math.sin(t * 1.1) * 0.1, sube = Math.sin(t * 1.1 + 0.8) * 0.3;
  trazo(o, [[-6.4, 2.6], [6.6, 2.6], [4.6, 5.0], [-4.6, 5.0]], 22, true);
  tramo(o, 0, 2.6, 0, -8.2, 10);
  const viento = Math.sin(t * 0.9) * 0.4;
  trazo(o, [[0.4, -7.8], [5.2 + viento, 1.6], [0.4, 1.6]], 14);       // la vela mayor
  trazo(o, [[-0.4, -6.6], [-4.6 - viento, 1.6], [-0.4, 1.6]], 12, false, '0', 'n', 0.8);   // el foque
  o.push(pt(0, -8.8, '>', 'x'));
  giro(o, 0, inc, 0, 3.0, 0, sube);
  for (let i = 0; i < 9; i++) { const x = -8 + i * 2; o.push(pt(x, 6.0 + Math.sin(t * 2 + i * 0.9) * 0.4, '~', 'n', 0.6)); }
  return o;
}

// ── Ovni: platillo en 3D con luces que corren por el borde y un haz que barre el suelo ───────────────────────────────
function ovni(t) {
  const o = [], v = [t * 0.6, 0.38, 0.035, 1.05, -2.2 + Math.sin(t * 1.2) * 0.5];
  torno(o, [[1.2, -2.6, 6], [2.4, -1.6, 10], [6.4, 0, 22], [3.4, 1.0, 12]], 10, v);
  for (let k = 0; k < 8; k++) {
    const g = (k / 8) * TAU, enc = Math.floor(t * 6) % 8 === k || Math.floor(t * 6 + 4) % 8 === k;
    p3(o, Math.cos(g) * 5.0, 0.55, Math.sin(g) * 5.0, v, enc ? '*' : '.', 'x');
  }
  for (let i = 0; i < 12; i++) {                                      // el haz: un cono de puntos tenues
    const u = (i % 4) / 3, f = Math.floor(i / 4) - 1, y = 2.8 + u * 7.0, w = 1.2 + u * 3.0;
    o.push(pt(f * w * 0.9 + Math.sin(t * 3 + i) * 0.2, y, '.', 'd', 0.35 + 0.3 * Math.sin(t * 4 + u * 4)));
  }
  return o;
}

// ── Bicicleta: dos ruedas con radios, el cuadro, el manillar y los pedales que dan vueltas ─────────────────────────────
function bicicleta(t) {
  const o = [], g = t * 4;
  rueda(o, -4.8, 2.8, 3.0, 12, g, 0); rueda(o, 4.8, 2.8, 3.0, 12, g, 0);
  const P = [0, 2.8], S = [-1.6, -2.2], M = [3.4, -2.4], A = [-4.8, 2.8], D = [4.8, 2.8];   // pedalier, sillín, dirección y ejes
  trazo(o, [A, P, S, A], 11); trazo(o, [S, M, P], 9); trazo(o, [M, D], 4);
  trazo(o, [[-2.6, -2.8], [-0.6, -2.8]], 2, false, '=', 'x');         // sillín
  trazo(o, [M, [3.0, -4.2], [4.6, -4.4]], 3);                         // manillar
  for (const s of [1, -1]) { const x = P[0] + Math.cos(g * 0.7) * 1.4 * s, y = P[1] + Math.sin(g * 0.7) * 1.4 * s; o.push(pt(x, y, '=', 'x', s > 0 ? 1 : 0.6)); }
  return o;
}

export const MAQUINAS = {
  rover, cohete, satelite, submarino, mano_robot, coche, tren, grua, molino, avion, helicoptero, velero, ovni, bicicleta,
};
