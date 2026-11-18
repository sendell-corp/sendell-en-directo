// Ataques al guardián. Cada prueba dice lo que el guardián tendría que hacer y hoy no hace: mientras el agujero siga
// abierto, la prueba falla y nombra por su etiqueta los casos que se cuelan. Antes de cada ataque va un control (la
// forma llana sí cae), para que la prueba mida el disfraz y no otra cosa.
// Todos los datos son inventados. Lo que tiene forma de llave se arma por trozos, y los caracteres invisibles se
// escriben con su código, nunca tal cual.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { revisar, enmascarar, revisarObjeto, MASCARA } from './guardian.mjs';
import { crearIndice, salPrivada } from './huellas.mjs';

const u = (...trozos) => trozos.join('');
const usuario = os.userInfo().username;
const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-ataque-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const ZW = '\u200B', BLANDO = '\u00AD', DURO = '\u00A0', FINO = '\u202F', RAYA = '\u2013';
const meter = (cadena, i, signo = ZW) => cadena.slice(0, i) + signo + cadena.slice(i);
const trocear = (cadena, n, junto) => cadena.match(new RegExp(`.{1,${n}}`, 'gs')).join(junto);
// Pasa los caracteres ASCII visibles a su forma de anchura completa (U+FF01 a U+FF5E).
const ancho = cadena => [...cadena].map(c => (c > ' ' && c <= '~' ? String.fromCharCode(c.charCodeAt(0) + 0xFEE0) : c)).join('');

const GH = u('ghp_', 'x7Kq2mZp9Lr4Tn8Wb3Yv6Jc1Hd5Fg0Sa2QeU');
const HEX64 = u('7c4a8d09ca3762af', '61e59520943dc264', '94f8941b0d4e1c7a', '5b9e2f6a8c3d1e07');
const B64 = u('Q2FuYXJpb0RpZXot', 'c2VjcmV0by1mYWxz', 'by0wOTg3NjU0MzIx');
const TARJETA = ['4111', '1111', '1111', '1111'];

const sinUsuario = lista => lista.filter(r => r !== 'usuario-sistema');
const etiquetas = (casos, cuela) => Object.entries(casos).filter(([, caso]) => cuela(caso)).map(([etiqueta]) => etiqueta);
const queja = (verbo, lista, casos) => `${verbo} ${lista.length} de ${Object.keys(casos).length}: ${lista.join(' · ')}`;
// Control: la forma llana de cada caso cae en público.
function caen(casos) {
  const colados = etiquetas(casos, cadena => revisar(cadena).ok);
  assert.equal(colados.length, 0, queja('un control no cayó;', colados, casos));
}
// Ningún caso puede pasar la revisión pública.
function noPasa(casos, opciones) {
  const colados = etiquetas(casos, cadena => revisar(cadena, opciones).ok);
  assert.equal(colados.length, 0, queja('pasan en público', colados, casos));
}
// Casos [cadena, secreto]: enmascarar no puede dejar el secreto a la vista.
function noSeVe(casos) {
  const vistos = etiquetas(casos, ([cadena, secreto]) => enmascarar(cadena).includes(secreto));
  assert.equal(vistos.length, 0, queja('enmascarar deja ver', vistos, casos));
}
// Frases corrientes: tienen que pasar enteras (salvo por el nombre de usuario de quien corre la prueba).
function pasaLimpia(frases) {
  const rechazadas = frases.map((frase, i) => [i, sinUsuario(revisar(frase).reglas)]).filter(([, reglas]) => reglas.length);
  assert.equal(rechazadas.length, 0, `falsos positivos en ${rechazadas.length} de ${frases.length}: ${rechazadas.map(([i, r]) => `frase ${i} (${r.join(', ')})`).join(' · ')}`);
}
// Corre varias comprobaciones y junta sus quejas, para que la primera no tape a las demás.
function todas(...comprobaciones) {
  const quejas = [];
  for (const comprobar of comprobaciones) { try { comprobar(); } catch (e) { quejas.push(e.message.split('\n')[0]); } }
  assert.equal(quejas.length, 0, quejas.join(' | '));
}
function correr(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, SENDELL_DIR_PRIVADO: path.join(dir, 'privado') } });
  return { codigo: r.status, salida: r.stdout + r.stderr };
}
function archivo(nombre, contenido) {
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, contenido);
  return ruta;
}

