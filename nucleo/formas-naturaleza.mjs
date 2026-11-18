// Formas vivas · naturaleza. Mismo contrato que formas.mjs: función pura de t, siempre los mismos puntos en el mismo orden.
import { pt, TAU, tramo, anillo, trazo, arco, curva, giro } from './trazos.mjs';

// ── Árbol: tronco, ramas y una copa que se mece con el viento ─────────────────────────────────────────────────────
function arbol(t) {
  const o = [], viento = Math.sin(t * 1.1) * 0.35;
  for (const s of [-1, 1]) trazo(o, [[s * 1.6, 8.2], [s * 0.9, 6.6], [s * 0.8, 2.0]], 6);   // el tronco
  for (const s of [-1, 1]) trazo(o, [[s * 0.4, 2.6], [s * 2.4 + viento, 0.0]], 3, false, '0', 'n', 0.7);   // ramas
  const copa = [];
  for (let i = 0; i < 9; i++) {                                         // la copa: nueve lóbulos
    const g = Math.PI * 0.85 + (i / 8) * Math.PI * 1.3 + 0.0, r = 5.2, cx = Math.cos(g) * r + viento * (1 - Math.sin(g)) * 0.8, cy = -3.0 + Math.sin(g) * 4.4;
    copa.push(...curva(cx, cy, 1.8, 1.8, g - 1.3, g + 1.3, 5));
  }
  trazo(o, copa, 46);
  for (const [x, y] of [[-2.0, -4.0], [1.4, -5.4], [2.2, -2.0], [-1.0, -1.4], [0, -6.8]]) o.push(pt(x + viento * 0.6, y, 'o', 'n', 0.45));
  return o;
}

// ── Palmera: tronco curvo y hojas que se doblan con la brisa ───────────────────────────────────────────────────────
function palmera(t) {
  const o = [], b = Math.sin(t * 1.2) * 0.4;
  const tronco = s => [Math.sin(s * 1.4) * 2.4 + b * s * s, 8.4 - s * 13.0];
  for (let i = 0; i < 12; i++) { const [x, y] = tronco(i / 11); o.push(pt(x, y, i % 2 ? '=' : '0')); }
  const [cx, cy] = tronco(1);
  [-2.7, -2.1, -1.4, -0.4, 0.4, 1.3].forEach((g0, k) => {
    const g = g0 + b * 0.3, P = [];
    for (let i = 0; i <= 6; i++) { const s = i / 6; P.push([cx + Math.cos(g) * s * 6.4, cy + Math.sin(g) * s * 5.0 + s * s * 4.2]); }
    trazo(o, P, 9);
  });
  for (const d of [[-0.6, 0.8], [0.6, 0.9]]) o.push(pt(cx + d[0], cy + d[1], 'O', 'x'));   // los cocos
  return o;
}

// ── Flor: seis pétalos alrededor del botón; se abre, se cierra y gira despacio ────────────────────────────────────
function flor(t) {
  const o = [], abre = 0.88 + 0.12 * Math.sin(t * 1.2), gira = t * 0.25, cy = -3.0, sway = Math.sin(t * 0.9) * 0.6;
  const P = (r, a) => [sway + Math.cos(a) * r * abre, cy + Math.sin(a) * r * abre];
  for (let k = 0; k < 6; k++) {
    const a = gira + (k / 6) * TAU;
    trazo(o, [P(1.3, a - 0.32), P(3.6, a - 0.42), P(5.0, a), P(3.6, a + 0.42), P(1.3, a + 0.32)], 7);
  }
  anillo(o, sway, cy, 0.9, 0.9, 4, 0, 'O', 'x');
  trazo(o, [[sway, cy + 1.6], [sway * 0.5, 2.8], [0, 8.6]], 6);         // el tallo
  trazo(o, [[0.1, 5.4], [2.4, 3.8], [3.8, 3.8], [2.2, 5.8], [0.1, 5.8]], 6, false, '0', 'n', 0.8);   // una hoja
  return o;
}

// ── Hoja: limbo en punta, nervio central y el vaivén de una hoja que cae ─────────────────────────────────────────────
function hoja(t) {
  const o = [], borde = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, g = u * TAU, s = (1 - Math.cos(g)) / 2; borde.push([(i < 12 ? 1 : -1) * Math.pow(Math.sin(s * Math.PI), 0.85) * 4.2, -7.6 + s * 14.4]); }
  trazo(o, borde, 36, true);
  tramo(o, 0, -7.0, 0, 9.0, 12, '0', 'n', 0.9);                         // el nervio central y el pecíolo
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) tramo(o, 0, -1.6 + k * 2.8, s * 2.6, -3.6 + k * 2.8, 2, '0', 'n', 0.45);
  giro(o, 0, Math.sin(t * 1.1) * 0.45 + 0.35, 0, 0, Math.sin(t * 0.55) * 1.2, Math.sin(t * 2.2) * 0.4);
  return o;
}

