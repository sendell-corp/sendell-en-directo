// Formas vivas · cuerpos en 3D. Se calculan en el espacio, se giran y se proyectan con p3 (trazos.mjs): lo que queda al
// fondo sale más tenue y eso da el volumen. Mismo contrato que formas.mjs: siempre los mismos puntos, en el mismo orden.
import { pt, TAU, p3, tramo3, anillo3, trazo3 } from './trazos.mjs';

const dist = (A, B) => Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
// Un sólido de alambre: sus vértices (marcados) y, en cada arista, puntos a unos `paso` de distancia. Como el sólido no
// cambia de tamaño, el número de puntos de cada arista es siempre el mismo.
function solido(o, V, E, v, paso, vert = 'O') {
  for (const q of V) p3(o, q[0], q[1], q[2], v, vert, 'x');
  for (const [i, j] of E) { const n = Math.max(1, Math.round(dist(V[i], V[j]) / paso)); if (n > 1) tramo3(o, V[i], V[j], n, v, '0', 'n', 1, (n - 1) / n); }
}
// Aristas = pares de vértices a la distancia más corta (sirve para los sólidos regulares).
function aristasDe(V) {
  let m = Infinity;
  V.forEach((A, i) => V.forEach((B, j) => { if (i < j) m = Math.min(m, dist(A, B)); }));
  const E = [];
  V.forEach((A, i) => V.forEach((B, j) => { if (i < j && Math.abs(dist(A, B) - m) < m * 0.01) E.push([i, j]); }));
  return E;
}
const escala = (V, e) => V.map(q => q.map(n => n * e));

// ── Pirámide de base cuadrada ────────────────────────────────────────────────────────────────────────────────────────
const PIR = [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], [0, -1.15, 0]].map(q => q.map(n => n * 4.3));
const PIR_E = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 4], [2, 4], [3, 4]];
function piramide(t) {
  const o = [];
  solido(o, PIR, PIR_E, [t * 0.6, 0.32, 0.035, 1, 0.6], 1.15);
  return o;
}

// ── Tetraedro: cuatro caras, gira sobre dos ejes ───────────────────────────────────────────────────────────────────
const TET = escala([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], 3.6);
function tetraedro(t) {
  const o = [];
  solido(o, TET, aristasDe(TET), [t * 0.7, 0.5 + t * 0.31, 0.035], 1.0);
  return o;
}

// ── Octaedro ───────────────────────────────────────────────────────────────────────────────────────────────────────
const OCT = escala([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], 5.6);
function octaedro(t) {
  const o = [];
  solido(o, OCT, aristasDe(OCT), [t * 0.6, 0.3 + Math.sin(t * 0.5) * 0.25, 0.035], 1.25);
  return o;
}

// ── Dodecaedro: doce caras pentagonales ────────────────────────────────────────────────────────────────────────────
const FI = (1 + Math.sqrt(5)) / 2;
const DOD = [];
for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) DOD.push([a, b, c]);
for (const a of [-1, 1]) for (const b of [-1, 1]) DOD.push([0, a / FI, b * FI], [a / FI, b * FI, 0], [b * FI, 0, a / FI]);
const DOD3 = escala(DOD, 3.4);
function dodecaedro(t) {
  const o = [];
  solido(o, DOD3, aristasDe(DOD3), [t * 0.5, 0.4 + Math.sin(t * 0.4) * 0.3, 0.035], 1.5, '0');
  return o;
}

// ── Prisma hexagonal ───────────────────────────────────────────────────────────────────────────────────────────────
const PRI = [];
for (const y of [-4.6, 4.6]) for (let k = 0; k < 6; k++) PRI.push([Math.cos((k / 6) * TAU) * 3.6, y, Math.sin((k / 6) * TAU) * 3.6]);
const PRI_E = [];
for (let k = 0; k < 6; k++) PRI_E.push([k, (k + 1) % 6], [6 + k, 6 + (k + 1) % 6], [k, k + 6]);
function prisma(t) {
  const o = [];
  solido(o, PRI, PRI_E, [t * 0.6, 0.42, 0.035], 1.2);
  return o;
}

// ── Cilindro: dos tapas y generatrices que giran ───────────────────────────────────────────────────────────────────
function cilindro(t) {
  const o = [], v = [t * 0.7, 0.4 + Math.sin(t * 0.5) * 0.1, 0.035];
  for (const y of [-4.8, 4.8]) anillo3(o, [0, y, 0], 4.0, 18, 'y', v);
  for (let k = 0; k < 6; k++) { const g = (k / 6) * TAU; tramo3(o, [Math.cos(g) * 4, -4.8, Math.sin(g) * 4], [Math.cos(g) * 4, 4.8, Math.sin(g) * 4], 6, v, '0', 'n', 0.8, 5 / 6); }
  return o;
}

