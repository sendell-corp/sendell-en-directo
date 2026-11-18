// Formas vivas a las que Sendell se transforma. Cada forma es una función pura de t que devuelve SIEMPRE los mismos
// puntos en el mismo orden (solo cambian de sitio): así el reparto de ceros se calcula una vez y la forma puede moverse
// (la araña camina, el engranaje gira, el cubo rota) mientras Sendell «es» esa cosa.
//
// Punto: { x, y, c?, p?, a? } en la caja del avatar (17 × 18 celdas; el centro es (8, 8.5)). Una forma puede salirse de la caja.
// Dentro de este archivo se dibuja en unidades cuadradas (1 = ancho de celda) alrededor del centro y se convierte al final,
// porque la celda es más alta que ancha (× 1,2) y, si no, los círculos saldrían ovalados.
import { pt, TAU, tramo, anillo, relleno, p3, tramo3, anillo3 } from './trazos.mjs';   // los ayudantes viven en trazos.mjs
import { ANIMALES } from './formas-animales.mjs';
import { MAQUINAS } from './formas-maquinas.mjs';
import { CUERPOS } from './formas-3d.mjs';
import { OFICIOS } from './formas-oficios.mjs';
import { NATURALEZA } from './formas-naturaleza.mjs';
import { SIMBOLOS } from './formas-simbolos.mjs';

// ── Araña: vista desde arriba, ocho patas que caminan en dos grupos alternos ────────────────────────────────────
function arana(t) {
  const o = [];
  o.push(pt(-1, -2.4, '0', 'o'), pt(1, -2.4, '0', 'o'));              // ojos (siempre los dos primeros puntos)
  relleno(o, 0, -1.8, 2.6, 2.3, [[-1, -2.4], [1, -2.4]]);               // cabeza, con el hueco de los ojos
  relleno(o, 0, 3.2, 3.3, 3.1);                                         // abdomen
  const ANG = [-1.08, -0.42, 0.24, 0.92];                               // de la pata delantera a la trasera
  for (const s of [-1, 1]) {
    ANG.forEach((ang, i) => {
      const fase = t * 5.2 + ((i + (s > 0 ? 1 : 0)) % 2) * Math.PI;
      const g = ang + 0.17 * Math.sin(fase);                            // la pata barre adelante y atrás
      const alza = Math.max(0, Math.cos(fase)) * 0.5;                   // y se recoge un poco al avanzar
      const hx = s * 1.9, hy = -2.3 + i * 0.8;
      const kx = hx + s * Math.cos(g - 0.34) * 3.3, ky = hy + Math.sin(g - 0.34) * 3.3;
      const fx = hx + s * Math.cos(g + 0.1) * (6.5 - alza), fy = hy + Math.sin(g + 0.1) * (6.5 - alza);
      tramo(o, hx, hy, kx, ky, 3);
      tramo(o, kx, ky, fx, fy, 4);
    });
  }
  return o;
}

// ── Esqueleto: el propio Sendell visto como lo ve una herramienta de animación (huesos y articulaciones) ───────────
function esqueleto(t) {
  const o = [];
  const b = Math.sin(t * 1.8) * 0.35;                                   // balanceo de brazos
  o.push(pt(-0.7, -6.4, '0', 'o'), pt(0.7, -6.4, '0', 'o'));
  anillo(o, 0, -6.2, 1.9, 1.9, 12, 0.26);
  const J = (x, y) => o.push(pt(x, y, 'O', 'x'));
  const H = (ax, ay, bx, by, n) => tramo(o, ax, ay, bx, by, n, '0', 'n', 0.5);
  J(0, -3.9); H(0, -3.9, 0, 1.6, 5); J(0, 1.6);                         // cuello, columna, pelvis
  for (const s of [-1, 1]) {
    const cx = s * 3.9, cy = -1.3 + s * b, mx = s * 4.6 + s * b * 0.6, my = 1.5 + s * b * 1.4;
    J(s * 2.3, -3.6); H(s * 2.3, -3.6, cx, cy, 2); J(cx, cy); H(cx, cy, mx, my, 2); J(mx, my);     // hombro, codo, mano
    const rx = s * 1.9, ry = 5.0, px = s * 2.3, py = 8.3;
    J(s * 1.4, 2.0); H(s * 1.4, 2.0, rx, ry, 3); J(rx, ry); H(rx, ry, px, py, 3); J(px, py);        // cadera, rodilla, pie
  }
  return o;
}

