// Formas vivas · animales. Mismo contrato que formas.mjs: función pura de t, siempre los mismos puntos en el mismo orden,
// y los dos ojos (p 'o') como primeros puntos. Los que se ven de perfil llevan los dos ojos casi en el mismo sitio.
import { pt, TAU, tramo, anillo, relleno, p3, tramo3, anillo3, trazo, trazo3, arco, curva, giro } from './trazos.mjs';

const ojos = (o, x1, y1, x2, y2) => o.push(pt(x1, y1, '0', 'o'), pt(x2, y2, '0', 'o'));
// Pata de dos tramos que nace en (hx, hy): ángulo del muslo (0 = hacia abajo, positivo = hacia delante) y doblez de la rodilla.
function pata(o, hx, hy, g, dobla, l1, l2, n1, n2, a = 1) {
  const kx = hx + Math.sin(g) * l1, ky = hy + Math.cos(g) * l1;
  const fx = kx + Math.sin(g - dobla) * l2, fy = ky + Math.cos(g - dobla) * l2;
  tramo(o, hx, hy, kx, ky, n1, '0', 'n', a); tramo(o, kx, ky, fx, fy, n2, '0', 'n', a);
}

// ── Gato sentado, de frente: orejas en punta y la cola que se mece ─────────────────────────────────────────────────
function gato(t) {
  const o = [];
  ojos(o, -1.1, -4.4, 1.1, -4.4);
  trazo(o, [[-2.9, -3.6], [-2.8, -5.6], [-2.4, -8.6], [-0.9, -6.9], [0.9, -6.9], [2.4, -8.6], [2.8, -5.6], [2.9, -3.6],
    [2.1, -2.1], [0, -1.6], [-2.1, -2.1]], 24, true);
  o.push(pt(0, -3.2, 'v', 'x'));
  for (const s of [-1, 1]) { o.push(pt(s * 3.6, -3.7, '-', 'n', 0.55), pt(s * 3.8, -2.9, '-', 'n', 0.55)); }
  giro(o, 0, Math.sin(t * 0.9) * 0.1, 0, -2);                          // ladea la cabeza (ojos incluidos)
  trazo(o, [[-1.5, -1.8], [-3.2, 1.4], [-4.1, 4.4], [-3.8, 6.8], [-1.2, 7.4], [1.2, 7.4], [3.8, 6.8], [4.1, 4.4], [3.2, 1.4], [1.5, -1.8]], 24);
  for (const s of [-1, 1]) tramo(o, s * 1.1, 1.6, s * 1.2, 7.2, 4, '0', 'n', 0.7);   // patas delanteras
  const m = Math.sin(t * 1.7);                                          // la cola
  const cola = [];
  for (let i = 0; i <= 8; i++) { const s = i / 8; cola.push([3.9 + s * 2.6 + Math.sin(s * 3) * 0.6, 6.6 - s * 5.6 + m * s * s * 0.8]); }
  cola.forEach(q => { q[0] += m * Math.pow((6.6 - q[1]) / 5.6, 2) * 1.4; });
  trazo(o, cola, 9);
  return o;
}

