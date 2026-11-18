// El guardián: lo que impide que algo privado llegue a lo público. Determinista: sin red, sin modelos y sin azar.
//
//   revisar(cadena, { modo, permitidos, indice })  → { ok, reglas, posiciones }
//   enmascarar(cadena)                             → la cadena con los secretos tapados por «‹secreto›»
//   revisarObjeto(objeto, opciones)                → [{ ruta, en, reglas, posiciones }] de las cadenas que fallan
//
// Modo «publico» (videos, hábitat de sendell.co): niega lo que identifique a la máquina, a una persona o a algo interno.
// Modo «privado» (hábitat de la red local): solo los secretos; las rutas y los nombres sí se pueden ver.
// El resultado nunca lleva la cadena ni un trozo suyo: solo nombres de regla y la posición donde empieza cada hallazgo.
//
// Cómo trabaja: se examina una copia de la cadena tal como se lee (copia.mjs: sin caracteres invisibles, sin anchura
// completa, con espacios y rayas corrientes). Sobre ella pasa una fila de detectores, en orden. Cada uno tapa lo que
// encuentra, y así el siguiente no lo cuenta dos veces (un UUID no es además un hash; un correo no es además un dominio).
import os from 'node:os';
import path from 'node:path';
import { copia, raros, plegar } from './copia.mjs';
import { MASCARA, asignaciones, etiquetas, opciones as opcionesDeOrden, claseDeNombre, delataValor, anuncia } from './nombres.mjs';

export { MASCARA };
export const MODOS = ['publico', 'privado'];
// Lo único de fuera que puede nombrarse en público: el dominio de la marca (con sus subdominios) y sus cuentas.
export const PERMITIDOS = Object.freeze({ dominios: Object.freeze(['sendell.co']), cuentas: Object.freeze(['SrSendell', 'sendellgames']) });
export const LARGO_MAX = 1_000_000;   // una cadena más larga no se examina: falla entera
export const HONDURA_MAX = 64;        // niveles de un JSON

const HUECO = '\u0000';               // con esto se tapa lo ya encontrado (la copia nunca lleva un nulo de la cadena)
const P = String.raw`\p{L}\p{N}_`;    // carácter de palabra, con tildes y eñes

// ── Utilidades ───────────────────────────────────────────────────────────────────────────────────────
const todo = m => [m.index, m.index + m[0].length];
const antes = (m, n) => m.input.slice(Math.max(0, m.index - n), m.index);
// Tramos [inicio, fin, calla?] de un patrón global. «afinar» recorta la coincidencia (o da varios tramos), o no
// devuelve nada para descartarla.
function tramos(patron, texto, afinar = todo) {
  const lista = [];
  for (const m of texto.matchAll(patron)) {
    const t = afinar(m);
    if (!t) continue;
    if (Array.isArray(t[0])) lista.push(...t); else lista.push(t);
  }
  return lista;
}
const con = (patron, afinar) => (texto, ctx) => tramos(patron, texto, afinar && (m => afinar(m, ctx)));

function tapar(texto, lista) {
  let salida = '', cursor = 0;
  for (const [ini, fin] of [...lista].sort((a, b) => a[0] - b[0])) {
    if (fin <= cursor) continue;
    const desde = Math.max(ini, cursor);
    salida += texto.slice(cursor, desde) + HUECO.repeat(fin - desde);
    cursor = fin;
  }
  return salida + texto.slice(cursor);
}
const conCifraYLetra = t => /\d/.test(t) && /[a-f]/i.test(t);