// ── Cubo de alambre que rota: «esto es un modelo 3D» ───────────────────────────────────────────────────────────
function cubo(t) {
  const o = [];
  const R = 4.3, gy = t * 0.8, gx = 0.5;
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const x1 = x * Math.cos(gy) + z * Math.sin(gy), z1 = -x * Math.sin(gy) + z * Math.cos(gy);
    const y1 = y * Math.cos(gx) - z1 * Math.sin(gx), z2 = y * Math.sin(gx) + z1 * Math.cos(gx);
    const k = 1 / (1 + z2 * 0.16);
    V.push([x1 * R * k, y1 * R * k, z2]);
  }
  const A = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [a, b] of A) {
    const lejos = (V[a][2] + V[b][2]) / 2 > 0.2 ? 0.45 : 1;             // las aristas del fondo, más tenues
    tramo(o, V[a][0], V[a][1], V[b][0], V[b][1], 8, '0', 'n', lejos);
  }
  return o;
}

// ── Engranaje que gira: física, mecanismo, «el motor» ──────────────────────────────────────────────────────────
function engranaje(t) {
  const o = [];
  const f = t * 0.9;
  anillo(o, 0, 0, 4.2, 4.2, 22, f);
  for (let d = 0; d < 8; d++) {
    const g = f + (d / 8) * TAU;
    for (const [r, dg] of [[5.4, -0.11], [5.4, 0.11], [6.4, -0.09], [6.4, 0.09]]) o.push(pt(Math.cos(g + dg) * r, Math.sin(g + dg) * r));
  }
  anillo(o, 0, 0, 1.6, 1.6, 8, -f);
  for (let r = 0; r < 4; r++) { const g = f + (r / 4) * TAU; tramo(o, Math.cos(g) * 1.6, Math.sin(g) * 1.6, Math.cos(g) * 4.2, Math.sin(g) * 4.2, 2); }
  return o;
}

// ── Cámara: «te grabo desde varios lados» ──────────────────────────────────────────────────────────────────────
function camara(t) {
  const o = [];
  tramo(o, -4.5, -3.2, 2.5, -3.2, 8); tramo(o, 2.5, -3.2, 2.5, 1.6, 4); tramo(o, 2.5, 1.6, -4.5, 1.6, 8); tramo(o, -4.5, 1.6, -4.5, -3.2, 4);
  tramo(o, 2.5, -1.8, 5.4, -3.4, 4); tramo(o, 5.4, -3.4, 5.4, 1.8, 5); tramo(o, 5.4, 1.8, 2.5, 0.2, 4);     // visera del objetivo
  anillo(o, -1.0, -0.8, 1.5, 1.5, 9, t * 1.4);                                                            // lente
  o.push(pt(-3.4, -2.0, '*', 'x', 0.35 + 0.65 * (Math.sin(t * 4) > 0 ? 1 : 0)));                          // piloto de grabación
  tramo(o, -1, 1.6, -1, 4.2, 3); tramo(o, -1, 4.2, -4.2, 8.2, 5); tramo(o, -1, 4.2, 2.2, 8.2, 5); tramo(o, -1, 4.2, -1, 8.2, 4);   // trípode
  return o;
}

// ── Malla que ondula: la superficie de un modelo ───────────────────────────────────────────────────────────────
function malla(t) {
  const o = [];
  for (let j = 0; j < 7; j++) for (let i = 0; i < 11; i++) {
    const x = (i - 5) * 1.25, z = (j - 3);
    const y = z * 1.5 + Math.sin(x * 0.7 + t * 1.8 + z * 0.6) * 0.9;
    o.push(pt(x + z * 0.35, y, (i + j) % 2 ? '+' : '0', 'n', 0.55 + 0.45 * (j / 6)));
  }
  return o;
}

// ── Globo con meridianos que giran: internet, noticias, investigación ──────────────────────────────────────────
function mundo(t) {
  const o = [];
  const R = 5;
  anillo(o, 0, 0, R, R, 30);
  for (let m = 0; m < 3; m++) {
    const g = t * 0.7 + (m / 3) * Math.PI, rx = R * Math.cos(g), delante = Math.sin(g) > 0 ? 1 : 0.4;
    for (let i = 1; i < 12; i++) { const k = (i / 12) * Math.PI; o.push(pt(Math.sin(k) * rx, -Math.cos(k) * R, '0', 'n', delante)); }
  }
  for (const y of [-2.5, 0, 2.5]) { const w = Math.sqrt(R * R - y * y); tramo(o, -w, y, w, y, 7, '-', 'n', 0.6); }
  return o;
}

