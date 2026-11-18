// Pruebas del índice de huellas. Los textos «privados» son inventados; los archivos van a un directorio temporal
// propio que se borra al terminar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearIndice, palabras, salPrivada, indicePrivado, rutasPrivadas, N, VETADA_MAX } from './huellas.mjs';
import { revisar, revisarObjeto } from './guardian.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-huellas-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const SAL = 'sal de prueba, fija para que todo sea repetible';
const PRIVADO = 'Mañana quiero que el dragón de cristal aparezca justo cuando el héroe abre la puerta azul del faro, ¿vale?';
const OTRO = 'Recuerda cambiar la música del pantano por algo más lento antes del viernes.';

test('las palabras se normalizan: minúsculas, sin tildes ni puntuación', () => {
  assert.deepEqual(palabras('¡Mañana, a las SEIS… en «El Faro»!'), ['manana', 'a', 'las', 'seis', 'en', 'el', 'faro']);
  assert.deepEqual(palabras("Don't stop — it's 3.5 km"), ['dont', 'stop', 'it', '3', '5', 'km']);
  assert.deepEqual(palabras('  \n\t '), []);
});

test('detecta una cita de 6 palabras aunque cambien mayúsculas, tildes y puntuación', () => {
  const indice = crearIndice({ sal: SAL });
  assert.equal(indice.agregar(PRIVADO), palabras(PRIVADO).length - N + 1);
  assert.equal(indice.solapa('En el video: EL DRAGON, de cristal… ¡aparezca justo cuando! Y sigue.'), true);
  assert.equal(indice.solapa('el héroe abre la puerta azul'), true);
  assert.equal(indice.solapa(PRIVADO), true);
});

test('con menos de 6 palabras seguidas, o en otro orden, no solapa', () => {
  const indice = crearIndice({ sal: SAL });
  indice.agregar(PRIVADO);
  assert.equal(indice.solapa('el dragón de cristal aparezca'), false);                    // 5 seguidas
  assert.equal(indice.solapa('cristal de dragón el aparezca justo cuando héroe'), false);   // las mismas, revueltas
  assert.equal(indice.solapa('el dragón de cristal aparezca pronto cuando el héroe abre'), false);
  assert.equal(indice.solapa('Sendell dibuja en vivo lo que hace cada sesión de trabajo.'), false);
  assert.equal(indice.solapa(''), false);
});

test('un índice vacío no solapa con nada, y sin sal no hay índice', () => {
  assert.equal(crearIndice({ sal: SAL }).solapa(PRIVADO), false);
  assert.throws(() => crearIndice({}), /falta la sal/);
  assert.throws(() => crearIndice({ sal: '' }), /falta la sal/);
});

test('las palabras y frases vetadas saltan solas, con otra grafía', () => {
  const indice = crearIndice({ sal: SAL });
  indice.vetar(['Zarabanda', 'Ñandú Pérez']);
  indice.vetar('Torre del Sur');
  assert.equal(indice.solapa('hoy vino ZARABANDA, otra vez'), true);
  assert.equal(indice.solapa('gracias a nandu perez por la idea'), true);
  assert.equal(indice.solapa('subimos a la torre… del sur'), true);
  assert.equal(indice.solapa('el ñandú corre'), false);            // media frase no es la frase
  assert.equal(indice.solapa('una torre al sur del mapa'), false);
  assert.equal(indice.solapa('zarabandas'), false);                // otra palabra
  assert.equal(indice.cuenta, 3);
});

test('una frase vetada de 6 o más palabras se guarda como secuencias', () => {
  const indice = crearIndice({ sal: SAL });
  indice.vetar('la casa de la colina que nadie visita');
  assert.equal(indice.cuenta, 8 - N + 1);
  assert.equal(indice.solapa('fuimos a la casa de la colina que da miedo'), true);
  assert.equal(VETADA_MAX, N - 1);
});

test('solapa solo dice sí o no', () => {
  const indice = crearIndice({ sal: SAL });
  indice.agregar(PRIVADO);
  indice.vetar('Zarabanda');
  for (const cadena of [PRIVADO, 'Zarabanda', 'nada que ver', '']) assert.equal(typeof indice.solapa(cadena), 'boolean');
});

