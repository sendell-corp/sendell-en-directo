// Trazos: los ayudantes con que se dibujan las formas vivas (formas.mjs y las familias formas-*.mjs).
// Se dibuja en unidades cuadradas (1 = ancho de celda) alrededor del centro de la caja del avatar, y pt() convierte a
// celdas al final, porque la celda es más alta que ancha (× 1,2) y, si no, los círculos saldrían ovalados.
import { ALTO } from './rejilla.mjs';

export const CX = 8, CY = 8.5;
export const TAU = Math.PI * 2;
export const pt = (xu, yu, c = '0', p = 'n', a = 1) => ({ x: CX + xu, y: CY + yu / ALTO, c, p, a });

// n puntos repartidos en el tramo A→B, sin incluir A (para encadenar tramos sin repetir).
export function tramo(out, ax, ay, bx, by, n, c = '0', p = 'n', a = 1) {
  for (let i = 1; i <= n; i++) { const k = i / n; out.push(pt(ax + (bx - ax) * k, ay + (by - ay) * k, c, p, a)); }
}
// Anillo de n puntos (elipse rx, ry) girado fase radianes.
export function anillo(out, cx, cy, rx, ry, n, fase = 0, c = '0', p = 'n', a = 1) {
  for (let i = 0; i < n; i++) { const g = fase + (i / n) * TAU; out.push(pt(cx + Math.cos(g) * rx, cy + Math.sin(g) * ry, c, p, a)); }
}
// Relleno en rejilla de una elipse: puntos sobre la cuadrícula real de celdas, para que el cuerpo se lea como bloque de ceros.
// `huecos` son puntos [x, y] alrededor de los cuales no se rellena (el blanco que deja ver un ojo).
export function relleno(out, cx, cy, rx, ry, huecos = [], c = '0', p = 'n') {
  for (let fy = Math.ceil((cy - ry) / ALTO); fy * ALTO <= cy + ry; fy++) {
    for (let fx = Math.ceil(cx - rx); fx <= cx + rx; fx++) {
      const dx = (fx - cx) / rx, dy = (fy * ALTO - cy) / ry;
      if (dx * dx + dy * dy > 1.02) continue;
      if (huecos.some(([hx, hy]) => Math.abs(fx - hx) < 1.3 && Math.abs(fy * ALTO - hy) < 0.9)) continue;
      out.push(pt(fx, fy * ALTO, c, p));
    }
  }
}

// ── En tres dimensiones ──────────────────────────────────────────────────────────────────────────────────────────
// Se calculan en el espacio, se giran y se proyectan. Lo que queda al fondo se dibuja más tenue: eso da el volumen.
export function gira(x, y, z, gy, gx) {
  const x1 = x * Math.cos(gy) + z * Math.sin(gy), z1 = -x * Math.sin(gy) + z * Math.cos(gy);
  return [x1, y * Math.cos(gx) - z1 * Math.sin(gx), y * Math.sin(gx) + z1 * Math.cos(gx)];
}
// Un punto 3D a la lista. v = [giroY, inclinaciónX, perspectiva, escala, desplazamiento vertical].
export function p3(out, x, y, z, v, c = '0', p = 'n', a = 1) {
  const e = v[3] ?? 1, [x1, y1, z1] = gira(x * e, y * e, z * e, v[0], v[1]), k = 1 / (1 + z1 * (v[2] ?? 0.03));
  out.push(pt(x1 * k, y1 * k + (v[4] ?? 0), c, p, a * Math.max(0.28, Math.min(1, 0.72 - z1 * 0.085))));
}
// n puntos del tramo A→B en 3D, sin incluir A. `hasta` < 1 deja el último punto antes de B (para no pisar una articulación).
export function tramo3(out, A, B, n, v, c = '0', p = 'n', a = 1, hasta = 1) {
  for (let i = 1; i <= n; i++) { const k = (i / n) * hasta; p3(out, A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k, v, c, p, a); }
}
export function anillo3(out, C, r, n, eje, v, fase = 0, c = '0', p = 'n', a = 1) {    // eje: 'y' (plano del suelo) | 'z' (de frente) | 'x'
  for (let i = 0; i < n; i++) {
    const g = fase + (i / n) * TAU, u = Math.cos(g) * r, w = Math.sin(g) * r;
    if (eje === 'y') p3(out, C[0] + u, C[1], C[2] + w, v, c, p, a); else if (eje === 'z') p3(out, C[0] + u, C[1] + w, C[2], v, c, p, a); else p3(out, C[0], C[1] + u, C[2] + w, v, c, p, a);
  }
}