// ── Cono: la base gira y las generatrices suben al vértice ─────────────────────────────────────────────────────────
function cono(t) {
  const o = [], v = [t * 0.7, 0.35, 0.035, 1, 0.8];
  anillo3(o, [0, 4.6, 0], 4.6, 20, 'y', v);
  p3(o, 0, -6.4, 0, v, 'O', 'x');
  for (let k = 0; k < 6; k++) { const g = (k / 6) * TAU; tramo3(o, [Math.cos(g) * 4.6, 4.6, Math.sin(g) * 4.6], [0, -6.4, 0], 8, v, '0', 'n', 0.85, 7 / 8); }
  return o;
}

// ── Esfera de meridianos y paralelos, inclinada, que gira ──────────────────────────────────────────────────────────
function esfera(t) {
  const o = [], R = 5.6, v = [t * 0.6, 0.45, 0.035];
  for (let m = 0; m < 6; m++) {
    const g = (m / 6) * Math.PI;
    for (let i = 1; i < 8; i++) { const k = (i / 8) * Math.PI; p3(o, Math.sin(k) * Math.cos(g) * R, -Math.cos(k) * R, Math.sin(k) * Math.sin(g) * R, v); }
  }
  for (const [lat, n] of [[0, 18], [0.75, 12], [-0.75, 12]]) anillo3(o, [0, Math.sin(lat) * R, 0], Math.cos(lat) * R, n, 'y', v, 0.13, '0', 'n', 0.6);
  p3(o, 0, -R, 0, v, 'O', 'x'); p3(o, 0, R, 0, v, 'O', 'x');
  return o;
}

// ── Diamante tallado: mesa, corona, filetín y pabellón; destella al girar ──────────────────────────────────────────
function diamante(t) {
  const o = [], v = [t * 0.5, 0.42, 0.035, 1, 0.4], V = [];
  for (let k = 0; k < 8; k++) { const g = (k / 8) * TAU; V.push([Math.cos(g) * 2.6, -3.6, Math.sin(g) * 2.6]); }
  for (let k = 0; k < 8; k++) { const g = ((k + 0.5) / 8) * TAU; V.push([Math.cos(g) * 5.6, -1.8, Math.sin(g) * 5.6]); }
  V.push([0, 5.6, 0]);
  const E = [];
  for (let k = 0; k < 8; k++) E.push([k, (k + 1) % 8], [8 + k, 8 + (k + 1) % 8], [k, 8 + k], [(k + 1) % 8, 8 + k], [8 + k, 16]);
  solido(o, V, E, v, 2.0, '0');
  const brillo = Math.floor(t * 2.5) % 8;
  p3(o, V[brillo][0], V[brillo][1] - 0.9, V[brillo][2], v, '*', 'x', 0.5 + 0.5 * Math.abs(Math.sin(t * 7.8)));
  return o;
}

// ── Cinta de Möbius: un solo borde que da dos vueltas, y los travesaños que muestran el giro ───────────────────────
function mobius(t) {
  const o = [], R = 4.8, w = 1.9, v = [t * 0.5, 0.75 + Math.sin(t * 0.4) * 0.2, 0.035];
  const P = (u, s) => { const r = R + s * w * Math.cos(u / 2); return [r * Math.cos(u), s * w * Math.sin(u / 2) * 1.2, r * Math.sin(u)]; };
  for (let i = 0; i < 56; i++) { const q = P((i / 56) * 2 * TAU, 1); p3(o, q[0], q[1], q[2], v); }
  for (let k = 0; k < 10; k++) {
    const u = (k / 10) * TAU, A = P(u, 1), B = P(u, -1);
    tramo3(o, A, B, 3, v, '-', 'n', 0.6, 2 / 3);
  }
  return o;
}

// ── Nudo de trébol: la curva cerrada más sencilla que no se deja desatar; los puntos corren por ella ───────────────
function nudo(t) {
  const o = [], v = [t * 0.45, 0.3 + Math.sin(t * 0.35) * 0.3, 0.035], N = 76;
  for (let i = 0; i < N; i++) {
    const u = (i / N) * TAU + t * 0.25;
    p3(o, (Math.sin(u) + 2 * Math.sin(2 * u)) * 2.0, (Math.cos(u) - 2 * Math.cos(2 * u)) * 2.0, -Math.sin(3 * u) * 2.2, v, i % 8 === 0 ? 'O' : '0');
  }
  return o;
}

// ── Espiral cónica: un remolino que se cierra hacia abajo y gira ───────────────────────────────────────────────────
function espiral(t) {
  const o = [], v = [t * 1.1, 0.3, 0.035], N = 74;
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1), g = s * 5.2 * TAU, r = 0.4 + 5.6 * (1 - s);
    p3(o, Math.cos(g) * r, -6.4 + s * 13.0, Math.sin(g) * r, v);
  }
  return o;
}