// ── Documento: un paper, unas notas ────────────────────────────────────────────────────────────────────────────
function documento(t) {
  const o = [];
  tramo(o, -3.6, -6, 2.2, -6, 6); tramo(o, 2.2, -6, 3.8, -4.2, 2); tramo(o, 3.8, -4.2, 3.8, 6.4, 8); tramo(o, 3.8, 6.4, -3.6, 6.4, 7); tramo(o, -3.6, 6.4, -3.6, -6, 10);
  const L = [5, 4, 5, 3, 5, 4, 2];
  L.forEach((n, i) => {
    const y = -3.6 + i * 1.35, escrito = (t * 5) % (L.length * 6 + 8) - i * 6;      // las líneas se escriben una tras otra
    for (let k = 0; k < n; k++) o.push(pt(-2.4 + k * 1.05, y, '=', 'n', escrito > k ? 0.9 : 0.18));
  });
  return o;
}

// ── Onda: voz, sonido ──────────────────────────────────────────────────────────────────────────────────────────
function onda(t) {
  const o = [];
  for (let i = 0; i < 23; i++) {
    const x = (i - 11) * 0.62, amp = 4.6 * Math.abs(Math.sin(i * 0.9 + t * 3) * Math.cos(i * 0.31 - t * 1.3)) + 0.4;
    for (let k = 0; k < 3; k++) o.push(pt(x, (k - 1) * amp * 0.5, k === 1 ? '0' : '|', 'n', k === 1 ? 1 : 0.6));
  }
  return o;
}

// ── Visto bueno ────────────────────────────────────────────────────────────────────────────────────────────────
function ok() {
  const o = [];
  for (const d of [0, 0.9]) { tramo(o, -5 + d, 0.6, -1.6 + d, 4.4, 6); tramo(o, -1.6 + d, 4.4, 5 + d, -4.6, 13); }
  return o;
}

// ── Lupa ───────────────────────────────────────────────────────────────────────────────────────────────────────
function lupa(t) {
  const o = [];
  const dx = Math.sin(t * 1.1) * 1.2, dy = Math.cos(t * 0.8) * 0.7;      // recorre despacio lo que examina
  anillo(o, -1 + dx, -1.6 + dy, 3.6, 3.6, 24);
  anillo(o, -1 + dx, -1.6 + dy, 2.5, 2.5, 12, 0.3, '.', 'n', 0.5);
  for (const d of [-0.45, 0.45]) tramo(o, 1.6 + dx + d, 1.0 + dy - d, 5.2 + dx + d, 5.6 + dy - d, 6);
  return o;
}

// ── Rayo: energía, un impacto ──────────────────────────────────────────────────────────────────────────────────
function rayo(t) {
  const o = [];
  const v = Math.sin(t * 22) > 0.4 ? 1 : 0.75;
  for (const d of [0, 1]) {
    tramo(o, 1.6 + d, -7.4, -2.6 + d, -0.6, 8, '0', 'n', v); tramo(o, -2.6 + d, -0.6, 1.2 + d, -0.6, 4, '0', 'n', v); tramo(o, 1.2 + d, -0.6, -2.2 + d, 7.2, 9, '0', 'n', v);
  }
  return o;
}

// ═══ Formas en tres dimensiones ═══════════════════════════════════════════════════════════════════════════════════
// Los ayudantes 3D (gira, p3, tramo3, anillo3) están en trazos.mjs.

// ── Toro: la rosquilla de los gráficos por computador ─────────────────────────────────────────────────────────────
function toro(t) {
  const o = [], v = [t * 0.6, 1.0 + Math.sin(t * 0.4) * 0.25, 0.03];
  for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) {
    const u = (i / 12) * TAU, w = (j / 8) * TAU + t * 0.9, R = 4.3 + 1.7 * Math.cos(w);
    p3(o, R * Math.cos(u), 1.7 * Math.sin(w), R * Math.sin(u), v);
  }
  return o;
}

