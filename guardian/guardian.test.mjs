// Pruebas del guardián: una tabla de casos por regla (los que deben caer y los que no), el modo privado y el recorrido
// de un JSON. Todos los datos son inventados. Los que tienen forma de secreto se arman por trozos, para que el propio
// archivo no lleve escrita ninguna cadena con forma de llave.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { revisar, enmascarar, revisarObjeto, luhn, REGLAS, SECRETAS, MASCARA, PERMITIDOS, LARGO_MAX, HONDURA_MAX } from './guardian.mjs';
import { copia, raros } from './copia.mjs';
import { claseDeNombre } from './nombres.mjs';

const u = (...trozos) => trozos.join('');
const usuario = os.userInfo().username;
// Reglas de una cadena, sin la del nombre de usuario (que depende de la máquina donde corren las pruebas).
const reglas = (cadena, opciones) => revisar(cadena, opciones).reglas.filter(r => r !== 'usuario-sistema');

const HEX64 = u('9f86d081884c7d65', '9a2feaa0c55ad015', 'a3bf4f1b2b0b822c', 'd15d6c15b0f00a08');
const JWT = u('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJ', 'zdWIiOiJjYW5hcmlvIn0', '.', 'c2lnbmF0dXJhLWZhbHNh');
const PEM = u('-----BEGIN ', 'OPENSSH PRIVATE KEY-----\n', 'Y2FuYXJpby1mYWxzbw==\n', '-----END ', 'OPENSSH PRIVATE KEY-----');
const SK = u('sk-', 'ant-api03-', 'CANARIOcanarioCANARIO0123456789');
const AZAR = u('aB3xK9mQ2pL7', 'vR4tY8wZ1nC6');

