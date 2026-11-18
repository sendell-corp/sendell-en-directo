// Formas vivas · objetos de oficio: lo que un agente usa en su trabajo. Mismo contrato que formas.mjs: función pura de t,
// siempre los mismos puntos en el mismo orden.
import { pt, TAU, tramo, anillo, p3, tramo3, anillo3, trazo, trazo3, arco, curva, giro, caja3, torno } from './trazos.mjs';

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const mueve = (P, dx, dy) => P.map(([x, y]) => [x + dx, y + dy]);

// ── Libro abierto: las páginas se pasan solas ───────────────────────────────────────────────────────────────────
function libro(t) {
  const o = [];
  for (const s of [-1, 1]) {
    trazo(o, [[0, -3.4], [s * 3.4, -4.4], [s * 7.0, -3.8], [s * 7.0, 4.2], [s * 3.4, 3.6], [0, 4.6]], 20);   // la página
    for (let k = 0; k < 3; k++) tramo(o, s * 1.4, -1.8 + k * 1.8, s * 5.6, -1.6 + k * 1.8, 3, '-', 'n', 0.55);   // renglones
  }
  tramo(o, 0, -3.4, 0, 4.6, 6, '|', 'n', 0.8);                         // el lomo
  const u = (t * 0.45) % 1, g = Math.PI * (u < 0.15 ? 0 : u > 0.85 ? 1 : (u - 0.15) / 0.7);   // la hoja que pasa, de derecha a izquierda
  const w = Math.cos(g) * 6.6, alza = Math.sin(g) * 1.6;
  trazo(o, [[0, -3.4], [w * 0.5, -4.3 - alza], [w, -3.8 - alza], [w, 4.2 - alza], [w * 0.5, 3.6 - alza], [0, 4.6]], 14, false, '0', 'n', 0.85);
  return o;
}

// ── Balanza: el astil se inclina y los platillos buscan el equilibrio ─────────────────────────────────────────────
function balanza(t) {
  const o = [], g = Math.sin(t * 1.3) * 0.22 * Math.exp(-((t % 6) / 6) * 1.5);
  trazo(o, [[-3.6, 7.6], [3.6, 7.6]], 6); trazo(o, [[0, 7.6], [0, -5.2]], 10);   // la base y el pie
  o.push(pt(0, -6.0, 'O', 'x'));
  const ex = Math.cos(g) * 6.4, ey = Math.sin(g) * 6.4;
  tramo(o, -ex, -5.2 - ey, ex, -5.2 + ey, 12);                         // el astil
  for (const s of [-1, 1]) {
    const hx = s * ex, hy = -5.2 + s * ey;
    for (const d of [-1.6, 1.6]) tramo(o, hx, hy, hx + d, hy + 4.2, 3, '0', 'n', 0.5);   // los hilos
    trazo(o, curva(hx, hy + 4.2, 2.2, 1.4, 0, Math.PI, 8), 8);           // el platillo
  }
  return o;
}

// ── Llave antigua que gira sobre su caña ──────────────────────────────────────────────────────────────────────────
function llave(t) {
  const o = [], v = [0.25 + Math.sin(t * 0.6) * 0.2, Math.sin(t * 0.9) * 0.95, 0.035];
  anillo3(o, [-4.6, 0, 0], 2.4, 16, 'z', v);                           // el ojo
  anillo3(o, [-4.6, 0, 0], 1.1, 7, 'z', v, 0, '0', 'n', 0.6);
  for (const y of [-0.45, 0.45]) tramo3(o, [-2.2, y, 0], [6.8, y, 0], 11, v);   // la caña
  trazo3(o, [[3.4, 0.45, 0], [3.4, 2.6, 0], [4.4, 2.6, 0], [4.4, 1.6, 0], [5.4, 1.6, 0], [5.4, 3.0, 0], [6.6, 3.0, 0], [6.8, 0.45, 0]], 12, v);   // los dientes
  return o;
}

