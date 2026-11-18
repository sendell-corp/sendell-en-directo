// Sendell: el avatar de ceros. avatar(estado, t) devuelve sus celdas, función pura del estado y del tiempo.
// Está vivo sin mentir: respira, parpadea a su aire y mueve la boca solo con la voz que se le pasa.
// Cambia de forma repartiendo sus propios ceros en la silueta de destino (ver formas.mjs).
import { COLS, FILAS, figura, celdasDe, CICLO_PIERNAS, CICLO_BRAZOS } from './matriz.mjs';
import { ALTO, clamp, lerp, ease, suave, rnd } from './rejilla.mjs';
import { forma as puntosDeForma } from './formas.mjs';

export const TAM = { cols: COLS, filas: FILAS };
export const POSES = ['neutra', 'camina', 'saluda', 'senala', 'teclea', 'lupa', 'descansa'];
export const ANIMOS = ['neutro', 'curioso', 'contento', 'cansado', 'sorpresa'];

// Brazos de cada pose: filas del torso que se sobrescriben (lado derecho de la pantalla; «lado: izq» las espeja).
// Cualquier carácter que no sea '0' ni '.' se pinta tal cual, como acento.
const BRAZOS_POSE = {
  saluda: [
    { 7: '..............00.', 8: '...00.......00...', 9: '..00.............', 10: '..0..............' },
    { 5: '..............0..', 6: '..............0..', 7: '.............0...', 8: '...00.......0....', 9: '..00.............', 10: '..0..............' },
  ],
  senala: [{ 6: '................0', 7: '..............00.', 8: '...00.......00...', 9: '..00.............', 10: '..0..............' }],
  teclea: [   // un teclado delante del cuerpo y las manos que suben y bajan sobre él
    { 8: '...00.......00...', 9: '..00.........00..', 10: '..0.=========.0..', 11: '....=========....' },
    { 8: '...00.......00...', 9: '..00.........00..', 10: '...0=========0...', 11: '....=========....' },
  ],
  lupa: [{ 5: '...............Q.', 6: '..............0..', 7: '.............0...', 8: '...00.......0....', 9: '..00.............', 10: '..0..............' }],
};
const RITMO = { saluda: 3, teclea: 8, senala: 1, lupa: 1 };              // cuadros por segundo de cada pose
const ZONA_BRAZO = j => j < 5 || j > 11;                                 // columnas que pertenecen a los brazos

function filasDe(est, t) {
  const mira = est.mira ?? 'frente', pose = est.pose ?? 'neutra';
  if (pose === 'camina') {
    const paso = Math.floor(t / 0.17) % 4;
    return figura({ mira, brazos: CICLO_BRAZOS[paso], piernas: CICLO_PIERNAS[paso] });
  }
  const base = figura({ mira });
  const cuadros = BRAZOS_POSE[pose];
  if (!cuadros) return base;
  const n = cuadros.length, capa = cuadros[((Math.floor(t * RITMO[pose]) % n) + n) % n];   // t puede ser negativo (primer cuadro del navegador)
  const espejo = est.lado === 'izq';
  return base.map((fila, i) => {
    const limpio = i >= 5 && i <= 11 ? [...fila].map((c, j) => (ZONA_BRAZO(j) ? '.' : c)) : [...fila];
    let sobre = capa[i];
    if (sobre) {
      if (espejo) sobre = [...sobre].reverse().join('');
      [...sobre].forEach((c, j) => { if (c !== '.') limpio[j] = c; });
    }
    return limpio.join('');
  });
}

// Parpadeo irregular y determinista: nueve parpadeos repartidos en un bucle de 41 s, uno de cada cinco doble.
function parpadea(t, semilla) {
  const u = ((t + semilla * 7.7) % 41 + 41) % 41;
  for (let j = 0; j < 9; j++) {
    const ini = j * (41 / 9) + rnd(semilla + j) * 3.2;
    if (u >= ini && u < ini + 0.13) return true;
    if (rnd(semilla + j + 50) < 0.2 && u >= ini + 0.3 && u < ini + 0.42) return true;
  }
  return false;
}

