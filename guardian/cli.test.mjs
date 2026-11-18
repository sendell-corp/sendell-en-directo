// Pruebas del CLI del guardián: códigos de salida, formato de lo que imprime y lectura en flujo.
// Los archivos van a un directorio temporal propio, y el «directorio privado» de las pruebas también.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { crearIndice, salPrivada } from './huellas.mjs';
import { LARGO_MAX } from './guardian.mjs';

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-cli-'));
const privado = path.join(dir, 'privado');
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

function correr(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, SENDELL_DIR_PRIVADO: privado } });
  return { codigo: r.status, salida: r.stdout, error: r.stderr };
}
function archivo(nombre, contenido) {
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, contenido);
  return ruta;
}

test('texto limpio: sale con 0 y dice PASA', () => {
  const r = correr(archivo('limpio.txt', 'Sendell dibuja lo que hace cada sesión.\nHoy fueron 3 horas y un 85 % de avance.\n'));
  assert.deepEqual(r, { codigo: 0, salida: 'PASA\n', error: '' });
  assert.deepEqual(correr(archivo('vacio.txt', '')), { codigo: 0, salida: 'PASA\n', error: '' });
});

test('texto con fallos: sale con 1 y dice línea, columna y regla', () => {
  const r = correr(archivo('sucio.txt', 'Primera línea limpia.\nEscribe a canario@falso.org o entra en 10.0.0.1 hoy.\n\nRonda r850.'));
  assert.equal(r.codigo, 1);
  assert.equal(r.salida, 'L2:C11 correo\nL2:C40 ipv4\nL4:C7 ronda\nFALLA: 3 hallazgos · reglas: correo, ipv4, ronda\n');
  assert.equal(r.error, '');
});

test('fin de línea de Windows y marca de orden de bytes no estorban', () => {
  assert.equal(correr(archivo('windows.txt', '﻿Hola a todos.\r\nSeguimos mañana.\r\n')).codigo, 0);
  assert.equal(correr(archivo('windows2.txt', '﻿canario@falso.org\r\nfin\r\n')).salida.split('\n')[0], 'L1:C1 correo');
});

test('JSON: dice la ruta dentro del objeto, también cuando falla una clave', () => {
  const objeto = { titulo: 'piloto', sesiones: [{ nota: 'todo bien' }, { nota: 'ver 10.0.0.1' }], 'canario@falso.org': 'x' };
  const r = correr(archivo('datos.json', JSON.stringify(objeto)));
  assert.equal(r.codigo, 1);
  assert.equal(r.salida, '$.sesiones[1].nota C5 ipv4\n$.‹clave 2› (clave) C1 correo\nFALLA: 2 hallazgos · reglas: ipv4, correo\n');
  assert.deepEqual(correr(archivo('bien.json', '{"v":1,"tipo":"editar","mas":12,"ok":true}')), { codigo: 0, salida: 'PASA\n', error: '' });
});

test('JSON roto: falla sin repetir el contenido', () => {
  const r = correr(archivo('roto.json', '{"nota": "canario@falso.org", '));
  assert.equal(r.codigo, 1);
  assert.equal(r.salida, '$ json-roto\nFALLA: 1 hallazgos · reglas: json-roto\n');
  assert.ok(!(r.salida + r.error).includes('canario'));
});

