// Formas vivas · símbolos. Mismo contrato que formas.mjs: función pura de t, siempre los mismos puntos en el mismo orden.
import { pt, TAU, tramo, anillo, p3, tramo3, anillo3, trazo, trazo3, arco, curva, giro, torno } from './trazos.mjs';

// Una figura plana con grosor: el contorno delante y detrás, y los cantos en las esquinas. Gira con v.
function extruye(o, P, n, fondo, v, esquinas = []) {
  for (const z of [-fondo, fondo]) trazo3(o, P.map(([x, y]) => [x, y, z]), n, v, true);
  for (const i of esquinas) tramo3(o, [P[i][0], P[i][1], -fondo], [P[i][0], P[i][1], fondo], 2, v, '0', 'n', 0.8, 0.5);
}

// ── Corazón que late ──────────────────────────────────────────────────────────────────────────────────────────────
function corazon(t) {
  const o = [], u = (t * 1.2) % 1, late = 1 + 0.12 * Math.exp(-u * 9) + 0.07 * Math.exp(-Math.abs(u - 0.22) * 14);   // lub-dub
  const P = [];
  for (let i = 0; i < 48; i++) { const g = (i / 48) * TAU, x = 16 * Math.sin(g) ** 3, y = 13 * Math.cos(g) - 5 * Math.cos(2 * g) - 2 * Math.cos(3 * g) - Math.cos(4 * g); P.push([x * 0.46 * late, (-y * 0.46 - 0.6) * late]); }
  trazo(o, P, 44, true);
  trazo(o, P.map(([x, y]) => [x * 0.62, y * 0.62 - 0.3]), 20, true, '0', 'n', 0.4);
  return o;
}

// ── Estrella de cinco puntas en 3D, con grosor, que gira ──────────────────────────────────────────────────────────
const ESTRELLA = Array.from({ length: 10 }, (_, i) => { const g = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 3.1 : 7.4; return [Math.cos(g) * r, Math.sin(g) * r + 0.6]; });
function estrella(t) {
  const o = [];
  extruye(o, ESTRELLA, 38, 0.9, [Math.sin(t * 0.9) * 1.0, 0.18, 0.035], [0, 2, 4, 6, 8]);
  return o;
}

// ── Infinito: la lemniscata y una luz que la recorre sin fin ──────────────────────────────────────────────────────
function infinito(t) {
  const o = [], N = 52;
  for (let i = 0; i < N; i++) {
    const g = (i / N) * TAU, d = 1 + Math.sin(g) ** 2, x = 7.4 * Math.cos(g) / d, y = 7.4 * Math.sin(g) * Math.cos(g) / d;
    const luz = Math.cos(g - t * 2.2), c = luz > 0.97 ? 'O' : '0';
    o.push(pt(x, y * 1.15, c, luz > 0.97 ? 'x' : 'n', 0.45 + 0.55 * Math.max(0, luz)));
  }
  return o;
}

// ── Flecha en 3D que apunta, avanza y vuelve ──────────────────────────────────────────────────────────────────────
const FLECHA = [[-7.0, -1.4], [1.6, -1.4], [1.6, -4.0], [7.4, 0], [1.6, 4.0], [1.6, 1.4], [-7.0, 1.4]];
function flecha(t) {
  const o = [], empuje = Math.sin(t * 2.4) * 0.8;
  extruye(o, FLECHA.map(([x, y]) => [x + empuje, y]), 34, 1.0, [0.35 + Math.sin(t * 0.7) * 0.3, 0.35, 0.03], [1, 2, 3, 4, 5]);
  return o;
}

// ── Diana: anillos concéntricos y la flecha que se clava en el centro ───────────────────────────────────────────────
function diana(t) {
  const o = [], u = (t * 0.5) % 1, vuela = u < 0.35 ? 1 - u / 0.35 : 0, tiembla = u > 0.35 && u < 0.55 ? Math.sin(u * 120) * 0.25 * (0.55 - u) * 5 : 0;
  anillo(o, 0, 0, 7.2, 7.2, 30); anillo(o, 0, 0, 4.8, 4.8, 20, 0.15); anillo(o, 0, 0, 2.4, 2.4, 10, 0.3);
  o.push(pt(0, 0, '@', 'x'));
  const dx = 3.6 + vuela * 10, dy = -3.6 - vuela * 10;
  tramo(o, dx * 0.12 + tiembla, dy * 0.12, dx + tiembla * 2, dy, 6, '/', 'x', vuela > 0.95 ? 0 : 1);   // la flecha clavada (o en vuelo)
  o.push(pt(dx + 0.6 + tiembla * 2, dy - 0.2, '>', 'x', vuela > 0.95 ? 0 : 1), pt(dx - 0.2 + tiembla * 2, dy - 0.9, 'v', 'x', vuela > 0.95 ? 0 : 1));
  return o;
}

