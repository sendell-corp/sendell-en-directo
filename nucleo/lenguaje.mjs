// El lenguaje procedural: cada clase de actividad real tiene su propio patrón animado de caracteres.
// No son iconos fijos ni texto: son pequeños organismos que se generan solos a partir del tiempo, de una semilla y de
// cuánta actividad hay. Nunca muestran contenido (ni código, ni rutas, ni mensajes): solo la FORMA de lo que ocurre.
//
// patron(tipo, t, { ancho, alto, semilla, fuerza, ok }) → celdas dentro de una caja de ancho × alto celdas.
//   fuerza 0..1  cuánta actividad hay (acelera y llena el patrón)
//   ok     false si la última acción falló (algunos patrones lo enseñan)
import { ALTO, clamp, lerp, ease, suave, rnd, rnd2 } from './rejilla.mjs';

const TAU = Math.PI * 2;
const frac = x => x - Math.floor(x);
const C = (x, y, c, a = 1, g = false) => ({ x, y, c, a, p: 'd', g });
const dentro = (q, an, al) => q.x > -0.5 && q.x < an - 0.5 && q.y > -0.5 && q.y < al - 0.5 && (q.a ?? 1) > 0.02;

// Líneas de «código» que se escriben y suben: sangría y largo distintos en cada una, con su marca de añadida o quitada.
function editar(t, { ancho, alto, semilla, v }) {
  const o = [], T = t * v * 1.5, n = Math.floor(T), f = frac(T), sube = suave((f - 0.82) / 0.18);
  for (let fila = 0; fila <= alto; fila++) {
    const L = n - (alto - 1 - fila), y = fila - sube;
    if (y < -0.4 || y > alto - 0.6) continue;
    const sangria = 2 + Math.floor(rnd2(L, semilla) * 4) * 2, largo = 3 + Math.floor(rnd2(L + 0.5, semilla) * Math.max(1, ancho - sangria - 4));
    const quita = rnd2(L + 0.7, semilla) < 0.28, nueva = fila === alto - 1, visto = nueva ? Math.floor(Math.min(1, f / 0.7) * largo) : fila > alto - 1 ? 0 : largo;
    const a = nueva ? 1 : quita ? 0.3 : 0.62 - (alto - 1 - fila) * 0.06;
    if (visto > 0 || nueva) o.push(C(0, y, quita ? '-' : '+', nueva ? 1 : 0.5));
    for (let k = 0; k < visto; k++) o.push(C(sangria + k, y, quita ? '~' : rnd2(L, k) < 0.14 ? ' ' : '=', a));
    if (nueva && visto < largo && Math.floor(t * 5) % 2) o.push(C(sangria + visto, y, '_', 1, true));
  }
  return o;
}

// Una hoja nueva que se va llenando de arriba abajo; al completarse brilla y empieza otra.
function escribir(t, { ancho, alto, semilla, v }) {
  const o = [], filas = alto - 2, ciclo = filas + 1.6, T = (t * v * 1.3) % ciclo, hoja = Math.floor((t * v * 1.3) / ciclo);
  const x0 = 1, x1 = ancho - 2, lleno = T >= filas, brillo = lleno ? 0.75 + 0.25 * Math.sin((T - filas) * 9) : 0.55;
  for (let x = x0; x <= x1; x++) { o.push(C(x, 0, x === x0 || x === x1 ? '+' : '-', brillo)); o.push(C(x, alto - 1, x === x0 || x === x1 ? '+' : '-', brillo)); }
  for (let y = 1; y < alto - 1; y++) { o.push(C(x0, y, '|', brillo)); o.push(C(x1, y, '|', brillo)); }
  for (let f = 0; f < filas; f++) {
    const largo = 2 + Math.floor(rnd2(hoja * 7 + f, semilla) * (x1 - x0 - 3)), k = clamp(T - f) * largo;
    for (let i = 0; i < Math.floor(k); i++) o.push(C(x0 + 2 + i, 1 + f, '=', lleno ? 1 : 0.8));
    if (T >= f && T < f + 1) o.push(C(x0 + 2 + Math.floor(k), 1 + f, '_', 1, true));
  }
  return o;
}