// ── Cactus de brazos con una flor que se abre arriba ───────────────────────────────────────────────────────────────
function cactus(t) {
  const o = [];
  trazo(o, [[-1.6, 7.6], [-1.6, 1.4], [-3.6, 1.4], ...curva(-4.8, -0.6, 1.2, 2.0, 0.3, Math.PI, 3), [-6.0, -3.6], ...curva(-4.8, -3.6, 1.2, 1.2, Math.PI, TAU, 4),
    [-3.6, -0.6], [-1.6, -0.6], [-1.6, -5.6], ...curva(0, -5.6, 1.6, 1.6, Math.PI, TAU, 6), [1.6, -2.6], [3.6, -2.6], [3.6, -5.0], ...curva(4.8, -5.0, 1.2, 1.2, Math.PI, TAU, 4),
    [6.0, -1.6], ...curva(4.8, -1.6, 1.2, 2.0, 0, Math.PI * 0.6, 3), [1.6, -0.6], [1.6, 7.6]], 52);
  for (const [x, y] of [[-0.6, -3.0], [0.6, 0.4], [-0.6, 3.4], [0.6, 5.6], [-4.8, -2.4], [4.8, -3.4]]) o.push(pt(x, y, "'", 'n', 0.6));   // espinas
  tramo(o, -4.6, 7.8, 4.6, 7.8, 6, '_', 'n', 0.7);
  const abre = Math.max(0, Math.sin(t * 0.8));
  for (let k = 0; k < 4; k++) { const g = Math.PI * (1.15 + k * 0.23); o.push(pt(Math.cos(g) * 1.2 * abre, -7.4 + Math.sin(g) * 1.2 * abre, '*', 'x', 0.3 + 0.7 * abre)); }
  return o;
}

// ── Seta: sombrero con motas, pie y el anillo; crece un poco y respira ─────────────────────────────────────────────
function seta(t) {
  const o = [], c = 1 + Math.sin(t * 1.4) * 0.05;
  trazo(o, [...curva(0, -0.6, 6.4 * c, 6.2 * c, Math.PI, TAU, 18), [5.6 * c, 0.4], [-5.6 * c, 0.4]], 34, true);   // el sombrero
  for (const [x, y] of [[-3.0, -3.0], [0, -4.6], [3.0, -3.0], [-1.6, -1.2], [1.8, -1.0]]) anillo(o, x * c, y * c, 0.6, 0.5, 3, 0.5, '0', 'n', 0.55);   // las motas
  for (const s of [-1, 1]) trazo(o, [[s * 1.6, 0.4], [s * 1.8, 4.0], [s * 2.2, 7.4]], 7);   // el pie
  tramo(o, -2.2, 7.4, 2.2, 7.4, 3);
  tramo(o, -2.0, 2.0, 2.0, 2.0, 3, '-', 'n', 0.7);
  return o;
}

// ── Montañas con nieve y un sol que asoma detrás ──────────────────────────────────────────────────────────────────
function montana(t) {
  const o = [], sube = (Math.sin(t * 0.4) * 0.5 + 0.5) * 2.6;
  trazo(o, [[-8.6, 6.4], [-2.6, -5.4], [0.4, -0.6], [3.4, -3.2], [8.6, 6.4]], 40);
  trazo(o, [[-4.4, -1.8], [-3.4, -1.0], [-2.6, -2.0], [-1.8, -1.0], [-1.0, -2.2]], 6, false, '0', 'n', 0.6);   // la línea de nieve
  trazo(o, [[2.2, -1.2], [3.0, -0.6], [3.6, -1.4], [4.4, -0.6]], 4, false, '0', 'n', 0.6);
  tramo(o, -8.6, 6.4, 8.6, 6.4, 12, '_', 'n', 0.7);
  arco(o, -6.4, -4.4 + 2.6 - sube, 1.6, 1.6, Math.PI, TAU, 7, '0', 'x', 0.9);   // el sol
  return o;
}

