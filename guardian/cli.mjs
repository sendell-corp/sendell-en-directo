#!/usr/bin/env node
// Guardián por línea de órdenes.
//   node guardian/cli.mjs archivo.json|archivo.jsonl|archivo.txt [--modo publico|privado] [--dominio d] [--cuenta c] [--sin-huellas]
// Sale con 0 si todo pasa, con 1 si algo falla y con 2 si no pudo revisar (uso, lectura, archivo demasiado grande o
// que no está en UTF-8: de un archivo mal leído no se puede decir que pasa).
// Solo imprime reglas y posiciones (línea y columna, o la ruta dentro del JSON): nunca el texto revisado.
//   .json    se lee entero y se recorren sus claves y valores      $.sesiones[2].nota C14 correo
//   .jsonl   un JSON por línea, en flujo                           L7 $.nota C14 correo
//   otro     texto, línea a línea, en flujo                        L7:C14 correo
// En texto, las líneas seguidas que son solo alfabeto de base64 se miran además juntas (un secreto partido en renglones).
// En JSON, una clave repetida dentro de un objeto es «json-roto»: al leerlo solo queda la última y la otra no se vería.
// --dominio y --cuenta añaden permitidos a los de la marca. En modo público usa el índice de huellas si existe.
import fs from 'node:fs';
import path from 'node:path';
import { revisar, revisarObjeto, PERMITIDOS, MODOS, LARGO_MAX } from './guardian.mjs';
import { indicePrivado } from './huellas.mjs';

const USO = 'uso: node guardian/cli.mjs archivo.json|archivo.jsonl|archivo.txt [--modo publico|privado] [--dominio d] [--cuenta c] [--sin-huellas]';
const JSON_MAX = 8 * 1024 * 1024;   // un .json se lee entero; lo que pese más, en .jsonl

function argumentos(crudos) {
  const args = crudos.flatMap(a => (/^--[a-z-]+=/.test(a) ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a]));
  const o = { archivo: null, modo: 'publico', dominios: [], cuentas: [], huellas: true };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--modo') o.modo = args[++i];
    else if (a === '--dominio') o.dominios.push(args[++i]);
    else if (a === '--cuenta') o.cuentas.push(args[++i]);
    else if (a === '--sin-huellas') o.huellas = false;
    else if (a.startsWith('--') || o.archivo) return null;
    else o.archivo = a;
  }
  const completo = o.archivo && MODOS.includes(o.modo) && ![...o.dominios, ...o.cuentas].includes(undefined);
  return completo ? o : null;
}

const aviso = texto => Object.assign(new Error(texto), { aviso: true });
const MAL_LEIDO = 'el archivo no está en UTF-8';
// Decodificador estricto: un byte que no es UTF-8 (Latin-1, UTF-16) es un error, no un signo de reemplazo.
function estricto() {
  const deco = new TextDecoder('utf-8', { fatal: true });
  return (bytes, fin = false) => {
    try { return deco.decode(bytes, { stream: !fin }); } catch { throw aviso(MAL_LEIDO); }
  };
}
const esUtf16 = bytes => bytes.length >= 2 && ((bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF));

// Líneas de un archivo, en flujo y con tope: de una línea más larga que LARGO_MAX no se guarda nada y sale null.
function* lineas(archivo) {
  const fd = fs.openSync(archivo, 'r');
  const bloque = Buffer.allocUnsafe(65536), leer = estricto();
  let linea = '', larga = false, leidos, primero = true;
  const sumar = trozo => { if (larga || linea.length + trozo.length > LARGO_MAX) { larga = true; linea = ''; } else linea += trozo; };
  const soltar = () => { const sale = larga ? null : linea.replace(/\r$/, ''); linea = ''; larga = false; return sale; };
  try {
    while ((leidos = fs.readSync(fd, bloque, 0, bloque.length, null)) > 0) {
      const bytes = bloque.subarray(0, leidos);
      if (primero && esUtf16(bytes)) throw aviso(MAL_LEIDO);
      primero = false;
      const trozos = leer(bytes).split('\n');
      for (let i = 0; i < trozos.length; i++) {
        sumar(trozos[i]);
        if (i < trozos.length - 1) yield soltar();
      }
    }
    sumar(leer(new Uint8Array(0), true));
    if (linea || larga) yield soltar();
  } finally { fs.closeSync(fd); }
}

// Cada hallazgo se imprime como «lugar regla»; del texto solo se dice dónde.
function informe() {
  const reglas = new Set();
  let n = 0;
  const decir = (lugar, regla) => { n++; reglas.add(regla); console.log(`${lugar} ${regla}`); };
  return {
    deCadena(lugar, r, junto = ':') { for (const { regla, pos } of r.posiciones) decir(pos === null ? lugar : `${lugar}${junto}C${pos + 1}`, regla); },
    deObjeto(prefijo, fallos) { for (const f of fallos) this.deCadena(`${prefijo}${f.ruta}${f.en === 'clave' ? ' (clave)' : ''}`, f, ' '); },
    decir,
    cerrar() {
      console.log(n ? `FALLA: ${n} hallazgos · reglas: ${[...reglas].join(', ')}` : 'PASA');
      return n ? 1 : 0;
    },
  };
}

