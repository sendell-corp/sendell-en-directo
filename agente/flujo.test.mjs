// node --test agente/flujo.test.mjs
// Prueba la lógica pura del flujo, los textos y que el núcleo de dibujo responde a todo lo que la página le pide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as F from './flujo.mjs';
import { TEXTOS, IDIOMAS, COLORES, FORMAS_ROTULOS } from './textos.mjs';
import { enviar } from './enviar.mjs';
import { avatar, POSES, ANIMOS } from '../nucleo/avatar.mjs';
import { nombresDeFormas } from '../nucleo/formas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

function completos() {
  const d = F.datosIniciales();
  d.negocio = { nombre: '  Panadería La Esquina ', dedica: 'Pan y tortas por encargo' };
  d.problema = 'Me escriben de noche y no alcanzo a responder a tiempo.';
  d.canales = { publico: 'clientes', lista: ['web', 'whatsapp'], otro: 'algo que no se pidió' };
  d.saber = { fuentes: ['hojas', 'documentos'], nota: '' };
  d.hogar = { opcion: 'preparado', encendido: 'si' };
  d.apariencia = { forma: 'sendell', color: 'menta' };
  d.nombre = 'Faro';
  d.contacto = { nombre: 'Ana', medio: ' Ana@Correo.com ', consentimiento: true };
  return d;
}
const almacenFalso = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };

// ── Pasos ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('el flujo tiene entre 7 y 9 pasos y navega en orden', () => {
  assert.ok(F.PASOS.length >= 7 && F.PASOS.length <= 9);
  assert.equal(F.siguiente('intro'), F.PASOS[0]);
  assert.equal(F.siguiente(F.PASOS.at(-1)), 'ficha');
  assert.equal(F.anterior(F.PASOS[0]), 'intro');
  assert.equal(F.anterior('intro'), 'intro');
  assert.equal(F.siguiente('ficha'), 'ficha');
  assert.equal(F.numeroDePaso('intro'), 0);
  assert.equal(F.numeroDePaso('contacto'), F.TOTAL_PASOS);
});

test('los datos iniciales no dejan pasar los pasos obligatorios', () => {
  const d = F.datosIniciales();
  for (const p of ['negocio', 'problema', 'canales', 'saber', 'hogar', 'nombre', 'contacto']) {
    assert.ok(Object.keys(F.validar(p, d)).length > 0, p);
  }
  // Los que traen un punto de partida sensato sí pasan.
  assert.deepEqual(F.validar('autonomia', d), {});
  assert.deepEqual(F.validar('apariencia', d, { formas: ['arana'] }), {});
  assert.equal(F.primerPasoIncompleto(d), 'negocio');
});

test('con todo lleno, todos los pasos pasan', () => {
  const d = completos();
  for (const p of F.PASOS) assert.deepEqual(F.validar(p, d, { formas: ['arana'] }), {}, p);
  assert.equal(F.primerPasoIncompleto(d, { formas: ['arana'] }), null);
});

test('validación: mínimos, máximos, «otro» y consentimiento', () => {
  const d = completos();
  d.problema = 'corto';
  assert.deepEqual(F.validar('problema', d), { problema: { clave: 'corto', n: 15 } });
  d.problema = 'x'.repeat(2001);
  assert.equal(F.validar('problema', d).problema.clave, 'largo');
  d.canales.lista = ['otro']; d.canales.otro = '  ';
  assert.equal(F.validar('canales', d)['canales.otro'].clave, 'requerido');
  d.canales.lista = ['inventado'];
  assert.equal(F.validar('canales', d)['canales.lista'].clave, 'elige');
  d.contacto.consentimiento = false;
  assert.equal(F.validar('contacto', d)['contacto.consentimiento'].clave, 'consentimiento');
  d.contacto.medio = 'mi casa';
  assert.equal(F.validar('contacto', d)['contacto.medio'].clave, 'contacto');
  d.apariencia.forma = 'no-existe';
  assert.ok(F.validar('apariencia', d, { formas: ['arana'] })['apariencia.forma']);
  d.autonomia.acciones.pagos = 'a veces';
  assert.ok(F.validar('autonomia', d)['autonomia.acciones.pagos']);
});