// ── Secretos: se rechazan en público y se tapan en privado ───────────────────────────────────────────
const PEM = /-----BEGIN [A-Z0-9 ]{1,40}-----[\s\S]*?(?:-----END [A-Z0-9 ]{1,40}-----|$)|-----END [A-Z0-9 ]{1,40}-----/g;
const JWT = /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g;
// Con un prefijo que no admite otra lectura (ghp_, sk-ant-, xoxb-, AKIA) basta un trozo: los registros suelen enseñar
// solo el principio de la llave, y ese principio ya es parte del secreto.
const TOKENS = [
  /(?<![A-Za-z0-9_-])sk-(?:ant-[A-Za-z0-9_-]{6,}|[A-Za-z0-9_-]{16,})/g,                 // OpenAI, Anthropic
  /(?<![A-Za-z0-9_])(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g,                      // Stripe
  /(?<![A-Za-z0-9_])gh[pousr]_[A-Za-z0-9]{8,}/g,                                        // GitHub
  /(?<![A-Za-z0-9_])github_pat_[A-Za-z0-9_]{8,}/g,
  /(?<![A-Za-z0-9_-])glpat-[A-Za-z0-9_-]{20,}/g,                                        // GitLab
  /(?<![A-Za-z0-9])(?:AKIA[0-9A-Z]{6,16}|ASIA[0-9A-Z]{16})(?![A-Za-z0-9])/g,            // AWS
  /(?<![A-Za-z0-9])xox[abeoprs]-[A-Za-z0-9-]{6,}/g,                                     // Slack
  /(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}/g,                                           // Google
  /(?<![A-Za-z0-9_])(?:npm|hf|whsec)_[A-Za-z0-9]{24,}/g,
  /(?<![A-Za-z0-9_])(?:pub|prv)_(?:prod|test)_[A-Za-z0-9]{16,}/g,                       // Wompi
  /(?<![A-Za-z0-9_])(?:prod|test)_(?:events|integrity)_[A-Za-z0-9]{16,}/g,
  /(?<![A-Za-z0-9])\d{8,10}:[A-Za-z0-9_-]{35}(?![A-Za-z0-9_-])/g,                       // bot de Telegram
  /(?<![A-Za-z0-9_-])[MNO][A-Za-z0-9_-]{23,27}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g, // bot de Discord
];
// «Bearer» tal cual delata con cualquier valor largo; en otra caja («bearer», «BEARER»), si el valor lleva una cifra.
const BEARER = /(?<![A-Za-z0-9])bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi;
const bearer = m => (m[0].startsWith('Bearer') || /\d/.test(m[0]) ? todo(m) : null);

// Contraseña dentro de una URL: esquema://usuario:contraseña@sitio, con o sin usuario. Se tapa solo la contraseña,
// que llega hasta la última arroba de la autoridad (o hasta la primera arroba, si la contraseña lleva una barra).
const CREDENCIAL_URL = /(?<![A-Za-z0-9+.-])([a-z][a-z0-9+.-]{1,15}:\/\/[^\s/:@]{0,100}:)([^\s<>"'\x60]{1,300})/gi;
function enUrl(m) {
  const resto = m[2], corte = resto.search(/[/?#]/);
  const cabeza = corte < 0 ? resto : resto.slice(0, corte);
  let largo = cabeza.lastIndexOf('@');
  if (largo < 0 && !/^\d{0,5}$/.test(cabeza)) largo = resto.indexOf('@');   // solo cifras es un puerto, no una contraseña
  if (largo <= 0 || resto.slice(0, largo) === MASCARA) return null;
  const ini = m.index + m[1].length;
  return [ini, ini + largo];
}

// Tarjetas: de 13 a 19 cifras, corridas o en grupos, con prefijo de marca conocida y suma de Luhn correcta.
const ENTRE_GRUPOS = String.raw`[ \t.-]{1,3}`;
const TARJETA = new RegExp(String.raw`(?<!\d)(?:\d{4}(?:${ENTRE_GRUPOS}\d{4}){2}${ENTRE_GRUPOS}\d{1,7}|\d{4}${ENTRE_GRUPOS}\d{6}${ENTRE_GRUPOS}\d{4,5}|\d{13,19})(?!\d)`, 'g');
export function luhn(cifras) {
  let suma = 0;
  for (let i = cifras.length - 1, doble = false; i >= 0; i--, doble = !doble) {
    let d = cifras.charCodeAt(i) - 48;
    if (doble && (d *= 2) > 9) d -= 9;
    suma += d;
  }
  return suma % 10 === 0;
}
function tarjeta(m) {
  const cifras = m[0].replace(/\D/g, '');
  return /^(?:[3-6]\d{12,18}|2[2-7]\d{14})$/.test(cifras) && luhn(cifras) ? todo(m) : null;
}

// Cadenas largas. Hexadecimal: 32 o más, seguidas o troceadas en pares o cuartetos (salida de xxd, huellas de
// certificado). «Base64»: un tramo de 20 o más del alfabeto de base64 que no se deja leer.
// Se trocea en fichas (palabra, sigla, cifras) y se cuentan las letras que no hacen palabra: las fichas de una o dos
// letras, las que no tienen vocales y las consonantes que van cinco o más seguidas; cada cifra con una letra pegada
// detrás vale tres. Se puntúa por trozos entre separadores. Es raro el tramo que junta 6 puntos y el 30 % de su largo.
// Es una heurística: una cadena al azar hecha solo de letras, o que por casualidad se deja leer, puede colarse.
const HEX_LARGO = /(?<![A-Za-z0-9])(?:0x)?[0-9a-f]{32,}(?![A-Za-z0-9])/gi;
const HEX_PARES = /(?<![A-Za-z0-9])[0-9a-f]{2}(?:[ :-][0-9a-f]{2}){15,}(?![A-Za-z0-9])/gi;
const HEX_CUARTETOS = /(?<![A-Za-z0-9])[0-9a-f]{4}(?:[ :-][0-9a-f]{4}){7,}(?![A-Za-z0-9])/gi;
const hexTroceado = m => (conCifraYLetra(m[0]) ? todo(m) : null);
const TRAMO_B64 = /(?<![A-Za-z0-9+/_=-])[A-Za-z0-9+/_-]{20,}={0,2}/g;
const FICHA = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g;
const SIN_VOCAL = /^[^aeiouy]{4,}$/i, CONSONANTES = /[bcdfghjklmnpqrstvwxz]{5,}/gi;
const FORMATO_DE_VIDEO = /^(?:\d{3,4}p\d{0,3}|yuv\d{3}p\d{0,2}|[hx]26[45])$/i;   // 1080p60, yuv420p, x264: se leen

function puntos(trozo) {
  if (FORMATO_DE_VIDEO.test(trozo)) return 0;
  let n = 0;
  for (const m of trozo.matchAll(FICHA)) {
    const ficha = m[0];
    if (ficha.charCodeAt(0) < 58) n += /[A-Za-z]/.test(trozo[m.index + ficha.length] ?? '') ? 3 : 0;
    else if (ficha.length <= 2 || SIN_VOCAL.test(ficha)) n += ficha.length;
    else for (const c of ficha.matchAll(CONSONANTES)) n += c[0].length;
  }
  return Math.min(n, trozo.length);   // un trozo corto no puede pesar más que sus letras («-0a1b» al final de un nombre)
}
const rareza = tramo => tramo.split(/[-_+=/]/).reduce((n, trozo) => n + puntos(trozo), 0);
const esRaro = t => t.length >= 20 && rareza(t) >= Math.max(6, t.length * 0.3);
// Parte un tramo por un separador de un carácter y da cada parte con su posición.
function partir(tramo, base, separador) {
  const partes = [];
  let pos = base;
  for (const texto of tramo.split(separador)) {
    partes.push({ texto, ini: pos, fin: pos + texto.length });
    pos += texto.length + 1;
  }
  return partes;
}
// Grupos de partes seguidas que no se leen. Vale el que tiene una parte rara por sí sola, o todos si lo es el tramo entero.
function grupos(partes, entero) {
  const lista = [];
  let grupo = null;
  for (const q of [...partes, null]) {
    if (q && rareza(q.texto) > 0) {
      grupo ??= { ini: q.ini, vale: entero };
      grupo.fin = q.fin;
      grupo.vale ||= esRaro(q.texto);
    } else {
      if (grupo?.vale) lista.push([grupo.ini, grupo.fin]);
      grupo = null;
    }
  }
  return lista;
}
// Un tramo puede ser una ruta con una parte al azar, y se señala lo justo: las partes entre barras que son raras
// (un base64 con barras cae entero) o, si ninguna lo es, los trozos raros entre guiones.
function alAzar(texto) {
  return [...texto.matchAll(TRAMO_B64)].flatMap(m => {
    const partes = partir(m[0], m.index, '/');
    const lista = grupos(partes, esRaro(m[0]));
    if (lista.length) return lista;
    return partes.flatMap(q => partir(q.texto, q.ini, /[-_+=]/)).filter(q => esRaro(q.texto)).map(q => [q.ini, q.fin]);
  });
}
// Un secreto troceado: trozos seguidos del mismo largo, separados por un blanco o un salto, y ninguno se lee. Tienen
// que sumar 20 caracteres y ser bastantes para su largo: 6 trozos cortos, 3 de 8 o más, o 2 de 16 o más. El último
// puede ser más corto. (Cuatro medidas seguidas, «60fps 48kHz 24bit 16bit», no son un secreto.)
const TROZO_B64 = String.raw`[A-Za-z0-9+/_-]{4,}={0,2}`;
const RACHA = new RegExp(String.raw`(?<![A-Za-z0-9+/_=-])${TROZO_B64}(?:(?: |\t|\r?\n)${TROZO_B64})+`, 'g');
const denso = t => rareza(t) >= Math.max(2, t.length * 0.3);
function troceado(texto) {
  const lista = [];
  for (const racha of texto.matchAll(RACHA)) {
    let g = null;
    const cerrar = () => {
      const bastantes = g && (g.n >= 6 || (g.n >= 3 && g.largo >= 8) || (g.n >= 2 && g.largo >= 16));
      if (bastantes && g.letras >= 20) lista.push([g.ini, g.fin]);
      g = null;
    };
    for (const m of racha[0].matchAll(new RegExp(TROZO_B64, 'g'))) {
      const ini = racha.index + m.index, largo = m[0].length;
      if (!denso(m[0]) || (g && largo > g.largo)) cerrar();
      if (!denso(m[0])) continue;
      g ??= { ini, n: 0, letras: 0, largo };
      g.fin = ini + largo; g.n++; g.letras += largo;
      if (largo < g.largo) cerrar();
    }
    cerrar();
  }
  return lista;
}

// ── Lo que identifica: se rechaza solo en público ────────────────────────────────────────────────────
const UUID = /(?<![A-Za-z0-9])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![A-Za-z0-9])/gi;
const LLAVE_PUBLICA = /(?<![A-Za-z0-9-])(?:ssh-(?:rsa|dss|ed25519)|ecdsa-sha2-nistp\d{3})\s+AAAA[A-Za-z0-9+/=]{20,}/g;
const ARCHIVO_LLAVE = /(?<![\w.-])(?:id_(?:rsa|dsa|ecdsa|ed25519)[\w.-]*|authorized_keys2?|known_hosts|[\w.-]*(?:ed25519|ecdsa)[\w.-]*|[\w.-]+[_-](?:rsa|dsa)(?:\.pub)?|[\w.-]+\.(?:pem|ppk|p12|pfx|key|jks|keystore|kdbx|gpg|asc))(?![\w-])/gi;
// «Ed25519» suelto es el nombre del algoritmo: se aparta (para que no parezca un hash) y no se señala.
const archivoLlave = m => [...todo(m), /^(?:ed25519|ecdsa)$/i.test(m[0])];

// Correos, también disfrazados: «canario (at) sitio (dot) org», «canario arroba sitio punto org». Sin excepción para la marca.
const ETIQUETA = String.raw`[\p{L}\p{N}-]{1,63}`;
const CORREO = new RegExp(String.raw`(?<![${P}.+-])[${P}.+-]+@${ETIQUETA}(?:\.${ETIQUETA})*\.[A-Za-z]{2,24}(?![${P}-])`, 'gu');
const ARROBA = String.raw`(?:[ \t]{0,3}(?:@|\(at\)|\[at\])[ \t]{0,3}|[ \t]{1,3}arroba[ \t]{1,3})`;
const PUNTO = String.raw`(?:\.|[ \t]{0,2}(?:\(dot\)|\[dot\]|\(punto\)|\[punto\]|\[\.\]|\(\.\))[ \t]{0,2}|[ \t]{1,2}(?:punto|dot)[ \t]{1,2})`;
const CORREO_DISFRAZADO = new RegExp(String.raw`(?<![${P}.+-])[${P}.+-]{1,64}${ARROBA}${ETIQUETA}(?:${PUNTO}${ETIQUETA}){0,4}${PUNTO}[A-Za-z]{2,24}(?![${P}-])`, 'giu');

// Direcciones. El punto de una IP puede venir disfrazado ([.], (.), « . ») y el octeto con ceros delante.
const OCTETO = String.raw`(?:25[0-5]|2[0-4]\d|1\d\d|0?[1-9]?\d|00\d)`;
const PUNTO_IP = String.raw`(?:\.|\[\.\]|\(\.\)| \. )`;
const IPV4 = new RegExp(String.raw`(?<![0-9.])${OCTETO}(?:${PUNTO_IP}${OCTETO}){3}(?![0-9]|\.[0-9])`, 'g');
// No es una IP el número de versión («v1.2.3.4», «versión 1.0.0.1») ni una cifra con puntos de millar («1.000.000.000»).
const ipv4 = m => (/(?:v|versi[oó]n\s{0,2})$/i.test(antes(m, 10)) || /(?:\.000){2}$/.test(m[0]) ? null : todo(m));
const IPV4_GUIONES = new RegExp(String.raw`(?<=ip-)${OCTETO}(?:-${OCTETO}){3}(?![0-9])`, 'gi');
const IPV4_HEX = /(?<![A-Za-z0-9.])0x[0-9a-f]{1,2}(?:\.0x[0-9a-f]{1,2}){3}(?![A-Za-z0-9])/gi;
const MAC = /(?<![\w:-])[0-9a-f]{2}([:-])(?:[0-9a-f]{2}\1){4}[0-9a-f]{2}(?![\w:-])/gi;
const MAC_CISCO = /(?<![\w.])[0-9a-f]{4}(?:\.[0-9a-f]{4}){2}(?![\w.])/gi;
const IPV6 = /(?<![\w:.])(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){1,7}:(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})?|::(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})(?![\w:])/gi;

// Hash de commit o de build: de 7 a 31 hexadecimales con letras y cifras mezcladas (no un color con transparencia).
const HASH = /(?<![A-Za-z0-9])(?:0x)?[0-9a-f]{7,31}(?![A-Za-z0-9])/gi;
function hash(m) {
  const color = m[0].length === 8 && m.input[m.index - 1] === '#';
  return !color && conCifraYLetra(m[0].replace(/^0x/i, '')) ? todo(m) : null;
}
// Ronda interna: r850, también dentro de un nombre (juegox_r850, buildR850, r850b) o escrita de otra forma
// («ronda 850», «r-850», «R 815»).
const RONDA = new RegExp(String.raw`(?:(?<![\p{L}\p{N}])[rR]|(?<=\p{Ll})R)\d{3,4}(?!\d)|(?<![\p{L}\p{N}])[rR][-. ]\d{3,4}(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])(?:[rR]onda|RONDA)[ \t]{0,2}(?:n\.?[o°][ \t]{0,2})?\d{3,4}(?!\d)`, 'gu');

// Teléfonos: con prefijo internacional (de 8 a 15 cifras), en grupos 3-3-4 o 3-2-2-2, o un número colombiano (móvil
// 3xx o fijo 60x, con el 57 delante o sin él) corrido o partido de cualquier forma. Un tamaño en bytes no es un teléfono.
const TEL_MAS = /(?<![\w+])\+\d{1,3}(?:[ .-]?\(?\d{1,4}\)?){2,6}(?!\d)/g;
const telMas = m => { const n = m[0].replace(/\D/g, '').length; return n >= 8 && n <= 15 ? todo(m) : null; };
const TEL_GRUPOS = /(?<![\w.,+-])(?:\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}|\d{3}(?:[ .-]\d{2}){3})(?![\w-]|[.,]\d)/g;
const UNIDAD = String.raw`[ ]?(?:bytes?|[kKMGT]i?[Bb]|B|ms|px|Hz|bps|fps)(?![${P}])`;
const TEL_COLOMBIA = new RegExp(String.raw`(?<![${P}+]|\d[.,-])(?:57[ .-]?)?\(?(?:3[0-5]\d|60[1-8])\)?[ .-]?\d{3}[ .-]?\d{4}(?![${P}-]|[.,]\d|${UNIDAD})`, 'gu');

// Dominios. Los de pruebas y los de la máquina delatan por sí solos; los demás, si no son de la marca.
// Una etiqueta puede llevar letras de cualquier alfabeto y huecos: un trozo ya tapado (un hash de despliegue) sigue
// siendo parte del dominio. El punto puede venir como «[.]».
const E = String.raw`[\p{L}\p{N}\0-]`;
const PT = String.raw`(?:\.|\[\.\])`;
// Dónde puede empezar un dominio: no en mitad de otro, ni tras una arroba o una barra de ruta («://» y «:/» sí).
const SIN_PUNTO = String.raw`(?<![${P}\0-]|[${P}\0]\.|[${P}\0]\[\.\])`;   // un dominio de pruebas delata también dentro de una URL o de un correo
const ANTES = String.raw`(?<![${P}\0@-]|[${P}\0]\.|[${P}\0]\[\.\]|(?<!:)\/)`;
const DE_PRUEBAS = String.raw`pages\.dev|workers\.dev|vercel\.app|netlify\.app|trycloudflare\.com|ngrok(?:-free)?\.(?:io|app|dev)|surge\.sh|github\.io|web\.app|firebaseapp\.com|herokuapp\.com|onrender\.com|fly\.dev|glitch\.me|repl\.co`;
const DE_CASA = String.raw`local|internal|lan|home|localdomain|home\.arpa|intranet|corp`;
const DOMINIO_PRUEBAS = new RegExp(String.raw`${SIN_PUNTO}(?:${E}+${PT})*(?:${DE_PRUEBAS})(?![${P}-])|${SIN_PUNTO}localhost(?![${P}-])|${SIN_PUNTO}(?:${E}+${PT})+(?:${DE_CASA})(?![${P}.-])`, 'giu');
// Un nombre.algo suelto es un dominio si «algo» es alfabético y no es una extensión de archivo. Con un final de los
// conocidos basta una etiqueta de una letra («t.me»); con otro cualquiera hacen falta tres («p.ej» y «EE.UU» no lo son).
const TLD = new Set(('com net org io co dev app ai gg tv xyz info edu gov online site store tech cloud page link live games blog shop club es mx ar cl pe uk fr br eu ly '
  + 'de me us be ee it nl ca jp cn ru in au ch se pt cc to fm social art studio design media news world zone top pro biz fun game wiki chat team work tools email one').split(' '));
const RESTO_URL = String.raw`[^\s<>"'\x60]*`;
const URL_ESQUEMA = new RegExp(String.raw`(?<![A-Za-z0-9+.-])[a-z][a-z0-9+.-]{1,15}:\/\/${RESTO_URL}`, 'gi');
const URL_SIN_ESQUEMA = new RegExp(String.raw`(?<![${P}:/])\/\/[\p{L}\p{N}]${RESTO_URL}`, 'giu');   // //sitio.com/ruta
const URL_SUELTA = new RegExp(String.raw`${ANTES}(?:www${PT}(?:${E}+${PT})+[a-z]{2,24}|(${E}+)${PT}((?:${E}+${PT})*)([a-z]{2,24}))(?![${P}-]|\.[\p{L}\p{N}])(?::\d{1,5})?(?:[/?#]${RESTO_URL})?`, 'giu');
const URL_CON_RUTA = new RegExp(String.raw`${ANTES}(?:${E}+${PT})+([a-z]{2,24})\/${RESTO_URL}`, 'giu');
// Extensiones de archivo: «guardian.test.mjs» o «node.js/lib» no son ni un dominio ni un interruptor.
const EXT = new Set(('mjs js cjs ts tsx jsx json jsonl md txt html htm css scss svg png jpg jpeg gif webp avif bmp ico psd mp4 mov webm mkv avi mp3 wav ogg flac pdf csv tsv yml yaml toml sh bash zsh ps bat '
  + 'py rb php java kt swift cs lua gd rs go c h cpp hpp zip gz tar rar lock log map exe dll so bin iso ass srt vtt ttf otf woff woff2 glb gltf fbx obj blend uasset umap uproject unity '
  + 'db sqlite sql ini cfg conf env bak tmp xml wasm vue ipynb patch diff').split(' '));

const COLA = new Set('.,;:!?)]}»”’…');
function sinCola(u) {
  let fin = u.length;
  while (fin > 0 && COLA.has(u[fin - 1])) fin--;
  return u.slice(0, fin);
}
const CABEZA_URL = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
function anfitrion(u) {
  const autoridad = u.replace(CABEZA_URL, '').split(/[/?#\\]/)[0].replaceAll('[.]', '.');
  return autoridad.slice(autoridad.lastIndexOf('@') + 1).replace(/:\d*$/, '').replace(/\.$/, '').toLowerCase();
}
const dominioPermitido = (host, dominios) => /^[a-z0-9.-]+$/.test(host) && dominios.some(d => host === d || host.endsWith('.' + d));
// Una URL ajena falla y se tapa entera (su ruta no es una ruta del disco). De una permitida (de la marca, por http o
// https) solo se apartan el sitio y los nombres sencillos de su consulta: lo demás lo sigue mirando el resto de la fila.
function url(m, ctx) {
  const u = sinCola(m[0]);
  const esquema = /^([a-z][a-z0-9+.-]*):\/\//i.exec(u)?.[1].toLowerCase();
  const pasa = (!esquema || esquema === 'http' || esquema === 'https') && dominioPermitido(anfitrion(u), ctx.dominios);
  if (!pasa) return [m.index, m.index + u.length, false];
  const cabeza = CABEZA_URL.exec(u)?.[0].length ?? 0;
  const corte = u.slice(cabeza).search(/[/?#\\]/);
  const sitio = [m.index, m.index + (corte < 0 ? u.length : cabeza + corte), true];
  const consulta = [...u.matchAll(/[?&][a-z][a-z0-9_-]{0,30}=/g)].map(q => [m.index + q.index + 1, m.index + q.index + q[0].length, true]);
  return [sitio, ...consulta];
}
function urlSuelta(m, ctx) {
  const final = m[3]?.toLowerCase();
  if (final && EXT.has(final)) return null;
  const abreviatura = final && !TLD.has(final) && !m[2] && m[1].length < 3 && !/[/?#:]/.test(m[0]);
  return abreviatura ? null : url(m, ctx);
}
const urlConRuta = (m, ctx) => (EXT.has(m[1].toLowerCase()) ? null : url(m, ctx));

// usuario@equipo. La arroba de una resolución («1080p@60», «4K@30») no lo es.
const USUARIO_HOST = new RegExp(String.raw`(?<![${P}.+-])[${P}.+-]+@[${P}][${P}.-]*`, 'gu');
const usuarioHost = m => (/^\d+[pk]@\d/i.test(m[0]) ? null : todo(m));
// Menciones. La cuenta se compara entera: «@SrSendell-falso» no es «@SrSendell». «@types/node» es un paquete.
const MENCION = new RegExp(String.raw`(?<![${P}.-])@([${P}]+(?:[.-][${P}]+)*)`, 'gu');
function mencion(m, ctx) {
  const paquete = /^[a-z0-9-]+$/.test(m[1]) && /^\/[a-z0-9]/.test(m.input.slice(m.index + m[0].length, m.index + m[0].length + 2));
  return paquete ? null : [...todo(m), ctx.cuentas.includes(m[1].toLowerCase())];
}

// Rutas absolutas. La de Linux empieza donde empieza una palabra (no «km/h» ni «24/7») y tiene dos tramos o una raíz
// conocida. Con raíz conocida y otro tramo cae también pegada a cualquier signo, a una opción (-I/usr/include), a un
// «\n» escrito o con las barras escapadas (\/home\/…).
const RAICES = 'home|root|etc|usr|var|tmp|opt|mnt|media|srv|run|proc|sys|dev|boot|bin|sbin|lib|lib64|Users|Volumes|Library|Applications|System|private|data|storage|sdcard|nix|snap';
const RAICES_CLARAS = 'home|root|etc|usr|var|tmp|opt|mnt|Users|Volumes|private';
const FIN_RUTA = String.raw`[^\s"'<>|,;)\]}»”]*`;
const BARRA = String.raw`\\?\/`;
const RUTA_UNIX = new RegExp(String.raw`(?<=^|[\s("'«“‘\[{=:,;>|\x60])\/(?:(?:${RAICES})(?![${P}-])|[${P}.~-]+\/)${FIN_RUTA}`, 'gu');
const PEGADA = String.raw`(?:(?<![\p{L}\p{N}/~.\0])|(?<=[\p{L}\p{N}]\.)|(?<=(?<![${P}])-[A-Za-z])|(?<=\\[nrt]))`;
const RUTA_RAIZ = new RegExp(String.raw`${PEGADA}${BARRA}(?:${RAICES})${BARRA}[${P}.~-]${FIN_RUTA}`, 'gu');
const RUTA_SUBE = new RegExp(String.raw`(?<![${P}]|\.\.[\\/])(?:\.\.[\\/]){2,}(?:${RAICES_CLARAS})(?![${P}-])${FIN_RUTA}`, 'gu');
const RUTA_CASA = new RegExp(String.raw`(?<![${P}/~.-])~(?:[a-z_][a-z0-9_-]*)?[\\/]${FIN_RUTA}`, 'giu');
const RUTA_WIN = new RegExp(String.raw`(?<![A-Za-z0-9])[A-Za-z]:(?:\\|\/(?=[${P}.]))[^\s"'<>|*?]*`, 'gu');
const RUTA_WIN_SIN_UNIDAD = new RegExp(String.raw`(?<![${P}:\\])\\(?:Users|Windows|ProgramData|Program Files(?: \(x86\))?|Documents and Settings)\\[^\s"'<>|*?]*`, 'giu');
const RUTA_UNC = new RegExp(String.raw`(?<![\\${P}])\\\\[${P}.-]+\\[^\s"'<>|*?]*`, 'gu');
// Variables: $HOME sola, cualquier $NOMBRE seguida de barra, $env:NOMBRE y %NOMBRE% (no el %C3%B1 de una URL).
const RUTA_ENTORNO = /\$\{?HOME\}?(?![A-Za-z0-9_])|\$\{?[A-Za-z_][A-Za-z0-9_]{0,60}\}?(?=[\\/])|\$env:\w{1,60}|(?<![\w%])%[A-Za-z_][\w()]{0,40}%/gi;

// Interruptores internos: tres o más tramos unidos por puntos (juegox.algo.v2), o nombre.vN. En cualquier caja.
const PUNTOS = new RegExp(String.raw`(?<![${P}.-])[a-z][a-z0-9_-]+(?:\.[a-z][a-z0-9_-]*){2,}(?![${P}-])`, 'giu');
const sinExtension = m => (EXT.has(m[0].slice(m[0].lastIndexOf('.') + 1).toLowerCase()) ? null : todo(m));
const CON_VERSION = new RegExp(String.raw`(?<![${P}./-])[a-z][a-z0-9_-]+\.v\d+(?![${P}-]|\.[${P}])`, 'giu');
// Cualquier NOMBRE=valor pegado (variables de entorno, opciones): no es un secreto, pero tampoco es para el público.
const ASIGNACION_SUELTA = new RegExp(String.raw`(?<![${P}.-])(?:--?)?[A-Za-z_][A-Za-z0-9_.-]{2,}=(?=[^\s=>\0])`, 'gu');

// Una palabra que mezcla el alfabeto latino con letras cirílicas o griegas: se ve igual y no es la misma («sеndell»).
// Las de tres letras o menos son unidades («μm», «Δt»).
const LETRA_AJENA = String.raw`[\p{Script=Cyrillic}\p{Script=Greek}]`;
const HAY_AJENA = new RegExp(LETRA_AJENA, 'u');
const PALABRA_AJENA = new RegExp(String.raw`(?<![${P}])[${P}]*${LETRA_AJENA}[${P}]*`, 'gu');
const mezclada = m => (m[0].length > 3 && /\p{Script=Latin}/u.test(m[0]) ? todo(m) : null);
const mezcladas = texto => (HAY_AJENA.test(texto) ? tramos(PALABRA_AJENA, texto, mezclada) : []);

// ── La fila ──────────────────────────────────────────────────────────────────────────────────────────
// secreto: se tapa en privado.  guarda: en privado no se señala, pero se aparta para que no parezca una cadena al azar.
const DETECTORES = [
  { regla: 'pem', secreto: true, buscar: con(PEM) },
  { regla: 'jwt', secreto: true, buscar: con(JWT) },
  ...TOKENS.map(patron => ({ regla: 'token', secreto: true, buscar: con(patron) })),
  { regla: 'token', secreto: true, buscar: con(BEARER, bearer) },
  { regla: 'uuid', guarda: true, buscar: con(UUID) },
  { regla: 'credencial-url', secreto: true, buscar: con(CREDENCIAL_URL, enUrl) },
  { regla: 'asignacion', secreto: true, buscar: asignaciones },
  { regla: 'asignacion', secreto: true, buscar: etiquetas },
  { regla: 'asignacion', secreto: true, buscar: opcionesDeOrden },
  { regla: 'tarjeta', secreto: true, buscar: con(TARJETA, tarjeta) },
  { regla: 'llave-ssh', buscar: con(LLAVE_PUBLICA) },
  { regla: 'llave-ssh', buscar: con(ARCHIVO_LLAVE, archivoLlave) },
  { regla: 'correo', buscar: con(CORREO) },
  { regla: 'correo', buscar: con(CORREO_DISFRAZADO) },
  { regla: 'ipv4', buscar: con(IPV4, ipv4) },
  { regla: 'ipv4', buscar: con(IPV4_GUIONES) },
  { regla: 'ipv4', buscar: con(IPV4_HEX) },
  { regla: 'mac', guarda: true, buscar: con(MAC) },
  { regla: 'mac', buscar: con(MAC_CISCO, hexTroceado) },
  { regla: 'ipv6', guarda: true, buscar: con(IPV6) },
  { regla: 'hex-largo', secreto: true, buscar: con(HEX_LARGO) },
  { regla: 'hex-largo', secreto: true, buscar: con(HEX_PARES, hexTroceado) },
  { regla: 'hex-largo', secreto: true, buscar: con(HEX_CUARTETOS, hexTroceado) },
  { regla: 'base64-largo', secreto: true, buscar: alAzar },
  { regla: 'base64-largo', secreto: true, buscar: troceado },
  { regla: 'hash-commit', buscar: con(HASH, hash) },
  { regla: 'ronda', buscar: con(RONDA) },
  { regla: 'telefono', buscar: con(TEL_MAS, telMas) },
  { regla: 'telefono', buscar: con(TEL_GRUPOS) },
  { regla: 'telefono', buscar: con(TEL_COLOMBIA) },
  { regla: 'dominio-pruebas', buscar: con(DOMINIO_PRUEBAS) },
  { regla: 'url-ajena', buscar: con(URL_ESQUEMA, url) },
  { regla: 'url-ajena', buscar: con(URL_SIN_ESQUEMA, url) },
  { regla: 'url-ajena', buscar: con(URL_SUELTA, urlSuelta) },
  { regla: 'url-ajena', buscar: con(URL_CON_RUTA, urlConRuta) },
  { regla: 'usuario-host', buscar: con(USUARIO_HOST, usuarioHost) },
  { regla: 'mencion-ajena', buscar: con(MENCION, mencion) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_WIN) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_WIN_SIN_UNIDAD) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_UNC) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_ENTORNO) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_CASA) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_SUBE) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_UNIX) },
  { regla: 'ruta-absoluta', buscar: con(RUTA_RAIZ) },
  { regla: 'interruptor', buscar: con(PUNTOS, sinExtension) },
  { regla: 'interruptor', buscar: con(CON_VERSION) },
  { regla: 'asignacion', buscar: con(ASIGNACION_SUELTA) },
  { regla: 'alfabeto-mezclado', buscar: mezcladas },
];
// Reglas que no salen de un detector: las de lo que no se ve o está mal leído, el nombre de usuario, el índice de
// huellas y las de lo que no se puede examinar («json-roto» la pone el CLI).
const OTRAS = ['caracter-oculto', 'codificacion', 'usuario-sistema', 'solapa-privado', 'no-es-cadena', 'demasiado-larga', 'tipo-raro', 'muy-profundo', 'ciclo', 'json-roto'];
export const REGLAS = [...new Set([...DETECTORES.map(d => d.regla), ...OTRAS])];
export const SECRETAS = [...new Set(DETECTORES.filter(d => d.secreto).map(d => d.regla))];