// Renglones seguidos que son solo alfabeto de base64: juntos pueden ser un secreto que, renglón a renglón, no se ve.
const RENGLON_B64 = /^[ \t]*[A-Za-z0-9+/_-]{8,}={0,2}[ \t]*$/;
const RENGLONES_MAX = 64;
function juntador(opciones, inf) {
  let renglones = [], desde = 0, limpios = true;
  function cerrar() {
    if (renglones.length > 1 && limpios) {
      for (const regla of revisar(renglones.join('\n'), opciones).reglas) inf.decir(`L${desde}`, regla);
    }
    renglones = [];
    limpios = true;
  }
  return {
    cerrar,
    ver(n, linea, r) {
      if (!RENGLON_B64.test(linea) || renglones.length === RENGLONES_MAX) cerrar();
      if (!RENGLON_B64.test(linea)) return;
      if (!renglones.length) desde = n;
      renglones.push(linea);
      limpios &&= r.ok;
    },
  };
}

function revisarTexto(archivo, opciones, indice, inf) {
  const sigue = indice?.seguido(), junta = juntador(opciones, inf);
  let n = 0;
  for (const linea of lineas(archivo)) {
    n++;
    if (linea === null) { junta.cerrar(); inf.decir(`L${n}`, 'demasiado-larga'); continue; }
    const r = revisar(linea, opciones);
    inf.deCadena(`L${n}`, r);
    if (sigue?.(linea)) inf.decir(`L${n}`, 'solapa-privado');
    junta.ver(n, linea, r);
  }
  junta.cerrar();
}

// Claves escritas en un texto JSON (cadenas seguidas de dos puntos) y claves que quedan tras leerlo. Si no coinciden,
// alguna está repetida y JSON.parse se quedó con la última: el valor de la otra no se llegaría a examinar.
const CLAVE_ESCRITA = /"(?:[^"\\]|\\.)*"(\s*:)?/g;
function clavesEscritas(texto) {
  let n = 0;
  for (const m of texto.matchAll(CLAVE_ESCRITA)) if (m[1]) n++;
  return n;
}
function clavesLeidas(objeto) {
  let n = 0;
  const pila = [objeto];
  while (pila.length) {
    const nodo = pila.pop();
    if (nodo === null || typeof nodo !== 'object') continue;
    if (!Array.isArray(nodo)) n += Object.keys(nodo).length;
    for (const hijo of Object.values(nodo)) pila.push(hijo);
  }
  return n;
}
// El objeto de un texto JSON, o null si está roto o repite una clave.
function leerJson(texto) {
  let objeto;
  try { objeto = JSON.parse(texto); } catch { return null; }
  return objeto !== null && clavesEscritas(texto) !== clavesLeidas(objeto) ? null : { objeto };
}

function revisarJsonl(archivo, opciones, inf) {
  let n = 0;
  for (const linea of lineas(archivo)) {
    n++;
    if (linea === null) { inf.decir(`L${n}`, 'demasiado-larga'); continue; }
    if (!linea.trim()) continue;
    const leido = leerJson(linea);
    if (!leido) { inf.decir(`L${n}`, 'json-roto'); continue; }
    inf.deObjeto(`L${n} `, revisarObjeto(leido.objeto, opciones));
  }
}

function revisarJson(archivo, opciones, inf) {
  if (fs.statSync(archivo).size > JSON_MAX) throw aviso('el .json pesa demasiado para leerlo entero: usa .jsonl');
  const bytes = fs.readFileSync(archivo);
  if (esUtf16(bytes)) throw aviso(MAL_LEIDO);
  const leido = leerJson(estricto()(bytes, true));
  if (!leido) return inf.decir('$', 'json-roto');
  inf.deObjeto('', revisarObjeto(leido.objeto, opciones));
}

function principal() {
  const o = argumentos(process.argv.slice(2));
  if (!o) { console.error(USO); return 2; }
  const permitidos = { dominios: [...PERMITIDOS.dominios, ...o.dominios], cuentas: [...PERMITIDOS.cuentas, ...o.cuentas] };
  const inf = informe();
  try {
    const indice = o.modo === 'publico' && o.huellas ? indicePrivado() : null;
    const opciones = { modo: o.modo, permitidos };
    const ext = path.extname(o.archivo).toLowerCase();
    if (ext === '.json') revisarJson(o.archivo, { ...opciones, indice }, inf);
    else if (ext === '.jsonl' || ext === '.ndjson') revisarJsonl(o.archivo, { ...opciones, indice }, inf);
    else revisarTexto(o.archivo, opciones, indice, inf);
  } catch (e) {
    // El mensaje de un error ajeno puede llevar la ruta o un trozo del archivo: de esos solo se dice el código.
    console.error(`no se pudo revisar: ${e.aviso ? e.message : e.code ?? 'error interno'}`);
    return 2;
  }
  return inf.cerrar();
}

process.exitCode = principal();