// ── Volcán que humea y escupe chispas ─────────────────────────────────────────────────────────────────────────────
function volcan(t) {
  const o = [];
  trazo(o, [[-8.4, 7.2], [-5.0, 2.0], [-2.0, -3.0], [-1.6, -3.4], [1.6, -3.4], [2.0, -3.0], [5.0, 2.0], [8.4, 7.2]], 36);
  trazo(o, [[-1.0, -2.8], [-0.4, 0.6], [0.4, 2.4], [-0.6, 5.0]], 6, false, '~', 'x', 0.8);   // la lava que baja
  for (let i = 0; i < 6; i++) {                                         // el humo
    const u = (t * 0.5 + i / 6) % 1;
    o.push(pt(Math.sin(u * 5 + i) * (0.6 + u * 2) + u * 2.4, -4.2 - u * 5.0, u < 0.4 ? 'o' : 'O', 'n', (1 - u) * 0.85));
  }
  for (let i = 0; i < 5; i++) {                                         // las chispas
    const u = (t * 0.9 + i / 5) % 1, vx = (i - 2) * 1.6;
    o.push(pt(vx * u * 2.2, -3.6 - 7 * u + 7 * u * u, '*', 'x', 1 - u));
  }
  return o;
}

// ── Nube con lluvia: la nube flota y las gotas caen ───────────────────────────────────────────────────────────────
function nube(t) {
  const o = [], dx = Math.sin(t * 0.6) * 0.8;
  trazo(o, [...curva(-4.0 + dx, -3.0, 2.4, 2.4, Math.PI * 0.5, Math.PI * 1.25, 4), ...curva(-1.0 + dx, -5.2, 3.0, 3.0, Math.PI * 1.0, Math.PI * 1.9, 6),
    ...curva(3.2 + dx, -3.6, 2.6, 2.6, Math.PI * 1.25, Math.PI * 2.1, 5), ...curva(4.4 + dx, -1.2, 1.8, 1.6, -Math.PI * 0.4, Math.PI * 0.5, 4), [-4.0 + dx, -0.6]], 40, true);
  for (let i = 0; i < 12; i++) {                                         // gotas
    const x = -5.2 + (i % 6) * 2.1 + (i >= 6 ? 1.0 : 0), u = (t * 1.3 + ((i * 0.37) % 1)) % 1;
    o.push(pt(x + dx * 0.5 - u * 0.6, 0.4 + u * 7.6, i % 3 ? '|' : "'", 'n', 0.9 - u * 0.6));
  }
  return o;
}

// ── Sol: un disco y rayos que giran y laten ───────────────────────────────────────────────────────────────────────
function sol(t) {
  const o = [], late = Math.sin(t * 2.2) * 0.5, g = t * 0.4;
  anillo(o, 0, 0, 3.8, 3.8, 22, g);
  for (let k = 0; k < 12; k++) {
    const a = g + (k / 12) * TAU, l = (k % 2 ? 1.6 : 2.6) + late * (k % 2 ? -1 : 1);
    tramo(o, Math.cos(a) * 4.8, Math.sin(a) * 4.8, Math.cos(a) * (5.0 + l), Math.sin(a) * (5.0 + l), 2, '0', 'n', k % 2 ? 0.7 : 1);
    o.push(pt(Math.cos(a) * 4.8, Math.sin(a) * 4.8, '0', 'n', k % 2 ? 0.7 : 1));
  }
  return o;
}

// ── Luna creciente con estrellas que titilan ──────────────────────────────────────────────────────────────────────
function luna(t) {
  const o = [], g = Math.sin(t * 0.5) * 0.15;
  const fuera = curva(0, 0, 6.2, 6.2, Math.PI * 0.42, Math.PI * 1.58, 20), dentro = curva(2.4, -0.6, 5.0, 5.0, Math.PI * 1.42, Math.PI * 0.58, 16);
  trazo(o, [...fuera, ...dentro], 44, true);
  for (const [x, y] of [[-2.8, -1.4], [-3.4, 2.2], [-1.6, 4.0]]) o.push(pt(x, y, 'o', 'n', 0.4));   // cráteres
  giro(o, 0, g);
  for (const [x, y, f] of [[5.0, -6.0, 0], [7.0, -1.4, 1.7], [4.4, 5.4, 3.1], [-6.6, -7.0, 4.2], [8.0, 4.0, 2.2]]) o.push(pt(x, y, '*', 'x', 0.25 + 0.75 * Math.abs(Math.sin(t * 1.6 + f))));
  return o;
}