// si: la regla tiene que saltar.  no: esa regla no puede saltar (aunque salte otra).
const TABLA = {
  'ruta-absoluta': {
    si: ['/home/canario/Projects/x/guardian.mjs', 'abre /etc/passwd ahora', 'está en /tmp', '(/var/log/syslog)', 'cwd:/srv/datos',
      '/Users/canario/Desktop', '/nucleo/rejilla.mjs', '~/Projects/explica', '~canario/notas', 'C:\\Users\\Canario\\Documents\\x.txt',
      'D:/Juegos/qdt', '\\\\servidor\\compartido\\x', '$HOME/.config', '${HOME}/x', '%USERPROFILE%\\Desktop'],
    no: ['docs/F2.md', 'nucleo/rejilla.mjs', './relativo/archivo.txt', '../arriba/x.md', 'y/o', '24/7', 'a 50 km/h', '5 €/mes', '30 %/año',
      '22/11/2026', 'HTTP/2', 'él/ella', 'La ruta /eventos del hábitat', 'un 50/50', 'ratio 16:9', 'a ~5 minutos', 'input/output',
      'https://sendell.co/noticias/hoy', 'un </b> suelto', 'página 3/12'],
  },
  correo: {
    si: ['escribe a canario.falso@ejemplo-falso.com hoy', 'josé.pérez+x@buzon.falso.co', 'A@b.io', '<canario@falso.org>', 'mailto:canario@falso.org'],
    no: ['una arroba @ suelta', '@SrSendell', 'canario@casita', 'el 50 % @ 60 fps'],
  },
  ipv4: {
    si: ['en 192.168.1.23 escucha', '10.0.0.1:8765', 'DNS 8.8.8.8', '127.0.0.1'],
    no: ['versión 2.4.1', 'v1.2.3.4', '1.250 visitas', '999.999.999.999', '1.2.3.4.5', '3.14', 'ffmpeg 7.1'],
  },
  ipv6: {
    si: ['fe80::1ff:fe23:4567:890a', 'la ::1 local', '2001:0db8:85a3:0000:0000:8a2e:0370:7334', '2001:db8::8a2e:370:7334'],
    no: ['10:30:45', '00:01:23.450', 'std::vector', 'Clase::metodo', 'ratio 16:9', 'a las 12:00', 'Capítulo 3: fin'],
  },
  mac: {
    si: ['aa:bb:cc:dd:ee:ff', '00-1A-2B-3C-4D-5E'],
    no: ['10:20:30', '12-34-56', 'ab:cd'],
  },
  'usuario-host': {
    si: ['ssh canario@casita', 'root@servidor:~', 'nota: 3@5'],
    no: ['@SrSendell', 'canario @ casita', 'canario.falso@ejemplo-falso.com'],
  },
  'url-ajena': {
    si: ['https://ejemplo-falso.com/x', 'http://malo.org', 'mira ejemplo-falso.com/x', 'ejemplo-falso.com', 'sendell.com', 'itch.io',
      'https://sendell.co.malo.com/', 'https://sendell.co@malo.com/', 'https://malo.com\\@sendell.co/', 'https://malo.com#@sendell.co',
      'http://malosendell.co', 'ftp://sendell.co/x', 't.me/canario', 'www.falso.zz', 'https://s\u0435ndell.co/', 'file:///x/y', '//malo.com/x'],
    no: ['sendell.co', 'https://sendell.co', 'https://sendell.co/noticias/2026-11-17-forja', 'noticias.sendell.co', 'Sendell.co.',
      'https://www.sendell.co/juegos?orden=nuevo', 'Node.js', 'three.js', 'docs/F2.md', 'guion.txt', 'rejilla.mjs', 'README.md',
      'package.json', 'archivo.tar.gz', 'node.js/lib', 'terminó. Es decir', 'v2.4.1', '//sendell.co/juegos', '// un comentario'],
  },
  'mencion-ajena': {
    si: ['gracias @canario_falso', '@SrSendell_oficial', '@sr.sendell', 'vía @otra_cuenta.'],
    no: ['@SrSendell', '@sendellgames', '@SRSENDELL', 'Síguenos en @SrSendell y @sendellgames.', 'precio @ 5', 'canario@falso.com'],
  },
  token: {
    si: [SK, u('sk-', 'proj-', 'CANARIO0123456789abcdef'), u('ghp_', 'CANARIO0123456789abcdefghijABCDEFGH'), u('gho_', 'CANARIO0123456789abcdefghij'),
      u('github_pat_', '11CANARIO0abcdefghij_ABCDEFGHIJ0123456789'), u('AKIA', 'CANARIO4CUATRO56'), u('ASIA', 'CANARIO4CUATRO56'),
      u('xoxb-', '123456789012-CANARIOabcdef'), u('xoxp-', '123456789012-CANARIOabcdef'), u('AIza', 'CANARIO0123456789abcdefghijABCDEFGH'),
      u('npm_', 'CANARIO0123456789abcdefghijABCDEFGH0'), u('glpat-', 'CANARIO0123456789abcd'), u('sk_', 'live_', 'CANARIO0123456789abcd'),
      u('pub_', 'prod_', 'CANARIO0123456789abcd'), u('prv_', 'test_', 'CANARIO0123456789abcd'), u('prod_', 'integrity_', 'CANARIO0123456789abcd'),
      u('123456789:', 'AACANARIO0123456789abcdefghijABCDEF'), u('Bearer ', 'CANARIO0123456789abcd')],
    no: ['sk-8', 'ask-me-anything-about-this-game', 'ghp_corto', 'la sigla AKIA', 'xoxo', 'un plan risk-free', 'el Bearer del acta'],
  },
  jwt: { si: [JWT, `cabecera ${JWT} fin`], no: ['eyJ', 'eyJhbGciOiJIUzI1NiJ9', 'ojo.con.puntos'] },
  pem: {
    si: [PEM, u('-----BEGIN ', 'RSA PRIVATE KEY-----\nMIIEcanario'), u('…cola\n-----END ', 'PRIVATE KEY-----')],
    no: ['----- separador -----', 'BEGIN y END', '-- nota --'],
  },
  asignacion: {
    si: ['password: canario-hunter2', 'PASSWORD=x', 'contraseña: la de siempre', 'pwd=abc', 'API_KEY=canario123', 'api-key: abc', 'apiKey: "abc def"',
      '"client_secret": "abc"', 'AWS_SECRET_ACCESS_KEY=abc', 'db_password = abc', 'clave=constancia', 'La clave: Canario2026!', 'token: abc123def',
      'pin: 4821', 'NODE_ENV=production', 'fps=60', '--token=abc', 'curl --password hunter2', 'usa --modo=publico', 'Authorization: Bearer abc',
      'https://sendell.co/?token=abc'],
    no: ['La clave: constancia y paciencia.', 'El secreto: dormir bien.', 'The key: persistence.', 'Tokens: 2048', 'author: Daniel', 'keyboard: es',
      'x = 3 y y = 4', '2+2=4 y E=mc2', 'a => b', 'si a == b', 'Precio: $ 12.500', 'Capítulo 3: el parry', 'monkey: banana',
      'https://www.sendell.co/juegos?orden=nuevo'],
  },
  'credencial-url': {
    si: ['https://canario:contra-falsa@ejemplo-falso.com/repo.git', 'postgres://u:p4ss@db:5432/x'],
    no: ['https://sendell.co/a:b', 'https://sendell.co:443/x', 'a las 10:30 @SrSendell'],
  },
  tarjeta: {
    si: ['4111 1111 1111 1111', '4111-1111-1111-1111', '4111111111111111', '5500005555555559', '3782-822463-10005', '6011000990139424'],
    no: ['4111 1111 1111 1112', '1234567890123456', '1763400000000', '20261117101500', '1000000000000000', 'pedido 4111-1111'],
  },
  'hex-largo': {
    si: [HEX64, HEX64.slice(0, 32), HEX64.slice(0, 40).toUpperCase(), '0x' + HEX64.slice(0, 40)],
    no: ['deadbeef', HEX64.slice(0, 16), 'electroencefalografista'],
  },
  'base64-largo': {
    si: [AZAR, 'Q2FuYXJpb051ZXZlLXNlY3JldG8tZmFsc28tMDk4NzY1NDMyMQ==', 'dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIHRlc3Rpbmc=', 'k3j9x0q2m5n8p1r7t4v6w2y0z3b5',
      'Zm9v_YmFy-QmF6_cXV4-MTIzNDU2Nzg5MA', `salida/${AZAR}/x.png`],
    no: ['electroencefalografista', 'sendell-hyperframes-marketing-2026-10-13', 'crearIndiceDeHuellasConSalPrivada', 'tasks/anthropic-residency-2026-11-03/v2',
      'frontend/src/app/components/UserProfileSettingsDialogContainer.tsx', 'internationalization-and-localization', 'getHTTPResponseCodeFromServer',
      'home/canario/Projects/sendell-en-directo/guardian/guardian', 'forja-ya-camina-sola-en-la-web-de-sendell'],
  },
  uuid: {
    si: ['0f3a9c21-7b4e-4d2a-9c11-5e6f7a8b9c0d', 'sesión 56DC7C54-D2BF-4377-BC06-D5EDAB9BFB3C.'],
    no: ['2026-11-17', '56dc7c54-d2bf-4377', '1234-5678-9012'],
  },
  telefono: {
    si: ['+57 300 123 4567', '+573001234567', '+1 (555) 123-4567', '+34 612 345 678', 'llama al 300 123 4567', '300-123-4567', '3001234567',
      '(555) 123-4567', '612 34 56 78'],
    no: ['1 000 000 de celdas', '250 000 cuadros', '2026-11-17', 'son 300 123 personas', '1920x1080', 'a las 12:30', '3.400 visitas', '$ 12.500',
      '2024-2025', '+3 puntos', '2+2=4', '1,234,567', '15 000 000', '1763400000000', 'pedido 12345'],
  },
  'llave-ssh': {
    si: ['id_rsa', 'usa id_ed25519.pub', '.ssh/id_ecdsa', 'con -i canario-equipo-ed25519', 'servidor.pem', 'llave.ppk', 'authorized_keys',
      'known_hosts', 'mi_rsa', u('ssh-ed25519 ', 'AAAAC3NzaC1lZDI1NTE5AAAAIcanariocanariocanario')],
    no: ['la llave del éxito', 'RSA de 4096 bits', 'teclado.txt', 'monkey', 'keynote', 'identidad'],
  },
  'hash-commit': {
    si: ['commit 4f2a9c1', 'build 4f2a9c1b7d3e', 'v1.2.3-4f2a9c1', '(a1b2c3d)', '0x4f2a9c1b'],
    no: ['1234567', 'deadbeef', 'abc123', '#1c1c1c', 'década', 'año 2026', 'F2', '1920x1080', 'un café', 'H.264', '1763400000000'],
  },
  ronda: {
    si: ['r850', 'la R815 salió', '(r1024)', 'ronda 850', 'Ronda n.º 850', 'r850b', 'juegox_r850', 'buildR850', 'r-850'],
    no: ['r85', 'R2D2', 'ronda 85', 'r85012', 'gr850', 'Rondas ganadas: 12', 'RTX 4090', 'la ronda de las 1000 pruebas'],
  },
  'dominio-pruebas': {
    si: ['canario.pages.dev', 'https://abc.canario.pages.dev/x', 'abc1234.canario.pages.dev', 'x.workers.dev', 'mi-app.vercel.app', 'localhost',
      'http://localhost:8765/', 'casita.local', 'nas.lan'],
    no: ['pages', 'el plan local', 'config.local.json', 'sendell.co', 'localhostal', 'un .dev suelto'],
  },
  'alfabeto-mezclado': {
    si: ['s\u0435ndell', 'c\u0430nario', 'Sendell\u03BF'],
    no: ['\u041F\u0440\u0438\u0432\u0435\u0442', 'mide 5 \u03BCm', '\u0394t', 'sendell'],
  },
  interruptor: {
    si: ['juegox.combate.v2', 'juegox.algo.v2', 'activa juegox.v2', 'app.feature.nuevo-menu', 'Juegox.Combate.V2', 'juegox.V2'],
    no: ['guardian.test.mjs', 'archivo.tar.gz', 'v2.4.1', 'a las 9 a.m.', 'p. ej.', 'Q.D.T.', 'Node.js', 'sendell.co', 'noticias.sendell.co',
      'logo.final.png', 'docs/F2.md', 'final.v2.png'],
  },
};