// ── Notas musicales que botan al compás ───────────────────────────────────────────────────────────────────────────
function nota(t) {
  const o = [], b1 = -Math.abs(Math.sin(t * 3.2)) * 1.0, b2 = -Math.abs(Math.sin(t * 3.2 + 1.2)) * 1.0;
  for (const [x, b] of [[-3.6, b1], [3.6, b2]]) {
    anillo(o, x - 1.4, 4.6 + b, 1.7, 1.3, 9, -0.4);                     // la cabeza
    tramo(o, x + 0.2, 4.2 + b, x + 0.2, -4.6 + b, 8);                   // la plica
  }
  trazo(o, [[-3.4, -4.6 + b1], [3.8, -6.0 + b2]], 9);                   // la barra
  trazo(o, [[-3.4, -3.2 + b1], [3.8, -4.6 + b2]], 9, false, '0', 'n', 0.8);
  for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i / 3) % 1; o.push(pt(6.8 + Math.sin(u * 6) * 0.6, 4 - u * 9, '.', 'n', 1 - u)); }
  return o;
}

// ── Bocadillo de diálogo: alguien está escribiendo… ───────────────────────────────────────────────────────────────
function bocadillo(t) {
  const o = [];
  trazo(o, [...curva(-4.4, -3.4, 2.6, 2.6, Math.PI, Math.PI * 1.5, 4), ...curva(4.4, -3.4, 2.6, 2.6, Math.PI * 1.5, TAU, 4), ...curva(4.4, 1.8, 2.6, 2.6, 0, Math.PI / 2, 4),
    [-1.0, 4.4], [-4.6, 7.6], [-3.6, 4.4], ...curva(-4.4, 1.8, 2.6, 2.6, Math.PI / 2, Math.PI, 4)], 46, true);
  for (let k = 0; k < 3; k++) { const s = Math.sin(t * 5 - k * 0.9); o.push(pt(-2.6 + k * 2.6, -0.8 - Math.max(0, s) * 0.7, 'O', 'x', 0.45 + 0.55 * Math.max(0, s))); }
  return o;
}

// ── Signo de interrogación que se balancea ────────────────────────────────────────────────────────────────────────
function interrogacion(t) {
  const o = [];
  trazo(o, [...curva(0, -3.6, 3.8, 3.6, Math.PI * 1.05, Math.PI * 2.35, 14), [0.4, 0.8], [0.2, 3.0]], 30);
  for (const d of [-0.9, 0.9]) o.push(pt(0.2 + d * 0.5, 6.0, '0', 'n'));
  o.push(pt(0.2, 6.0, 'O', 'x'), pt(0.2, 6.9, '0', 'n', 0.7));
  trazo(o, curva(0, -3.6, 2.6, 2.4, Math.PI * 1.1, Math.PI * 2.2, 8), 8, false, '0', 'n', 0.35);   // el grosor de la curva
  giro(o, 0, Math.sin(t * 1.6) * 0.18, 0, 6.6);
  return o;
}

// ── Moneda que gira sobre su canto ────────────────────────────────────────────────────────────────────────────────
function moneda(t) {
  const o = [], v = [Math.sin(t * 0.9) * 1.1, 0.1, 0.03];
  for (const z of [-0.6, 0.6]) anillo3(o, [0, 0, z], 6.2, 30, 'z', v);
  anillo3(o, [0, 0, 0.6], 4.8, 18, 'z', v, 0, '.', 'n', 0.6);
  trazo3(o, [[2.0, -2.8, 0.7], [-1.6, -2.8, 0.7], [-2.0, -0.8, 0.7], [1.8, 0.6, 0.7], [1.6, 2.6, 0.7], [-2.0, 2.6, 0.7]], 12, v, false, '0', 'x');   // la S del dólar
  tramo3(o, [0, -4.0, 0.7], [0, 4.0, 0.7], 3, v, '|', 'x');
  return o;
}

// ── Gráfica que sube: barras que crecen y una flecha de tendencia ──────────────────────────────────────────────────
function grafica(t) {
  const o = [], u = (t * 0.35) % 1, crece = Math.min(1, u * 2.2);
  tramo(o, -7.0, 7.0, -7.0, -7.4, 12, '|', 'n', 0.6); tramo(o, -7.0, 7.0, 7.6, 7.0, 12, '_', 'n', 0.6);
  [2.0, 3.6, 3.0, 5.4, 8.6].forEach((h, k) => {
    const x = -5.2 + k * 2.8, alto = h * crece;
    for (let i = 0; i < 5; i++) o.push(pt(x, 6.6 - (i / 4) * alto, i === 4 ? '=' : '|', 'n', alto > 0.3 ? 0.9 : 0));
  });
  const L = [[-6.0, 3.4], [-2.8, 1.2], [0, 2.4], [3.0, -1.8], [6.6, -6.8]];
  trazo(o, L, 16, false, '0', 'x', 1);
  for (let i = 0; i < 16; i++) { const q = o[o.length - 16 + i]; if (i / 15 > crece) q.a = 0; }
  o.push(pt(7.0, -7.4, '^', 'x', crece >= 1 ? 1 : 0));
  return o;
}