// ── Icosaedro: un sólido de veinte caras que rota ─────────────────────────────────────────────────────────────────
const FI = (1 + Math.sqrt(5)) / 2;
const ICO = [];
for (const a of [-1, 1]) for (const b of [-FI, FI]) ICO.push([0, a, b], [a, b, 0], [b, 0, a]);
const ICO_ARISTAS = [];
ICO.forEach((A, i) => ICO.forEach((B, j) => { if (i < j && Math.abs(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) - 2) < 0.01) ICO_ARISTAS.push([i, j]); }));
function icosaedro(t) {
  const o = [], v = [t * 0.7, 0.4 + Math.sin(t * 0.5) * 0.3, 0.035], e = 3.4, V = ICO.map(q => q.map(n => n * e));
  for (const q of V) p3(o, q[0], q[1], q[2], v, 'O', 'x');
  for (const [i, j] of ICO_ARISTAS) tramo3(o, V[i], V[j], 2, v, '0', 'n', 1, 0.66);
  return o;
}

// ── Doble hélice ──────────────────────────────────────────────────────────────────────────────────────────────────
function helice(t) {
  const o = [], v = [0, 0.12, 0.04];
  for (let i = 0; i < 22; i++) {
    const y = (i - 10.5) * 0.72, g = i * 0.55 + t * 1.4;
    const A = [Math.cos(g) * 2.9, y, Math.sin(g) * 2.9], B = [-A[0], y, -A[2]];
    p3(o, A[0], A[1], A[2], v); p3(o, B[0], B[1], B[2], v);
    if (i % 2 === 0) tramo3(o, A, B, 2, v, '-', 'n', 0.7, 0.66);
  }
  return o;
}

// ── Brazo robótico: tres tramos articulados y una pinza que abre y cierra ─────────────────────────────────────────
function brazo(t) {
  const o = [], v = [0.7 * Math.sin(t * 0.5), 0.3, 0.03, 1.2, -2.2];
  const a1 = -0.55 + 0.35 * Math.sin(t * 1.1), a2 = a1 + 1.25 + 0.4 * Math.sin(t * 1.7 + 1), a3 = a2 + 0.5 * Math.sin(t * 2.3);
  const H = [0, 4.6, 0], C = [H[0] + Math.sin(a1) * 4.4, H[1] - Math.cos(a1) * 4.4, 0], M = [C[0] + Math.sin(a2) * 3.8, C[1] - Math.cos(a2) * 3.8, 0];
  const P = [M[0] + Math.sin(a3) * 1.5, M[1] - Math.cos(a3) * 1.5, 0];
  anillo3(o, [0, 7.4, 0], 2.6, 12, 'y', v);                                        // peana
  tramo3(o, [0, 7.4, 0], H, 3, v);
  for (const d of [-0.45, 0.45]) { tramo3(o, [H[0], H[1], d], [C[0], C[1], d], 5, v, '0', 'n', 1, 0.85); tramo3(o, [C[0], C[1], d], [M[0], M[1], d], 5, v, '0', 'n', 1, 0.85); }
  tramo3(o, M, P, 2, v);
  for (const q of [H, C, M]) p3(o, q[0], q[1], q[2], v, 'O', 'x');
  const abre = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.6)), nx = Math.cos(a3), ny = Math.sin(a3);
  for (const s of [-1, 1]) tramo3(o, [P[0] + nx * abre * s, P[1] + ny * abre * s, 0], [P[0] + nx * abre * s + Math.sin(a3) * 1.3, P[1] + ny * abre * s - Math.cos(a3) * 1.3, 0], 3, v);
  for (let i = 0; i < 9; i++) p3(o, -6 + ((i * 1.5 + t * 1.2) % 13.5), 8.3, 1.5, v, '-', 'n', 0.5);   // la cinta que pasa por delante
  return o;
}

// ── Dron: cuatro rotores girando, cabecea al volar ────────────────────────────────────────────────────────────────
function dron(t) {
  const o = [], sube = Math.sin(t * 1.9) * 0.6, v = [t * 0.45, 0.95 + Math.sin(t * 1.3) * 0.12, 0.035];
  anillo3(o, [0, sube, 0], 1.1, 8, 'y', v);
  let n = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const M = [sx * 3.5, sube - 0.2, sz * 3.5];
    tramo3(o, [sx * 0.8, sube, sz * 0.8], M, 3, v);
    anillo3(o, [M[0], M[1] - 0.35, M[2]], 1.8, 9, 'y', v, t * 15 * (n++ % 2 ? 1 : -1), '0', 'n', 0.85);
    tramo3(o, [sx * 1.0, sube, sz * 1.0], [sx * 1.3, sube + 1.4, sz * 1.3], 2, v, '0', 'n', 0.7);   // patas
  }
  return o;
}