const LLANOS = {
  token: GH, correo: 'canario@falso.org', ip: '192.168.1.23', ruta: '/home/canario/Projects/plan.md', usuario,
  telefono: '+57 300 123 4567', tarjeta: TARJETA.join(' '), ronda: 'r850', clave: 'password: hunter2',
};

// ── Unicode ──────────────────────────────────────────────────────────────────────────────────────────
test('A01 · un carácter invisible (ancho cero, guion blando) no desarma ninguna regla', () => {
  caen(LLANOS);
  noPasa({
    'token con ancho cero': meter(meter(GH, 26), 12),
    'token con guion blando': trocear(GH, 15, BLANDO),
    'correo': `canario@${ZW}falso.${ZW}org`,
    'ip': `192.168.${ZW}1.23`,
    'ruta': `/${ZW}home/canario/Projects/plan.md`,
    'usuario con ancho cero': meter(usuario, 2),
    'usuario con guion blando': meter(usuario, 2, BLANDO),
    'teléfono': `+57 300${ZW} 123 4567`,
    'tarjeta': `4111 1111${ZW} 1111 1111`,
    'ronda': `r${ZW}850`,
    'clave': meter('password: hunter2', 4),
  });
});

test('A02 · anchura completa: las mismas cosas escritas con U+FF01…U+FF5E también caen', () => {
  caen(LLANOS);
  noPasa({
    ...Object.fromEntries(Object.entries(LLANOS).map(([etiqueta, llano]) => [`${etiqueta} entero`, ancho(llano)])),
    'solo la arroba, en el dominio de la marca': `canario${ancho('@')}sendell.co`,
    'solo los dos puntos de la asignación': `password${ancho(':')}hunter2`,
    'solo el punto del dominio': `malo${ancho('.')}com`,
    'solo la arroba de una mención': `${ancho('@')}canario_ajeno`,
  });
});

test('A03 · letras parecidas y tildes combinadas: el usuario y los dominios disfrazados caen', () => {
  const parecida = { a: '\u0430', e: '\u0435', o: '\u043E', c: '\u0441', p: '\u0440', x: '\u0445', y: '\u0443' };
  caen({ usuario, 'dominio ajeno': 'sendell.com', 'dominio sin tilde': 'mipagina.com' });
  noPasa({
    'usuario con una letra cirílica': usuario.replace(/[aeocpxy]/, c => parecida[c]),
    'usuario con una tilde combinada': meter(usuario, 1, '\u0301'),
    'dominio de la marca con «е» cirílica, suelto': 's\u0435ndell.co',
    'el mismo, con ruta': 's\u0435ndell.co/juegos',
    'dominio ajeno con tilde, suelto': 'mipágina.com',
    'dominio ajeno con eñe, suelto': 'cañón-falso.com',
  });
});

test('A04 · enmascarar tapa un secreto aunque lleve un carácter invisible o vaya en anchura completa', () => {
  assert.ok(!enmascarar(GH).includes(GH.slice(-10)) && !enmascarar('password=hunter2').includes('hunter2'), 'control');
  noSeVe({
    'token con ancho cero': [meter(meter(GH, 26), 12), GH.slice(-10)],
    'token con guion blando': [trocear(GH, 15, BLANDO), GH.slice(-6)],
    'contraseña con ancho cero en el nombre': [meter('password=hunter2', 4), 'hunter2'],
    'token en anchura completa': [ancho(GH), ancho(GH.slice(-10))],
    'contraseña con dos puntos anchos': [`password${ancho(':')}hunter2`, 'hunter2'],
  });
});