// Un texto de puntos y una línea de lectura que lo recorre renglón a renglón.
function leer(t, { ancho, alto, semilla, v }) {
  const o = [], T = (t * v * 1.1) % (alto + 0.8), fila = Math.floor(T), cab = frac(T) * ancho;
  for (let y = 0; y < alto; y++) for (let x = 1; x < ancho - 1; x++) {
    if (rnd2(x * 1.7 + semilla, y * 3.1) < 0.2) continue;                       // espacios entre «palabras»
    const leido = y < fila || (y === fila && x < cab), cerca = y === fila && Math.abs(x - cab) < 1.2;
    o.push(C(x, y, leido ? ':' : '.', cerca ? 1 : leido ? 0.6 : 0.28, cerca));
  }
  if (fila < alto) o.push(C(clamp(cab, 0, ancho - 1), fila, '|', 0.9, true));
  return o;
}

// Un radar que barre un campo de puntos; lo que encuentra se enciende y se apaga despacio.
function buscar(t, { ancho, alto, semilla, v }) {
  const o = [], cx = (ancho - 1) / 2, cy = (alto - 1) / 2, g = t * v * 2.2;
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
    const dx = x - cx, dy = (y - cy) * ALTO, ang = Math.atan2(dy, dx);
    const atras = frac((g - ang) / TAU);                                        // 0 = justo bajo el haz
    const hallazgo = rnd2(x * 2.3 + semilla, y * 5.7) < 0.07;
    const luz = Math.max(0, 1 - atras * 2.6);
    if (hallazgo) o.push(C(x, y, 'o', 0.25 + 0.75 * Math.max(0, 1 - atras * 1.3), atras < 0.25));
    else if ((x + y) % 2 === 0) o.push(C(x, y, '.', 0.16 + 0.6 * luz));
  }
  const r = Math.min(cx, cy * ALTO);
  for (let k = 1; k <= 5; k++) o.push(C(cx + Math.cos(g) * r * k / 5, cy + Math.sin(g) * r * k / 5 / ALTO, '-', 0.5 + 0.1 * k));
  return o;
}

// Una consola: se teclea una orden, salen unas líneas de respuesta y un veredicto.
function consola(t, { ancho, alto, semilla, v, ok }) {
  const o = [], ciclo = 2.6, T = t * v, n = Math.floor(T / ciclo), f = frac(T / ciclo) * ciclo;
  for (let h = 0; h < alto; h++) {                                               // órdenes anteriores, cada vez más tenues
    const N = n - h, y = alto - 1 - h * 2, largo = 3 + Math.floor(rnd2(N, semilla) * (ancho - 9));
    if (y < 0) break;
    const actual = h === 0, tecleado = actual ? Math.floor(clamp(f / 0.9) * largo) : largo, a = actual ? 1 : 0.5 - h * 0.12;
    if (y - 1 >= 0) {
      o.push(C(0, y - 1, '>', a));
      for (let k = 0; k < tecleado; k++) o.push(C(2 + k, y - 1, '#', a));
      if (actual && f < 0.9 && Math.floor(t * 5) % 2) o.push(C(2 + tecleado, y - 1, '_', 1, true));
    }
    const sale = actual ? clamp((f - 1.0) / 0.8) : 1, lr = 2 + Math.floor(rnd2(N + 0.3, semilla) * (ancho - 8));
    for (let k = 0; k < Math.floor(sale * lr); k++) o.push(C(2 + k, y, ':', a * 0.7));
    if (!actual || f > 1.9) {
      const falla = actual && ok === false;
      [...(falla ? 'x!' : 'ok')].forEach((c, i) => o.push(C(ancho - 2 + i, y, c, actual ? 1 : a, actual)));
    }
  }
  return o;
}