test('cada error que puede salir tiene su texto en los dos idiomas', () => {
  const claves = new Set(['requerido', 'corto', 'largo', 'elige', 'eligeUna', 'contacto', 'consentimiento', 'hay']);
  for (const i of IDIOMAS) for (const k of claves) assert.ok(TEXTOS[i].errores[k], `${i}.${k}`);
});

test('contacto: correo o WhatsApp, nada más', () => {
  assert.deepEqual(F.clasificarContacto(' Ana@Correo.com '), { tipo: 'correo', valor: 'ana@correo.com' });
  assert.deepEqual(F.clasificarContacto('+57 300 000 0000'), { tipo: 'whatsapp', valor: '+573000000000' });
  assert.deepEqual(F.clasificarContacto('(604) 555-1234'), { tipo: 'whatsapp', valor: '6045551234' });
  for (const malo of ['', 'ana@', 'ana@correo', '12345', 'llámame', '+1 234 567 890 123 456', '@usuario']) {
    assert.equal(F.clasificarContacto(malo), null, malo);
  }
});

// ── Ficha ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('la ficha lleva solo lo que la persona eligió, recortado', () => {
  const f = F.construirFicha(completos(), { idioma: 'es', creada: '2026-11-17T00:00:00.000Z' });
  assert.deepEqual(f, {
    version: 1, origen: 'crea-tu-agente', idioma: 'es', creada: '2026-11-17T00:00:00.000Z',
    agente: { nombre: 'Faro', forma: 'sendell', color: 'menta' },
    negocio: { nombre: 'Panadería La Esquina', dedica: 'Pan y tortas por encargo' },
    problema: 'Me escriben de noche y no alcanzo a responder a tiempo.',
    conversa: { con: 'clientes', canales: ['whatsapp', 'web'] },                    // sin «otro» no viaja su texto
    aprende: { fuentes: ['documentos', 'hojas'] },
    autonomia: { solo: ['responder', 'recordar', 'registrar'], consulta: ['agendar', 'precios', 'pagos'], nunca: ['borrar'] },
    hogar: { opcion: 'preparado' },                                                // «encendido» solo si es su equipo
    contacto: { nombre: 'Ana', medio: 'correo', valor: 'ana@correo.com' },
    consentimiento: true,
  });
  const d = completos();
  d.canales.lista.push('otro'); d.hogar.opcion = 'propio';
  const g = F.construirFicha(d);
  assert.equal(g.conversa.otroCanal, 'algo que no se pidió');
  assert.equal(g.hogar.encendidoTodoElDia, 'si');
  assert.match(g.creada, /^\d{4}-\d\d-\d\dT/);
});

test('la ficha se traduce al cuerpo que ya acepta /survey', () => {
  const f = F.construirFicha(completos(), { idioma: 'en' });
  const c = F.aCargaEncuesta(f, { country: 'mx', desde: '/news' });
  assert.equal(c.survey_type, 'business');
  assert.equal(c.language, 'en');
  assert.equal(c.consent, true);
  assert.equal(c.hp, '');
  assert.equal(c.answers.origen, 'agente-a-medida');
  assert.equal(c.answers.email, 'ana@correo.com');
  assert.equal(c.answers.whatsapp, undefined);
  assert.deepEqual(JSON.parse(c.answers.ficha), f);
  const d = completos(); d.contacto.medio = '+57 300 111 2222';
  const w = F.aCargaEncuesta(F.construirFicha(d));
  assert.equal(w.answers.whatsapp, '+573001112222');
  assert.equal(w.answers.email, undefined);
});