// ── Martillo que golpea un clavo y saca chispas ───────────────────────────────────────────────────────────────────
function martillo(t) {
  const o = [], u = (t * 0.9) % 1, golpe = u < 0.7 ? Math.sin((u / 0.7) * Math.PI / 2) : 1 - (u - 0.7) / 0.3;   // sube despacio, cae de golpe
  const P = [-6.4, 4.6], g = -golpe * 1.1, d = [Math.cos(g), Math.sin(g)], n = [-d[1], d[0]];
  const en = (a, b) => [P[0] + d[0] * a + n[0] * b, P[1] + d[1] * a + n[1] * b];   // a lo largo del mango, a lo ancho
  for (const b of [-0.4, 0.4]) trazo(o, [en(0, b), en(9.6, b)], 11);   // el mango
  trazo(o, [en(9.0, -3.4), en(11.8, -3.4), en(11.8, 1.8), en(10.6, 3.4), en(9.0, 1.8)], 16, true);   // la cabeza y su uña
  tramo(o, 5.4, 4.0, 5.4, 7.2, 3, '|', 'n', 0.9); o.push(pt(5.4, 3.6, '=', 'x'));   // el clavo
  tramo(o, 0.4, 7.6, 9.6, 7.6, 7, '=', 'n', 0.6);                      // la tabla
  const chispa = u > 0.97 || u < 0.08 ? 1 : 0;
  for (const [dx, dy] of [[-1.6, -1.2], [1.6, -1.2], [0, -2.2], [-2.4, 0.2], [2.4, 0.2]]) o.push(pt(5.4 + dx, 3.4 + dy, '*', 'x', chispa));
  return o;
}

// ── Pincel que pinta un trazo ondulado ────────────────────────────────────────────────────────────────────────────
function pincel(t) {
  const o = [], u = (t * 0.3) % 1, curvaY = x => 5.2 + Math.sin(x * 0.7) * 1.4;
  const px = -7 + u * 14, py = curvaY(px);
  for (let i = 0; i < 18; i++) { const x = -7 + (i / 17) * 14; o.push(pt(x, curvaY(x), '0', 'n', x <= px ? 0.9 : 0)); }   // la pintura
  const ini = o.length;
  trazo(o, [[0, 0], [-1.4, -1.6], [-1.4, -3.4], [1.4, -3.4], [1.4, -1.6], [0, 0]], 12);   // las cerdas
  trazo(o, rect(-1.2, -3.6, 1.2, -5.8), 8, true, '#', 'n', 0.8);       // la virola
  for (const x of [-0.7, 0.7]) tramo(o, x, -5.8, x * 0.5, -12.0, 7);  // el mango
  giro(o, ini, 0.5 + Math.sin(t * 2) * 0.1, 0, 0, px, py - 0.6);
  return o;
}

// ── Cámara de fotos: objetivo con su anillo que gira y el flash que salta ────────────────────────────────────────
function camara_fotos(t) {
  const o = [], foco = t * 0.8;
  trazo(o, [[-7.0, -3.2], [-2.6, -3.2], [-1.6, -5.0], [2.6, -5.0], [3.6, -3.2], [7.0, -3.2], [7.0, 4.6], [-7.0, 4.6]], 40, true);
  anillo(o, 0.2, 0.6, 3.3, 3.3, 16, foco);                             // el objetivo
  anillo(o, 0.2, 0.6, 1.8, 1.8, 9, -foco, '0', 'n', 0.7);
  o.push(pt(0.2, 0.6, 'O', 'x'));
  trazo(o, rect(-6.0, -2.4, -4.2, -1.2), 4, true, '0', 'n', 0.6);     // el visor
  o.push(pt(-5.4, -4.0, '=', 'x'));                                    // el disparador
  const flash = (t * 0.6) % 1 < 0.08 ? 1 : 0.15;
  for (const [dx, dy] of [[0, 0], [-1, -1], [1, -1], [0, -1.8]]) o.push(pt(5.4 + dx, -4.4 + dy * 1.2, '*', 'x', dx === 0 && dy === 0 ? 0.4 + 0.6 * flash : flash));
  return o;
}