// ── JSON y archivos ──────────────────────────────────────────────────────────────────────────────────
const CON_NOMBRE = {
  'password': { password: 'hunter2' },
  'token': { token: 'abc123xyz' },
  'api_key': { api_key: 'canarioclave' },
  'pin guardado como número': { pin: 4821 },
  'credenciales anidadas': { servicio: { credenciales: { usuario: 'canario', contrasena: 'hunter2' } } },
  'lista de argumentos': ['curl', '--password', 'hunter2'],
  'pares nombre-valor': [['Authorization', 'Basic aHVudGVyMg']],
};

test('A05 · revisarObjeto: una contraseña falla aunque su nombre vaya en la clave y ella en el valor', () => {
  // Control: el mismo objeto, escrito como texto, sí cae.
  caen({ texto: 'password: hunter2', serie: JSON.stringify(CON_NOMBRE.password), opcion: 'curl --password hunter2' });
  const colados = etiquetas(CON_NOMBRE, objeto => revisarObjeto(objeto).length === 0);
  assert.equal(colados.length, 0, queja('pasan en público', colados, CON_NOMBRE));
});

test('A06 · el CLI no da por bueno un .json ni un .jsonl con la contraseña en un valor', () => {
  const json = correr(archivo('con-nombre.json', JSON.stringify({ servicio: 'correo', password: 'hunter2', argv: ['--password', 'hunter2'] })));
  const jsonl = correr(archivo('con-nombre.jsonl', `${JSON.stringify({ token: 'abc123xyz' })}\n`));
  assert.deepEqual([json.codigo, jsonl.codigo], [1, 1]);
});

test('A06b · el CLI no da por bueno un JSON con una clave repetida que esconde el primer valor', () => {
  assert.equal(correr(archivo('una-clave.json', '{"nota": "canario@falso.org"}')).codigo, 1, 'control');
  const json = correr(archivo('repetida.json', '{"nota": "canario@falso.org", "nota": "todo bien"}'));
  const jsonl = correr(archivo('repetida.jsonl', '{"nota": "en /home/canario/x", "nota": "todo bien"}\n'));
  assert.deepEqual([json.codigo, jsonl.codigo], [1, 1]);
});

test('A07 · el CLI no dice PASA de un archivo que no está en UTF-8 o que lleva bytes nulos', () => {
  const sucio = `Escribe a canario@falso.org\ncon ${GH} y en /home/canario/x\n`;
  assert.equal(correr(archivo('utf8.txt', sucio)).codigo, 1, 'control');
  const codigos = {
    'UTF-16 LE con marca': correr(archivo('utf16le.txt', Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(sucio, 'utf16le')]))),
    'UTF-16 BE con marca': correr(archivo('utf16be.txt', Buffer.concat([Buffer.from([0xFE, 0xFF]), Buffer.from(sucio, 'utf16le').swap16()]))),
    'Latin-1 con eñe en el nombre': correr(archivo('latin1.txt', Buffer.from('contraseña: Canario-2026!\n', 'latin1'))),
    'bytes nulos en medio': correr(archivo('nulos.txt', 'canario@\0falso.\0org y 192.168.\x001.23\n')),
  };
  const dados = etiquetas(codigos, r => r.codigo === 0);
  assert.equal(dados.length, 0, queja('el CLI da por buenos', dados, codigos));
});

test('A08 · revisar no da por buena una cadena con caracteres nulos o con el signo de reemplazo', () => {
  noPasa({
    'un nulo tras cada carácter (UTF-16 mal leído)': [...'canario@falso.org'].join('\0'),
    'signo de reemplazo en el nombre': 'contrase\uFFFDa: Canario-2026!',
    'nulo dentro de la IP': '192.168.\x001.23',
  });
});

