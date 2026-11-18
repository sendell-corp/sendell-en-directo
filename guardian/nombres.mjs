// Nombres delatores: «password», «api_key», «authToken»… y las formas de darles un valor:
//   nombre: valor · nombre = valor · nombre => valor · "nombre": "valor" · <nombre>valor</nombre> · --nombre valor
// Cada buscador devuelve tramos [inicio, fin] con el valor (nunca el nombre). El nombre se valida en código, sobre un
// trozo corto, para que ninguna cadena retorcida haga trabajar de más a un patrón.
export const MASCARA = '‹secreto›';

const NOMBRE_MAX = 80;
const VALOR_MAX = 400;

// Los nombres seguros delatan siempre, también con algo pegado delante («dbpassword»). Los enteros son seguros solo
// como tramo completo. Los dudosos («clave», «token», «key»…) son además palabras corrientes: sueltos y con dos puntos
// solo cuentan si lo que sigue no se lee como una frase.
const SEGURAS = 'passw(?:or)?d|passwd|passphrase|pwd|contrase[nñ]a|api[_-]?key|access[_-]?key|private[_-]?key|secret[_-]?key|client[_-]?secret|authorization|credentials?|credencial(?:es)?';
const ENTERAS = 'cvv2?|cvc2?|otp|totp|psk';
const DUDOSAS = 'secret[oa]?|token|clave|llave|key|pin|auth|cookie|pass';
const NOMBRE = new RegExp(`^[-._]*(?:[A-Za-z0-9]+[_.-])*(?:[A-Za-z0-9]*(?:${SEGURAS})|${ENTERAS}|${DUDOSAS})(?:[_-][A-Za-z0-9]+)*$`, 'iu');
const SOLO_DUDOSA = new RegExp(`^[-._]*(?:${DUDOSAS})$`, 'iu');
// camelCase: la joroba delatora cierra el nombre o va seguida de otra joroba (authToken, jwtSecret, apiKeyVieja).
const JOROBA = /^[-._]*(?:[A-Za-z0-9]+[_.-])*[a-z][A-Za-z0-9]*?(Token|Secret|Key|Password|Passwd|Pass|Pwd|Auth)(?:[A-Z][A-Za-z0-9]*)?$/;
const JOROBA_SEGURA = /^(?:Secret|Password|Passwd|Pwd)$/;

// 'segura', 'dudosa' o null.
export function claseDeNombre(nombre) {
  if (!nombre || nombre.length > NOMBRE_MAX) return null;
  if (NOMBRE.test(nombre)) return SOLO_DUDOSA.test(nombre) ? 'dudosa' : 'segura';
  const joroba = JOROBA.exec(nombre)?.[1];
  return joroba ? (JOROBA_SEGURA.test(joroba) ? 'segura' : 'dudosa') : null;
}