// ── Guitarra: caja de dos curvas, boca, mástil, clavijas y las cuerdas que vibran ─────────────────────────────────
function guitarra(t) {
  const o = [];
  const caja = [...curva(0, 4.6, 4.2, 3.6, -Math.PI * 0.62, Math.PI * 1.62, 18), ...curva(0, -0.6, 3.1, 2.5, Math.PI * 0.72, Math.PI * 2.28, 14)];
  trazo(o, caja, 36, true);
  anillo(o, 0, 1.6, 1.3, 1.3, 8, 0, '0', 'n', 0.7);                    // la boca
  for (const x of [-0.6, 0.6]) tramo(o, x, -3.1, x, -9.0, 6);          // el mástil
  trazo(o, rect(-1.2, -9.0, 1.2, -10.8), 6, true);                     // la pala
  for (const s of [-1, 1]) o.push(pt(s * 1.9, -9.6, '-', 'x'), pt(s * 1.9, -10.4, '-', 'x'));
  tramo(o, -1.4, 6.0, 1.4, 6.0, 3, '=', 'x');                          // el puente
  for (const x of [-0.6, 0, 0.6]) for (let k = 1; k <= 4; k++) {       // cuerdas: tiemblan más en el centro
    const y = 6.0 - k * 2.6, vib = Math.sin(t * 40 + x * 9) * 0.25 * Math.sin((k / 5) * Math.PI) * (0.5 + 0.5 * Math.sin(t * 1.5));
    o.push(pt(x + vib, y, '|', 'n', 0.55));
  }
  giro(o, 0, 0, 0, 0, 0, 1.2);                                        // centrada en la caja
  return o;
}

// ── Micrófono de estudio sobre su pie, con ondas que salen cuando suena ────────────────────────────────────────────
function microfono(t) {
  const o = [];
  trazo(o, [...curva(0, -4.6, 2.4, 2.4, Math.PI, TAU, 8), [2.4, -1.0], ...curva(0, -1.0, 2.4, 2.4, 0, Math.PI, 8), [-2.4, -4.6]], 26, true);   // la cápsula
  for (const y of [-4.4, -2.8]) tramo(o, -1.6, y, 1.6, y, 3, '-', 'n', 0.5);   // la rejilla
  trazo(o, curva(0, -1.6, 3.6, 3.4, 0, Math.PI, 10), 9);                // la horquilla
  tramo(o, 0, 1.8, 0, 6.8, 5);
  tramo(o, -3.6, 7.2, 3.6, 7.2, 6, '=', 'n', 0.9);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {               // las ondas: salen y se apagan
    const u = (t * 1.2 + k / 3) % 1, r = 3.4 + u * 3.8;
    arco(o, 0, -2.8, r, r * 0.95, s > 0 ? -0.55 : Math.PI - 0.55, s > 0 ? 0.55 : Math.PI + 0.55, 3, ')', 'n', (1 - u) * 0.8);
  }
  for (const q of o.slice(-18)) if (q.x < 8) q.c = '(';
  return o;
}

// ── Taza humeante ─────────────────────────────────────────────────────────────────────────────────────────────────
function taza(t) {
  const o = [];
  trazo(o, [[-4.6, -2.4], [-4.2, 4.4], [-3.0, 5.6], [3.0, 5.6], [4.2, 4.4], [4.6, -2.4]], 26);   // el cuerpo
  trazo(o, curva(0, -2.4, 4.6, 0.9, 0, TAU, 16), 14, true, '0', 'n', 0.8);   // la boca, en perspectiva
  trazo(o, [[4.4, -1.0], [6.6, -0.8], [7.0, 1.0], [6.2, 2.8], [4.2, 3.0]], 9);   // el asa
  tramo(o, -6.4, 6.6, 6.4, 6.6, 8, '=', 'n', 0.6);                     // el plato
  for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) {            // el vapor
    const u = (t * 0.5 + i / 4 + k * 0.13) % 1;
    o.push(pt((k - 1) * 1.8 + Math.sin(u * 6 + k * 2 + t) * 0.7, -3.8 - u * 5.0, u < 0.5 ? '(' : ')', 'n', (1 - u) * 0.75));
  }
  return o;
}