// ── Peón de ajedrez, torneado, que gira ───────────────────────────────────────────────────────────────────────────
function peon(t) {
  const o = [], v = [t * 0.6, 0.32, 0.035, 1, 0.6];
  anillo3(o, [0, -5.2, 0], 2.2, 12, 'z', v);                            // la cabeza (siempre redonda)
  torno(o, [[2.6, -2.5, 12], [2.0, 2.0, 9], [3.4, 4.4, 12], [4.2, 6.4, 16]], 10, v);
  for (const s of [-1, 1]) trazo(o, [[s * 1.4, -1.4], [s * 1.9, 2.0], [s * 3.3, 4.2], [s * 4.2, 5.6]].map(([x, y]) => [x, y + 0.6]), 7, false, '0', 'n', 0.9);   // la silueta
  return o;
}

// ── Torre de ajedrez con almenas, que gira ────────────────────────────────────────────────────────────────────────
function torre(t) {
  const o = [], v = [t * 0.6, 0.32, 0.035, 1, 0.4];
  for (let k = 0; k < 6; k++) {                                         // las almenas
    const g = (k / 6) * TAU, c = Math.cos(g), s = Math.sin(g), g2 = g + TAU / 12, c2 = Math.cos(g2), s2 = Math.sin(g2);
    tramo3(o, [c * 3.4, -4.6, s * 3.4], [c * 3.4, -7.0, s * 3.4], 2, v); tramo3(o, [c * 3.4, -7.0, s * 3.4], [c2 * 3.4, -7.0, s2 * 3.4], 2, v); tramo3(o, [c2 * 3.4, -7.0, s2 * 3.4], [c2 * 3.4, -5.2, s2 * 3.4], 2, v);
  }
  torno(o, [[3.4, -4.6, 12], [2.6, 3.0, 9], [4.4, 6.8, 14]], 10, v);
  for (const s of [-1, 1]) trazo(o, [[s * 2.4, -3.0], [s * 2.6, 3.6]], 5, false, '0', 'n', 0.9);
  return o;
}

// ── Corona en 3D: puntas con joyas que brillan, girando ───────────────────────────────────────────────────────────
function corona(t) {
  const o = [], v = [t * 0.5, 0.42, 0.035, 1, 1.0];
  anillo3(o, [0, 3.0, 0], 5.2, 24, 'y', v);
  for (let k = 0; k < 5; k++) {                                         // cinco puntas
    const g = (k / 5) * TAU, g1 = g - TAU / 10, g2 = g + TAU / 10, P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    tramo3(o, P(g1, 5.2, 3.0), P(g, 5.6, -4.0), 5, v); tramo3(o, P(g, 5.6, -4.0), P(g2, 5.2, 3.0), 5, v, '0', 'n', 1, 0.8);
    const j = P(g, 5.7, -5.0); p3(o, j[0], j[1], j[2], v, (Math.floor(t * 3) + k) % 3 ? 'o' : '*', 'x');
  }
  return o;
}

// ── Reloj de agujas: el segundero corre y el minutero avanza ──────────────────────────────────────────────────────
function reloj(t) {
  const o = [];
  anillo(o, 0, 0, 7.0, 7.0, 32);
  for (let k = 0; k < 12; k++) { const g = (k / 12) * TAU; o.push(pt(Math.cos(g) * 5.8, Math.sin(g) * 5.8, k % 3 ? '.' : 'o', 'n', k % 3 ? 0.6 : 1)); }
  const seg = (t / 6) * TAU - Math.PI / 2, min = (t / 72) * TAU - Math.PI / 2 + 1.2, hora = -Math.PI / 2 - 0.6;
  tramo(o, 0, 0, Math.cos(hora) * 3.2, Math.sin(hora) * 3.2, 3);
  tramo(o, 0, 0, Math.cos(min) * 4.8, Math.sin(min) * 4.8, 5);
  tramo(o, 0, 0, Math.cos(seg) * 5.4, Math.sin(seg) * 5.4, 6, '.', 'x');
  o.push(pt(0, 0, 'O', 'x'));
  return o;
}