// Pasa la fila sobre la copia de trabajo y devuelve los hallazgos { regla, ini, fin }, en posiciones de la copia.
function examinar(copiada, privado, ctx) {
  const hallazgos = [];
  let texto = copiada;
  for (const d of DETECTORES) {
    if (privado && !d.secreto && !d.guarda) continue;
    const lista = d.buscar(texto, ctx);
    if (!lista.length) continue;
    const calla = privado && d.guarda;
    for (const [ini, fin, pasa] of lista) if (!pasa && !calla) hallazgos.push({ regla: d.regla, ini, fin });
    texto = tapar(texto, lista);
  }
  return hallazgos;
}

function contexto(permitidos) {
  permitidos ??= {};
  const lista = (propia, base) => (Array.isArray(propia) ? propia : base).map(x => String(x).toLowerCase());
  return {
    dominios: lista(permitidos.dominios, PERMITIDOS.dominios).map(d => d.replace(/^\*?\./, '')),
    cuentas: lista(permitidos.cuentas, PERMITIDOS.cuentas).map(c => c.replace(/^@/, '')),
  };
}

// El nombre de usuario se lee de la máquina al ejecutar; no está escrito en ningún archivo del repo.
let delSistema = null;
function nombresDelSistema() {
  if (delSistema) return delSistema;
  const nombres = new Set([path.basename(os.homedir() || '')]);
  try { nombres.add(os.userInfo().username); } catch { /* sin ficha de usuario */ }
  delSistema = [...nombres].filter(n => n && n.length >= 2);
  return delSistema;
}
const patrones = new Map();
function patronDeNombre(nombre) {
  if (!patrones.has(nombre)) {
    const literal = nombre.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    // Un nombre muy corto solo cuenta como palabra entera; uno normal, en cualquier parte.
    patrones.set(nombre, new RegExp(nombre.length < 4 ? `(?<![${P}])${literal}(?![${P}])` : literal, 'giu'));
  }
  return patrones.get(nombre);
}
// Se busca sobre la copia plegada (sin tildes ni adornos), con el nombre plegado igual: una tilde de más no lo esconde.
function delUsuario(cadena, extra) {
  const nombres = [...nombresDelSistema(), ...[].concat(extra ?? []).map(String)].map(plegar).filter(n => n.length >= 2);
  const plegada = copia(cadena, true);
  return nombres.flatMap(n => tramos(patronDeNombre(n), plegada.texto).map(([ini]) => ({ regla: 'usuario-sistema', ini: plegada.origen(ini) })));
}