// ── Teléfonos y tarjetas ─────────────────────────────────────────────────────────────────────────────
test('A09 · teléfonos colombianos en otros formatos corrientes', () => {
  caen({ '3-3-4': '300 123 4567', 'con +57': '+57 300 123 4567', 'corrido': '3001234567' });
  noPasa({
    '3 + 7': '300 1234567',
    '57 pegado, sin +': '573001234567',
    '57 + 3 + 7': '57 300 1234567',
    'paréntesis + 7': '(300) 1234567',
    'guion + 7': '300-1234567',
    'con espacios duros': ['300', '123', '4567'].join(DURO),
    'con + y espacios duros': ['+57', '300', '123', '4567'].join(DURO),
    'tras un guion': '57-300-123-4567',
    'tras un punto': 'Cel.3001234567',
  });
});

test('A10 · tarjetas con otros separadores, en público y en privado', () => {
  const separadores = { 'espacio duro': DURO, 'espacio fino': FINO, 'punto': '.', 'dos espacios': '  ', 'raya': RAYA, 'tabulador': '\t', 'guion entre espacios': ' - ' };
  const casos = Object.fromEntries(Object.entries(separadores).map(([etiqueta, s]) => [etiqueta, TARJETA.join(s)]));
  caen({ espacios: TARJETA.join(' '), guiones: TARJETA.join('-'), corrida: TARJETA.join('') });
  todas(() => noPasa(casos), () => noSeVe(Object.fromEntries(Object.entries(casos).map(([etiqueta, t]) => [etiqueta, [`tarjeta ${t} vence`, t]]))));
});

// ── Rutas ────────────────────────────────────────────────────────────────────────────────────────────
test('A11 · una ruta absoluta cae aunque vaya pegada a otro signo', () => {
  caen({ suelta: 'en /home/canario/Projects/plan.md', comillas: '"/opt/canario/lib"' });
  noPasa({
    'negrita de Markdown': '**/home/canario/Projects/plan.md**',
    'cursiva de Markdown': '_/home/canario/Projects/plan.md_',
    'entre ángulos': '</home/canario/Projects/plan.md>',
    'opción del compilador': 'gcc -I/usr/include/canario -L/opt/canario/lib',
    'tras una raya': 'está en—/home/canario/Projects/plan.md',
    'tras una flecha': 'copia→/home/canario/Projects/plan.md',
    'tras un \\n escrito': 'linea\\n/home/canario/Projects/plan.md',
    'con las barras escapadas': '\\/home\\/canario\\/Projects\\/plan.md',
    'tras un punto': 'mira./home/canario/Projects/plan.md',
  });
});

test('A12 · rutas con variables, de Windows sin unidad y relativas que suben hasta la raíz', () => {
  caen({ home: '$HOME/.config', perfil: '%USERPROFILE%\\Desktop', unidad: 'C:\\Users\\Canario\\plan.txt' });
  noPasa({
    '%AppData%': '%AppData%\\Sendell\\clave',
    '%userprofile% en minúsculas': '%userprofile%\\Desktop\\plan.txt',
    '%TEMP%': '%TEMP%\\sendell\\x.log',
    '$XDG_CONFIG_HOME': '$XDG_CONFIG_HOME/sendell/clave',
    '$PWD': '$PWD/secreto/plan.md',
    '$env: de PowerShell': '$env:USERPROFILE\\Documents\\plan.txt',
    'Windows sin unidad': '\\Users\\Canario\\Desktop\\plan.txt',
    'Windows que sube': '..\\..\\Users\\Canario\\Documents\\plan.txt',
    'relativa que sube a /home': '../../../home/canario/.ssh/config',
    'tilde con barra de Windows': '~\\Projects\\plan',
  });
});

