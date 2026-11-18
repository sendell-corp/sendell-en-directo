// Huellas: índice privado de solapamiento. Dice si una cadena pública repite algo de un texto privado, sin guardar
// el texto y sin decir qué repite.
//   · De cada texto privado guarda la huella de cada secuencia de 6 palabras seguidas.
//   · De cada palabra o frase corta vetada (nombres), su huella.
// Huella = HMAC-SHA256 con sal, recortada a 8 bytes. Las palabras se normalizan antes: minúsculas, sin tildes ni
// puntuación. El archivo es binario, va en el directorio privado con permisos 600 y nunca lleva texto en claro.
import { createHmac, createSecretKey, randomBytes, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const N = 6;              // palabras por secuencia
export const VETADA_MAX = N - 1; // una frase vetada tiene de 1 a 5 palabras; con 6 o más ya es una secuencia
const BYTES = 8;                 // bytes por huella
const MAGIA = Buffer.from([0x89, 0xe5, 0x1d, 0x01]);
const CABEZA = 16;               // magia (4) + número de huellas (4) + sello de la sal (8)
const PENDIENTES_MAX = 65_536;   // huellas sueltas antes de ordenarlas (medio MB)
const SAL_MIN = 16;               // bytes de sal: con menos, las palabras vetadas se sacan por diccionario

// Errores propios: su mensaje no lleva datos y se puede enseñar tal cual.
const aviso = texto => Object.assign(new Error(texto), { aviso: true });

// Dónde vive lo privado. La variable de entorno solo sirve para que las pruebas usen un directorio temporal.
export function rutasPrivadas() {
  const dir = process.env.SENDELL_DIR_PRIVADO || path.join(os.homedir(), '.local', 'share', 'sendell-en-directo');
  return { dir, indice: path.join(dir, 'huellas.bin'), sal: path.join(dir, 'huellas.sal') };
}

// Palabras normalizadas de un texto: «¡Mañana, a las SEIS!» → ['manana', 'a', 'las', 'seis'].
// Lo que no se ve (ancho cero, guion blando) no parte una palabra, y el posesivo inglés no la cambia:
// «Zarabanda's» es «zarabanda».
const INVISIBLES = /[\p{Cf}\u034F\uFE00-\uFE0F]+/gu;
const POSESIVO = /['’]s(?![\p{L}\p{N}])/giu;
export function palabras(texto) {
  return String(texto).replace(INVISIBLES, '').normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(POSESIVO, '').replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// ── Tabla de huellas: un búfer ordenado, de 8 en 8 bytes ─────────────────────────────────────────────
function esta(tabla, h) {
  let a = 0, b = tabla.length / BYTES - 1;
  while (a <= b) {
    const m = (a + b) >> 1;
    const c = tabla.compare(h, 0, BYTES, m * BYTES, (m + 1) * BYTES);   // la huella m frente a h
    if (c === 0) return true;
    if (c < 0) a = m + 1; else b = m - 1;
  }
  return false;
}
// Une dos tablas ordenadas en una, sin repetidos (ni entre ellas ni dentro de cada una).
function fundir(x, y) {
  const z = Buffer.allocUnsafe(x.length + y.length);
  let i = 0, j = 0, k = 0;
  while (i < x.length || j < y.length) {
    const c = i >= x.length ? 1 : j >= y.length ? -1 : x.compare(y, j, j + BYTES, i, i + BYTES);
    const origen = c <= 0 ? x : y, pos = c <= 0 ? i : j;
    const repetida = k > 0 && origen.compare(z, k - BYTES, k, pos, pos + BYTES) === 0;
    if (!repetida) k += origen.copy(z, k, pos, pos + BYTES);
    if (c <= 0) i += BYTES;
    if (c >= 0) j += BYTES;
  }
  return z.subarray(0, k);
}

// Ni el índice ni su sal pueden ser legibles por otros: con los dos, una palabra vetada se prueba por diccionario.
const abierto = archivo => process.platform !== 'win32' && (fs.statSync(archivo).mode & 0o077) !== 0;

function leer(archivo, sello) {
  if (abierto(archivo)) throw aviso('el índice de huellas tiene permisos abiertos: se espera 600');
  const datos = fs.readFileSync(archivo);
  const entero = datos.length >= CABEZA && datos.subarray(0, 4).equals(MAGIA) && datos.length === CABEZA + datos.readUInt32LE(4) * BYTES;
  if (!entero) throw aviso('el índice de huellas está dañado');
  if (!timingSafeEqual(datos.subarray(8, CABEZA), sello)) throw aviso('la sal no es la de este índice de huellas');
  return datos.subarray(CABEZA);
}
function escribir(archivo, tabla, sello) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true, mode: 0o700 });
  const cabeza = Buffer.alloc(CABEZA);
  MAGIA.copy(cabeza);
  cabeza.writeUInt32LE(tabla.length / BYTES, 4);
  sello.copy(cabeza, 8);
  const temporal = `${archivo}.${process.pid}.tmp`;
  const fd = fs.openSync(temporal, 'w', 0o600);
  try {
    fs.writeFileSync(fd, cabeza);
    fs.writeFileSync(fd, tabla);
  } finally { fs.closeSync(fd); }
  fs.chmodSync(temporal, 0o600);
  fs.renameSync(temporal, archivo);
}

