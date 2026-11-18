// Canarios: secretos falsos sembrados en un guion largo. Cada uno es de una clase distinta y tiene que hacer fallar la
// revisión; y ninguno puede asomar, ni entero ni a trozos, en lo que devuelve revisar ni en lo que imprime el CLI.
// Todo es inventado, y lo que tiene forma de llave se arma por trozos para que este archivo no la lleve escrita.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { revisar, enmascarar, revisarObjeto, luhn, REGLAS, SECRETAS, MASCARA } from './guardian.mjs';

const u = (...trozos) => trozos.join('');
const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-canarios-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

// Una tarjeta inventada con la suma de Luhn bien hecha.
const base = '453914880343646';
const tarjeta = (base + [...'0123456789'].find(d => luhn(base + d))).replace(/(\d{4})(?=\d)/g, '$1 ');

// clase → lo que se siembra, lo que nunca puede verse (valor; por defecto, lo sembrado) y las reglas que debe disparar.
const CANARIOS = [
  { clase: 'llave-de-modelo', siembra: u('sk-', 'ant-api03-', 'CANARIOuno0123456789abcdefghijKLMNOP'), reglas: ['token'] },
  { clase: 'llave-de-github', siembra: u('ghp_', 'CANARIOdos0123456789abcdefghijABCDEFGH'), reglas: ['token'] },
  { clase: 'llave-fina-de-github', siembra: u('github_pat_', '11CANARIO0tres_abcdefghijABCDEFGHIJ0123456789'), reglas: ['token'] },
  { clase: 'llave-de-aws', siembra: u('AKIA', 'CANARIO4CUATRO56'), reglas: ['token'] },
  { clase: 'llave-de-slack', siembra: u('xoxb-', '123456789012-CANARIOcinco-abcdef'), reglas: ['token'] },
  { clase: 'jwt', siembra: u('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJ', 'zdWIiOiJjYW5hcmlvLXNlaXMifQ', '.', 'c2Vpcy1maXJtYS1mYWxzYS1jYW5hcmlv'), reglas: ['jwt'] },
  { clase: 'pem', siembra: u('-----BEGIN ', 'OPENSSH PRIVATE KEY-----\n', 'Y2FuYXJpby1zaWV0ZS1jYW5hcmlvLXNpZXRl\n', '-----END ', 'OPENSSH PRIVATE KEY-----'), valor: 'Y2FuYXJpby1zaWV0ZS1jYW5hcmlvLXNpZXRl', reglas: ['pem'] },
  { clase: 'contraseña', siembra: 'contraseña: Canario-Ocho-2026!', valor: 'Canario-Ocho-2026!', reglas: ['asignacion'] },
  { clase: 'hexadecimal-largo', siembra: u('7c4a8d09ca3762af', '61e59520943dc264', '94f8941b0d4e1c7a', '5b9e2f6a8c3d1e07'), reglas: ['hex-largo'] },
  { clase: 'base64-largo', siembra: 'Q2FuYXJpb0RpZXotc2VjcmV0by1mYWxzby0wOTg3NjU0MzIx', reglas: ['base64-largo'] },
  { clase: 'uuid', siembra: u('3f2b9c1e-7a4d-', '4e8b-9c6f-0a1b2c3d4e5f'), reglas: ['uuid'] },
  { clase: 'tarjeta', siembra: tarjeta, reglas: ['tarjeta'] },
  { clase: 'teléfono', siembra: '+57 300 555 0142', reglas: ['telefono'] },
  { clase: 'correo', siembra: 'canario.catorce@buzon-falso.com', reglas: ['correo'] },
  { clase: 'ipv4', siembra: '192.168.77.15', reglas: ['ipv4'] },
  { clase: 'ipv6', siembra: 'fe80::1ff:fe23:4567:890a', reglas: ['ipv6'] },
  { clase: 'mac', siembra: 'a4:5e:60:c1:9b:7d', reglas: ['mac'] },
  { clase: 'ruta-de-linux', siembra: '/home/canario/Projects/plan-diecisiete/notas.md', reglas: ['ruta-absoluta'] },
  { clase: 'ruta-de-windows', siembra: 'C:\\Users\\Canario\\Documentos\\dieciocho.txt', reglas: ['ruta-absoluta'] },
  { clase: 'archivo-de-llave-ssh', siembra: 'canario-equipo-ed25519', reglas: ['llave-ssh'] },
  { clase: 'hash-de-commit', siembra: '4f2a9c1', reglas: ['hash-commit'] },
  { clase: 'número-de-ronda', siembra: 'r850', reglas: ['ronda'] },
  { clase: 'subdominio-de-pruebas', siembra: 'canario-veintidos.pages.dev', reglas: ['dominio-pruebas'] },
  { clase: 'interruptor', siembra: 'juegox.canario.v2', reglas: ['interruptor'] },
  { clase: 'usuario-y-equipo', siembra: 'canario@casita-falsa', reglas: ['usuario-host'] },
  { clase: 'cuenta-ajena', siembra: '@canario_ajeno', reglas: ['mencion-ajena'] },
  { clase: 'url-ajena', siembra: 'https://sitio-ajeno-falso.com/canario', reglas: ['url-ajena'] },
  { clase: 'contraseña-en-url', siembra: u('https://canario:', 'contra-falsa-27', '@repo-falso.com/x.git'), valor: 'contra-falsa-27', reglas: ['url-ajena', 'credencial-url'] },
  { clase: 'usuario-del-sistema', siembra: os.userInfo().username, reglas: ['usuario-sistema'] },
].map(c => ({ valor: c.siembra, ...c }));