// ── Rondas, interruptores ────────────────────────────────────────────────────────────────────────────
test('A13 · el número de ronda cae también pegado a un guion bajo o dentro de un nombre', () => {
  caen({ suelta: 'la r850 salió', guion: 'juegox-r850-final' });
  noPasa({
    'guion bajo antes': 'juegox_r850',
    'guion bajo después': 'r850_final.mp4',
    'mayúscula entre guiones bajos': 'QDT_R815_win64.zip',
    'pegada a una palabra': 'buildR850',
  });
});

test('A14 · el número de ronda escrito de otra forma', () => {
  noPasa({
    'con la palabra': 'ronda 850',
    'palabra pegada': 'ronda850',
    'con guion': 'r-850',
    'con espacio': 'R 815',
    'con punto': 'r.850',
    'con letra de arreglo': 'r850b',
  });
});

test('A15 · un interruptor interno cae aunque cambie de caja', () => {
  caen({ llano: 'juegox.combate.v2', corto: 'activa juegox.v2' });
  noPasa({
    'iniciales en mayúscula': 'Juegox.Combate.V2',
    'todo en mayúsculas': 'JUEGOX.COMBATE.V2',
    'un tramo en camelCase': 'juegox.combateNuevo.v2',
    'la V de versión en mayúscula': 'juegox.V2',
  });
});

// ── Correos, direcciones, dominios, menciones ────────────────────────────────────────────────────────
test('A16 · un correo disfrazado cae, también en el dominio de la marca', () => {
  caen({ ajeno: 'canario@falso.org', 'de la marca': 'canario@sendell.co' });
  noPasa({
    'espacios alrededor de la arroba': 'canario @ sendell.co',
    'espacio tras la arroba': 'canario@ sendell.co',
    '(at)': 'canario (at) sendell.co',
    '[at]': 'canario[at]sendell.co',
    'arroba escrita': 'canario arroba sendell.co',
    'arroba y punto escritos': 'canario arroba falso punto org',
    '(at) y (dot)': 'canario (at) falso (dot) org',
  });
});

test('A17 · una IP o una MAC ofuscada cae', () => {
  caen({ ip: '192.168.1.23', mac: 'a4:5e:60:c1:9b:7d' });
  noPasa({
    'puntos entre corchetes': '192[.]168[.]1[.]23',
    'puntos entre paréntesis': '192(.)168(.)1(.)23',
    'puntos con espacios': '192 . 168 . 1 . 23',
    'ceros a la izquierda': '192.168.001.023',
    'entre guiones bajos': 'captura_192.168.1.23_puerto.png',
    'pegada a una palabra': 'ip192.168.1.23',
    'con guiones': 'ip-192-168-1-23',
    'cada octeto en hexadecimal': '0xC0.0xA8.0x01.0x17',
    'MAC al estilo Cisco': 'a45e.60c1.9b7d',
  });
});

test('A18 · un dominio ajeno cae con otro dominio de primer nivel, con comodín o con una sola barra', () => {
  caen({ com: 'canario-falso.com', corto: 'malo.com', pruebas: 'canario.pages.dev', equipo: 'casita.local' });
  noPasa({
    '.de': 'canario-falso.de',
    '.social': 'bsky.social',
    '.ee': 'linktr.ee',
    '.be': 'youtu.be',
    '.me': 'canario.me',
    '.us': 'falso.us',
    'subdominio de pruebas en .sh': 'canario.surge.sh',
    'comodín': '*.malo.com',
    'punto delante': '.malo.com',
    'comodín de un dominio de pruebas': '*.canario.pages.dev',
    'esquema con una sola barra': 'https:/malo.com',
    'punto entre corchetes': 'malo[.]com',
    'equipo de casa en .home': 'casita.home',
    'equipo de casa en .localdomain': 'casita.localdomain',
  });
});

test('A19 · una mención ajena cae aunque empiece como una cuenta de la marca o vaya tras otro signo', () => {
  caen({ llana: 'gracias @canario_ajeno', pegada: '(@canario_ajeno)' });
  noPasa({
    'tras una barra': 'tiktok /@canario_ajeno',
    'doble arroba': '@@canario_ajeno',
    'cuenta de la marca + guion': '@SrSendell-falso',
    'cuenta de la marca + punto': '@SrSendell.falso',
    'cuenta de la marca + letra con tilde': '@SrSendellñ',
  });
});