test('la sal importa: con otra sal, las mismas palabras dan otras huellas', () => {
  const uno = crearIndice({ sal: SAL }), otro = crearIndice({ sal: 'otra sal, también fija' });
  const a = path.join(dir, 'sal-uno.bin'), b = path.join(dir, 'sal-otro.bin');
  uno.agregar(PRIVADO); otro.agregar(PRIVADO);
  uno.guardar(a); otro.guardar(b);
  assert.equal(fs.statSync(a).size, fs.statSync(b).size);
  assert.ok(!fs.readFileSync(a).subarray(16).equals(fs.readFileSync(b).subarray(16)));
});

test('el archivo en disco es 600, no lleva ninguna palabra del texto y se vuelve a cargar', () => {
  const archivo = path.join(dir, 'huellas.bin');
  const indice = crearIndice({ sal: SAL, archivo });
  indice.agregar(PRIVADO);
  indice.agregar(OTRO);
  indice.vetar(['Zarabanda', 'Torre del Sur']);
  indice.guardar();

  assert.equal(fs.statSync(archivo).mode & 0o777, 0o600);
  const datos = fs.readFileSync(archivo);
  assert.equal(datos.length, 16 + 8 * indice.cuenta);
  const comoTexto = [datos.toString('latin1'), datos.toString('utf8')].map(t => t.toLowerCase());
  const originales = [PRIVADO, OTRO, 'Zarabanda', 'Torre del Sur'].join(' ');
  const buscadas = new Set([...originales.toLowerCase().split(/[^\p{L}\p{N}]+/u), ...palabras(originales)].filter(p => p.length >= 3));
  assert.ok(buscadas.size > 25);
  for (const palabra of buscadas) for (const t of comoTexto) assert.ok(!t.includes(palabra), 'el archivo lleva una palabra del texto');
  assert.deepEqual(fs.readdirSync(dir).filter(f => f.endsWith('.tmp')), []);   // no queda el temporal

  const cargado = crearIndice({ sal: SAL, archivo });
  assert.equal(cargado.cuenta, indice.cuenta);
  assert.equal(cargado.solapa('que el dragón de cristal aparezca justo'), true);
  assert.equal(cargado.solapa('la música del pantano por algo más'), true);
  assert.equal(cargado.solapa('vino zarabanda'), true);
  assert.equal(cargado.solapa('un texto público cualquiera, con sus seis o siete palabras'), false);
});

test('guardar, cargar y seguir añadiendo no pierde ni repite huellas', () => {
  const archivo = path.join(dir, 'crece.bin');
  const primero = crearIndice({ sal: SAL, archivo });
  primero.agregar(PRIVADO);
  primero.agregar(PRIVADO);          // repetido: no cuenta dos veces
  const n = primero.cuenta;
  assert.equal(n, palabras(PRIVADO).length - N + 1);
  primero.guardar();

  const segundo = crearIndice({ sal: SAL, archivo });
  segundo.agregar(OTRO);
  segundo.agregar(PRIVADO);          // ya estaba en el archivo
  assert.equal(segundo.cuenta, n + palabras(OTRO).length - N + 1);
  segundo.guardar();

  const tercero = crearIndice({ sal: SAL, archivo });
  assert.equal(tercero.cuenta, segundo.cuenta);
  assert.equal(tercero.solapa('cuando el héroe abre la puerta azul'), true);
  assert.equal(tercero.solapa('cambiar la música del pantano por algo'), true);
  // La tabla del archivo va ordenada y sin repetidos.
  const tabla = fs.readFileSync(archivo).subarray(16);
  for (let i = 8; i < tabla.length; i += 8) assert.equal(tabla.compare(tabla, i, i + 8, i - 8, i), -1);
});