// Frases corrientes, en español y en inglés, con cifras, horas, porcentajes, versiones y archivos relativos: pasan enteras.
const LIMPIAS = [
  'Hoy trabajamos 3 horas y 45 minutos; el 85 % de las pruebas pasa.',
  'La reunión es a las 10:30 y termina a las 12:00.',
  'Subimos de 1.250 a 3.400 visitas, un 172 % más.',
  'Version 2.4.1 fixes 12 bugs and adds 3 features.',
  'The build took 4 minutes 30 seconds at 60 fps.',
  'See docs/F2.md and nucleo/rejilla.mjs for details.',
  'El video dura 1:30 y pesa 24,5 MB a 1920x1080.',
  'Precio: $ 12.500 COP (unos 3 USD).',
  'Faltan 7 días para el 22/11/2026.',
  'Sendell usó 15 herramientas: leer (8), editar (4) y consola (3).',
  'Un 50/50 entre arte y código, y/o ambas cosas.',
  'El avatar mide 17 × 18 celdas.',
  'Forja F0–F1 está lista; seguimos con F2.',
  "It's 100% offline: no cloud, no accounts.",
  'Capítulo 3: el parry de Y.',
  'Rondas ganadas: 12 de 15.',
  'Node 26 y ffmpeg 7.1 bastan.',
  'La clave: constancia y paciencia.',
  'El secreto: dormir bien.',
  'The key: persistence.',
  'Ratio 16:9, audio a 48 kHz, 320 kbps.',
  'Tenemos 1 000 000 de celdas y 250 000 cuadros.',
  'Guardamos en salida/video-final.mp4 y hojas/hoja-avatar.svg.',
  'Ver pruebas/guardian.test.mjs y guardian/guardian.test.mjs',
  'Tiempo: 00:01:23.450',
  'Fecha 2026-11-17T10:15:00Z',
  'Temperatura 23.5 °C, CPU al 87 %, RAM 6,9 GB de 8 GB.',
  'Página 3/12, paso 2/5, a 50 km/h.',
  'We shipped v0.3.0 on Nov 17, 2026 at 6:00 PM.',
  'About 1,234,567 cells per second; 99.9% uptime.',
  'ISO 8601, RFC 2119 and HTTP/2.',
  'Son 300 123 personas en 2024-2025.',
  'x = 3 y y = 4, así que x + y = 7.',
  'Abrimos a las 9 a.m. y cerramos a las 6 p.m. en EE. UU.',
  'Visita sendell.co o https://sendell.co/noticias/2026-11-17-forja-ya-camina-sola.',
  'Más en https://www.sendell.co/juegos?orden=nuevo y en noticias.sendell.co.',
  'Síguenos en @SrSendell y @sendellgames.',
  'Usamos Node.js, three.js y HMAC-SHA256 con base64.',
  'Costó 5 €/mes y rinde 30 %/año.',
  'Corre con node --test y listo.',
  'El 3er episodio dura 12 min; el 4.º, 15.',
  '2+2=4 y E=mc2.',
  'Sendell Games presenta Q.D.T.: Lifetime Returns',
  'electroencefalografista y otorrinolaringólogo son palabras largas',
  'Ganamos 3 a 1; quedan 1.000.000 de pasos.',
  'Código de color #1c1c1c sobre #090909.',
  'Un commit, dos commits, 7 archivos y +120/−45 líneas.',
  'H.264 a 1080p60, AAC 48 kHz; 4K después.',
  'La ruta /eventos responde en vivo.',
  'El 100 % de 2 500 000 000 bytes.',
  'Pedido 12345, factura 2026-0042.',
  'The quick brown fox jumps over 13 lazy dogs in 0.5 s.',
  'Chapter 2 starts at 00:45 and runs 3 min 20 s (about 12% of the video).',
  'Fixed in 1.10.3; see CHANGELOG.md and src/index.js, lines 40-52.',
  '¿Cuánto falta? Un 12,5 % — unas 2 h 30 min.',
  'leer · buscar · editar · escribir · consola · web · delegar',
  '',
];