// ── Galaxia espiral: dos brazos de estrellas alrededor de un núcleo brillante, inclinada en el espacio ──────────────
function galaxia(t) {
  const o = [], v = [0.3, 1.0 + Math.sin(t * 0.3) * 0.15, 0.03], gira = t * 0.35;
  for (let i = 0; i < 9; i++) { const g = i * 2.4; p3(o, Math.cos(g) * 0.9 * Math.sqrt(i / 9), Math.sin(i) * 0.3, Math.sin(g) * 0.9 * Math.sqrt(i / 9), v, i === 0 ? '@' : 'O', 'x'); }
  for (const brazo of [0, Math.PI]) {
    for (let i = 0; i < 38; i++) {
      const s = i / 37, g = brazo + gira + s * 4.6, r = 1.2 + s * 7.6;
      const disp = Math.sin(i * 12.9898 + brazo * 7) * (0.3 + s * 0.9);  // las estrellas no van en fila
      const c = i % 7 === 3 ? '*' : s > 0.7 ? '.' : '0';
      p3(o, Math.cos(g) * r + Math.cos(g + 1.57) * disp, Math.sin(i * 3.1) * 0.25, Math.sin(g) * r + Math.sin(g + 1.57) * disp, v, c, 'n', 1 - s * 0.45);
    }
  }
  return o;
}

// ── Hipercubo: un cubo de cuatro dimensiones que gira en el plano x–w; se ve un cubo que atraviesa a otro ───────────
const HIP = [];
for (let i = 0; i < 16; i++) HIP.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
const HIP_E = [];
for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (i < j) HIP_E.push([i, j]); }
function hipercubo(t) {
  const o = [], g = t * 0.6, c = Math.cos(g), s = Math.sin(g), v = [t * 0.25 + 0.5, 0.45, 0.03];
  const V = HIP.map(([x, y, z, w]) => {
    const x1 = x * c - w * s, w1 = x * s + w * c, k = 3.0 / (2.6 - w1);   // giro en 4D y proyección a 3D
    return [x1 * k * 2.2, y * k * 2.2, z * k * 2.2];
  });
  for (const q of V) p3(o, q[0], q[1], q[2], v, 'O', 'x');
  for (const [i, j] of HIP_E) tramo3(o, V[i], V[j], 2, v, '0', 'n', 1, 0.5);
  return o;
}

// ── Muelle: una hélice que se comprime y se estira ─────────────────────────────────────────────────────────────────
function muelle(t) {
  const o = [], v = [t * 0.4, 0.38, 0.035], alto = 5.2 + Math.sin(t * 2.6) * 2.0, N = 66;
  for (let i = 0; i < N; i++) { const s = i / (N - 1), g = s * 5 * TAU; p3(o, Math.cos(g) * 3.4, alto - s * alto * 2 + 1.4, Math.sin(g) * 3.4, v); }
  for (const y of [alto + 1.6, -alto + 1.2]) tramo3(o, [-3.6, y, 0], [3.6, y, 0], 6, v, '=', 'x', 1, 5 / 6);
  return o;
}

// ── Giroscopio: tres anillos encajados que giran cada uno sobre su eje ─────────────────────────────────────────────
function giroscopio(t) {
  const o = [], v = [0.6, 0.35, 0.035];
  const R = (q, a, b) => {                                             // gira primero sobre x (a) y luego sobre y (b)
    const y = q[1] * Math.cos(a) - q[2] * Math.sin(a), z = q[1] * Math.sin(a) + q[2] * Math.cos(a);
    return [q[0] * Math.cos(b) + z * Math.sin(b), y, -q[0] * Math.sin(b) + z * Math.cos(b)];
  };
  const a = t * 0.9, b = t * 0.6;
  const aro = (r, n, f, c) => { for (let i = 0; i < n; i++) { const g = (i / n) * TAU; const q = f([Math.cos(g) * r, Math.sin(g) * r, 0]); p3(o, q[0], q[1], q[2], v, c); } };
  aro(6.0, 26, q => q, '0');                                           // el marco quieto
  aro(4.8, 22, q => R([q[2], q[1], q[0]], 0, b), '0');                 // el de en medio gira sobre el eje vertical
  aro(3.5, 16, q => R(R([q[0], q[2], q[1]], a, 0), 0, b), 'o');         // el de dentro, sobre los dos
  tramo3(o, [0, -7.4, 0], [0, 7.4, 0], 6, v, '|', 'n', 0.6, 5 / 6);
  p3(o, 0, 0, 0, v, '@', 'x');
  return o;
}

export const CUERPOS = {
  piramide, tetraedro, octaedro, dodecaedro, prisma, cilindro, cono, esfera, diamante, mobius, nudo, espiral, galaxia, hipercubo, muelle, giroscopio,
};