// Lo único que sale: nombres de regla y dónde empieza cada hallazgo. (Un solapamiento no dice dónde: delataría la frase.)
function veredicto(hallazgos) {
  const orden = [...hallazgos].sort((a, b) => (a.ini ?? -1) - (b.ini ?? -1));
  return {
    ok: orden.length === 0,
    reglas: [...new Set(orden.map(h => h.regla))],
    posiciones: orden.map(h => ({ regla: h.regla, pos: h.ini })),
  };
}
// El mismo veredicto con un hallazgo más.
const sumar = (r, regla, ini) => veredicto([...r.posiciones.map(p => ({ regla: p.regla, ini: p.pos })), { regla, ini }]);

// opciones: modo ('publico' por defecto), permitidos { dominios, cuentas }, indice (de huellas.mjs),
// usuarios (nombres de más que tampoco pueden aparecer).
export function revisar(cadena, { modo = 'publico', permitidos, indice = null, usuarios } = {}) {
  if (!MODOS.includes(modo)) throw new Error('modo desconocido: se espera «publico» o «privado»');
  if (typeof cadena !== 'string') return veredicto([{ regla: 'no-es-cadena', ini: null }]);
  if (cadena.length > LARGO_MAX) return veredicto([{ regla: 'demasiado-larga', ini: null }]);
  const privado = modo === 'privado';
  const plana = copia(cadena);
  const hallazgos = examinar(plana.texto, privado, contexto(permitidos)).map(h => ({ regla: h.regla, ini: plana.origen(h.ini) }));
  if (!privado) {
    // Negación por defecto: lo que no se ve en pantalla o viene mal leído no se publica, lleve lo que lleve.
    hallazgos.push(...raros(cadena), ...delUsuario(cadena, usuarios));
    if (indice && indice.solapa(cadena)) hallazgos.push({ regla: 'solapa-privado', ini: null });
  }
  return veredicto(hallazgos);
}