test('cada regla salta con lo suyo', () => {
  for (const [regla, { si }] of Object.entries(TABLA)) {
    for (const caso of si) assert.ok(revisar(caso).reglas.includes(regla), `«${regla}» no saltó con su caso ${si.indexOf(caso)}`);
  }
});

test('cada regla calla con lo que se le parece', () => {
  for (const [regla, { no }] of Object.entries(TABLA)) {
    for (const caso of no) assert.ok(!revisar(caso).reglas.includes(regla), `«${regla}» saltó sin motivo con: ${caso}`);
  }
});

test('las frases corrientes pasan enteras', () => {
  for (const frase of LIMPIAS) assert.deepEqual(reglas(frase), [], `falso positivo en: ${frase}`);
});

test('la tabla cubre todas las reglas de los detectores', () => {
  const sinTabla = ['caracter-oculto', 'codificacion', 'usuario-sistema', 'solapa-privado', 'no-es-cadena', 'demasiado-larga', 'tipo-raro', 'muy-profundo', 'ciclo', 'json-roto'];
  assert.deepEqual(REGLAS.filter(r => !TABLA[r] && !sinTabla.includes(r)), []);
  for (const regla of Object.keys(TABLA)) assert.ok(REGLAS.includes(regla), regla);
});

test('el nombre de usuario del sistema se lee de la máquina y no pasa', () => {
  for (const caso of [`hola ${usuario}`, `de ${usuario.toUpperCase()}.`, `carpeta/${usuario}/notas.md`, `(${usuario})`]) {
    assert.ok(revisar(caso).reglas.includes('usuario-sistema'));
  }
  assert.deepEqual(revisar(`hola ${usuario}`).posiciones, [{ regla: 'usuario-sistema', pos: 5 }]);
  assert.ok(!revisar('hola mundo, 3 pruebas').reglas.includes('usuario-sistema'));
  // Nombres de más, dados por quien llama.
  assert.deepEqual(revisar('lo hizo canarioextra ayer', { usuarios: ['canarioextra'] }).reglas.filter(r => r === 'usuario-sistema'), ['usuario-sistema']);
});

test('el resultado solo lleva nombres de regla y posiciones', () => {
  const todos = Object.values(TABLA).flatMap(t => [...t.si, ...t.no]).concat(LIMPIAS, `hola ${usuario}`);
  for (const caso of todos) {
    const r = revisar(caso);
    assert.deepEqual(Object.keys(r), ['ok', 'reglas', 'posiciones']);
    assert.equal(r.ok, r.reglas.length === 0);
    for (const regla of r.reglas) assert.ok(REGLAS.includes(regla));
    for (const p of r.posiciones) {
      assert.deepEqual(Object.keys(p), ['regla', 'pos']);
      assert.ok(REGLAS.includes(p.regla) && Number.isInteger(p.pos) && p.pos >= 0 && p.pos < caso.length);
    }
  }
});

test('las posiciones dicen dónde empieza cada hallazgo', () => {
  const r = revisar('Escribe a canario@falso.org o entra en 10.0.0.1 hoy.');
  assert.deepEqual(r, { ok: false, reglas: ['correo', 'ipv4'], posiciones: [{ regla: 'correo', pos: 10 }, { regla: 'ipv4', pos: 39 }] });
  assert.deepEqual(revisar('todo en orden'), { ok: true, reglas: [], posiciones: [] });
});