// ── Carrito de la compra que avanza ───────────────────────────────────────────────────────────────────────────────
function carrito(t) {
  const o = [], g = t * 4, b = Math.abs(Math.sin(t * 6)) * 0.12;
  trazo(o, [[-7.4, -6.4], [-5.6, -6.4], [-4.0, 2.4], [5.6, 2.4], [7.0, -4.2], [-5.0, -4.2]].map(([x, y]) => [x, y - b]), 30);
  for (const x of [-1.4, 1.6, 4.4]) tramo(o, x, -4.2 - b, x - 0.2, 2.4 - b, 4, '|', 'n', 0.5);   // la rejilla
  tramo(o, -4.6, -0.9 - b, 6.2, -0.9 - b, 6, '-', 'n', 0.5);
  tramo(o, -4.0, 2.4 - b, -4.4, 4.6, 2); tramo(o, 5.4, 2.4 - b, 5.0, 4.6, 2);
  trazo(o, [[-4.4, 4.6], [5.0, 4.6]], 6, false, '0', 'n', 0.8);
  for (const x of [-3.6, 4.2]) { anillo(o, x, 5.8, 0.9, 0.9, 5, g); }
  return o;
}

// ── Estetoscopio: olivas, tubos, campana; el latido viaja por el tubo ──────────────────────────────────────────────
function estetoscopio(t) {
  const o = [], lat = (t * 1.2) % 1;
  const tubo = [[0, -0.6], [0.6, 2.4], [2.4, 4.6], [4.6, 5.2], [6.0, 3.8], [6.0, 1.6]];
  for (const s of [-1, 1]) trazo(o, [[s * 3.2, -8.4], [s * 3.4, -6.4], ...curva(0, -6.4, 3.4, 5.8, s > 0 ? 0 : Math.PI, Math.PI / 2, 6)].map(([x, y]) => [x, y]), 14);   // los auriculares
  for (const s of [-1, 1]) o.push(pt(s * 3.0, -9.2, 'O', 'x'));
  trazo(o, tubo, 14);
  anillo(o, 6.0, 0.0, 1.8, 1.6, 10);                                    // la campana
  o.push(pt(6.0, 0.0, 'O', 'x'));
  const i = Math.floor(lat * 6);
  o.push(pt(...tubo[Math.min(5, i)], '*', 'x', lat < 0.9 ? 1 : 0));
  return o;
}

// ── Casa: tejado, puerta, una ventana con luz que titila y el humo de la chimenea ─────────────────────────────────
function casa(t) {
  const o = [];
  trazo(o, [[-5.6, 0], [-5.6, 7.6], [5.6, 7.6], [5.6, 0]], 24);        // las paredes
  trazo(o, [[-7.4, 0.6], [0, -6.4], [7.4, 0.6]], 22);                  // el tejado
  trazo(o, [[3.0, -3.6], [3.0, -6.2], [4.6, -6.2], [4.6, -2.1]], 6);    // la chimenea
  trazo(o, [[-3.6, 7.6], [-3.6, 3.0], [-0.8, 3.0], [-0.8, 7.6]], 8, false, '0', 'n', 0.8);   // la puerta
  o.push(pt(-1.5, 5.4, 'o', 'x'));
  const luz = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.9) * Math.sin(t * 2.3 + 1));
  trazo(o, [[1.2, 2.0], [4.0, 2.0], [4.0, 4.8], [1.2, 4.8]], 8, true, '0', 'n', 0.8);   // la ventana
  o.push(pt(2.6, 2.6, '+', 'x', luz), pt(2.6, 4.2, '+', 'x', luz));
  for (let i = 0; i < 5; i++) { const u = (t * 0.5 + i / 5) % 1; o.push(pt(3.8 + u * 2.2 + Math.sin(u * 7 + i) * 0.5, -7.0 - u * 3.0, u < 0.4 ? 'o' : 'O', 'n', 1 - u)); }
  return o;
}