// El guion: narración corriente, con un hueco «{clase}» por canario metido en notas que no deberían estar ahí.
const GUION = `SENDELL EN DIRECTO — guion del piloto (borrador 3)

[00:00] Sendell aparece de frente y saluda. Hoy cuenta cómo nació Forja.
[00:08] «Esta semana trabajamos 3 días seguidos, casi 14 horas, y el 85 % salió a la primera.»
[00:15] La primera sesión leyó 42 archivos antes de tocar nada. Leer primero, editar después.
[00:22] NOTA DE MONTAJE: la llave del servicio era {llave-de-modelo} y hay que cambiarla.
[00:30] Sendell señala el patrón de lectura: una lluvia de ceros que baja despacio.
[00:37] El repositorio se clonó con {llave-de-github} en la orden, mala idea.
[00:44] «Después llegaron los ayudantes: 4 a la vez, cada uno con su encargo.»
[00:51] Para las acciones automáticas se usó {llave-fina-de-github} durante dos días.
[00:58] Sendell camina a la derecha. El patrón cambia: ahora son líneas que se escriben solas.
[01:05] El almacén de renders pide {llave-de-aws} y su pareja secreta.
[01:12] «En total, 1.250 líneas nuevas y 310 borradas. No está mal para un martes.»
[01:19] El aviso al canal salió con {llave-de-slack} desde el guion de despliegue.
[01:26] Sendell mira al frente. Pausa de 2 segundos.
[01:33] La sesión del panel quedó abierta con {jwt} en la cabecera.
[01:40] «¿Y qué es Forja? Una herramienta para mover personajes sin pagar licencias.»
[01:47] La llave del PC viejo, tal cual estaba en el portapapeles:
{pem}
[01:54] Sendell cambia de forma: durante 3 segundos es una araña de ceros.
[02:01] En la configuración quedó escrito {contraseña} sin cifrar.
[02:08] «La versión 0.3.1 ya abre un personaje, lo anima y lo exporta.»
[02:15] La suma del instalador es {hexadecimal-largo}, por si alguien pregunta.
[02:22] El patrón de consola: un cursor que parpadea y deja estela.
[02:29] La clave de la sesión del hábitat era {base64-largo} ese día.
[02:36] «Cada evento que ves aquí pasó de verdad. Si no hay señal, lo digo.»
[02:43] La sesión que hizo casi todo fue la {uuid}, la larga.
[02:50] Sendell teclea. Cuenta 12 ediciones en 40 segundos.
[02:57] Los créditos de la nube se pagaron con la {tarjeta}, la de siempre.
[03:04] «Hubo errores: 7 pruebas en rojo antes del verde.»
[03:11] Si falla la subida, llamar al {teléfono} antes de las 6.
[03:18] El patrón de búsqueda: una lupa que barre la rejilla de izquierda a derecha.
[03:25] Las facturas llegan a {correo} cada mes.
[03:32] «El hábitat vive en casa. Nadie de fuera lo ve.»
[03:39] En casa la página se abre en {ipv4} con el puerto de siempre,
[03:46] o por {ipv6} si el teléfono se pone terco,
[03:53] y la tarjeta de red del PC viejo es la {mac}.
[04:00] Sendell descansa. El avatar baja la cabeza un momento.
[04:07] El plan completo está en {ruta-de-linux} para quien lo quiera leer.
[04:14] La copia del portátil quedó en {ruta-de-windows} y está vieja.
[04:21] «Lo siguiente: enemigos y personajes no jugables.»
[04:28] Al PC viejo se entra con {archivo-de-llave-ssh} y paciencia.
[04:35] La versión que se grabó es la del commit {hash-de-commit}, no la de hoy.
[04:42] En la {número-de-ronda} se arregló el parry; antes no servía.
[04:49] Sendell saluda con la mano izquierda.
[04:56] La vista previa sigue en {subdominio-de-pruebas} hasta el viernes.
[05:03] Para verlo hay que encender {interruptor} en los ajustes.
[05:10] «Gracias por mirar. Esto apenas empieza.»
[05:17] El render se lanza desde {usuario-y-equipo} por las noches.
[05:24] La idea de las siluetas salió de {cuenta-ajena}, hay que avisarle.
[05:31] La referencia de animación está en {url-ajena} completa.
[05:38] El espejo del repositorio es {contraseña-en-url} todavía.
[05:45] Todo esto lo montó {usuario-del-sistema} en su escritorio.
[05:52] Cierre: el logo, 2 segundos de silencio y fundido a negro.
Más en sendell.co y en @SrSendell.
`;