// ── Ola que rompe: la cresta se enrolla y la espuma salpica ───────────────────────────────────────────────────────
function ola(t) {
  const o = [], d = Math.sin(t * 1.3) * 0.6;
  const P = [[-8.4, 5.0], [-5.6, 4.0], [-2.6, 1.0], [-0.4, -2.8 - d], [1.6, -5.6 - d], ...curva(3.2, -3.6 - d, 2.4, 2.4, Math.PI * 1.2, Math.PI * 2.4, 8), ...curva(3.2, -3.4 - d, 1.0, 1.0, Math.PI * 0.4, -Math.PI * 0.4, 4)];
  trazo(o, P, 34);
  trazo(o, [[-8.4, 6.8], [-4.0, 6.0], [0, 4.4], [3.0, 3.0], [5.8, 1.0 - d], [8.4, 4.6]], 18, false, '~', 'n', 0.8);
  for (let k = 0; k < 2; k++) tramo(o, -8.4, 7.8 + k, 8.4, 7.8 + k, 8, '~', 'n', 0.45);
  for (let i = 0; i < 5; i++) { const u = (t * 0.8 + i / 5) % 1; o.push(pt(5.6 + i * 0.6 + u * 2.0, -5.0 - d - Math.sin(u * Math.PI) * 2.4, '.', 'n', 1 - u)); }   // la espuma
  return o;
}

// ── Llama: la punta se dobla y el borde ondea como lenguas de fuego; otra más pequeña dentro, y pavesas ───────────────
function llama(t) {
  const o = [];
  const lengua = (e, f, dy) => {                                       // de la punta, por un lado hasta la base y por el otro de vuelta
    const P = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, lado = u < 0.5 ? -1 : 1, h = u < 0.5 ? u * 2 : 2 - u * 2;   // h: 0 en la punta, 1 en la base
      const ondas = 1 + 0.28 * Math.sin(h * 13 + t * 8 + f + lado * 1.3) * (1 - h);
      const w = Math.pow(Math.sin(Math.PI * 0.92 * Math.pow(h, 1.5)), 0.7) * 4.6 * e * ondas;
      const dobla = Math.sin(t * 2.6 + f) * 1.8 * Math.pow(1 - h, 2) * e;
      P.push([lado * w + dobla, 6.8 * e + dy - (1 - h) * 15.0 * e]);
    }
    return P;
  };
  trazo(o, lengua(1, 0, 0), 40, true);
  trazo(o, lengua(0.5, 2.0, 3.6), 16, true, '0', 'n', 0.6);
  for (let i = 0; i < 4; i++) { const u = (t * 0.9 + i / 4) % 1; o.push(pt(Math.sin(i * 2.6 + t * 3) * 2.2, -8.6 - u * 2.0, '.', 'x', 1 - u)); }   // pavesas
  return o;
}

// ── Copo de nieve: seis brazos con sus ramitas; gira despacio ─────────────────────────────────────────────────────
function copo(t) {
  const o = [], g = t * 0.35;
  for (let k = 0; k < 6; k++) {
    const a = g + (k / 6) * TAU, c = Math.cos(a), s = Math.sin(a), R = (u, w) => [u * c - w * s, u * s + w * c];
    trazo(o, [R(1.0, 0), R(7.4, 0)], 7);
    for (const d of [-1, 1]) trazo(o, [R(4.2, 0), R(5.6, d * 1.7)], 2, false, '0', 'n', 0.8);
  }
  o.push(pt(0, 0, '*', 'x'));
  return o;
}

// ── Planeta con anillo: el anillo gira inclinado y su mitad de atrás pasa tapada por el planeta ──────────────────────
function planeta(t) {
  const o = [];
  anillo(o, 0, 0, 3.8, 3.8, 22, t * 0.4);                               // el disco del planeta
  arco(o, 0, -1.2, 3.2, 0.7, 0.35, Math.PI - 0.35, 5, '-', 'n', 0.5);   // una franja
  for (let i = 0; i < 32; i++) {
    const g = (i / 32) * TAU + t * 0.4, x = Math.cos(g) * 8.2, z = Math.sin(g) * 8.2;
    const y = z * 0.36, x2 = x * 0.96 + y * 0.28, y2 = y - x * 0.2;
    const tapado = z < 0 && Math.hypot(x2, y2) < 4.2;
    o.push(pt(x2, y2, '0', 'n', tapado ? 0 : z < 0 ? 0.55 : 1));
  }
  return o;
}

export const NATURALEZA = {
  arbol, palmera, flor, hoja, cactus, seta, montana, volcan, nube, sol, luna, ola, llama, copo, planeta,
};