// ── Tienda: toldo de rayas que ondea, letrero, escaparate y puerta ──────────────────────────────────────────────────
function tienda(t) {
  const o = [];
  trazo(o, rect(-6.6, -5.6, 6.6, 7.4), 40, true);                      // la fachada
  trazo(o, rect(-4.0, -8.2, 4.0, -5.6), 10, true, '0', 'n', 0.8);       // el letrero
  for (let i = 0; i < 4; i++) o.push(pt(-1.8 + i * 1.2, -6.9, '$', 'x', 0.6 + 0.4 * Math.sin(t * 3 - i)));
  for (let i = 0; i < 8; i++) {                                         // el toldo festoneado
    const x = -6.6 + (i + 0.5) * (13.2 / 8), y = -2.6 + Math.sin(t * 2.2 + i * 0.8) * 0.3;
    o.push(pt(x, y, 'U', 'n', 0.9));
    tramo(o, x, -5.6, x, y - 0.6, 2, '|', 'n', i % 2 ? 0.9 : 0.4);
  }
  trazo(o, rect(-5.2, -0.4, -0.4, 4.4), 10, true, '0', 'n', 0.6);       // el escaparate
  trazo(o, [[1.6, 7.4], [1.6, -0.4], [4.8, -0.4], [4.8, 7.4]], 8, false, '0', 'n', 0.8);   // la puerta
  return o;
}

// ── Caja registradora: pantalla con la cuenta, teclado y el cajón que sale ─────────────────────────────────────────
function caja_registradora(t) {
  const o = [], u = (t * 0.4) % 1, cajon = u > 0.6 ? Math.min(1, (u - 0.6) * 6) * 1.6 : 0;
  trazo(o, [[-6.2, 3.2], [-5.0, -2.6], [5.0, -2.6], [6.2, 3.2]], 20, true);   // el cuerpo
  trazo(o, rect(-1.8, -6.6, 4.2, -3.8), 12, true);                     // la pantalla
  tramo(o, 1.2, -3.8, 1.2, -2.6, 1);
  const cifra = String(10 + Math.floor(u * 90)).padStart(3, ' ');
  [...('$' + cifra)].forEach((c, i) => o.push(pt(-0.6 + i * 1.2, -5.2, c === ' ' ? '0' : c, 'x', c === ' ' ? 0 : 1)));
  for (let f = 0; f < 3; f++) for (let c = 0; c < 4; c++) {            // el teclado
    const pulsa = Math.floor(t * 5) % 12 === f * 4 + c;
    o.push(pt(-3.4 + c * 1.8, -1.2 + f * 1.4, pulsa ? 'o' : '0', 'n', pulsa ? 1 : 0.55));
  }
  trazo(o, [[-6.4, 3.2], [-6.4, 5.6 + cajon], [6.4, 5.6 + cajon], [6.4, 3.2]], 16);   // el cajón
  o.push(pt(0, 4.6 + cajon, '-', 'x'));
  return o;
}

// ── Teléfono móvil que vibra con una llamada ───────────────────────────────────────────────────────────────────────
function telefono(t) {
  const o = [], suena = Math.sin(t * 1.4) > 0, sacude = suena ? Math.sin(t * 50) * 0.25 : 0;
  trazo(o, mueve([...curva(-3.0, -7.0, 1.0, 1.0, Math.PI, Math.PI * 1.5, 3), ...curva(3.0, -7.0, 1.0, 1.0, Math.PI * 1.5, TAU, 3),
    ...curva(3.0, 7.0, 1.0, 1.0, 0, Math.PI / 2, 3), ...curva(-3.0, 7.0, 1.0, 1.0, Math.PI / 2, Math.PI, 3)], sacude, 0), 40, true);
  tramo(o, -1.0 + sacude, -6.6, 1.0 + sacude, -6.6, 2, '-', 'n', 0.7);  // el auricular
  o.push(pt(sacude, 6.8, 'o', 'n', 0.8));
  anillo(o, sacude, -1.6, 1.7, 1.7, 9, 0, '0', 'n', 0.8);               // quien llama
  tramo(o, -2.0 + sacude, 2.2, 2.0 + sacude, 2.2, 4, '-', 'n', 0.6);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) o.push(pt(s * (5.6 + k * 1.3) + sacude, -1.0, s > 0 ? ')' : '(', 'x', suena ? 0.9 - k * 0.3 : 0));
  return o;
}