// Un globo con meridianos que giran y señales que llegan desde fuera: algo se trae de internet.
function web(t, { ancho, alto, semilla, v }) {
  const o = [], cx = (ancho - 1) / 2, cy = (alto - 1) / 2, R = (alto / 2 - 0.2) * ALTO, T = t * v;
  const P = (xu, yu, c, a, g) => o.push(C(cx + xu, cy + yu / ALTO, c, a, g));
  for (let i = 0; i < 18; i++) { const g = (i / 18) * TAU; P(Math.cos(g) * R, Math.sin(g) * R, '0', 0.9); }
  for (let m = 0; m < 3; m++) {
    const g = T * 0.9 + (m / 3) * Math.PI, rx = R * Math.cos(g);
    for (let i = 1; i < 6; i++) { const k = (i / 6) * Math.PI; P(Math.sin(k) * rx, -Math.cos(k) * R, ':', Math.sin(g) > 0 ? 0.8 : 0.3); }
  }
  for (let s = 0; s < 4; s++) {                                                  // señales que entran por los lados
    const f = frac(T * 0.5 + rnd(s + semilla)), lado = s % 2 ? 1 : -1, y = (rnd(s * 3 + semilla) - 0.5) * R * 1.2;
    P(lado * lerp(ancho / 2, R + 0.6, ease(f)), y * (1 - f * 0.6), f > 0.85 ? '*' : '-', 0.4 + 0.6 * f, f > 0.85);
  }
  return o;
}

// El principal en el centro y sus ayudantes saliendo a trabajar y volviendo con algo.
function delegar(t, { ancho, alto, semilla, v, fuerza }) {
  const o = [], cx = (ancho - 1) / 2, cy = (alto - 1) / 2, n = 2 + Math.round(fuerza * 4), T = t * v;
  o.push(C(cx, cy, '0', 1, true));
  for (let k = 0; k < n; k++) {
    const g = (k / n) * TAU + rnd(k + semilla) * 0.8, f = frac(T * (0.32 + 0.1 * rnd(k + 7)) + rnd(k * 5 + semilla));
    const ida = f < 0.4 ? ease(f / 0.4) : f < 0.7 ? 1 : 1 - ease((f - 0.7) / 0.3);  // sale, trabaja, vuelve
    const rx = (ancho / 2 - 1.2) * ida, ry = (alto / 2 - 0.7) * ida, x = cx + Math.cos(g) * rx, y = cy + Math.sin(g) * ry;
    for (let s = 1; s <= 3; s++) o.push(C(cx + Math.cos(g) * rx * s / 4, cy + Math.sin(g) * ry * s / 4, '.', 0.22));
    const trabaja = f >= 0.4 && f < 0.7;
    o.push(C(x, y, trabaja && Math.floor(t * 9 + k) % 2 ? 'o' : '0', 0.95, trabaja));
    if (f >= 0.7) o.push(C(x + Math.cos(g) * 0.9, y + Math.sin(g) * 0.5, '*', 0.8));   // lo que trae de vuelta
  }
  return o;
}

// Un paquete que viaja entre dos sesiones por un hilo de puntos.
function mensaje(t, { ancho, alto, semilla, v }) {
  const o = [], y = (alto - 1) / 2, a = 1, b = ancho - 2, T = t * v * 0.7, n = Math.floor(T), f = frac(T);
  const ida = (n + Math.floor(rnd(semilla) * 2)) % 2 === 0, k = suave(clamp(f / 0.75)), x = ida ? lerp(a + 1.5, b - 1.5, k) : lerp(b - 1.5, a + 1.5, k);
  for (let i = a + 1; i < b; i++) if (i % 2 === 0) o.push(C(i, y, '.', 0.3));
  const llega = f > 0.75, destino = ida ? b : a;
  o.push(C(a, y, llega && destino === a ? '@' : 'O', 1, llega && destino === a), C(b, y, llega && destino === b ? '@' : 'O', 1, llega && destino === b));
  if (!llega) ['[', '=', ']'].forEach((c, i) => o.push(C(x - 1 + i, y + Math.sin(k * Math.PI) * -0.7, c, 1, i === 1)));
  else for (let r = 0; r < 6; r++) { const g = (r / 6) * TAU, d = (f - 0.75) * 9; o.push(C(destino + Math.cos(g) * d, y + Math.sin(g) * d * 0.6, '.', 1 - (f - 0.75) * 4)); }
  return o;
}