// Siembra los canarios pedidos; los demás huecos se llenan con una palabra cualquiera.
function sembrar(clases) {
  return GUION.replace(/\{([^}]+)\}/g, (_, clase) => (clases.includes(clase) ? CANARIOS.find(c => c.clase === clase).siembra : 'algo'));
}
const TODAS = CANARIOS.map(c => c.clase);
const sinUsuario = lista => lista.filter(r => r !== 'usuario-sistema');

// Ventanas de 6 caracteres de un canario: si alguna sale, se escapó un trozo. Las cortas se buscan enteras.
function trozos(valor) {
  if (valor.length < 8) return [valor];
  return Array.from({ length: valor.length - 5 }, (_, i) => valor.slice(i, i + 6));
}
// Todo lo que el guardián puede decir por sí mismo: nombres de regla y las palabras fijas del CLI.
const VOCABULARIO = [...REGLAS, 'FALLA: 99 hallazgos · reglas: , PASA (clave) ‹clave 0› json-roto $.guion[0] $.apuntes L1:C1'].join(' ');
function escapados(salida) {
  return CANARIOS.filter(c => trozos(c.valor).some(t => !VOCABULARIO.includes(t) && salida.includes(t))).map(c => c.clase);
}
function correr(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, SENDELL_DIR_PRIVADO: path.join(dir, 'privado') } });
  return { codigo: r.status, salida: r.stdout + r.stderr };
}

test('los canarios están bien hechos: hay más de una docena, cada uno con su hueco, y sus trozos no son palabras del guardián', () => {
  assert.ok(CANARIOS.length >= 24);
  assert.equal(new Set(CANARIOS.map(c => c.siembra)).size, CANARIOS.length);
  for (const c of CANARIOS) {
    assert.ok(GUION.includes(`{${c.clase}}`), c.clase);
    assert.ok(c.siembra.includes(c.valor), c.clase);
    if (c.clase !== 'usuario-del-sistema') assert.ok(!trozos(c.valor).some(t => VOCABULARIO.includes(t)), c.clase);
  }
  assert.equal(GUION.match(/\{[^}]+\}/g).length, CANARIOS.length);
  assert.ok(luhn(tarjeta.replace(/ /g, '')));
  assert.deepEqual(escapados(sembrar(TODAS)), TODAS);   // la búsqueda de escapados funciona: en el guion sembrado están todos
});

test('el guion sin canarios pasa', () => {
  assert.deepEqual(sinUsuario(revisar(sembrar([])).reglas), []);
  assert.equal(enmascarar(sembrar([])), sembrar([]));
});

test('cada canario, él solo, hace fallar el guion con su regla', () => {
  for (const c of CANARIOS) {
    const r = revisar(sembrar([c.clase]));
    assert.equal(r.ok, false, c.clase);
    const esperadas = c.clase === 'usuario-del-sistema' ? r.reglas.filter(x => x === 'usuario-sistema') : sinUsuario(r.reglas);
    assert.deepEqual(esperadas, c.reglas, c.clase);
  }
});