// ── Portátil en 3D: la pantalla escribe código y el equipo gira despacio ──────────────────────────────────────────
function portatil(t) {
  const o = [], v = [0.35 + Math.sin(t * 0.5) * 0.35, 0.22, 0.035, 1.1, 2.4];
  trazo3(o, [[-5.6, 0, -3.6], [5.6, 0, -3.6], [5.6, 0, 3.4], [-5.6, 0, 3.4]], 26, v, true);   // la base
  trazo3(o, [[-5.6, 0, -3.6], [-5.6, -7.0, -4.6], [5.6, -7.0, -4.6], [5.6, 0, -3.6]], 20, v);   // la pantalla
  for (let f = 0; f < 3; f++) for (let c = 0; c < 6; c++) p3(o, -3.8 + c * 1.5, 0, -2.0 + f * 1.2, v, '.', 'n', 0.6);   // el teclado
  const linea = Math.floor(t * 3) % 16;
  for (let f = 0; f < 4; f++) {                                         // el código que se escribe
    const largo = [5, 3, 6, 4][f];
    for (let c = 0; c < largo; c++) p3(o, -4.0 + c * 1.3 + (f % 2) * 1.3, -5.6 + f * 1.4, -4.4 + f * 0.2, v, '=', 'x', f * 4 + c * 0.7 <= linea ? 0.9 : 0.12);
  }
  return o;
}

// ── Bombilla que se enciende: filamento, rosca y los rayos ───────────────────────────────────────────────────────────
function bombilla(t) {
  const o = [], luz = 0.5 + 0.5 * Math.sin(t * 1.8);
  trazo(o, [...curva(0, -2.6, 4.2, 4.2, Math.PI * 0.78, Math.PI * 2.22, 20), [1.8, 3.4], [-1.8, 3.4]], 30, true);   // el cristal
  for (let k = 0; k < 3; k++) tramo(o, -1.7, 4.2 + k * 0.9, 1.7, 4.2 + k * 0.9, 3, '=', 'n', 0.85);   // la rosca
  o.push(pt(0, 7.2, 'v', 'n', 0.8));
  trazo(o, [[-1.0, 3.2], [-1.0, -1.6], [-0.5, -2.4], [0, -1.6], [0.5, -2.4], [1.0, -1.6], [1.0, 3.2]], 11, false, '0', 'x', 0.35 + 0.65 * luz);   // el filamento
  for (let k = 0; k < 7; k++) {                                         // los rayos
    const g = Math.PI * (1.0 + k / 6), r0 = 5.4, r1 = 5.4 + 1.4 * luz;
    o.push(pt(Math.cos(g) * r0, -2.6 + Math.sin(g) * r0, '0', 'n', luz * 0.9), pt(Math.cos(g) * r1, -2.6 + Math.sin(g) * r1, '0', 'n', luz * 0.6));
  }
  return o;
}

// ── Escudo con su cruz y un destello que lo cruza ─────────────────────────────────────────────────────────────────
function escudo(t) {
  const o = [];
  const borde = [[-6.0, -7.2], [0, -8.2], [6.0, -7.2], [6.0, -1.0], [4.8, 3.6], [0, 8.2], [-4.8, 3.6], [-6.0, -1.0]];
  trazo(o, borde, 40, true);
  trazo(o, borde.map(([x, y]) => [x * 0.72, y * 0.74 - 0.2]), 22, true, '0', 'n', 0.45);
  tramo(o, 0, -5.4, 0, 5.4, 8, '0', 'n', 0.85); tramo(o, -4.0, -2.4, 4.0, -2.4, 6, '0', 'n', 0.85);
  const d = ((t * 0.5) % 1.6) * 14 - 9;                                 // el destello barre en diagonal
  for (let k = -1; k <= 1; k++) o.push(pt(d + k * 1.2, -d * 0.6 + k * 1.4 - 1, '/', 'x', Math.abs(d) < 7 ? 0.8 : 0));
  return o;
}