test('A20 · lo que va dentro o pegado a una URL permitida también se revisa', () => {
  caen({ asignacion: 'NODE_ENV=production', interruptor: 'juegox.combate.v2', 'usuario y equipo': 'canario@casita' });
  noPasa({
    'asignación en la consulta': 'https://sendell.co/x?NODE_ENV=production',
    'interruptor en la ruta': 'https://sendell.co/juegox.combate.v2',
    'usuario y equipo tras una coma': 'sendell.co/x,canario@casita',
  });
});

// ── Asignaciones y secretos ──────────────────────────────────────────────────────────────────────────
test('A21 · nombres delatores y formas de asignar que faltan: camelCase, pass, cvv, otp, comillas escapadas, XML', () => {
  caen({ password: 'password: hunter2', api: 'apiKey: "abc def"', token: 'token: abc123def' });
  noPasa({
    'authToken': 'authToken: "hunter2"',
    'jwtSecret': 'jwtSecret: hunter2',
    'apiSecret': 'apiSecret: "abc def"',
    'webhookSecret': 'webhookSecret: hunter2',
    'pass': 'pass: hunter2',
    'cvv': 'cvv: 123',
    'otp': 'OTP: 482913',
    'JSON con las comillas escapadas': '{\\"password\\":\\"hunter2\\"}',
    'etiqueta XML': '<password>hunter2</password>',
  });
});

test('A22 · enmascarar tapa el valor con esos mismos nombres y formas, y con las opciones largas de usuario y frase de paso', () => {
  noSeVe({
    'DB_PASS=': ['DB_PASS=hunter2', 'hunter2'],
    'SMTP_PASS=': ['SMTP_PASS=hunter2 y sigue', 'hunter2'],
    'authToken:': ['authToken: "hunter2-falso"', 'hunter2-falso'],
    'jwtSecret:': ['jwtSecret: hunter2falso', 'hunter2falso'],
    'cvv:': ['cvv: 123', '123'],
    '--user usuario:contraseña': ['curl --user canario:contra-falsa-27 sitio', 'contra-falsa-27'],
    '--passphrase': ['gpg --passphrase hunter2falso -d x', 'hunter2falso'],
    'JSON con las comillas escapadas': ['{\\"password\\":\\"hunter2\\"}', 'hunter2'],
    'etiqueta XML': ['<password>hunter2</password>', 'hunter2'],
  });
});

test('A23 · la máscara puesta delante de un secreto no lo libra', () => {
  todas(() => noPasa({
    'asignación con dos puntos': `contraseña: ${MASCARA}Canario-2026!`,
    'opción de una orden': `curl --password ${MASCARA}hunter2`,
  }), () => noSeVe({
    'asignación con igual': [`password=${MASCARA}hunter2`, 'hunter2'],
    'asignación con dos puntos': [`contraseña: ${MASCARA}Canario-2026!`, 'Canario-2026!'],
    'opción de una orden': [`curl --password ${MASCARA}hunter2 sitio`, 'hunter2'],
    'contraseña en una URL': [u('https://canario:', MASCARA, 'contra-falsa-27', '@falso.org/x.git'), 'contra-falsa-27'],
  }));
});