// Modo privado: tapa los secretos y deja lo demás como está.
export function enmascarar(cadena) {
  const texto = typeof cadena === 'string' ? cadena : String(cadena ?? '');
  if (texto.length > LARGO_MAX) return MASCARA;
  const plana = copia(texto);
  let salida = '', cursor = 0;
  for (const h of examinar(plana.texto, true, contexto()).sort((a, b) => a.ini - b.ini)) {
    const ini = plana.origen(h.ini), fin = plana.fin(h.fin);
    if (fin <= cursor) continue;
    if (ini >= cursor) salida += texto.slice(cursor, ini) + MASCARA;   // si monta sobre el anterior, es la misma tapa
    cursor = fin;
  }
  return salida + texto.slice(cursor);
}

// Recorre todas las cadenas de un JSON, claves y valores (y los números, por si son un teléfono o una tarjeta).
// La ruta de cada fallo se escribe con las claves que pasan; una clave que falla o no es sencilla se nombra por su puesto.
// Además de cada cadena por separado, mira lo que solo se ve entre dos:
//   · el nombre en la clave y el secreto en el valor ({"password": "…"}), o en el elemento anterior de una lista
//     (["--password", "…"]); bajo un nombre seguro falla todo lo que cuelgue de él;
//   · una cita privada partida entre cadenas hermanas seguidas (un guion guardado como lista de líneas).
// Solo se recorren listas y objetos llanos: lo demás (new String, una clase con toJSON) es «tipo-raro».
const CLAVE_SENCILLA = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
const esEscalar = v => typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint';
const esLlano = nodo => Array.isArray(nodo) || [Object.prototype, null].includes(Object.getPrototypeOf(nodo));