// ── Perro de perfil que camina: oreja caída y la cola contenta ─────────────────────────────────────────────────────
function perro(t) {
  const o = [], f = t * 5.5, bote = Math.abs(Math.sin(f)) * 0.25;
  ojos(o, 5.3, -4.1 - bote, 5.5, -4.1 - bote);
  trazo(o, [[3.3, -1.9], [3.4, -4.4], [4.3, -5.4], [5.7, -5.2], [6.4, -4.2], [7.9, -3.8], [8.0, -2.7], [6.4, -2.3], [5.0, -1.6]].map(([x, y]) => [x, y - bote]), 15);
  o.push(pt(8.1, -3.5 - bote, '0', 'x'));                              // la trufa
  const oreja = Math.sin(f) * 0.25;
  trazo(o, [[4.2, -5.2 - bote], [3.3 + oreja, -4.6 - bote], [3.0 + oreja, -2.9 - bote]], 4);
  trazo(o, curva(-0.6, -0.2 - bote, 4.4, 2.1, -Math.PI * 0.86, Math.PI * 1.06, 24), 24);   // el lomo y la tripa
  const cola = Math.sin(t * 9) * 0.7;
  trazo(o, [[-4.8, -0.9 - bote], [-5.8, -2.4 - bote + cola * 0.3], [-6.2 + cola, -3.9 - bote]], 5);
  [[2.4, 0], [1.6, Math.PI], [-3.2, Math.PI], [-4.0, 0]].forEach(([hx, d], i) => {
    const g = 0.45 * Math.sin(f + d), dobla = i < 2 ? -0.35 * Math.max(0, Math.cos(f + d)) : 0.45 * Math.max(0, Math.cos(f + d));
    pata(o, hx, 1.4 - bote, g, dobla, 2.6, 2.6, 2, 3, i % 2 ? 0.55 : 1);
  });
  return o;
}

// ── Pájaro que vuela: el ala bate de verdad (cerca, entera; lejos, tenue) ─────────────────────────────────────────
// El ave se modela con el eje del cuerpo en z (la cabeza hacia delante) y las alas en x; el ala gira sobre el cuerpo.
const ALA_AVE = [[1.2, 1.4], [3.6, 2.2], [6.4, 1.2], [8.8, -1.6], [6.0, -1.0], [3.4, -1.4], [1.2, -1.6]];   // (x, z)
function pajaro(t) {
  const o = [], f = t * 3.6, bate = Math.sin(f) * 0.75 + 0.1, sube = Math.sin(f) * 0.5;
  const v = [0.75 + Math.sin(t * 0.4) * 0.25, -0.7, 0.04, 1.15, sube];
  p3(o, -0.75, -0.7, 4.6, v, '0', 'o'); p3(o, 0.75, -0.7, 4.6, v, '0', 'o');
  anillo3(o, [0, -0.3, 4.4], 1.4, 9, 'x', v, 0.3);                    // cabeza
  trazo3(o, [[-0.5, 0, 5.6], [0, 0.1, 7.2], [0.5, 0, 5.6]], 4, v, false, '0', 'x');   // pico
  trazo3(o, curva(0, 0, 1.9, 3.6, 0, TAU, 20).map(([x, z]) => [x, 0.4, z]), 16, v, true);   // cuerpo
  trazo3(o, [[-0.8, 0.4, -3.2], [-2.0, 0.6, -6.2], [0, 0.5, -5.4], [2.0, 0.6, -6.2], [0.8, 0.4, -3.2]], 8, v);   // cola
  for (const s of [-1, 1]) trazo3(o, ALA_AVE.map(([x, z]) => [s * Math.cos(bate) * x, -Math.sin(bate) * x, z]), 17, v);   // las dos alas
  return o;
}

// ── Pez que nada: el cuerpo ondula y la cola empuja ───────────────────────────────────────────────────────────────
function pez(t) {
  const o = [], f = t * 3.2, ola = s => Math.sin(f - s * 2.6) * 0.75 * s * s;   // s: 0 en la cabeza, 1 en la cola
  const borde = (lado) => Array.from({ length: 11 }, (_, i) => { const s = i / 10, x = 5.4 - s * 9.4, ancho = Math.sin(Math.min(1, s * 1.15 + 0.08) * Math.PI) * 2.9; return [x, lado * ancho + ola(s)]; });
  ojos(o, 3.6, -0.7 + ola(0.18), 3.7, -0.7 + ola(0.18));
  trazo(o, borde(-1), 14); trazo(o, borde(1), 14);
  const c = ola(1);
  trazo(o, [[-4.0, c], [-6.6, -3.0 + c * 1.6], [-5.6, c], [-6.6, 3.0 + c * 1.6], [-4.0, c]], 10);   // aleta de la cola
  trazo(o, [[1.4, -2.6 + ola(0.42)], [-0.6, -4.6 + ola(0.6)], [-1.6, -2.6 + ola(0.7)]], 4, false, '0', 'n', 0.8);   // aleta de arriba
  trazo(o, curva(2.4, ola(0.3), 0.9, 2.0, -1.2, 1.2, 6), 4, false, ')', 'n', 0.6);   // agalla
  for (let i = 0; i < 3; i++) { const u = ((t * 0.5 + i / 3) % 1); o.push(pt(6.6 + Math.sin(u * 9 + i) * 0.4, -1 - u * 7, u > 0.6 ? 'o' : '.', 'n', 1 - u)); }   // burbujas
  return o;
}