// ── Candado que se abre y se cierra ───────────────────────────────────────────────────────────────────────────────
function candado(t) {
  const o = [], abre = Math.max(0, Math.sin(t * 1.1)) * 2.2;
  trazo(o, rect(-5.0, -1.6, 5.0, 7.0), 34, true);                      // el cuerpo
  trazo(o, [[-3.2, -1.6], ...curva(0, -4.8, 3.2, 3.2, Math.PI, TAU, 10), [3.2, -1.6]].map(([x, y], i, P) => [x, y - (x > 0 || i === P.length - 1 ? 0 : abre) - abre * (x <= 0 ? 0 : 1)]), 18);   // el arco
  anillo(o, 0, 1.8, 1.0, 1.0, 6, 0, '0', 'x');                         // el ojo de la cerradura
  tramo(o, 0, 2.8, 0, 4.8, 2, '0', 'x');
  return o;
}

// ── Reloj de arena: la arena cae y, al acabar, se da la vuelta ─────────────────────────────────────────────────────
function reloj_arena(t) {
  const o = [], ciclo = 7, u = (t % ciclo) / ciclo, vuelta = u > 0.88 ? (u - 0.88) / 0.12 : 0, k = u > 0.88 ? 1 : u / 0.88;
  trazo(o, [[-4.4, -7.4], [4.4, -7.4], [4.0, -6.6], [0.5, -0.5], [4.0, 6.6], [4.4, 7.4], [-4.4, 7.4], [-4.0, 6.6], [-0.5, 0.5], [-4.0, -6.6]], 42, true);
  for (const y of [-8.2, 8.2]) tramo(o, -5.6, y, 5.6, y, 7, '=', 'n', 0.9);
  for (let i = 0; i < 14; i++) {                                        // la arena: 14 granos que pasan de arriba abajo
    const cae = i / 14 < k, f = Math.floor(i / 5), c = i % 5 - 2;
    const arriba = [c * 0.6 * (1 + (2 - f) * 0.6), -1.6 - f * 1.2], abajo = [c * 0.7 * (1 + f * 0.4) * (1 - f * 0.15), 6.4 - f * 1.0];
    o.push(pt(...(cae ? abajo : arriba), '.', 'n', 0.9));
  }
  for (let i = 0; i < 3; i++) o.push(pt(0, 0.8 + ((t * 3 + i / 3) % 1) * 4.4, '.', 'n', k < 1 && vuelta === 0 ? 0.8 : 0));   // el hilo que cae
  giro(o, 0, vuelta * Math.PI);
  return o;
}

// ── Brújula: la aguja busca el norte y tiembla ────────────────────────────────────────────────────────────────────
function brujula(t) {
  const o = [], g = Math.sin(t * 1.5) * 0.5 * Math.exp(-((t % 5) / 5) * 2) - Math.PI / 2;
  anillo(o, 0, 0, 7.0, 7.0, 32);
  for (const [c, a] of [['N', -Math.PI / 2], ['E', 0], ['S', Math.PI / 2], ['O', Math.PI]]) o.push(pt(Math.cos(a) * 5.4, Math.sin(a) * 5.4, c, 'x', 0.85));
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; o.push(pt(Math.cos(a) * 5.6, Math.sin(a) * 5.6, '.', 'n', 0.6)); }
  const n = [Math.cos(g), Math.sin(g)], p = [-n[1], n[0]];
  trazo(o, [[n[0] * 4.4, n[1] * 4.4], [p[0] * 0.9, p[1] * 0.9], [-n[0] * 4.4, -n[1] * 4.4], [-p[0] * 0.9, -p[1] * 0.9]], 14, true);
  o.push(pt(0, 0, 'O', 'x'), pt(n[0] * 3.0, n[1] * 3.0, '^', 'x'));
  return o;
}