test('es determinista', () => {
  const caso = `De ${SK} a canario@falso.org por /home/canario/x, ronda r850, commit 4f2a9c1.`;
  assert.deepEqual(revisar(caso), revisar(caso));
  assert.equal(enmascarar(caso), enmascarar(caso));
});

test('los permitidos se pueden cambiar, y solo cambian lo suyo', () => {
  assert.deepEqual(reglas('itch.io y @otra_marca'), ['url-ajena', 'mencion-ajena']);
  assert.deepEqual(reglas('itch.io y @otra_marca', { permitidos: { dominios: ['sendell.co', 'itch.io'], cuentas: ['@otra_marca'] } }), []);
  assert.deepEqual(reglas('https://juegos.itch.io/qdt', { permitidos: { dominios: ['itch.io'] } }), []);
  assert.deepEqual(reglas('sendell.co', { permitidos: { dominios: ['itch.io'] } }), ['url-ajena']);
  assert.deepEqual(reglas('@SrSendell', { permitidos: { dominios: ['itch.io'] } }), []);          // las cuentas siguen siendo las de la marca
  assert.deepEqual(reglas('https://noitch.io', { permitidos: { dominios: ['itch.io'] } }), ['url-ajena']);
  assert.deepEqual(PERMITIDOS, { dominios: ['sendell.co'], cuentas: ['SrSendell', 'sendellgames'] });
});

test('lo que no se puede examinar falla entero', () => {
  for (const cosa of [null, undefined, 42, {}, ['a']]) assert.deepEqual(revisar(cosa), { ok: false, reglas: ['no-es-cadena'], posiciones: [{ regla: 'no-es-cadena', pos: null }] });
  assert.deepEqual(revisar('a'.repeat(LARGO_MAX + 1)).reglas, ['demasiado-larga']);
  assert.equal(enmascarar('a'.repeat(LARGO_MAX + 1)), MASCARA);
  assert.throws(() => revisar('x', { modo: 'abierto' }), /modo desconocido/);
});

test('suma de Luhn', () => {
  assert.ok(luhn('4111111111111111') && luhn('378282246310005'));
  assert.ok(!luhn('4111111111111112'));
});

// ── Lo que no se ve y lo mal leído ───────────────────────────────────────────────────────────────────
test('un carácter oculto o un signo de mala codificación hacen fallar en público, y solo se dice el primero', () => {
  const casos = [
    ['hola​ mundo​', [{ regla: 'caracter-oculto', pos: 4 }]],
    ['hola­ mundo', [{ regla: 'caracter-oculto', pos: 4 }]],
    ['﻿hola', [{ regla: 'caracter-oculto', pos: 0 }]],
    ['hola️', [{ regla: 'caracter-oculto', pos: 4 }]],
    ['ho\0la\0', [{ regla: 'codificacion', pos: 2 }]],
    ['ho�la', [{ regla: 'codificacion', pos: 2 }]],
    ['ho\x1Bla', [{ regla: 'codificacion', pos: 2 }]],
    ['ho\uD83Dla', [{ regla: 'codificacion', pos: 2 }]],
  ];
  for (const [cadena, posiciones] of casos) assert.deepEqual(revisar(cadena).posiciones, posiciones);
  for (const limpia of ['hola\tmundo\r\nfin', 'emoji \u{1F600} entero', 'café “con comillas” — y raya…']) assert.deepEqual(raros(limpia), []);
  // En privado no son secretos: no se señalan, y la cadena sale como entró.
  assert.ok(revisar('hola​ mundo\0', { modo: 'privado' }).ok);
  assert.equal(enmascarar('hola​ mundo'), 'hola​ mundo');
});

test('la copia de trabajo normaliza y recuerda de dónde salió cada carácter', () => {
  assert.equal(copia('todo llano, con eñe y «comillas»').texto, 'todo llano, con eñe y «comillas»');
  const c = copia('a​b ｃ d—eﬁn');   // ancho cero, c ancha, espacio duro, raya, ligadura «fi»
  assert.equal(c.texto, 'ab c d-efin');
  assert.deepEqual([...c.texto].map((_, i) => c.origen(i)), [0, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10]);
  assert.equal(c.origen(c.texto.length), 11);
  assert.deepEqual([c.fin(1), c.fin(2), c.fin(9), c.fin(10), c.fin(11)], [2, 3, 10, 10, 11]);
  // Una tilde combinada se junta con su letra; plegada, desaparece.
  assert.equal(copia('cañon ①').texto, 'cañon 1');
  assert.equal(copia('cañón', true).texto, 'canon');
  assert.equal(copia('​​').texto, '');
});

test('las posiciones se dan sobre la cadena original, aunque la copia cambie de largo', () => {
  const cadena = 'aﬁ canario@falso.org ｘ 10.0.0.1 fin';
  assert.deepEqual(revisar(cadena).posiciones, [{ regla: 'correo', pos: 3 }, { regla: 'ipv4', pos: 23 }]);
  assert.equal(enmascarar('ｘ​ password=hun​ter2 fin'), `ｘ​ password=${MASCARA} fin`);
});