// ── Pulpo: cabeza grande y ocho brazos que ondulan ────────────────────────────────────────────────────────────────
function pulpo(t) {
  const o = [], late = Math.sin(t * 1.6) * 0.25;
  ojos(o, -1.3, -2.6, 1.3, -2.6);
  trazo(o, curva(0, -3.6, 3.6 + late, 4.6 - late, Math.PI * 0.93, Math.PI * 2.07, 18), 20);   // el manto
  for (let k = 0; k < 8; k++) {
    const x0 = -3.3 + k * (6.6 / 7), lado = x0 < 0 ? -1 : 1, P = [];
    for (let i = 0; i <= 6; i++) {
      const s = i / 6, ond = Math.sin(t * 2.4 + k * 0.9 - s * 3.4) * 1.1 * s;
      P.push([x0 + lado * s * (1.2 + Math.abs(x0) * 0.9) + ond, -1.6 + s * 8.4 - s * s * (k % 2 ? 1.8 : 0.4)]);
    }
    const a = k === 0 || k === 7 ? 1 : k % 2 ? 0.4 : 0.8;              // los del fondo, más tenues
    trazo(o, P, 7, false, '0', 'n', a);
  }
  return o;
}

// ── Mariposa en 3D: las alas giran sobre el cuerpo al batir ───────────────────────────────────────────────────────
const ALA_ARRIBA = [[0.4, -0.6], [2.4, -4.6], [5.2, -6.0], [6.8, -4.6], [6.2, -2.0], [3.8, -0.4], [0.5, 0.2]];
const ALA_ABAJO = [[0.5, 0.4], [3.6, 0.8], [5.2, 2.8], [4.6, 5.0], [2.6, 5.4], [1.0, 3.4], [0.4, 1.4]];
function mariposa(t) {
  const o = [], bate = 0.12 + 0.85 * Math.abs(Math.sin(t * 2.6)), v = [Math.sin(t * 0.5) * 0.45, 0.3, 0.035, 1, Math.sin(t * 1.3) * 0.4];
  p3(o, -0.35, -2.4, -0.6, v, '0', 'o'); p3(o, 0.35, -2.4, -0.6, v, '0', 'o');
  for (const s of [-1, 1]) {
    const lleva = (P, n) => trazo3(o, P.map(([x, y]) => [s * x * Math.cos(bate), y, x * Math.sin(bate)]), n, v, true);
    lleva(ALA_ARRIBA, 19); lleva(ALA_ABAJO, 12);
    tramo3(o, [s * 0.3, -2.8, -0.5], [s * 1.6, -5.4, -1.0], 3, v, '0', 'n', 0.8);   // antenas
  }
  tramo3(o, [0, -2.0, 0], [0, 4.4, 0], 6, v, 'O', 'x');
  return o;
}