test('A24 · enmascarar tapa el secreto entero, no solo su primer trozo', () => {
  assert.ok(!enmascarar('password=hunter2 y sigue').includes('hunter2'), 'control');
  noSeVe({
    'frase de paso de varias palabras': ['passphrase: correcto caballo bateria grapa', 'caballo bateria grapa'],
    'flecha de PHP o Ruby': ["'password' => 'hunter2'", 'hunter2'],
    'comilla escapada dentro del valor': ['"password": "ab\\"cdefgh"', 'cdefgh'],
    'segunda galleta de la cabecera': ['Cookie: a=1; sesion=Canario-2026-xyz', 'Canario-2026-xyz'],
    'contraseña de URL con arroba': [u('https://canario:', 'contra@falsa-27', '@falso.org/x.git'), 'falsa-27'],
    'contraseña de URL con barra': [u('postgres://canario:', 'contra/falsa-27', '@db-falsa:5432/x'), 'falsa-27'],
    'URL con contraseña y sin usuario': [u('https://:', 'hunter2falso', '@falso.org/x'), 'hunter2falso'],
  });
});

test('A25 · un secreto troceado con espacios, saltos o dos puntos cae y se tapa', () => {
  const casos = {
    'token en grupos de 4': trocear(GH, 4, ' '),
    'base64 en trozos de 19': trocear(B64, 19, ' '),
    'base64 en líneas de 16': trocear(B64, 16, '\n'),
    'hexadecimal por pares con espacios': trocear(HEX64, 2, ' '),
    'hexadecimal por pares con dos puntos': trocear(HEX64, 2, ':'),
    'hexadecimal en cuartetos': trocear(HEX64, 4, ' '),
  };
  caen({ token: GH, base64: B64, hexadecimal: HEX64 });
  todas(() => noPasa(casos), () => noSeVe(Object.fromEntries(Object.entries(casos).map(([etiqueta, c]) => [etiqueta, [c, c.slice(-11)]]))));
});

test('A26 · un token cortado sigue siendo un trozo de token', () => {
  const casos = {
    'ghp_ con 15 caracteres': u('ghp_', 'x7Kq2mZp9Lr4Tn8'),
    'sk-ant- con 9 caracteres': u('sk-', 'ant-', 'x7Kq2mZp9'),
    'bearer en minúsculas': u('bearer ', 'x7Kq2mZp9Lr4Tn8Wb3'),
  };
  todas(() => noPasa(casos), () => noSeVe(Object.fromEntries(Object.entries(casos).map(([etiqueta, c]) => [etiqueta, [c, c.slice(-9)]]))));
});

// ── Huellas ──────────────────────────────────────────────────────────────────────────────────────────
const PRIVADO = 'Mañana quiero que el dragón de cristal aparezca justo cuando el héroe abre la puerta azul del faro.';
function indiceDePrueba() {
  const indice = crearIndice({ sal: 'sal de ataque, fija' });
  indice.agregar(PRIVADO);
  indice.vetar('Zarabanda');
  return indice;
}

test('A27 · huellas: un carácter invisible dentro de una palabra o un posesivo no esconden la cita ni el nombre vetado', () => {
  const indice = indiceDePrueba();
  assert.ok(indice.solapa('que el dragón de cristal aparezca justo') && indice.solapa('vino Zarabanda'), 'control');
  const casos = {
    'ancho cero dentro de una palabra de la cita': 'que el dra\u200Bgón de cristal aparezca justo',
    'guion blando dentro de una palabra de la cita': 'que el dra\u00ADgón de cristal aparezca justo',
    'ancho cero dentro del nombre vetado': 'vino Zara\u200Bbanda',
    'posesivo inglés': "Zarabanda's game",
    'posesivo inglés con comilla curva': 'Zarabanda\u2019s game',
  };
  const colados = etiquetas(casos, cadena => !indice.solapa(cadena));
  assert.equal(colados.length, 0, queja('no solapan', colados, casos));
});

test('A28 · huellas: una cita partida entre dos elementos seguidos de una lista JSON se ve', () => {
  const indice = indiceDePrueba();
  const guion = ['Nota.', 'Como dijimos: el dragón de cristal', 'aparezca justo cuando toca.'];
  assert.equal(revisar(guion.join('\n'), { indice }).ok, false, 'control: unida sí solapa');
  assert.ok(revisarObjeto({ guion }, { indice }).some(f => f.reglas.includes('solapa-privado')));
});