// ── Ayudantes de las familias ────────────────────────────────────────────────────────────────────────────────────
// n puntos a igual distancia a lo largo de una polilínea P = [[x, y], …]. Abierta: incluye los dos extremos.
// Cerrada: vuelve al primero sin repetirlo. El número de puntos no depende de la forma de P (sirve aunque P se mueva).
export function sobre(P, n, cerrado = false) {
  const Q = cerrado ? [...P, P[0]] : P, L = [0];
  for (let i = 1; i < Q.length; i++) L.push(L[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1], (Q[i][2] ?? 0) - (Q[i - 1][2] ?? 0)));
  const total = L.at(-1) || 1, r = [];
  for (let i = 0; i < n; i++) {
    const s = (cerrado ? i / n : n > 1 ? i / (n - 1) : 0) * total;
    let k = 1;
    while (k < Q.length - 1 && L[k] < s) k++;
    const u = (s - L[k - 1]) / ((L[k] - L[k - 1]) || 1), A = Q[k - 1], B = Q[k];
    r.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, (A[2] ?? 0) + ((B[2] ?? 0) - (A[2] ?? 0)) * u]);
  }
  return r;
}
export function trazo(out, P, n, cerrado = false, c = '0', p = 'n', a = 1) {
  for (const [x, y] of sobre(P, n, cerrado)) out.push(pt(x, y, c, p, a));
}
export function trazo3(out, P, n, v, cerrado = false, c = '0', p = 'n', a = 1) {
  for (const [x, y, z] of sobre(P, n, cerrado)) p3(out, x, y, z, v, c, p, a);
}
// Arco de elipse de g0 a g1, con los dos extremos.
export function arco(out, cx, cy, rx, ry, g0, g1, n, c = '0', p = 'n', a = 1) {
  for (let i = 0; i < n; i++) { const g = g0 + (g1 - g0) * (n > 1 ? i / (n - 1) : 0); out.push(pt(cx + Math.cos(g) * rx, cy + Math.sin(g) * ry, c, p, a)); }
}
// Puntos de un arco como polilínea (para pasarlos a sobre/trazo).
export const curva = (cx, cy, rx, ry, g0, g1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const g = g0 + (g1 - g0) * (i / n); return [cx + Math.cos(g) * rx, cy + Math.sin(g) * ry]; });
// Gira y mueve los puntos de out a partir del índice `desde`, alrededor de (ox, oy) en unidades cuadradas.
export function giro(out, desde, g, ox = 0, oy = 0, dx = 0, dy = 0) {
  const c = Math.cos(g), s = Math.sin(g);
  for (let i = desde; i < out.length; i++) {
    const q = out[i], x = q.x - CX - ox, y = (q.y - CY) * ALTO - oy;
    q.x = CX + ox + dx + x * c - y * s;
    q.y = CY + (oy + dy + x * s + y * c) / ALTO;
  }
}
// Caja de alambre centrada en C con medias medidas [hx, hy, hz]: sus ocho vértices y, en cada arista, n[eje] puntos de en medio.
export function caja3(out, C, [hx, hy, hz], v, n = [1, 1, 1], c = '0', p = 'n', a = 1) {
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([C[0] + x * hx, C[1] + y * hy, C[2] + z * hz]);
  for (const q of V) p3(out, q[0], q[1], q[2], v, c, p, a);
  for (const [i, j, e] of [[0, 4, 0], [1, 5, 0], [2, 6, 0], [3, 7, 0], [0, 2, 1], [1, 3, 1], [4, 6, 1], [5, 7, 1], [0, 1, 2], [2, 3, 2], [4, 5, 2], [6, 7, 2]]) {
    if (n[e] > 0) tramo3(out, V[i], V[j], n[e] + 1, v, c, p, a, n[e] / (n[e] + 1));
  }
}
// Torno: una pieza de revolución a partir de su perfil [[radio, y], …]; un anillo por escalón del perfil.
export function torno(out, perfil, n, v, fase = 0, c = '0', p = 'n', a = 1) {
  for (const [r, y, m] of perfil) anillo3(out, [0, y, 0], r, m ?? n, 'y', v, fase, c, p, a);
}