const OJO = { neutro: '0', curioso: '0', contento: '^', cansado: '~', sorpresa: 'O' };
const boca = (voz, animo) => (voz >= 0.5 ? 'O' : voz >= 0.14 ? 'o' : animo === 'sorpresa' ? 'o' : '_');

// Las celdas del Sendell «entero» (sin cambio de forma), con respiración, mirada, ánimo y boca.
function cuerpo(est, t) {
  const semilla = est.semilla ?? 0, animo = est.animo ?? 'neutro', voz = clamp(est.voz ?? 0), pose = est.pose ?? 'neutra';
  const cerrado = pose === 'descansa' || parpadea(t, semilla);
  const lento = animo === 'cansado' || pose === 'descansa' ? 0.55 : 1;
  const respira = Math.sin(t * 2.2 * lento + semilla) * 0.07;
  const bote = pose === 'camina' ? -Math.abs(Math.sin((t / 0.34) * Math.PI)) * 0.16 : 0;
  const out = [];
  let ojoN = 0;
  for (const q of celdasDe(filasDe(est, t))) {
    let { x, y, c, p } = q;
    const esCabeza = q.y <= 3;
    if (q.y <= 12) y += respira * (esCabeza ? 1.3 : 1);                  // los pies no se despegan del suelo
    y += bote;
    if (esCabeza && animo === 'curioso') x += (1.5 - q.y) * 0.24;        // ladea la cabeza
    if (esCabeza && (animo === 'cansado' || pose === 'descansa')) y += 0.16;
    if (esCabeza && animo === 'sorpresa') y -= 0.18;
    let g = false;
    if (p === 'o') {
      g = true;
      c = cerrado ? '-' : animo === 'curioso' && ojoN === 1 ? 'O' : OJO[animo] ?? '0';
      ojoN++;
    } else if (p === 'b') {
      c = boca(voz, animo);
      if (animo === 'contento' && voz < 0.14) {                          // sonrisa: \_/
        out.push({ x: x - 1, y, c: '\\', p: 'b', a: 0.95 }, { x: x + 1, y, c: '/', p: 'b', a: 0.95 });
      }
    } else if (c !== '0') {
      p = 'x'; g = true;                                                  // utilería de la pose (la lupa)
    }
    out.push({ x, y, c, p, a: 1, g });
  }
  return out;
}

// Materialización: cada cero cae a su sitio con su propio retraso (como en los videos del noticiero).
function materializa(celdas, k) {
  if (k >= 1) return celdas;
  return celdas.map((q, n) => {
    const d = rnd(n * 3.1 + q.x) * 0.9 + (FILAS - q.y) * 0.035;
    const u = ease((k * 2.05 - d) / 0.55);
    return { ...q, y: q.y - (1 - u) * 26, a: (q.a ?? 1) * u };
  });
}

// ── Cambio de forma ──────────────────────────────────────────────────────────────────────────────────────────────
// Reparto de los ceros entre dos siluetas (Sendell o cualquier forma): se emparejan primero los más cercanos. Si sobran
// ceros, se apagan camino del punto más próximo; si faltan, nacen del cero más próximo. Se calcula una vez por pareja.
const ORIGEN = celdasDe(figura());
const repartos = new Map();
const d2 = (a, b) => (a.x - b.x) ** 2 + ((a.y - b.y) * ALTO) ** 2;
const SENDELL = 'sendell';
const base = nombre => (nombre === SENDELL ? ORIGEN : puntosDeForma(nombre, 0));
const vivos = (nombre, est, t) => (nombre === SENDELL
  ? cuerpo({ ...est, pose: 'neutra', mira: 'frente', lado: undefined }, t).filter(q => q.c !== '\\' && q.c !== '/')
  : puntosDeForma(nombre, t));