test('enviar() del prototipo no sale a la red y devuelve la ficha en JSON', async () => {
  const antes = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('el prototipo no debe usar la red'); };
  try {
    const f = F.construirFicha(completos());
    const r = await enviar(f);
    assert.equal(r.ok, true);
    assert.equal(r.prototipo, true);
    assert.deepEqual(JSON.parse(r.cuerpo), f);
  } finally { globalThis.fetch = antes; }
});

// ── Guardado ───────────────────────────────────────────────────────────────────────────────────────────────────
test('guardar y cargar devuelven lo mismo', () => {
  const a = almacenFalso();
  const e = { ...F.estadoInicial('en'), pantalla: 'hogar', datos: completos() };
  e.datos.canales.lista = ['whatsapp', 'web']; e.datos.saber.fuentes = ['documentos', 'hojas'];   // el saneo deja el orden canónico
  assert.ok(F.guardar(a, e));
  assert.deepEqual(F.cargar(a), e);
  F.borrar(a);
  assert.equal(F.cargar(a), null);
});

test('lo guardado se sanea: basura, otra versión y almacenes que fallan', () => {
  const a = almacenFalso();
  a.setItem(F.CLAVE_GUARDADO, '{no es json');
  assert.equal(F.cargar(a), null);
  a.setItem(F.CLAVE_GUARDADO, JSON.stringify({ version: 99, pantalla: 'ficha' }));
  assert.deepEqual(F.cargar(a), F.estadoInicial());
  a.setItem(F.CLAVE_GUARDADO, JSON.stringify({
    version: 1, pantalla: 'hackeo', idioma: 'fr',
    datos: { problema: 42, canales: { publico: 'todos', lista: ['web', 'fax'] }, autonomia: { acciones: { pagos: 'siempre' } }, apariencia: { forma: 'ya-no-existe', color: '#f00' }, contacto: { consentimiento: 'true' } },
  }));
  const e = F.cargar(a, { formas: ['arana'] });
  assert.equal(e.pantalla, 'intro');
  assert.equal(e.idioma, 'es');
  assert.equal(e.datos.problema, '');
  assert.equal(e.datos.canales.publico, '');
  assert.deepEqual(e.datos.canales.lista, ['web']);
  assert.equal(e.datos.autonomia.acciones.pagos, F.AUTONOMIA_INICIAL.pagos);
  assert.equal(e.datos.apariencia.forma, 'sendell');
  assert.equal(e.datos.apariencia.color, 'blanco');
  assert.equal(e.datos.contacto.consentimiento, false);
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('lleno'); }, removeItem() { throw new Error('x'); } };
  assert.equal(F.cargar(roto), null);
  assert.equal(F.guardar(roto, F.estadoInicial()), false);
  assert.doesNotThrow(() => F.borrar(roto));
  assert.equal(F.cargar(null), null);
});

test('idioma de partida: ?lang, luego lo guardado, luego el navegador', () => {
  assert.equal(F.elegirIdioma({ query: '?lang=en', guardado: 'es' }), 'en');
  assert.equal(F.elegirIdioma({ query: '?lang=xx', guardado: 'en' }), 'en');
  assert.equal(F.elegirIdioma({ navegador: ['fr-FR', 'en-US'] }), 'en');
  assert.equal(F.elegirIdioma({ navegador: ['pt-BR'] }), 'es');
});

// ── Textos ─────────────────────────────────────────────────────────────────────────────────────────────────────
function claves(o, pre = '') {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? claves(v, pre + k + '.') : [pre + k]));
}
test('los dos idiomas tienen las mismas claves y las listas el mismo largo', () => {
  assert.deepEqual(claves(TEXTOS.en).sort(), claves(TEXTOS.es).sort());
  const largos = o => claves(o).map(k => [k, k.split('.').reduce((x, y) => x[y], o)]).filter(([, v]) => Array.isArray(v)).map(([k, v]) => k + ':' + v.length);
  assert.deepEqual(largos(TEXTOS.en).sort(), largos(TEXTOS.es).sort());
});