// ── Nombres delatores ────────────────────────────────────────────────────────────────────────────────
test('los nombres delatores se clasifican en seguros y dudosos', () => {
  const seguros = ['password', 'DB_PASSWORD', 'dbpassword', 'contraseña', 'api_key', 'apiKey', 'client-secret', 'Authorization', '--password', 'SMTP_PASS',
    'cvv', 'OTP', 'jwtSecret', 'userPassword', 'mi-token', 'set-cookie'];
  const dudosos = ['token', 'Clave', 'key', 'pin', 'pass', 'cookie', 'secreto', 'authToken', 'publicKey'];
  const ninguno = ['tokens', 'keyboard', 'monkey', 'author', 'compass', 'laptop', 'nota', 'tipo', '', 'Keynote', 'x'.repeat(81) + '_password'];
  for (const n of seguros) assert.equal(claseDeNombre(n), 'segura', n);
  for (const n of dudosos) assert.equal(claseDeNombre(n), 'dudosa', n);
  for (const n of ninguno) assert.equal(claseDeNombre(n), null, n);
});

test('un nombre dudoso con dos puntos calla ante una frase y salta ante lo que no se lee', () => {
  const pasan = ['Key: WASD para moverse.', 'La clave: ¡constancia!', 'El token: GPT-4o gasta menos.', 'Pass: aprobado.', 'primaryKey: id', '<key>Enter</key>',
    'clave: «constancia».', 'key => value', 'El secreto: three.js.'];
  const caen = ['token: abc123 para pruebas', 'La clave: Canario2026! ya está', 'pin: 4821', 'clave=constancia', 'pass: hunter2', 'authToken: "hunter2"',
    '<token>abc123def</token>', "'clave' => 'abc 123'", 'token := abc123def'];
  for (const frase of pasan) assert.deepEqual(reglas(frase), [], frase);
  for (const frase of caen) assert.deepEqual(reglas(frase), ['asignacion'], frase);
});

test('lo ya tapado no se vuelve a tapar, y la máscara pegada delante no libra a nadie', () => {
  for (const tapada of [`password: ${MASCARA} y sigue`, `"clave": "${MASCARA}",`, `curl --password ${MASCARA} sitio`, `https://canario:${MASCARA}@sendell.co/x`]) {
    assert.equal(enmascarar(tapada), tapada);
    assert.ok(!revisar(tapada).reglas.includes('asignacion') && !revisar(tapada).reglas.includes('credencial-url'));
  }
  assert.equal(enmascarar(`password=${MASCARA}hunter2`), `password=${MASCARA}`);
});

// ── Lo que se parece y no es ─────────────────────────────────────────────────────────────────────────
test('los disfraces nuevos no arrastran a lo corriente', () => {
  const corrientes = [
    'Vivimos en EE.UU. y, p.ej., en Colombia.', 'Son 1.000.000.000 de celdas.', 'Importa ./lib/util.mjs y ../../lib/otro.mjs.', 'Play it at sendell.co today.',
    'https://sendell.co/juegos/ca%C3%B1on%20azul', 'El 50% de los 30% restantes.', 'Formatos: 60fps 48kHz 24bit 16bit y listo.', 'HTML CSS HTTP JSON XML SVG PNG',
    'yo no sé si él se lo da a tu tío', 'Sendell — el avatar — saluda…', 'El 4.º capítulo; n.º 12.', 'docker run -u 1000:1000 imagen', 'git push -u origin main',
    '10 20 30 40 50 60 70 80 90 10 20 30 40 50 60 70 80', '2020 2021 2022 2023 2024 2025 2026 2027', 'cafe dead beef face cada fea daba', 'La ronda final empieza.',
    'ASIAPACIFIC y la sigla AKIA', 'el bearer internacionalizacion', 'Versión 5.4.1.0 del motor', 'café “entre comillas” y ‘simples’', 'Capítulo 2: Zona R',
    'https://sendell.co/@SrSendell', 'https://sendell.co/noticias/hoy?orden=nuevo&pagina=2', 'Un </data> suelto y <lib> también.',
  ];
  for (const frase of corrientes) {
    assert.deepEqual(reglas(frase), [], `falso positivo en: ${frase}`);
    assert.equal(enmascarar(frase), frase);
  }
});

test('de una URL permitida solo se aparta el sitio: lo que lleva dentro se sigue mirando', () => {
  assert.deepEqual(reglas('https://sendell.co/x?NODE_ENV=production'), ['asignacion']);
  assert.deepEqual(reglas('https://sendell.co/x?orden=nuevo&clave=abc123'), ['asignacion']);
  assert.deepEqual(reglas('https://sendell.co/de/canario@falso.org'), ['correo']);
  assert.deepEqual(reglas('https://sendell.co/@canario_ajeno'), ['mencion-ajena']);
  assert.deepEqual(reglas('https://sendell.co/media/video.mp4'), []);          // la ruta de una URL no es una ruta del disco
});

// ── Modo privado ─────────────────────────────────────────────────────────────────────────────────────
test('enmascarar deja pasar una ruta y tapa un token', () => {
  const ruta = '/home/canario/Projects/sendell-en-directo/guardian/guardian.mjs';
  assert.equal(enmascarar(ruta), ruta);
  assert.equal(enmascarar(`lee ${ruta} con ${SK} puesto`), `lee ${ruta} con ${MASCARA} puesto`);
});