function reparto(desde, hacia) {
  const clave = desde + '>' + hacia;
  if (repartos.has(clave)) return repartos.get(clave);
  const A = base(desde), B = base(hacia);
  const pares = [], libreA = new Set(A.keys()), libreB = new Set(B.keys());
  const une = (i, j, clase) => { pares.push({ i, j, clase }); libreA.delete(i); libreB.delete(j); };
  // Los ojos van a los ojos, para que la mirada no se pierda en el viaje.
  const ojosA = [...A.keys()].filter(i => A[i].p === 'o'), ojosB = [...B.keys()].filter(j => B[j].p === 'o');
  ojosA.forEach((i, n) => { if (ojosB[n] !== undefined) une(i, ojosB[n], 'par'); });
  const cand = [];
  for (const i of libreA) for (const j of libreB) cand.push([d2(A[i], B[j]), i, j]);
  cand.sort((u, v) => u[0] - v[0]);
  for (const [, i, j] of cand) if (libreA.has(i) && libreB.has(j)) une(i, j, 'par');
  const cerca = (q, lista) => { let m = Infinity, r = 0; lista.forEach((w, k) => { const d = d2(q, w); if (d < m) { m = d; r = k; } }); return r; };
  for (const i of [...libreA]) une(i, cerca(A[i], B), 'sobra');
  for (const j of [...libreB]) une(cerca(B[j], A), j, 'nace');
  repartos.set(clave, pares);
  return pares;
}

// forma = { desde?: nombre | 'sendell', hacia: nombre | 'sendell', k: 0..1 }
function transforma(est, t) {
  const desde = est.forma.desde ?? SENDELL, hacia = est.forma.hacia;
  const k = clamp(est.forma.k), A = vivos(desde, est, t), B = vivos(hacia, est, t);
  if (!A.length || !B.length) return cuerpo(est, t);
  const cerrado = parpadea(t, est.semilla ?? 0);
  const out = [];
  reparto(desde, hacia).forEach(({ i, j, clase }, n) => {
    const a = A[i], b = B[j];
    if (!a || !b) return;
    const lejos = Math.sqrt(d2(a, b));
    const retraso = rnd(n * 7.3 + 1) * 0.28 + Math.min(lejos, 10) * 0.012;
    const u = suave(k * 1.42 - retraso);
    const dx = b.x - a.x, dy = b.y - a.y, largo = Math.hypot(dx, dy) || 1;
    const arco = Math.sin(u * Math.PI) * (0.5 + 1.6 * rnd(n + 9)) * (rnd(n + 3) < 0.5 ? -1 : 1);   // viaja en curva, no en línea
    const x = lerp(a.x, b.x, u) + (-dy / largo) * arco;
    const y = lerp(a.y, b.y, u) + (dx / largo) * arco;
    const viaje = u > 0.04 && u < 0.96, de = u < 0.5 ? a : b;
    const esOjo = de.p === 'o';
    let c = !viaje ? de.c ?? '0' : Math.floor(t * 14 + n * 3) % 4 === 0 ? '1' : '0';   // en el viaje, los ceros titilan a unos
    if (esOjo) c = cerrado ? '-' : de.c === '-' ? '0' : de.c ?? '0';
    else if (de.p === 'b' && !viaje) c = de.c;
    let alfa = lerp(a.a ?? 1, b.a ?? 1, u);
    if (clase === 'sobra') alfa *= 1 - u;
    if (clase === 'nace') alfa *= u;
    out.push({ x, y, c, p: de.p ?? 'n', a: alfa, g: esOjo || (viaje && n % 5 === 0) });
  });
  return out;
}

export function avatar(estado = {}, t = 0) {
  const est = estado ?? {};
  const f = est.forma;
  const celdas = f && f.hacia && (f.k > 0 || (f.desde && f.desde !== SENDELL)) ? transforma(est, t) : cuerpo(est, t);
  return materializa(celdas, est.entra ?? 1);
}

// Busto: la cabeza y los hombros (filas 0 a 8), para cuando Sendell habla a cámara. Mismas celdas, recortadas.
export const busto = (estado, t) => avatar(estado, t).filter(q => q.y < 8.6);