test('no se carga un índice con otra sal, dañado o con permisos abiertos', () => {
  const archivo = path.join(dir, 'estricto.bin');
  const indice = crearIndice({ sal: SAL, archivo });
  indice.agregar(PRIVADO);
  indice.guardar();
  assert.throws(() => crearIndice({ sal: 'otra sal, también fija', archivo }), /la sal no es la de este índice/);

  const roto = path.join(dir, 'roto.bin');
  fs.writeFileSync(roto, fs.readFileSync(archivo).subarray(0, 21), { mode: 0o600 });
  assert.throws(() => crearIndice({ sal: SAL, archivo: roto }), /dañado/);
  fs.writeFileSync(roto, 'esto no es un índice', { mode: 0o600 });
  assert.throws(() => crearIndice({ sal: SAL, archivo: roto }), /dañado/);

  fs.chmodSync(archivo, 0o644);
  assert.throws(() => crearIndice({ sal: SAL, archivo }), /permisos abiertos/);
  assert.throws(() => crearIndice({ sal: SAL }).guardar(), /falta el archivo/);
});

test('seguido(): una cita partida entre dos líneas también se ve, y solo en la línea donde se completa', () => {
  const indice = crearIndice({ sal: SAL });
  indice.agregar(PRIVADO);
  indice.vetar('Torre del Sur');
  const sigue = indice.seguido();
  assert.equal(sigue('Primera línea, sin nada. Luego: que el dragón'), false);
  assert.equal(sigue('de cristal aparezca, y ya.'), true);
  assert.equal(sigue('Otra línea limpia para cerrar.'), false);
  assert.equal(sigue('Subimos a la torre'), false);
  assert.equal(sigue('del sur.'), true);
  assert.equal(sigue('Y nada más.'), false);
  // Sin memoria entre líneas no se vería.
  assert.equal(indice.solapa('de cristal aparezca, y ya.'), false);
});

test('revisar usa el índice en público y no dice qué se repite ni dónde', () => {
  const indice = crearIndice({ sal: SAL });
  indice.agregar(PRIVADO);
  indice.vetar('Zarabanda');
  const cita = 'Y entonces: el dragón de cristal aparezca justo cuando toca.';
  const r = revisar(cita, { indice });
  assert.deepEqual(r, { ok: false, reglas: ['solapa-privado'], posiciones: [{ regla: 'solapa-privado', pos: null }] });
  assert.ok(revisar('Sendell dibuja lo que hace cada sesión.', { indice }).ok);
  assert.ok(revisar(cita).ok);                                   // sin índice no hay cómo saberlo
  assert.ok(revisar(cita, { indice, modo: 'privado' }).ok);      // en privado no se mira
  assert.deepEqual(revisarObjeto({ guion: ['hola', 'saluda a Zarabanda'] }, { indice }).map(f => [f.ruta, f.reglas]), [['$.guion[1]', ['solapa-privado']]]);
});

test('la sal y el índice del directorio privado: 600, y nada en el disco hasta que se pide', () => {
  const antes = process.env.SENDELL_DIR_PRIVADO;
  process.env.SENDELL_DIR_PRIVADO = path.join(dir, 'privado');
  try {
    const rutas = rutasPrivadas();
    assert.equal(rutas.dir, path.join(dir, 'privado'));
    assert.equal(indicePrivado(), null);
    assert.ok(!fs.existsSync(rutas.dir));

    const indice = indicePrivado({ crear: true });
    assert.equal(fs.statSync(rutas.sal).mode & 0o777, 0o600);
    assert.equal(fs.statSync(rutas.dir).mode & 0o777, 0o700);
    assert.equal(fs.readFileSync(rutas.sal).length, 32);
    assert.ok(salPrivada().equals(salPrivada()));
    indice.agregar(PRIVADO);
    indice.guardar();
    assert.equal(fs.statSync(rutas.indice).mode & 0o777, 0o600);
    assert.equal(indicePrivado().solapa('que el dragón de cristal aparezca justo'), true);
  } finally {
    if (antes === undefined) delete process.env.SENDELL_DIR_PRIVADO; else process.env.SENDELL_DIR_PRIVADO = antes;
  }
});