// ── Serpiente vista desde arriba: se desliza en ese y saca la lengua ──────────────────────────────────────────────
function serpiente(t) {
  const o = [], f = t * 2.4, N = 16;
  const eje = s => [6.6 - s * 14.4, Math.sin(s * 6.6 - f) * 3.4 * (0.3 + s * 0.7)];
  const [hx, hy] = eje(0);
  ojos(o, hx + 0.2, hy - 0.8, hx + 0.2, hy + 0.8);
  for (const lado of [-1, 1]) {
    const P = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, [x, y] = eje(s), [x2, y2] = eje(s + 0.01), dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1;
      const ancho = s < 0.1 ? 1.7 - s * 3 : 1.45 * (1 - s) + 0.15;
      P.push([x - (dy / l) * ancho * lado, y + (dx / l) * ancho * lado]);
    }
    trazo(o, P, 21);
  }
  trazo(o, curva(hx, hy, 1.9, 1.7, -Math.PI / 2, Math.PI / 2, 8), 5);  // el morro
  const lengua = Math.max(0, Math.sin(t * 3.1)) > 0.5 ? 1 : 0;
  o.push(pt(hx + 2.5 + lengua * 0.6, hy, '-', 'x', 0.3 + 0.7 * lengua), pt(hx + 3.3 + lengua * 0.6, hy, '<', 'x', lengua));
  return o;
}

// ── Tortuga de perfil: caparazón con su dibujo, la cabeza asoma y las patas pasan despacio ────────────────────────
function tortuga(t) {
  const o = [], f = t * 2.0, cuello = Math.sin(t * 0.8) * 0.6;
  ojos(o, 6.2 + cuello, -0.9, 6.3 + cuello, -0.9);
  trazo(o, curva(0, 1.2, 5.0, 5.0, Math.PI, TAU, 18), 21);            // la cúpula
  tramo(o, -5.0, 1.2, 5.0, 1.2, 10, '=', 'n', 0.9);                     // el borde
  trazo(o, curva(0, 1.2, 3.0, 2.8, Math.PI * 1.08, Math.PI * 1.92, 10), 9, false, '0', 'n', 0.5);   // el dibujo de las placas
  for (const x of [-1.6, 1.6]) tramo(o, x, -1.2, x * 1.5, -3.6, 2, '0', 'n', 0.5);
  for (const x of [-3.4, 3.4]) tramo(o, x * 0.8, -1.0, x, 0.6, 1, '0', 'n', 0.5);
  trazo(o, [[4.6, 0.6], [5.6 + cuello, -0.2], [6.0 + cuello, -1.6], [7.2 + cuello, -1.4], [7.4 + cuello, -0.2], [6.6 + cuello, 0.6], [5.0, 1.2]], 9);   // cabeza
  trazo(o, [[-4.9, 0.8], [-6.2, 1.6]], 2);                             // cola
  [[3.0, 0], [-2.6, Math.PI]].forEach(([x, d]) => {
    const g = Math.sin(f + d) * 0.5;
    trazo(o, [[x - 0.8, 1.4], [x - 0.8 + Math.sin(g) * 1.6, 3.4], [x + 0.8 + Math.sin(g) * 1.6, 3.4], [x + 0.8, 1.4]], 6);
  });
  return o;
}

// ── Medusa: la campana late y los tentáculos se arrastran detrás ──────────────────────────────────────────────────
function medusa(t) {
  const o = [], late = Math.sin(t * 2.2), sube = -Math.sin(t * 2.2 - 0.6) * 0.6, rx = 4.6 + late * 0.6, ry = 3.6 - late * 0.5;
  trazo(o, curva(0, -2.0 + sube, rx, ry, Math.PI, TAU, 20), 20);
  const P = [];
  for (let i = 0; i <= 14; i++) { const x = -rx + (i / 14) * rx * 2; P.push([x, -2.0 + sube + (i % 2 ? 0.7 : 0.15)]); }
  trazo(o, P, 15, false, '0', 'n', 0.85);                               // el borde con volantes
  trazo(o, curva(0, -2.6 + sube, rx * 0.55, ry * 0.5, Math.PI * 1.15, Math.PI * 1.85, 8), 6, false, '.', 'n', 0.6);
  for (let k = 0; k < 6; k++) {
    const x0 = -3.4 + k * 1.36, Q = [];
    for (let i = 0; i <= 6; i++) { const s = i / 6; Q.push([x0 * (1 - s * 0.25) + Math.sin(t * 2.6 + k * 1.3 - s * 4) * s * 1.2, -1.2 + sube + s * (k % 2 ? 9.2 : 7.4) * (1 - late * 0.06)]); }
    trazo(o, Q, 6, false, k % 2 ? '0' : '|', 'n', k % 2 ? 0.95 : 0.6);
  }
  return o;
}