test('JSONL: un objeto por línea, con su número de línea', () => {
  const lineas = [{ tipo: 'leer', ext: 'mjs' }, { tipo: 'editar', nota: 'en /home/canario/x' }, 'esto no es json: canario@falso.org', { tipo: 'commit' }];
  const r = correr(archivo('bitacora.jsonl', lineas.map(l => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n\n'));
  assert.equal(r.codigo, 1);
  assert.equal(r.salida, 'L2 $.nota C4 ruta-absoluta\nL3 json-roto\nFALLA: 2 hallazgos · reglas: ruta-absoluta, json-roto\n');
});

test('--modo privado solo mira secretos', () => {
  const ruta = archivo('privado.txt', 'En /home/canario/x, de canario@falso.org.\npassword=hunter2\n');
  assert.equal(correr(ruta, '--modo', 'privado').salida, 'L2:C10 asignacion\nFALLA: 1 hallazgos · reglas: asignacion\n');
  assert.equal(correr(ruta, '--modo=privado').codigo, 1);
  assert.equal(correr(ruta).salida.split('\n').length - 2, 3);     // en público: ruta, correo y asignación
  assert.equal(correr(archivo('privado2.txt', 'En /home/canario/x, de canario@falso.org.\n'), '--modo', 'privado').codigo, 0);
});

test('--dominio y --cuenta añaden permitidos a los de la marca', () => {
  const ruta = archivo('marca.txt', 'Juega en itch.io y sigue a @otra_marca, a @SrSendell y sendell.co.\n');
  assert.equal(correr(ruta).salida, 'L1:C10 url-ajena\nL1:C28 mencion-ajena\nFALLA: 2 hallazgos · reglas: url-ajena, mencion-ajena\n');
  assert.equal(correr(ruta, '--dominio', 'itch.io').salida.split('\n')[0], 'L1:C28 mencion-ajena');
  assert.deepEqual(correr(ruta, '--dominio', 'itch.io', '--cuenta', 'otra_marca'), { codigo: 0, salida: 'PASA\n', error: '' });
});

test('un archivo que no está en UTF-8 no se puede revisar: sale con 2 y no dice PASA', () => {
  const texto = 'Sendell saluda desde el faro.\n';
  const mal = { codigo: 2, salida: '', error: 'no se pudo revisar: el archivo no está en UTF-8\n' };
  assert.deepEqual(correr(archivo('utf16le.txt', Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(texto, 'utf16le')]))), mal);
  assert.deepEqual(correr(archivo('utf16be.txt', Buffer.concat([Buffer.from([0xFE, 0xFF]), Buffer.from(texto, 'utf16le').swap16()]))), mal);
  assert.deepEqual(correr(archivo('latin1.txt', Buffer.from('Mañana seguimos.\n', 'latin1'))), mal);
  assert.deepEqual(correr(archivo('latin1.json', Buffer.from('{"nota": "mañana"}', 'latin1'))), mal);
  assert.deepEqual(correr(archivo('utf16.json', Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('{"v": 1}', 'utf16le')]))), mal);
  // Un carácter de varios bytes partido entre dos bloques de lectura sí es UTF-8.
  assert.equal(correr(archivo('partido.txt', 'palabra '.repeat(8192).slice(0, 65535) + 'ñ fin\n')).codigo, 0);
  // Un nulo suelto es UTF-8, pero no es texto: falla, con su regla.
  assert.equal(correr(archivo('nulo.txt', 'hola\0 mundo\n')).salida, 'L1:C5 codificacion\nFALLA: 1 hallazgos · reglas: codificacion\n');
});

test('JSON con una clave repetida: es json-roto, también dentro de otro objeto y en JSONL', () => {
  assert.equal(correr(archivo('repetida.json', '{"a": {"nota": "x", "nota": "todo bien"}}')).salida, '$ json-roto\nFALLA: 1 hallazgos · reglas: json-roto\n');
  assert.equal(correr(archivo('repetida.jsonl', '{"v": 1}\n{"v": 1, "v": 2}\n')).salida, 'L2 json-roto\nFALLA: 1 hallazgos · reglas: json-roto\n');
  // Dos objetos con la misma clave, o una cadena con dos puntos y comillas dentro, no son repeticiones.
  const limpio = { lista: [{ nota: 'uno' }, { nota: 'dos' }], frase: 'dijo: "hola": y se fue', '': 1, __proto__x: { 'a"b': 'c' } };
  assert.deepEqual(correr(archivo('sin-repetir.json', JSON.stringify(limpio, null, 2))), { codigo: 0, salida: 'PASA\n', error: '' });
});

test('JSON: una contraseña en un valor falla por el nombre de su clave', () => {
  const r = correr(archivo('con-nombre.json', JSON.stringify({ servicio: 'correo', password: 'hunter2', argv: ['--password', 'hunter2'] })));
  assert.equal(r.salida, '$.password C1 asignacion\n$.argv[1] C1 asignacion\nFALLA: 2 hallazgos · reglas: asignacion\n');
});

test('texto: renglones seguidos de base64 se miran también juntos', () => {
  const trozos = ['Q2FuYXJpb0RpZXot', 'c2VjcmV0by1mYWxz', 'by0wOTg3NjU0MzIx'];
  assert.equal(correr(archivo('renglones.txt', `La llave:\n${trozos.join('\n')}\nfin\n`)).salida, 'L2 base64-largo\nFALLA: 1 hallazgos · reglas: base64-largo\n');
  assert.equal(correr(archivo('renglones-fin.txt', trozos.join('\r\n'))).codigo, 1);
  assert.equal(correr(archivo('palabras.txt', 'constancia\npaciencia\ndisciplina\n')).codigo, 0);
});