// ── Telescopio en su trípode: busca en el cielo y una estrella titila ─────────────────────────────────────────────
function telescopio(t) {
  const o = [], g = -0.55 + Math.sin(t * 0.5) * 0.18, P = [0, 0.4];
  const ini = o.length;
  trazo(o, [[-5.2, -1.0], [4.8, -1.4], [4.8, 1.4], [-5.2, 1.0]], 24, true);   // el tubo (horizontal; luego se inclina)
  trazo(o, rect(4.8, -1.8, 6.0, 1.8), 6, true);
  trazo(o, rect(-6.4, -0.6, -5.2, 0.6), 3, true, '0', 'n', 0.7);       // el ocular
  giro(o, ini, g, 0, 0, P[0], P[1]);
  for (const x of [-3.6, 0, 3.6]) tramo(o, P[0], P[1] + 0.6, x, 8.0, 6, '0', 'n', x === 0 ? 0.5 : 1);   // el trípode
  o.push(pt(P[0], P[1], 'O', 'x'));
  o.push(pt(6.8, -8.4, '*', 'x', 0.4 + 0.6 * Math.abs(Math.sin(t * 2.3))), pt(-5.0, -7.6, '.', 'n', 0.5 + 0.5 * Math.sin(t * 3.1)), pt(1.4, -9.0, '.', 'n', 0.5 + 0.5 * Math.sin(t * 1.7)));
  return o;
}

// ── Microscopio: base, brazo, tubo, platina; el tubo baja para enfocar ────────────────────────────────────────────
function microscopio(t) {
  const o = [], foco = Math.sin(t * 1.2) * 0.5;
  trazo(o, [[-5.0, 8.0], [5.0, 8.0], [4.0, 6.6], [-4.0, 6.6]], 14, true);   // la base
  trazo(o, [[-1.6, 6.6], [-3.2, 3.0], ...curva(-0.4, -1.6, 3.6, 4.6, Math.PI, Math.PI * 1.45, 6)], 12);   // el brazo
  trazo(o, rect(-4.2, 2.6, 4.2, 3.4), 10, true, '=', 'n', 0.8);        // la platina
  o.push(pt(1.2, 2.0, '-', 'x'));                                      // la muestra
  const ini = o.length;
  trazo(o, [[0.2, -8.2], [2.4, -8.2], [2.4, -1.8], [1.8, -0.6], [0.8, -0.6], [0.2, -1.8]], 20, true);   // el tubo
  trazo(o, rect(0.4, -9.6, 2.2, -8.2), 4, true, '0', 'n', 0.8);       // el ocular
  for (let i = ini; i < o.length; i++) { o[i].y += foco / 1.2; }
  giro(o, ini, 0.3, 1.3, 0);
  anillo(o, -2.2, -1.6, 0.9, 0.9, 5, t * 2, '0', 'x');                  // el tornillo de enfoque
  return o;
}

// ── Sobre: la solapa se abre y asoma la carta ─────────────────────────────────────────────────────────────────────
function sobre(t) {
  const o = [], u = 0.5 - 0.5 * Math.cos(t * 0.9), alto = (u - 0.5) * 2;   // la solapa va de cerrada (1) a abierta (-1)
  const carta = Math.max(0, u - 0.6) / 0.4 * 4.0;
  trazo(o, rect(-3.8, -3.0 - carta, 3.8, 2.0 - carta), 14, true, '0', 'n', carta > 0.1 ? 0.8 : 0);   // la carta
  for (let k = 0; k < 2; k++) tramo(o, -2.4, -1.6 - carta + k * 1.2, 2.4, -1.6 - carta + k * 1.2, 3, '-', 'n', carta > 0.1 ? 0.6 : 0);
  trazo(o, rect(-6.6, -3.0, 6.6, 5.4), 36, true);                       // el sobre
  trazo(o, [[-6.6, 5.4], [0, 1.0], [6.6, 5.4]], 10, false, '0', 'n', 0.5);
  trazo(o, [[-6.6, -3.0], [0, -3.0 + alto * 4.6], [6.6, -3.0]], 12, false, '0', 'n', 1);   // la solapa
  return o;
}

export const OFICIOS = {
  libro, balanza, llave, martillo, pincel, camara_fotos, guitarra, microfono, taza, carrito, estetoscopio, casa, tienda,
  caja_registradora, telefono, portatil, bombilla, escudo, candado, reloj_arena, brujula, telescopio, microscopio, sobre,
};