// ── Cuadrúpedo: un perro robot que trota ──────────────────────────────────────────────────────────────────────────
function cuadrupedo(t) {
  const o = [], v = [0.55 + 0.45 * Math.sin(t * 0.35), 0.3, 0.03, 1.45, 1.2], bote = Math.abs(Math.sin(t * 6)) * 0.18;
  const X0 = -3.2, X1 = 3.0, Y0 = -2.4 - bote, Y1 = -1.0 - bote, Z = 1.1;
  p3(o, 4.5, Y0 - 0.5, -0.45, v, '0', 'o'); p3(o, 4.5, Y0 - 0.5, 0.45, v, '0', 'o');                 // ojos: mira hacia delante
  for (const y of [Y0, Y1]) for (const z of [-Z, Z]) tramo3(o, [X0, y, z], [X1, y, z], 4, v);
  for (const x of [X0, X1]) { for (const z of [-Z, Z]) tramo3(o, [x, Y0, z], [x, Y1, z], 1, v, '0', 'n', 1, 0.5); for (const y of [Y0, Y1]) tramo3(o, [x, y, -Z], [x, y, Z], 2, v, '0', 'n', 1, 0.66); }
  anillo3(o, [4.1, Y0 - 0.4, 0], 1.0, 7, 'x', v);                                                    // cabeza
  tramo3(o, [X1, Y0, 0], [3.6, Y0 - 0.3, 0], 1, v);
  tramo3(o, [X0, Y0, 0], [X0 - 1.3, Y0 - 0.9 + Math.sin(t * 9) * 0.3, 0], 2, v);                      // cola
  let n = 0;
  for (const x of [2.3, -2.5]) for (const z of [-Z, Z]) {
    const fase = t * 6 + ((n++ === 0 || n === 4) ? 0 : Math.PI);                                     // trote: patas en diagonal
    const g = 0.5 * Math.sin(fase), dobla = 0.55 + 0.55 * Math.max(0, Math.cos(fase));
    const C = [x, Y1, z], R = [x + Math.sin(g) * 2.1, Y1 + Math.cos(g) * 2.1, z], F = [R[0] + Math.sin(g - dobla) * 2.3, R[1] + Math.cos(g - dobla) * 2.3, z];
    tramo3(o, C, R, 3, v, '0', 'n', 1, 0.8); p3(o, R[0], R[1], R[2], v, 'O', 'x'); tramo3(o, R, F, 3, v);
  }
  return o;
}

// ── Robot humanoide que camina sobre una plataforma giratoria ─────────────────────────────────────────────────────
function robot(t) {
  const o = [], v = [t * 0.55, 0.16, 0.035, 1.15, -0.6], f = t * 4.2, bote = -Math.abs(Math.sin(f)) * 0.22;
  const J = q => p3(o, q[0], q[1], q[2], v, 'O', 'x');
  p3(o, -0.55, -5.9 + bote, 1.25, v, '0', 'o'); p3(o, 0.55, -5.9 + bote, 1.25, v, '0', 'o');           // ojos
  anillo3(o, [0, -5.7 + bote, 0], 1.45, 10, 'y', v); anillo3(o, [0, -5.7 + bote, 0], 1.45, 6, 'z', v, 0.5);   // cabeza
  const cuello = [0, -4.1 + bote, 0], pelvis = [0, 0.7 + bote, 0];
  tramo3(o, cuello, pelvis, 5, v, '0', 'n', 1, 0.85); J(cuello); J(pelvis);
  for (const s of [-1, 1]) {
    const bal = Math.sin(f) * 0.7 * s;                                                               // brazo y pierna contrarios
    const hom = [s * 2.0, -3.7 + bote, 0], codo = [hom[0] + s * 0.2, hom[1] + Math.cos(bal) * 2.2, -Math.sin(bal) * 2.2];
    const mano = [codo[0], codo[1] + Math.cos(bal - 0.5) * 2.0, codo[2] - Math.sin(bal - 0.5) * 2.0 + 0.3];
    tramo3(o, cuello, hom, 2, v, '0', 'n', 1, 0.8); J(hom); tramo3(o, hom, codo, 2, v, '0', 'n', 1, 0.75); J(codo); tramo3(o, codo, mano, 3, v);
    const cad = [s * 1.0, 0.9 + bote, 0], zan = -bal, dobla = 0.25 + 0.7 * Math.max(0, Math.sin(f * 1 + (s > 0 ? Math.PI / 2 : -Math.PI / 2)));
    const rod = [cad[0], cad[1] + Math.cos(zan) * 2.9, -Math.sin(zan) * 2.9], pie = [rod[0], rod[1] + Math.cos(zan + dobla) * 2.9, rod[2] - Math.sin(zan + dobla) * 2.9];
    tramo3(o, pelvis, cad, 1, v, '0', 'n', 1, 0.7); J(cad); tramo3(o, cad, rod, 3, v, '0', 'n', 1, 0.8); J(rod); tramo3(o, rod, pie, 4, v);
  }
  anillo3(o, [0, 7.9, 0], 3.4, 14, 'y', v, 0, '.', 'n', 0.6);                                         // plataforma
  return o;
}