// ── Señal wifi: los arcos se encienden de dentro afuera ───────────────────────────────────────────────────────────
function wifi(t) {
  const o = [], paso = Math.floor(t * 2.4) % 5;
  o.push(pt(0, 5.6, 'O', 'x'));
  for (let k = 0; k < 3; k++) {
    const r = 3.4 + k * 3.2, enc = paso > k ? 1 : 0.18;
    arco(o, 0, 5.6, r, r, -Math.PI * 0.78, -Math.PI * 0.22, 8 + k * 6, '0', 'n', enc);
    arco(o, 0, 5.6, r - 0.9, r - 0.9, -Math.PI * 0.76, -Math.PI * 0.24, 5 + k * 4, '0', 'n', enc * 0.5);
  }
  return o;
}

// ── Marcador de ubicación que bota sobre el mapa ──────────────────────────────────────────────────────────────────
function ubicacion(t) {
  const o = [], b = -Math.abs(Math.sin(t * 2.6)) * 2.0;
  trazo(o, [...curva(0, -3.8, 4.4, 4.4, Math.PI * 0.82, Math.PI * 2.18, 16), [0, 5.4]].map(([x, y]) => [x, y + b]), 36, true);
  anillo(o, 0, -3.8 + b, 1.7, 1.7, 8, 0, '0', 'x');
  const w = 1 + b * 0.18;                                               // la sombra se encoge al subir
  arco(o, 0, 7.0, 3.4 * w, 0.9 * w, 0, TAU * 0.94, 12, '.', 'n', 0.6);
  return o;
}

// ── Bandera que ondea en su mástil ────────────────────────────────────────────────────────────────────────────────
function bandera(t) {
  const o = [];
  tramo(o, -5.6, 8.6, -5.6, -8.0, 14);
  o.push(pt(-5.6, -8.8, 'O', 'x'));
  const ola = (x, y) => [x, y + Math.sin(x * 0.7 - t * 4) * 0.8 * ((x + 5.6) / 12)];
  const P = [];
  for (let i = 0; i <= 10; i++) P.push(ola(-5.6 + i * 1.2, -7.6));
  for (let i = 0; i <= 10; i++) P.push(ola(6.4 - i * 1.2, -0.6));
  trazo(o, P, 36);
  for (let i = 0; i < 9; i++) o.push(pt(...ola(-4.2 + i * 1.2, -4.1), '~', 'n', 0.5));
  return o;
}

// ── Trofeo: copa con asas sobre su peana y un destello ────────────────────────────────────────────────────────────
function trofeo(t) {
  const o = [];
  trazo(o, [[-5.0, -7.2], [5.0, -7.2], [4.6, -3.0], ...curva(0, -3.0, 4.6, 4.2, 0, Math.PI, 10), [-5.0, -7.2]], 36, true);   // la copa
  for (const s of [-1, 1]) trazo(o, curva(s * 5.0, -4.6, 2.2, 2.0, s > 0 ? -Math.PI / 2 : Math.PI * 1.5, s > 0 ? Math.PI / 2 : Math.PI / 2, 8), 7);   // las asas
  tramo(o, 0, 1.4, 0, 4.4, 3);
  trazo(o, [[-3.4, 4.4], [3.4, 4.4], [3.8, 7.4], [-3.8, 7.4]], 16, true);   // la peana
  o.push(pt(0, -4.6, '1', 'x'));
  const d = (t * 0.6) % 1.4;
  o.push(pt(-3.0 + d * 4, -6.0 + d * 3, '*', 'x', d < 1 ? 1 - Math.abs(d - 0.5) * 2 : 0));
  return o;
}

// ── Yin y yang que gira ───────────────────────────────────────────────────────────────────────────────────────────
function yinyang(t) {
  const o = [], g = t * 0.6;
  anillo(o, 0, 0, 6.8, 6.8, 32);
  trazo(o, [...curva(0, -3.4, 3.4, 3.4, -Math.PI / 2, Math.PI / 2, 10), ...curva(0, 3.4, 3.4, 3.4, -Math.PI / 2, -Math.PI * 1.5, 10)], 18);   // la ese
  anillo(o, 0, -3.4, 1.0, 1.0, 5, 0, '0', 'x'); o.push(pt(0, 3.4, '@', 'x'));
  for (const [x, y] of [[-3.4, 1.0], [-4.8, -1.6], [-2.4, 5.2], [-5.0, 2.6]]) o.push(pt(x, y, '.', 'n', 0.6));   // la mitad sombreada
  giro(o, 0, g);
  return o;
}

export const SIMBOLOS = {
  corazon, estrella, infinito, flecha, diana, nota, bocadillo, interrogacion, moneda, grafica, peon, torre, corona, reloj, wifi, ubicacion, bandera, trofeo, yinyang,
};