// ── Murciélago de frente: alas festoneadas que baten en 3D ────────────────────────────────────────────────────────
const ALA_MURC = [[1.0, -2.4], [2.8, -4.0], [5.0, -5.4], [8.4, -6.4], [7.8, -3.4], [7.0, -0.6], [5.8, -2.0], [4.8, 0.8], [3.6, -0.6], [2.4, 1.6], [1.0, 0.6]];
function murcielago(t) {
  const o = [], bate = 0.15 + Math.sin(t * 4.4) * 0.6, v = [Math.sin(t * 0.6) * 0.3, 0.25, 0.04, 1, 0.8 + Math.cos(t * 4.4) * 0.5];
  p3(o, -0.6, -3.0, -0.9, v, '0', 'o'); p3(o, 0.6, -3.0, -0.9, v, '0', 'o');
  for (const s of [-1, 1]) {
    trazo3(o, ALA_MURC.map(([x, y]) => [s * x * Math.cos(bate), y, -x * Math.sin(bate)]), 22, v);
    p3(o, s * 0.9, -4.7, 0, v, '^', 'x');                                                    // orejas
  }
  anillo3(o, [0, -3.1, 0], 1.3, 7, 'z', v, 0.4);
  trazo3(o, [[-0.9, -1.8, 0], [-1.0, 0.6, 0], [0, 2.2, 0], [1.0, 0.6, 0], [0.9, -1.8, 0]], 7, v);
  return o;
}

// ── Hormiga de perfil: tres partes, seis patas en trípode y antenas que tantean ───────────────────────────────────
function hormiga(t) {
  const o = [], f = t * 7;
  ojos(o, 5.3, -2.0, 5.4, -2.0);
  anillo(o, 4.9, -1.4, 1.6, 1.4, 11, 0.4);                            // cabeza
  anillo(o, 1.3, -0.6, 1.7, 0.95, 10);                                // tórax
  anillo(o, -3.9, -1.2, 2.9, 2.1, 16, 0.2);                           // abdomen
  for (const s of [1, -1]) { const tt = Math.sin(t * 3.4 + s) * 0.5; trazo(o, [[5.4, -2.8], [6.0 + s * 0.3, -4.8 + tt], [7.8 + s * 0.4, -5.6 + tt * 1.4]], 4, false, '0', 'n', s > 0 ? 1 : 0.5); }
  [-1.1, 0.2, 1.2].forEach((d, i) => {                                      // atrás, en medio, delante; cada una sube a la rodilla y baja
    for (const lado of [0, 1]) {
      const m = Math.sin(f + ((i + lado) % 2) * Math.PI) * 0.7, hx = 1.3 + d * 0.6;
      trazo(o, [[hx, 0.3], [hx + d * 2.2 + m * 0.3, -1.9], [hx + d * 4.0 + m, 4.6]], 8, false, '0', 'n', lado ? 0.45 : 1);
    }
  });
  return o;
}