test('enmascarar tapa cada clase de secreto y nada más', () => {
  const casos = [
    [`llave ${SK}.`, `llave ${MASCARA}.`],
    [`${u('ghp_', 'CANARIO0123456789abcdefghijABCDEFGH')}`, MASCARA],
    [`aws ${u('AKIA', 'CANARIO4CUATRO56')} fin`, `aws ${MASCARA} fin`],
    [`jwt ${JWT} fin`, `jwt ${MASCARA} fin`],
    [`antes\n${PEM}\ndespués`, `antes\n${MASCARA}\ndespués`],
    ['password=hunter2 y sigue', `password=${MASCARA} y sigue`],
    ['contraseña: Canario-2026! listo', `contraseña: ${MASCARA}`],            // con dos puntos y sin comillas, hasta el fin de la línea
    ['passphrase: correcto caballo bateria grapa\nsigue', `passphrase: ${MASCARA}\nsigue`],
    ['"client_secret": "abc def", "x": 1', `"client_secret": ${MASCARA}, "x": 1`],
    ['curl --password hunter2 sitio', `curl --password ${MASCARA} sitio`],
    [`Authorization: ${u('Bearer ', 'CANARIO0123456789abcd')}`, `Authorization: ${MASCARA}`],
    ['git clone https://canario:contra-falsa@ejemplo-falso.com/r.git', `git clone https://canario:${MASCARA}@ejemplo-falso.com/r.git`],
    ['tarjeta 4111 1111 1111 1111 vence', `tarjeta ${MASCARA} vence`],
    [`suma ${HEX64}`, `suma ${MASCARA}`],
    [`valor ${AZAR} fin`, `valor ${MASCARA} fin`],
    [`token=${u('56dc7c54-d2bf-', '4377-bc06-d5edab9bfb3c')}`, `token=${MASCARA}`],
  ];
  for (const [entra, sale] of casos) assert.equal(enmascarar(entra), sale);
});

test('enmascarar no toca lo que solo es privado: rutas, nombres, correos, direcciones', () => {
  const intactas = [
    '/home/canario/Projects/x/notas.md', 'C:\\Users\\Canario\\x.txt', '~/Projects/explica', 'canario@falso.org', '192.168.1.23', '+57 300 123 4567',
    'ssh canario@casita', 'https://ejemplo-falso.com/x', '@canario_falso', 'ronda r850, commit 4f2a9c1', 'juegox.combate.v2', 'NODE_ENV=production',
    '/tmp/claude-1000/-home-canario/0f3a9c21-7b4e-4d2a-9c11-5e6f7a8b9c0d/scratchpad/x.mjs', 'id_ed25519.pub', 'La clave: constancia.',
    'frontend/src/app/components/UserProfileSettingsDialogContainer.tsx', `hola ${usuario}`, 'Leer 3 archivos y editar 2 (85 %).', '',
  ];
  for (const cadena of intactas) assert.equal(enmascarar(cadena), cadena);
  assert.equal(enmascarar(null), '');
  assert.equal(enmascarar(42), '42');
});

test('enmascarar tapa solo la parte al azar de una ruta', () => {
  assert.equal(enmascarar(`/home/canario/salida/${AZAR}/video.mp4`), `/home/canario/salida/${MASCARA}/video.mp4`);
});

test('enmascarar dos veces da lo mismo', () => {
  for (const caso of [`a ${SK} b`, 'password=hunter2', `x ${PEM} y`, 'token: abc123def', 'sin secretos']) {
    assert.equal(enmascarar(enmascarar(caso)), enmascarar(caso));
  }
});

test('revisar en modo privado solo señala secretos', () => {
  const caso = `De ${SK} a canario@falso.org por /home/canario/x con password=hunter2 en 10.0.0.1`;
  assert.deepEqual(revisar(caso, { modo: 'privado' }).reglas, ['token', 'asignacion']);
  for (const regla of revisar(caso, { modo: 'privado' }).reglas) assert.ok(SECRETAS.includes(regla));
  assert.ok(revisar('/home/canario/x y canario@falso.org', { modo: 'privado' }).ok);
});

// ── JSON ─────────────────────────────────────────────────────────────────────────────────────────────
test('revisarObjeto recorre claves y valores y dice dónde falla cada cadena', () => {
  const objeto = {
    titulo: 'Sendell en directo',
    sesiones: [{ nombre: 'Vela', nota: 'todo bien' }, { nombre: 'Astra', nota: 'escribe a canario@falso.org' }],
    'canario@falso.org': 1,
    'clave rara': { dentro: '10.0.0.1' },
    numeros: [3, 3001234567, 1763400000000, true, null],
  };
  assert.deepEqual(revisarObjeto(objeto), [
    { ruta: '$.sesiones[1].nota', en: 'valor', reglas: ['correo'], posiciones: [{ regla: 'correo', pos: 10 }] },
    { ruta: '$.‹clave 2›', en: 'clave', reglas: ['correo'], posiciones: [{ regla: 'correo', pos: 0 }] },
    { ruta: '$.‹clave 3›.dentro', en: 'valor', reglas: ['ipv4'], posiciones: [{ regla: 'ipv4', pos: 0 }] },
    { ruta: '$.numeros[1]', en: 'valor', reglas: ['telefono'], posiciones: [{ regla: 'telefono', pos: 0 }] },
  ]);
});