// crearIndice({ sal, archivo }): índice vacío, o el del archivo si ya existe.
//   agregar(texto)        apunta las secuencias de 6 palabras de un texto privado (entero: un mensaje, un párrafo)
//   vetar(frases)         apunta palabras o frases cortas que no pueden salir (una cadena o una lista)
//   solapa(cadena)        ¿la cadena comparte una secuencia o una frase vetada? Solo sí o no
//   seguido()             lo mismo para un texto que llega a trozos (líneas): recuerda el final del trozo anterior
//   guardar(archivo)      escribe el índice (600); cuenta = número de huellas
export function crearIndice({ sal, archivo = null } = {}) {
  if (!sal || !sal.length) throw aviso('falta la sal del índice de huellas');
  const bytes = Buffer.isBuffer(sal) ? sal : Buffer.from(String(sal));
  if (bytes.length < SAL_MIN) throw aviso(`la sal del índice de huellas es corta: se esperan ${SAL_MIN} bytes o más`);
  const llave = createSecretKey(bytes);   // preparada una vez: cada huella sale 5 veces más rápida
  const hmac = dato => createHmac('sha256', llave).update(dato).digest().subarray(0, BYTES);
  const sello = hmac('sello del índice');
  let tabla = archivo && fs.existsSync(archivo) ? leer(archivo, sello) : Buffer.alloc(0);
  // Las huellas nuevas esperan aquí, como números de 64 bits, hasta que se ordenan y pasan a la tabla.
  let pendientes = null, sueltas = 0;

  // La marca separa las dos clases: una secuencia nunca coincide con una frase vetada.
  const huella = (marca, lista, desde, hasta) => hmac(marca + lista.slice(desde, hasta).join(' '));
  function ordenar() {
    if (!sueltas) return;
    const nuevas = Buffer.allocUnsafe(sueltas * BYTES);
    pendientes.subarray(0, sueltas).sort().forEach((h, i) => nuevas.writeBigUInt64BE(h, i * BYTES));
    tabla = fundir(tabla, nuevas);
    sueltas = 0;
  }
  function apuntar(h) {
    pendientes ??= new BigUint64Array(PENDIENTES_MAX);
    pendientes[sueltas++] = h.readBigUInt64BE(0);
    if (sueltas === PENDIENTES_MAX) ordenar();
  }
  const tiene = h => { ordenar(); return esta(tabla, h); };
  function agregar(texto) {
    const p = palabras(texto);
    for (let i = 0; i + N <= p.length; i++) apuntar(huella('s:', p, i, i + N));
    return Math.max(0, p.length - N + 1);
  }
  function vetar(frases) {
    for (const frase of [].concat(frases)) {
      const p = palabras(frase);
      if (p.length > VETADA_MAX) agregar(frase);
      else if (p.length) apuntar(huella('v:', p, 0, p.length));
    }
  }
  // ¿Alguna secuencia o frase vetada termina en una palabra de «desde» en adelante?
  function hay(p, desde) {
    if (!tabla.length && !sueltas) return false;
    for (let fin = desde + 1; fin <= p.length; fin++) {
      for (let n = 1; n <= VETADA_MAX && n <= fin; n++) if (tiene(huella('v:', p, fin - n, fin))) return true;
      if (fin >= N && tiene(huella('s:', p, fin - N, fin))) return true;
    }
    return false;
  }
  function seguido() {
    let cola = [];
    return cadena => {
      const p = [...cola, ...palabras(cadena)];
      const si = hay(p, cola.length);
      cola = p.slice(-(N - 1));
      return si;
    };
  }
  return {
    agregar, vetar, seguido,
    solapa: cadena => hay(palabras(cadena), 0),
    guardar(destino = archivo) {
      if (!destino) throw aviso('falta el archivo del índice de huellas');
      ordenar();
      escribir(destino, tabla, sello);
    },
    get cuenta() { ordenar(); return tabla.length / BYTES; },
  };
}

// La sal del directorio privado: 32 bytes al azar, creada la primera vez (600).
export function salPrivada(archivo = rutasPrivadas().sal) {
  if (fs.existsSync(archivo)) {
    if (abierto(archivo)) throw aviso('la sal del índice de huellas tiene permisos abiertos: se espera 600');
    const sal = fs.readFileSync(archivo);
    if (sal.length < SAL_MIN) throw aviso('la sal del índice de huellas está dañada');
    return sal;
  }
  fs.mkdirSync(path.dirname(archivo), { recursive: true, mode: 0o700 });
  const sal = randomBytes(32);
  fs.writeFileSync(archivo, sal, { mode: 0o600, flag: 'wx' });
  return sal;
}

// El índice del directorio privado. Sin «crear», devuelve null si todavía no existe (no deja nada en el disco).
export function indicePrivado({ crear = false } = {}) {
  const { indice, sal } = rutasPrivadas();
  if (!crear && !(fs.existsSync(indice) && fs.existsSync(sal))) return null;
  return crearIndice({ sal: salPrivada(sal), archivo: indice });
}