// ── El valor ─────────────────────────────────────────────────────────────────────────────────────────
// Entre comillas (también escapadas, como en un JSON metido en una cadena) o hasta el primer blanco.
const VALOR = String.raw`(?:(?:Bearer|Basic|Token)[ \t]+)?(?:\\(?<q>["'])(?:(?!\\?\k<q>)[^\n]){0,${VALOR_MAX}}(?:\\?\k<q>)?|"(?:[^"\\\n]|\\.){0,${VALOR_MAX}}"?|'(?:[^'\\\n]|\\.){0,${VALOR_MAX}}'?|[^\s"'][^\s]{0,${VALOR_MAX}})`;
const VALOR_AQUI = new RegExp(VALOR, 'iyu');
const ENTRE_COMILLAS = /^(?:(?:Bearer|Basic|Token)[ \t]+)?\\?["']/i;

// ¿Es la máscara y nada más? Lo ya tapado no se vuelve a tapar; un secreto con la máscara pegada delante, sí.
export const esMascara = valor => valor.replace(/^[\\"']+|[\\"'.,;:!?)\]}]+$/g, '') === MASCARA;

// Lo que puede seguir a un nombre dudoso sin ser un secreto.
// Una palabra corriente (con apertura, apóstrofo o cierre) o una tecla en mayúsculas: «constancia.», «don't», «SHIFT».
const PALABRA = /^[¡¿("'«“‘]*(?:\p{Lu}?\p{Ll}{0,24}(?:['’]\p{Ll}{1,3})?|\p{Lu}{1,8})["'»”’)]*[.,;:!?)]*$/u;
// Un nombre de archivo o de programa con extensión conocida: «Node.js», «three.js».
const CON_EXTENSION = /^[A-Za-z][A-Za-z0-9-]*\.(?:js|mjs|ts|py|rs|go|md|txt|json|css|html)[.,;:!?)]*$/;
// Un año o un nombre propio con su versión, seguidos de prosa: «2026 será el año.», «GPT-4o gasta menos.».
const NOMBRE_PROPIO = /^(?:\d{1,4}|\p{Lu}\p{L}*[-.]?\d{0,2}\p{L}{0,2})$/u;
const PROSA = /^(?:[ \t]+\p{Ll}+[,;]?){2,}[.!?]*[ \t]*$/u;
const corriente = valor => valor.length < 4 || PALABRA.test(valor) || CON_EXTENSION.test(valor);

// ¿Delata este valor, dado bajo un nombre de esa clase? (Para un JSON: el nombre es la clave.)
export function delataValor(clase, valor) {
  if (!clase || !valor || esMascara(valor)) return false;
  return clase === 'segura' || !corriente(valor);
}

// ── nombre: valor ────────────────────────────────────────────────────────────────────────────────────
const SEPARADOR = /(?:\\?["'])?[ \t]{0,3}(=>|:=|={1,3}|:)[ \t]{0,3}/g;
const DE_NOMBRE = /[\p{L}\p{N}_.-]/u;

function nombreAntes(texto, fin) {
  let ini = fin;
  while (ini > 0 && fin - ini <= NOMBRE_MAX && DE_NOMBRE.test(texto[ini - 1])) ini--;
  return fin - ini > NOMBRE_MAX ? '' : texto.slice(ini, fin);
}
function finDeLinea(texto, desde) {
  const salto = texto.indexOf('\n', desde);
  const tope = Math.min(salto < 0 ? texto.length : salto, desde + VALOR_MAX);
  return desde + texto.slice(desde, tope).trimEnd().length;
}
function valorEn(texto, ini) {
  VALOR_AQUI.lastIndex = ini;
  const m = VALOR_AQUI.exec(texto);
  return m && { ini, fin: ini + m[0].length, texto: m[0], suelto: !ENTRE_COMILLAS.test(m[0]) };
}
function sigueProsa(valor, texto) {
  if (!valor.suelto || !NOMBRE_PROPIO.test(valor.texto)) return false;
  return PROSA.test(texto.slice(valor.fin, finDeLinea(texto, valor.fin)));
}

export function asignaciones(texto) {
  const lista = [];
  let tapado = 0;
  for (const m of texto.matchAll(SEPARADOR)) {
    if (m.index < tapado) continue;
    const clase = claseDeNombre(nombreAntes(texto, m.index));
    const valor = clase && valorEn(texto, m.index + m[0].length);
    if (!valor || esMascara(valor.texto)) continue;
    const conIgual = /^=+$/.test(m[1]);
    if (clase === 'dudosa' && !conIgual && (corriente(valor.texto) || sigueProsa(valor, texto))) continue;
    // Con dos puntos y sin comillas el secreto puede llevar espacios (una frase de paso, una cabecera): hasta fin de línea.
    tapado = valor.suelto && !conIgual ? Math.max(valor.fin, finDeLinea(texto, valor.ini)) : valor.fin;
    lista.push([valor.ini, tapado]);
  }
  return lista;
}

// ── <nombre>valor</nombre> ───────────────────────────────────────────────────────────────────────────
const ETIQUETA = /<([A-Za-z][\w.-]{0,79})(?:[ \t][^<>\n]{0,200})?>([^<\n]{1,400})<\//g;

export function etiquetas(texto) {
  const lista = [];
  for (const m of texto.matchAll(ETIQUETA)) {
    if (!delataValor(claseDeNombre(m[1]), m[2].trim())) continue;
    const fin = m.index + m[0].length - 2;
    lista.push([fin - m[2].length, fin]);
  }
  return lista;
}

// ── --nombre valor ───────────────────────────────────────────────────────────────────────────────────
const P = String.raw`\p{L}\p{N}_`;
const OPCION = new RegExp(String.raw`(?<![${P}.-])(--?[A-Za-z0-9][A-Za-z0-9-]{0,${NOMBRE_MAX - 1}})[ \t]+(${VALOR})`, 'giu');
const NOMBRE_OPCION = /^--?(?:[A-Za-z0-9]+-)*(?:passw(?:or)?d|passwd|passphrase|pwd|pass|token|secret|api-?key|key|psk)(?:-[A-Za-z0-9]+)*$/i;
// curl --user usuario:contraseña (y -u): se tapa lo de detrás de los dos puntos. Dos números son usuario y grupo.
const OPCION_USUARIO = new RegExp(String.raw`(?<![${P}.-])(?:--user|-u)[ \t]+([^\s:]{1,100}):([^\s]{1,${VALOR_MAX}})`, 'gu');

export function opciones(texto) {
  const lista = [];
  for (const m of texto.matchAll(OPCION)) {
    const valor = m[2], fin = m.index + m[0].length;
    if (NOMBRE_OPCION.test(m[1]) && !valor.startsWith('-') && !esMascara(valor)) lista.push([fin - valor.length, fin]);
  }
  for (const m of texto.matchAll(OPCION_USUARIO)) {
    const fin = m.index + m[0].length;
    const numeros = /^\d+$/.test(m[1]) && /^\d+$/.test(m[2]);
    if (!numeros && !esMascara(m[2])) lista.push([fin - m[2].length, fin]);
  }
  return lista;
}

// En una lista: ¿este elemento anuncia que el siguiente es un secreto? («--password», «Authorization», «token:»).
// Una opción con guiones delata siempre; un nombre suelto, salvo que lo que siga sea una palabra corriente.
export function anuncia(elemento) {
  if (typeof elemento !== 'string' || elemento.length > NOMBRE_MAX + 1) return null;
  const clase = claseDeNombre(elemento.replace(/[:=]$/, ''));
  return clase && (elemento.startsWith('-') ? 'segura' : 'dudosa');
}