test('con todos sembrados, cada canario cae en su sitio', () => {
  const guion = sembrar(TODAS);
  const r = revisar(guion);
  assert.equal(r.ok, false);
  for (const c of CANARIOS) {
    const ini = guion.indexOf(c.siembra), fin = ini + c.siembra.length;
    const suyas = r.posiciones.filter(p => p.pos >= ini && p.pos < fin).map(p => p.regla);
    for (const regla of c.reglas) assert.ok(suyas.includes(regla), `${c.clase}: falta ${regla}`);
  }
});

test('el resultado de revisar no lleva ningún canario, ni entero ni a trozos', () => {
  const guion = sembrar(TODAS);
  assert.deepEqual(escapados(JSON.stringify(revisar(guion))), []);
  assert.deepEqual(escapados(JSON.stringify(revisar(guion, { modo: 'privado' }))), []);
  for (const linea of guion.split('\n')) assert.deepEqual(escapados(JSON.stringify(revisar(linea))), []);
});

test('revisarObjeto tampoco los devuelve, aunque vayan en las claves', () => {
  const objeto = { titulo: 'piloto', guion: sembrar(TODAS).split('\n'), apuntes: Object.fromEntries(CANARIOS.map(c => [c.siembra, c.clase])) };
  const fallos = revisarObjeto(objeto);
  assert.ok(fallos.length >= CANARIOS.length * 2);
  assert.deepEqual(escapados(JSON.stringify(fallos)), []);
  assert.equal(fallos.filter(f => f.en === 'clave').length, CANARIOS.length);
});

test('enmascarar tapa los canarios que son secretos y deja los demás', () => {
  const tapado = enmascarar(sembrar(TODAS));
  for (const c of CANARIOS) {
    const secreto = c.reglas.some(r => SECRETAS.includes(r));
    assert.equal(tapado.includes(c.valor), !secreto, c.clase);
  }
  assert.ok(tapado.includes(MASCARA));
  assert.ok(revisar(tapado, { modo: 'privado' }).ok);
});

test('el CLI falla con el guion sembrado y su salida no lleva ningún canario', () => {
  const archivo = path.join(dir, 'guion.txt');
  fs.writeFileSync(archivo, sembrar(TODAS));
  const { codigo, salida } = correr(archivo);
  assert.equal(codigo, 1);
  assert.deepEqual(escapados(salida), []);
  for (const regla of new Set(CANARIOS.flatMap(c => c.reglas))) assert.ok(salida.includes(` ${regla}\n`), regla);
  assert.match(salida, /FALLA: \d+ hallazgos · reglas: /);
  assert.ok(!salida.includes('PASA'));
  // Cada línea de la salida es «lugar regla»: nada más.
  for (const linea of salida.trim().split('\n').slice(0, -1)) assert.match(linea, /^L\d+(:C\d+)? [a-z0-9-]+$/);
});

test('el CLI falla con el JSON sembrado (también en las claves) y su salida no lleva ningún canario', () => {
  const archivo = path.join(dir, 'guion.json');
  const objeto = { titulo: 'piloto', guion: sembrar(TODAS).split('\n'), apuntes: Object.fromEntries(CANARIOS.map(c => [c.siembra, c.clase])) };
  fs.writeFileSync(archivo, JSON.stringify(objeto, null, 1));
  const { codigo, salida } = correr(archivo);
  assert.equal(codigo, 1);
  assert.deepEqual(escapados(salida), []);
  for (const linea of salida.trim().split('\n').slice(0, -1)) assert.match(linea, /^\$(\.[A-Za-z_]\w*|\[\d+\]|\.‹clave \d+›)*( \(clave\))?( C\d+)? [a-z0-9-]+$/);
});

test('el CLI deja pasar el guion sin canarios', () => {
  const texto = path.join(dir, 'limpio.txt'), json = path.join(dir, 'limpio.json');
  fs.writeFileSync(texto, sembrar([]));
  fs.writeFileSync(json, JSON.stringify({ titulo: 'piloto', guion: sembrar([]).split('\n') }));
  // El directorio temporal puede llevar el nombre de usuario, pero el CLI no revisa la ruta: solo el contenido.
  assert.deepEqual(correr(texto), { codigo: 0, salida: 'PASA\n' });
  assert.deepEqual(correr(json), { codigo: 0, salida: 'PASA\n' });
});