// Algo que sube para enseñárselo al humano.
function entrega(t, { ancho, alto, v }) {
  const o = [], cx = (ancho - 1) / 2, f = frac(t * v * 0.5), k = suave(clamp(f / 0.6)), y = lerp(alto - 1, 1, k);
  ['[', '#', ']'].forEach((c, i) => o.push(C(cx - 1 + i, y, c, 1, i === 1)));
  o.push(C(cx, y - 1, '^', 0.5 + 0.5 * Math.sin(t * 8)));
  for (let s = 1; s <= 3; s++) if (y + s < alto) o.push(C(cx, y + s, ':', 0.4 / s));
  if (f > 0.6) for (let r = 0; r < 8; r++) { const g = (r / 8) * TAU, d = (f - 0.6) * 7; o.push(C(cx + Math.cos(g) * d * 1.6, 1 + Math.sin(g) * d * 0.7, '*', 1 - (f - 0.6) * 2.5)); }
  return o;
}

// Una pregunta abierta: un signo que late mientras espera respuesta.
function pregunta(t, { ancho, alto }) {
  const o = [], cx = Math.round((ancho - 1) / 2), y0 = Math.max(0, Math.round((alto - 6) / 2)), late = 0.55 + 0.45 * Math.sin(t * 3);
  ['.000.', '0...0', '...0.', '..0..', '.....', '..0..'].forEach((fila, y) => [...fila].forEach((c, x) => { if (c === '0') o.push(C(cx - 2 + x, y0 + y, '0', late, y === 5)); }));
  for (let i = 0; i < 3; i++) o.push(C(cx + 4 + i, y0 + 5, '.', Math.floor(t * 2) % 4 > i ? 0.8 : 0.15));
  return o;
}

// Un reloj: algo quedó programado para después.
function programar(t, { ancho, alto, v }) {
  const o = [], cx = (ancho - 1) / 2, cy = (alto - 1) / 2, R = (alto / 2 - 0.2) * ALTO;
  const P = (xu, yu, c, a, g) => o.push(C(cx + xu, cy + yu / ALTO, c, a, g));
  for (let i = 0; i < 12; i++) { const g = (i / 12) * TAU; P(Math.cos(g) * R, Math.sin(g) * R, i % 3 ? '.' : '0', i % 3 ? 0.5 : 0.95); }
  const g = t * v * 1.5 - TAU / 4;
  for (let k = 1; k <= 3; k++) P(Math.cos(g) * R * 0.28 * k, Math.sin(g) * R * 0.28 * k, '0', 1, k === 3);
  P(0, 0, 'o', 1);
  return o;
}

// La historia de un repo: una línea de puntos a la que se le añade uno nuevo.
function commit(t, { ancho, alto, semilla, v }) {
  const o = [], y = (alto - 1) / 2, T = t * v * 0.45, n = Math.floor(T), f = frac(T), paso = 4, corre = suave(clamp((f - 0.7) / 0.3)) * paso;
  for (let k = 0; k < Math.ceil(ancho / paso) + 2; k++) {
    const x = ancho - 3 - k * paso - corre, N = n - k;
    if (x < -1) break;
    const nuevo = k === 0, nace = nuevo ? ease(clamp(f / 0.35)) : 1;
    for (let d = 1; d < paso; d++) if (x - d >= 0) o.push(C(x - d, y, '-', 0.45));
    o.push(C(x, y, nuevo ? 'O' : 'o', nace, nuevo));
    const mas = 1 + Math.floor(rnd2(N, semilla) * 3), menos = Math.floor(rnd2(N + 0.5, semilla) * 3);
    for (let i = 0; i < mas; i++) o.push(C(x, y - 1 - i, '+', nace * (nuevo ? 0.9 : 0.35)));
    for (let i = 0; i < menos; i++) o.push(C(x, y + 1 + i, '-', nace * (nuevo ? 0.7 : 0.25)));
  }
  return o;
}