test('cada valor permitido tiene rótulo en los dos idiomas', () => {
  for (const i of IDIOMAS) {
    const p = TEXTOS[i].pasos;
    for (const v of F.PUBLICOS) assert.ok(p.canales.publicos[v], `${i} publico ${v}`);
    for (const v of F.CANALES) assert.ok(p.canales.lista[v], `${i} canal ${v}`);
    for (const v of F.FUENTES) assert.ok(p.saber.lista[v], `${i} fuente ${v}`);
    for (const v of F.ACCIONES) assert.ok(p.autonomia.acciones[v], `${i} accion ${v}`);
    for (const v of F.NIVELES) assert.ok(p.autonomia.opciones[v], `${i} nivel ${v}`);
    for (const v of F.HOGARES) { assert.ok(p.hogar.lista[v], `${i} hogar ${v}`); assert.ok(p.hogar.detalle[v]); }
    for (const v of F.ENCENDIDOS) assert.ok(p.hogar.encendidos[v], `${i} encendido ${v}`);
    for (const paso of F.PASOS) assert.ok(p[paso]?.titulo, `${i} título de ${paso}`);
    const n = p.problema.ejemplos.length;
    assert.ok(n >= 6 && n <= 8, 'entre 6 y 8 ejemplos de problema');
  }
  assert.deepEqual(COLORES.map(c => c.id), F.COLORES_IDS);
  for (const c of COLORES) for (const i of IDIOMAS) assert.ok(c[i]);
});

test('honestidad: sin «gratis», sin precios y sin plazos en los textos', () => {
  const todo = JSON.stringify(TEXTOS);
  assert.doesNotMatch(todo, /gratis|\bfree\b|\$|\b\d+\s*(h|horas|hours|días|days|minutos|minutes)\b|garantiza|guarantee/i);
  assert.match(TEXTOS.es.ficha.pasosDespues[0], /persona/);
  assert.match(TEXTOS.en.ficha.pasosDespues[0], /person/);
});

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
test('los colores del agente y los textos tienen contraste alto sobre #0b0b0b', () => {
  for (const c of COLORES) assert.ok(contraste(c.hex, '#0b0b0b') >= 7, `${c.id} ${contraste(c.hex, '#0b0b0b').toFixed(1)}`);
  const html = readFileSync(join(AQUI, 'index.html'), 'utf8');
  for (const v of ['tinta', 'tenue', 'error']) {
    const hex = html.match(new RegExp(`--${v}: (#[0-9a-f]{6})`))[1];
    assert.ok(contraste(hex, '#0b0b0b') >= 7, `--${v}`);
  }
  assert.ok(contraste('#8f8f8f', '#141414') >= 4.5, 'placeholder');
});

// ── Formas y núcleo ────────────────────────────────────────────────────────────────────────────────────────────
test('rótulo de forma: catálogo en varias formas, reserva y nombre interno', () => {
  const r = (n, i, catalogo) => F.rotuloForma(n, i, { catalogo, reserva: FORMAS_ROTULOS });
  assert.equal(r('arana', 'en'), 'spider');
  assert.equal(r('forma-nueva', 'es'), 'Forma nueva');
  assert.equal(r('arana', 'es', { nombreVisible: (n, i) => `${n}/${i}` }), 'arana/es');
  assert.equal(r('arana', 'en', { CATALOGO: { arana: { es: 'araña viva', en: 'live spider' } } }), 'live spider');
  assert.equal(r('arana', 'es', { default: { arana: 'Araña' } }), 'Araña');
  assert.equal(r('arana', 'es', { LISTA: [{ id: 'arana', visible: { es: 'Arañita', en: 'Spidey' } }] }), 'Arañita');
  assert.equal(r('arana', 'es', { nombreVisible: () => { throw new Error('x'); } }), 'araña');
});