test('revisarObjeto: lo limpio da una lista vacía y la ruta nunca repite una clave que falla', () => {
  assert.deepEqual(revisarObjeto({ v: 1, tipo: 'editar', agente: 'principal', ts: 1763400000000, mas: 12, menos: 3, ok: true }), []);
  assert.deepEqual(revisarObjeto('una cadena sola'), []);
  assert.deepEqual(revisarObjeto(['a', ['b', { c: 'd' }]]), []);
  const fallos = revisarObjeto({ [usuario]: { dentro: 'r850' } });
  assert.deepEqual(fallos.map(f => f.ruta), ['$.‹clave 0›', '$.‹clave 0›.dentro']);
  assert.ok(!JSON.stringify(fallos).includes(usuario));
});

test('revisarObjeto: las opciones llegan a cada cadena', () => {
  const objeto = { ruta: '/home/canario/x', llave: `a ${SK}`, sitio: 'itch.io' };
  assert.deepEqual(revisarObjeto(objeto, { modo: 'privado' }).map(f => f.ruta), ['$.llave']);
  assert.deepEqual(revisarObjeto(objeto, { permitidos: { dominios: ['itch.io'] } }).map(f => f.ruta), ['$.ruta', '$.llave']);
});

test('revisarObjeto: ciclos, honduras y tipos raros fallan sin colgarse', () => {
  const ciclo = { a: {} };
  ciclo.a.b = ciclo;
  assert.deepEqual(revisarObjeto(ciclo).map(f => f.reglas), [['ciclo']]);
  let hondo = 'fin';
  for (let i = 0; i < HONDURA_MAX + 5; i++) hondo = [hondo];
  assert.deepEqual(revisarObjeto(hondo).map(f => f.reglas), [['muy-profundo']]);
  assert.deepEqual(revisarObjeto({ f: () => 1 }).map(f => f.reglas), [['tipo-raro']]);
  const compartido = { x: 'bien' };
  assert.deepEqual(revisarObjeto([compartido, compartido]), []);   // repetido no es ciclo
});

test('revisarObjeto: el nombre en la clave (o en el elemento anterior) y el secreto en el valor', () => {
  const objeto = {
    password: 'hunter2', pin: 4821, key: 'value', token: 'leer', nota: 'todo bien',
    argv: ['curl', '--password', 'hunter2', '--token', '--verbose', 'clave', 'secreto'],
    cabeceras: [['Authorization', 'Basic aHVudGVyMg'], ['Accept', 'texto']],
    credenciales: { usuario: 'canario', puerto: 22, activo: true },
  };
  assert.deepEqual(revisarObjeto(objeto).map(f => [f.ruta, f.reglas]), [
    ['$.password', ['asignacion']], ['$.pin', ['asignacion']], ['$.argv[2]', ['asignacion']], ['$.cabeceras[0][1]', ['asignacion']],
    ['$.credenciales.usuario', ['asignacion']], ['$.credenciales.puerto', ['asignacion']],
  ]);
  // Es un secreto: también falla en modo privado. Lo ya tapado, no.
  assert.deepEqual(revisarObjeto({ password: 'hunter2' }, { modo: 'privado' }).map(f => f.ruta), ['$.password']);
  assert.deepEqual(revisarObjeto({ password: MASCARA, clave: '' }), []);
  // Un solo fallo por valor, aunque el propio valor ya delate.
  assert.deepEqual(revisarObjeto({ token: 'x canario@falso.org' }), [{ ruta: '$.token', en: 'valor', reglas: ['asignacion', 'correo'], posiciones: [{ regla: 'asignacion', pos: 0 }, { regla: 'correo', pos: 2 }] }]);
});

test('revisarObjeto: solo recorre listas y objetos llanos', () => {
  class Nota { toJSON() { return 'canario@falso.org'; } }
  for (const raro of [new String('x'), new Number(3), new Date(0), new Map(), new Nota()]) {
    assert.deepEqual(revisarObjeto({ a: raro }).map(f => [f.ruta, f.reglas]), [['$.a', ['tipo-raro']]]);
  }
  assert.deepEqual(revisarObjeto(Object.assign(Object.create(null), { a: 'bien' })), []);
});

// ── Rendimiento ──────────────────────────────────────────────────────────────────────────────────────
test('una cadena larga y retorcida no cuelga los patrones', () => {
  const n = 60_000;
  const formas = ['a', 'a.', 'a-', 'a_', 'a/', '1 ', '1', '+1', 'a@', '@', ':', 'a:', '/', ' /a', '~/', '\\', 'eyJ', 'sk-', '-', '=', 'a=', 'key:',
    'key-', '-key', 'token_', 'http://a/!!!!', 'ab ', 'ab:', 'abcd ', 'aB3x ', '<a>', '<key>', '--key ', '../', '%a', '$a', 'a (at) ', ' arroba ', 'a[.]',
    '\u0430b', 'a\u0301', '\uFF41', '\u200B', 'x\u00A0', 'r850_', '57 ', '0x1.',
    'password ', 'www.', 'http://', 'abc1234 ', 'AbCdEf0', 'A1b2c3/', 'ffff:', 'id_rsa.', '.pem', '9.', '-----BEGIN A-----', '+111 111 111 1111 '];
  const t0 = performance.now();
  for (const forma of formas) {
    const cadena = forma.repeat(Math.ceil(n / forma.length));
    revisar(cadena);
    enmascarar(cadena);
  }
  const ms = performance.now() - t0;
  assert.ok(ms < 15_000, `tardó ${ms.toFixed(0)} ms`);
});