export function revisarObjeto(objeto, opciones = {}) {
  const fallos = [], rama = new Set();
  const indice = opciones.modo === 'privado' ? null : opciones.indice;
  const anotar = (ruta, en, r) => { if (!r.ok) fallos.push({ ruta, en, reglas: r.reglas, posiciones: r.posiciones }); };
  const fallar = (ruta, regla) => anotar(ruta, 'valor', veredicto([{ regla, ini: null }]));
  const deClave = (ruta, clave, i) => {
    const publica = revisar(clave, { ...opciones, modo: 'publico' });
    const oculta = `${ruta}.‹clave ${i}›`;
    anotar(oculta, 'clave', opciones.modo === 'privado' ? revisar(clave, opciones) : publica);
    return publica.ok && CLAVE_SENCILLA.test(clave) ? `${ruta}.${clave}` : oculta;
  };
  // pista: { nombre: clase del nombre que anuncia este valor, cita: una cita privada se completa aquí }
  const deValor = (valor, ruta, pista) => {
    const texto = String(valor);
    let r = revisar(texto, opciones);
    if (delataValor(pista.nombre, texto) && !r.reglas.includes('asignacion')) r = sumar(r, 'asignacion', 0);
    if (pista.cita && !r.reglas.includes('solapa-privado')) r = sumar(r, 'solapa-privado', null);
    anotar(ruta, 'valor', r);
  };
  // Los hijos de una lista o de un objeto, en orden: hijo(i, previo) → { ruta, valor, nombre que lo anuncia }.
  const deHijos = (cuantos, hijo, hondura, heredado) => {
    let seguido = indice?.seguido(), previo;
    for (let i = 0; i < cuantos; i++) {
      const { ruta, valor, nombre } = hijo(i, previo);
      const cadena = typeof valor === 'string';
      if (!cadena && indice) seguido = indice.seguido();   // solo cuentan las cadenas seguidas
      bajar(valor, ruta, hondura + 1, { nombre: nombre ?? heredado, cita: cadena && seguido ? seguido(valor) : false });
      previo = valor;
    }
  };
  const bajar = (nodo, ruta, hondura, pista) => {
    if (esEscalar(nodo)) return deValor(nodo, ruta, pista);
    if (nodo === null || nodo === undefined || typeof nodo === 'boolean') return;
    if (typeof nodo !== 'object' || !esLlano(nodo)) return fallar(ruta, 'tipo-raro');
    if (hondura >= HONDURA_MAX) return fallar(ruta, 'muy-profundo');
    if (rama.has(nodo)) return fallar(ruta, 'ciclo');
    rama.add(nodo);
    const heredado = pista.nombre === 'segura' ? 'segura' : null;
    if (Array.isArray(nodo)) {
      const anunciado = (v, previo) => (esEscalar(v) && !String(v).startsWith('-') ? anuncia(previo) : null);
      deHijos(nodo.length, (i, previo) => ({ ruta: `${ruta}[${i}]`, valor: nodo[i], nombre: anunciado(nodo[i], previo) }), hondura, heredado);
    } else {
      const claves = Object.keys(nodo);
      deHijos(claves.length, i => ({ ruta: deClave(ruta, claves[i], i), valor: nodo[claves[i]], nombre: claseDeNombre(claves[i]) }), hondura, heredado);
    }
    rama.delete(nodo);
  };
  bajar(objeto, '$', 0, {});
  return fallos;
}