test('formas agrupadas por familia cuando el catálogo la trae', () => {
  assert.deepEqual(F.agruparFormas(['a', 'b'], null), [{ familia: null, formas: ['a', 'b'] }]);
  const cat = { FAMILIAS: { x: 'equis' }, CATALOGO: { a: { es: 'A', familia: 'x' }, c: { es: 'C', familia: 'y' } } };
  assert.deepEqual(F.agruparFormas(['a', 'b', 'c'], cat), [{ familia: 'x', formas: ['a'] }, { familia: 'y', formas: ['c'] }, { familia: 'otras', formas: ['b'] }]);
});

// Informativa: otro trabajo está añadiendo formas al núcleo. Una forma sin rótulo no rompe la página (se ve su nombre
// interno), así que aquí solo se avisa con un diagnóstico; lo que sí debe cumplirse es que el agrupado no pierda ninguna.
test('formas del núcleo de hoy: rótulos del catálogo y agrupado completo', async t => {
  let catalogo;
  try { catalogo = await import('../nucleo/formas-catalogo.mjs'); } catch { t.diagnostic('sin formas-catalogo.mjs: rótulos de reserva'); return; }
  const sin = [];
  for (const n of nombresDeFormas()) for (const i of IDIOMAS) {
    const r = F.rotuloForma(n, i, { catalogo, reserva: {} });
    if (r === n.charAt(0).toUpperCase() + n.slice(1).replace(/[-_]/g, ' ')) sin.push(`${n}/${i}`);
  }
  if (sin.length) t.diagnostic('formas sin rótulo en el catálogo (se verá su nombre interno): ' + sin.join(', '));
  const grupos = F.agruparFormas(nombresDeFormas(), catalogo);
  assert.deepEqual(grupos.flatMap(g => g.formas).sort(), [...nombresDeFormas()].sort());
});

test('el gesto de cada pantalla es una pose y un ánimo que el avatar conoce', () => {
  const d = completos(); d.apariencia = { forma: 'arana', color: 'lila' };
  for (const p of F.PANTALLAS) {
    const g = F.gestoDe(p, d);
    assert.ok(POSES.includes(g.pose), p); assert.ok(ANIMOS.includes(g.animo), p);
    if (F.DESDE_APARIENCIA.has(p)) assert.deepEqual([g.forma, g.color], ['arana', 'lila']);
    else assert.deepEqual([g.forma, g.color], ['sendell', 'blanco']);
  }
});

test('el avatar se transforma en cada forma que hoy expone el núcleo, sin celdas rotas', () => {
  const formas = nombresDeFormas();
  assert.ok(formas.length > 0);
  const sanas = celdas => celdas.length > 0 && celdas.every(q => Number.isFinite(q.x) && Number.isFinite(q.y) && typeof q.c === 'string');
  for (const n of formas) {
    for (const k of [0.3, 1]) assert.ok(sanas(avatar({ forma: { desde: 'sendell', hacia: n, k } }, 1.7)), `${n} k=${k}`);
    assert.ok(sanas(avatar({ forma: { desde: n, hacia: formas[0], k: 0.5 } }, 2.1)), `${n} → ${formas[0]}`);
  }
  for (const pose of POSES) assert.ok(sanas(avatar({ pose, animo: 'curioso' }, 0.6)), pose);
});

test('cada import relativo de la página apunta a un archivo que existe', () => {
  for (const archivo of ['app.mjs', 'escena.mjs', 'flujo.mjs', 'textos.mjs', 'enviar.mjs']) {
    const src = readFileSync(join(AQUI, archivo), 'utf8');
    for (const [, ruta] of src.matchAll(/(?:^|\n)\s*import\s[^'"]*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      assert.ok(existsSync(resolve(AQUI, ruta)), `${archivo} → ${ruta}`);
    }
  }
  assert.match(readFileSync(join(AQUI, 'index.html'), 'utf8'), /<script type="module" src="\.\/app\.mjs">/);
});