// ── Escorpión visto desde arriba: pinzas que se abren y la cola que se arquea ─────────────────────────────────────
function escorpion(t) {
  const o = [], cola = Math.sin(t * 1.5), pinza = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3));
  ojos(o, -0.5, 3.6, 0.5, 3.6);
  trazo(o, curva(0, 1.3, 1.9, 3.2, 0, TAU, 20), 16, true);           // cuerpo
  const C = [];
  for (let i = 0; i <= 8; i++) { const s = i / 8, g = s * Math.PI * (0.95 + cola * 0.12); C.push([Math.sin(g) * 2.8 * (1 - s * 0.3) + cola * s * 0.8, -1.9 - Math.sin(g * 0.5) * 6.0 + s * s * 1.6]); }
  trazo(o, C, 11); const [ax, ay] = C.at(-1);
  o.push(pt(ax - 0.9, ay + 0.5, 'V', 'x'));                           // el aguijón
  for (const s of [-1, 1]) {
    trazo(o, [[s * 1.2, 4.1], [s * 2.8, 5.3], [s * 3.4, 6.5]], 4);
    const eje = Math.PI / 2 - s * 0.35;                                // hacia dónde apunta la pinza
    trazo(o, curva(s * 3.6 + Math.cos(eje) * 1.5, 6.3 + Math.sin(eje) * 1.5, 1.3, 1.6, eje + pinza + 0.2, eje + TAU - pinza - 0.2, 12), 10);
    for (let k = 0; k < 4; k++) {
      const y = 3.0 - k * 1.2, m = Math.sin(t * 6 + k * 1.6 + (s > 0 ? Math.PI : 0)) * 0.4;
      trazo(o, [[s * 1.7, y], [s * 3.6, y - 0.4], [s * 5.4, y + (1.5 - k) * 1.3 + m]], 3, false, '0', 'n', 0.75);
    }
  }
  giro(o, 0, Math.PI, 0, 0, 0, 0.8);                                  // de cara a quien mira: pinzas abajo, cola arriba
  return o;
}

// ── Cangrejo de frente: ojos en pedúnculo, pinzas que abren y cierran, anda de lado ───────────────────────────────
function cangrejo(t) {
  const o = [], lado = Math.sin(t * 1.4) * 1.2, f = t * 7;
  ojos(o, -1.2 + lado, -4.0, 1.2 + lado, -4.0);
  for (const s of [-1, 1]) tramo(o, s * 1.2 + lado, -3.2, s * 1.0 + lado, -1.9, 2, '|', 'n', 0.8);
  trazo(o, curva(lado, 0, 4.2, 2.3, 0, TAU, 20), 22, true);          // caparazón
  for (const s of [-1, 1]) {
    const abre = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.8 + s)), bx = s * 6.4 + lado, by = -3.6;
    trazo(o, [[s * 3.6 + lado, -1.2], [s * 5.4 + lado, -1.4], [bx, by]], 4);
    trazo(o, curva(bx, by - 1.1, 1.2, 1.3, s > 0 ? Math.PI * 0.5 + abre : Math.PI * 0.5 - abre, s > 0 ? Math.PI * 1.5 - abre * 0.4 : -Math.PI * 0.5 + abre * 0.4, 8), 6);
    trazo(o, [[bx, by], [bx + s * 0.8, by - 1.0 - abre], [bx + s * 0.4, by - 2.2 - abre]], 3);
    for (let k = 0; k < 3; k++) {
      const m = Math.sin(f + k * 2.1 + (s > 0 ? 0 : Math.PI)) * 0.4;
      trazo(o, [[s * (3.0 + k * 0.4) + lado, 1.0 + k * 0.3], [s * (5.4 + k * 0.5) + lado, 1.6 + k * 0.6 + m], [s * (6.0 + k * 0.6) + lado, 4.0 + k * 0.5 + m]], 3, false, '0', 'n', 0.8);
    }
  }
  return o;
}

// ── Búho: ojos enormes en su disco, gira la cabeza y vigila desde su rama ─────────────────────────────────────────
function buho(t) {
  const o = [], mira = Math.sin(t * 0.7) * 0.9;
  ojos(o, -2.0 + mira * 0.5, -3.6, 2.0 + mira * 0.5, -3.6);
  for (const s of [-1, 1]) anillo(o, s * 2.0 + mira * 0.4, -3.6, 1.75, 1.6, 8, 0.4, '.', 'n', 0.8);
  trazo(o, [[-4.6, -2.0], [-4.4, -5.6], [-3.8, -8.2], [-1.8, -6.4], [0, -6.8], [1.8, -6.4], [3.8, -8.2], [4.4, -5.6], [4.6, -2.0]].map(([x, y]) => [x + mira * 0.3, y]), 15);
  o.push(pt(mira * 0.5, -2.0, 'v', 'x'));
  trazo(o, curva(0, 1.4, 4.6, 5.0, Math.PI * 1.12, Math.PI * 1.88 - TAU, 22).map(([x, y]) => [x, Math.max(y, -2.4)]), 20);   // el cuerpo
  for (const s of [-1, 1]) trazo(o, curva(s * 1.6, 1.4, 1.8, 3.6, s > 0 ? -0.9 : Math.PI + 0.9, s > 0 ? 1.1 : Math.PI - 1.1, 8), 5, false, ')', 'n', 0.55);
  for (const [x, y] of [[-1.0, 0.4], [1.0, 0.4], [0, 1.8], [-1.4, 2.8], [1.4, 2.8]]) o.push(pt(x, y, 'v', 'n', 0.45));   // plumas del pecho
  tramo(o, -6.0, 6.8, 6.0, 6.8, 10, '=', 'n', 0.85);                  // la rama
  for (const s of [-1, 1]) o.push(pt(s * 1.3, 6.2, 'w', 'x'));
  return o;
}