test('A29 · huellas: la sal no se carga si tiene permisos abiertos', { skip: process.platform === 'win32' }, () => {
  const sal = archivo('huellas.sal', Buffer.alloc(32, 7));
  fs.chmodSync(sal, 0o644);
  assert.throws(() => salPrivada(sal), /permisos/);
});

// ── Objetos ──────────────────────────────────────────────────────────────────────────────────────────
test('A30 · revisarObjeto no da por vacío lo que JSON.stringify escribe con contenido', () => {
  const casos = {
    'cadena envuelta (new String)': { nota: new String('canario@falso.org') },
    'número envuelto (new Number)': { telefono: new Number(3001234567) },
    'toJSON heredado de una clase': { nota: new (class { toJSON() { return 'canario@falso.org'; } })() },
  };
  // Control: lo que de verdad se escribiría, una vez leído, falla.
  for (const objeto of Object.values(casos)) assert.ok(revisarObjeto(JSON.parse(JSON.stringify(objeto))).length > 0, 'control');
  const colados = etiquetas(casos, objeto => revisarObjeto(objeto).length === 0);
  assert.equal(colados.length, 0, queja('pasan en público', colados, casos));
});

// ── Tiempo ───────────────────────────────────────────────────────────────────────────────────────────
test('A31 · ningún patrón crece al cuadrado con el largo de la cadena', () => {
  const tarda = hacer => { const t0 = performance.now(); hacer(); return performance.now() - t0; };
  // Cada forma va con su pareja inofensiva del mismo largo; la mala no puede tardar diez veces más.
  const formas = {
    'nombre delator repetido con guiones': [() => revisar('key-'.repeat(8000)), () => revisar('kez-'.repeat(8000))],
    'opción con nombre delator repetido': [() => revisar(`-${'-key'.repeat(6000)}`), () => revisar(`-${'-kez'.repeat(6000)}`)],
    'URL con cola de signos de puntuación': [() => revisar(`http://a/${'!'.repeat(20000)}a`), () => revisar(`http://a/${'b'.repeat(20000)}a`)],
    'enmascarar con «token_» repetido': [() => enmascarar('token_'.repeat(6000)), () => enmascarar('tokem_'.repeat(6000))],
  };
  const lentas = etiquetas(formas, ([mala, pareja]) => tarda(mala) > 10 * Math.max(tarda(pareja), 5));
  assert.equal(lentas.length, 0, queja('crecen al cuadrado', lentas, formas));
});

// ── Falsos positivos de un guion real ────────────────────────────────────────────────────────────────
test('F01 · la arroba de uso técnico no es ni un equipo ni una cuenta', () => {
  pasaLimpia([
    'Grabamos a 1080p@60 y exportamos a 4K@30.',
    'El monitor va a 1440p@120Hz.',
    'Instalamos @types/node para las pruebas.',
  ]);
});

test('F02 · «la clave:», «el secreto:», «key:» en frases corrientes', () => {
  pasaLimpia([
    'Key: WASD para moverse.',
    'Tecla clave: SHIFT.',
    'La clave: Node.js y paciencia.',
    'El secreto: three.js.',
    'La clave: retroalimentación constante.',
    'El secreto: internacionalización.',
    "The key: don't panic.",
    'La clave: ¡constancia!',
    'La clave: (casi) todo.',
    'El token: GPT-4o gasta menos.',
    'La clave: 2026 será el año.',
  ]);
});

test('F03 · colores con transparencia, versiones de cuatro cifras, tamaños en bytes y nombres técnicos', () => {
  pasaLimpia([
    'El fondo es #0b0b0bff y el texto #ffffff80.',
    'Versión 1.0.0.1 del instalador.',
    'Firmas Ed25519 y cifrado AES-256.',
    'Son 3221225472 bytes (3 GiB).',
    'Codificamos con libx264-1080p60-yuv420p.',
  ]);
});