test('la sal no se carga con permisos abiertos ni se acepta corta', { skip: process.platform === 'win32' }, () => {
  const sal = path.join(dir, 'abierta.sal');
  fs.writeFileSync(sal, Buffer.alloc(32, 7), { mode: 0o600 });
  assert.ok(salPrivada(sal).equals(Buffer.alloc(32, 7)));
  fs.chmodSync(sal, 0o640);
  assert.throws(() => salPrivada(sal), /la sal del índice de huellas tiene permisos abiertos/);
  assert.throws(() => crearIndice({ sal: 'quince bytes..!' }), /la sal del índice de huellas es corta/);
  assert.doesNotThrow(() => crearIndice({ sal: 'dieciséis bytes!' }));
});

test('lo invisible no parte una palabra y el posesivo inglés no la cambia', () => {
  assert.deepEqual(palabras('dra​gón de cris­tal'), ['dragon', 'de', 'cristal']);
  assert.deepEqual(palabras("Zarabanda's game, Zarabanda’s rules, las Zarabandas"), ['zarabanda', 'game', 'zarabanda', 'rules', 'las', 'zarabandas']);
  const indice = crearIndice({ sal: SAL });
  indice.agregar(PRIVADO);
  indice.vetar('Zarabanda');
  assert.equal(indice.solapa('que el dra​gón de cristal aparezca justo'), true);
  assert.equal(indice.solapa("It is Zarabanda's game"), true);
  assert.equal(indice.solapa('It is her game'), false);
});

test('revisarObjeto ve una cita partida entre cadenas hermanas seguidas, y no entre las que no lo son', () => {
  const indice = crearIndice({ sal: SAL });
  indice.agregar(PRIVADO);
  const partida = ['Como dijimos: el dragón de cristal', 'aparezca justo cuando toca.'];
  assert.deepEqual(revisarObjeto({ guion: ['Nota.', ...partida] }, { indice }).map(f => [f.ruta, f.reglas]), [['$.guion[2]', ['solapa-privado']]]);
  assert.deepEqual(revisarObjeto({ uno: partida[0], dos: partida[1] }, { indice }).map(f => f.ruta), ['$.dos']);
  assert.deepEqual(revisarObjeto({ guion: [partida[0], 7, partida[1]] }, { indice }), []);            // un número en medio corta la cita
  assert.deepEqual(revisarObjeto({ guion: [[partida[0]], [partida[1]]] }, { indice }), []);            // listas distintas
  assert.deepEqual(revisarObjeto({ guion: partida }, { indice, modo: 'privado' }), []);
});

test('por defecto lo privado vive en ~/.local/share/sendell-en-directo', () => {
  const antes = process.env.SENDELL_DIR_PRIVADO;
  delete process.env.SENDELL_DIR_PRIVADO;
  try {
    assert.equal(rutasPrivadas().dir, path.join(os.homedir(), '.local', 'share', 'sendell-en-directo'));
  } finally {
    if (antes !== undefined) process.env.SENDELL_DIR_PRIVADO = antes;
  }
});

test('aguanta un texto grande sin guardar el texto', () => {
  // 60 000 palabras inventadas y distintas (una sílaba por cifra del contador): 59 995 secuencias, 8 bytes cada una.
  const silabas = ['ka', 'lo', 'mi', 'ne', 'su', 'tra', 've', 'zo', 'pi', 'du'];
  const palabra = i => [...String(i).padStart(5, '0')].map(c => silabas[c]).join('');
  const texto = Array.from({ length: 60_000 }, (_, i) => palabra(i)).join(' ');
  const archivo = path.join(dir, 'grande.bin');
  const indice = crearIndice({ sal: SAL, archivo });
  const n = indice.agregar(texto);
  indice.guardar();
  assert.equal(n, 60_000 - N + 1);
  assert.equal(indice.cuenta, n);
  assert.equal(fs.statSync(archivo).size, 16 + 8 * indice.cuenta);
  assert.equal(indice.solapa(Array.from({ length: N }, (_, i) => palabra(31_000 + i)).join(', ')), true);
  assert.equal(indice.solapa(Array.from({ length: N }, (_, i) => palabra(31_000 + i * 2)).join(' ')), false);
});