test('mal uso o archivo ilegible: sale con 2 y no repite la ruta', () => {
  for (const args of [[], ['--modo', 'publico'], ['a.txt', 'b.txt'], ['a.txt', '--modo', 'abierto'], ['a.txt', '--otra'], ['a.txt', '--dominio']]) {
    const r = correr(...args);
    assert.equal(r.codigo, 2);
    assert.match(r.error, /^uso: node guardian\/cli\.mjs /);
    assert.equal(r.salida, '');
  }
  const r = correr(path.join(dir, 'canario-no-existe.txt'));
  assert.deepEqual(r, { codigo: 2, salida: '', error: 'no se pudo revisar: ENOENT\n' });
  assert.equal(correr(dir).error, 'no se pudo revisar: EISDIR\n');
});

test('una línea más larga que el tope falla entera, sin cargarse en memoria', () => {
  const ruta = path.join(dir, 'larga.txt');
  const fd = fs.openSync(ruta, 'w');
  fs.writeSync(fd, 'línea corta\n');
  const bloque = 'palabra '.repeat(8192);
  for (let escrito = 0; escrito <= LARGO_MAX; escrito += bloque.length) fs.writeSync(fd, bloque);
  fs.writeSync(fd, '\ncanario@falso.org\n');
  fs.closeSync(fd);
  const r = correr(ruta);
  assert.equal(r.salida, 'L2 demasiado-larga\nL3:C1 correo\nFALLA: 2 hallazgos · reglas: demasiado-larga, correo\n');
});

test('un .json demasiado grande no se lee entero: sale con 2', () => {
  const ruta = path.join(dir, 'grande.json');
  const fd = fs.openSync(ruta, 'w');
  fs.writeSync(fd, '["');
  const bloque = 'a'.repeat(1 << 20);
  for (let i = 0; i < 9; i++) fs.writeSync(fd, bloque);
  fs.writeSync(fd, '"]');
  fs.closeSync(fd);
  assert.deepEqual(correr(ruta), { codigo: 2, salida: '', error: 'no se pudo revisar: el .json pesa demasiado para leerlo entero: usa .jsonl\n' });
  fs.rmSync(ruta);
});

test('con índice de huellas en el directorio privado, una cita privada falla aunque vaya partida en dos líneas', () => {
  const texto = 'Nota.\nComo dijimos: el dragón de cristal\naparezca justo cuando toca.\nY saluda a Zarabanda.\n';
  const ruta = archivo('cita.txt', texto);
  const json = archivo('cita.json', JSON.stringify({ guion: texto.split('\n') }));
  assert.equal(correr(ruta).codigo, 0);                       // todavía no hay índice

  fs.mkdirSync(privado, { mode: 0o700 });
  const indice = crearIndice({ sal: salPrivada(path.join(privado, 'huellas.sal')), archivo: path.join(privado, 'huellas.bin') });
  indice.agregar('Mañana quiero que el dragón de cristal aparezca justo cuando el héroe abre la puerta.');
  indice.vetar('Zarabanda');
  indice.guardar();

  const r = correr(ruta);
  assert.equal(r.codigo, 1);
  assert.equal(r.salida, 'L3 solapa-privado\nL4 solapa-privado\nFALLA: 2 hallazgos · reglas: solapa-privado\n');
  // En JSON las cadenas seguidas de una lista se miran también juntas: la cita partida se completa en guion[2].
  assert.equal(correr(json).salida, '$.guion[2] solapa-privado\n$.guion[3] solapa-privado\nFALLA: 2 hallazgos · reglas: solapa-privado\n');
  assert.equal(correr(ruta, '--sin-huellas').codigo, 0);
  assert.equal(correr(ruta, '--modo', 'privado').codigo, 0);

  // Un índice dañado no se ignora: no se puede revisar.
  fs.writeFileSync(path.join(privado, 'huellas.bin'), 'roto', { mode: 0o600 });
  assert.deepEqual(correr(ruta), { codigo: 2, salida: '', error: 'no se pudo revisar: el índice de huellas está dañado\n' });
  fs.rmSync(privado, { recursive: true });
});