// Llega un encargo: una chispa cae y se abre en anillo. Nunca dice qué se pidió.
function encargo(t, { ancho, alto, v }) {
  const o = [], cx = (ancho - 1) / 2, cy = (alto - 1) / 2, f = frac(t * v * 0.55);
  if (f < 0.35) {
    const y = lerp(-1, cy, ease(f / 0.35));
    o.push(C(cx, y, '*', 1, true));
    for (let s = 1; s <= 3; s++) o.push(C(cx, y - s * 0.8, '.', 0.5 / s));
  } else {
    const d = (f - 0.35) / 0.65, r = d * (ancho / 2), a = 1 - d;
    for (let k = 0; k < 14; k++) { const g = (k / 14) * TAU; o.push(C(cx + Math.cos(g) * r, cy + Math.sin(g) * r * 0.42, k % 2 ? '.' : '*', a)); }
    o.push(C(cx, cy, '0', 0.4 + 0.6 * a, true));
  }
  return o;
}

// Fin de un turno: una línea agitada que se calma hasta quedar plana.
function turno_fin(t, { ancho, alto, v }) {
  const o = [], y = (alto - 1) / 2, f = clamp(frac(t * v * 0.3) / 0.6), amp = (1 - suave(f)) * (alto / 2 - 0.6);
  for (let x = 1; x < ancho - 1; x++) o.push(C(x, y + Math.sin(x * 0.9 + t * 7) * amp, amp > 0.15 ? '~' : '-', 0.5 + 0.4 * f));
  if (f >= 1) o.push(C(ancho - 1, y, '.', 0.5 + 0.5 * Math.sin(t * 3), true));
  return o;
}

// Sin señal: una línea de rayas tenue y quieta. La ausencia de señal no se disfraza de descanso ni de trabajo.
function sin_senal(t, { ancho, alto }) {
  const o = [], y = Math.round((alto - 1) / 2);
  for (let x = 1; x < ancho - 1; x += 2) o.push(C(x, y, '-', 0.2));
  return o;
}

// Cualquier otra acción confirmada: tres puntos que laten en fila.
function otro(t, { ancho, alto, v }) {
  const o = [], cx = (ancho - 1) / 2, y = (alto - 1) / 2;
  for (let i = -1; i <= 1; i++) o.push(C(cx + i * 2, y, 'o', 0.3 + 0.7 * Math.max(0, Math.sin(t * v * 4 - i * 1.1))));
  return o;
}

export const PATRONES = { encargo, leer, buscar, editar, escribir, consola, web, delegar, mensaje, entrega, pregunta, programar, commit, turno_fin, otro, sin_senal };
// Cómo se dice cada actividad en palabras llanas (para rótulos).
export const NOMBRE = {
  encargo: 'llega un encargo', leer: 'lee', buscar: 'busca', editar: 'cambia un archivo', escribir: 'escribe un archivo nuevo',
  consola: 'ejecuta una orden', web: 'consulta internet', delegar: 'reparte trabajo a ayudantes', mensaje: 'habla con otra sesión',
  entrega: 'enseña un resultado', pregunta: 'pregunta algo', programar: 'deja algo programado', commit: 'guarda una versión',
  turno_fin: 'terminó su turno', otro: 'trabaja', sin_senal: 'sin señal',
};

export function patron(tipo, t = 0, { ancho = 16, alto = 6, semilla = 0, fuerza = 0.5, ok = true } = {}) {
  const f = PATRONES[tipo] ?? PATRONES.otro;
  const fz = clamp(fuerza);
  return f(t, { ancho, alto, semilla, fuerza: fz, ok, v: 0.65 + fz * 1.1 }).filter(q => dentro(q, ancho, alto));
}