// ── Terreno: una malla en perspectiva que avanza (simulación) ─────────────────────────────────────────────────────
function terreno(t) {
  const o = [], corre = (t * 1.3) % 1;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) {
    const z = j + 1 - corre, x = (i - 5.5) * 1.5, fila = j - Math.floor(t * 1.3);
    const h = Math.sin(x * 0.55 + fila * 0.9) * Math.cos(fila * 0.5 + i * 0.4) * 1.5;
    const k = 0.42 + z * 0.085;
    o.push(pt(x * k, -4.2 + z * 1.45 - h * k, (i + fila) % 2 ? '+' : '0', 'n', Math.min(1, 0.22 + z * 0.11)));
  }
  return o;
}

// ── Átomo: tres órbitas inclinadas y sus electrones ───────────────────────────────────────────────────────────────
function atomo(t) {
  const o = [], v = [t * 0.3, 0.35, 0.03];
  anillo3(o, [0, 0, 0], 0.75, 5, 'z', v, t, '0', 'x');
  for (let m = 0; m < 3; m++) {
    const inc = (m / 3) * Math.PI, e = t * (1.6 + m * 0.35) + m * 2;
    for (let i = 0; i < 22; i++) {
      const g = (i / 22) * TAU, x = Math.cos(g) * 5.6, w = Math.sin(g) * 5.6;
      const cerca = Math.cos(g - e);                                                                  // el electrón y su estela
      p3(o, x, w * Math.cos(inc), w * Math.sin(inc), v, cerca > 0.985 ? 'O' : cerca > 0.9 ? '0' : '.', cerca > 0.985 ? 'x' : 'n', cerca > 0.9 ? 1 : 0.5);
    }
  }
  return o;
}

// ── Red neuronal: nodos en capas y señales que la cruzan ──────────────────────────────────────────────────────────
function red(t) {
  const o = [], CAPAS = [4, 5, 3], X = [-5.2, 0, 5.2], Y = (n, k) => (k - (n - 1) / 2) * 2.5;
  CAPAS.forEach((n, c) => { for (let k = 0; k < n; k++) o.push(pt(X[c], Y(n, k), 'O', 'x', 0.55 + 0.45 * Math.abs(Math.sin(t * 2 + c * 1.3 + k * 2.1)))); });
  let s = 0;
  for (let c = 0; c < 2; c++) for (let a = 0; a < CAPAS[c]; a++) for (let b = 0; b < CAPAS[c + 1]; b++) {
    const pulso = ((t * 0.9 + (s++ * 0.37)) % 1 + 1) % 1;
    for (const k of [0.36, 0.66]) {
      const luz = Math.max(0, 1 - Math.abs(k - pulso) * 5);
      o.push(pt(X[c] + (X[c + 1] - X[c]) * k, Y(CAPAS[c], a) + (Y(CAPAS[c + 1], b) - Y(CAPAS[c], a)) * k, luz > 0.5 ? '0' : '.', 'n', 0.25 + 0.75 * luz));
    }
  }
  return o;
}

export const FORMAS = {
  arana, esqueleto, cubo, engranaje, camara, malla, mundo, documento, onda, ok, lupa, rayo,
  toro, icosaedro, helice, brazo, dron, cuadrupedo, robot, terreno, atomo, red,
  ...ANIMALES, ...MAQUINAS, ...CUERPOS, ...OFICIOS, ...NATURALEZA, ...SIMBOLOS,   // las familias, en sus archivos
};
export const nombresDeFormas = () => Object.keys(FORMAS);
// Los puntos de una forma en el instante t. Nombre desconocido → lista vacía (el avatar se queda como está).
export const forma = (nombre, t = 0) => (FORMAS[nombre] ? FORMAS[nombre](t) : []);