// ── Caracol: concha en espiral, cuernos con los ojos arriba, avanza estirándose ───────────────────────────────────
function caracol(t) {
  const o = [], est = Math.sin(t * 1.3) * 0.5;
  ojos(o, 5.6 + est, -4.6, 6.7 + est, -4.2);
  const E = [];
  for (let i = 0; i <= 40; i++) { const g = (i / 40) * 1.75 * TAU, r = 1.2 + g * 0.3; E.push([-0.6 + Math.cos(-g + 1.0) * r, -0.6 + Math.sin(-g + 1.0) * r]); }
  trazo(o, E, 22);                                                    // la concha
  trazo(o, [[-4.6 - est * 0.4, 3.6], [-1, 3.8], [3.0 + est, 3.6], [5.4 + est, 2.6], [6.2 + est, 0.6], [5.6 + est, -1.0], [4.0 + est, -0.6], [3.2, 2.0]], 16);   // el cuerpo
  for (const [x, y] of [[5.6, -4.6], [6.7, -4.2]]) tramo(o, 5.2 + est, -0.8, x + est, y + 0.8, 3, '|', 'n', 0.8);
  return o;
}

// ── Conejo sentado: orejas largas (una se dobla) y la nariz que tiembla; da un saltito ────────────────────────────
function conejo(t) {
  const o = [], salto = -Math.max(0, Math.sin(t * 2.2)) * 1.1, n = Math.sin(t * 13) * 0.08;
  ojos(o, -1.0, -2.4 + salto, 1.0, -2.4 + salto);
  anillo(o, 0, -2.2 + salto, 2.5, 2.2, 14, 0.2);
  o.push(pt(0, -1.3 + salto + n, 'x', 'x'));
  const dobla = 0.4 + Math.sin(t * 1.1) * 0.25;
  trazo(o, [[-1.0, -4.2], [-1.8, -6.6], [-1.6, -9.0], [-0.8, -6.6], [-0.4, -4.3]].map(([x, y]) => [x, y + salto]), 8);
  trazo(o, [[0.4, -4.3], [1.1, -6.4], [1.1 + Math.sin(dobla) * 2.2, -6.4 - Math.cos(dobla) * 2.2], [1.8, -6.2], [1.0, -4.2]].map(([x, y]) => [x, y + salto]), 8);
  trazo(o, curva(0, 2.6 + salto * 0.6, 3.6, 3.8, -Math.PI * 0.32, Math.PI * 1.32, 20), 20);   // cuerpo
  for (const s of [-1, 1]) trazo(o, curva(s * 2.6, 5.9 + salto * 0.3, 1.6, 0.7, Math.PI * 1.0, TAU, 6), 5);   // patas
  o.push(pt(4.0, 4.0 + salto * 0.6, '@', 'n', 0.8));                   // la colita
  return o;
}

export const ANIMALES = {
  gato, perro, pajaro, pez, pulpo, mariposa, serpiente, tortuga, medusa, murcielago, hormiga, escorpion, cangrejo, buho, caracol, conejo,
};
