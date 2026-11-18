// La página «Crea tu agente»: una pregunta a la vez, Sendell acompañando cada paso, todo guardado en este navegador.
// La lógica (pasos, validación, ficha) vive en flujo.mjs; aquí solo el DOM. El envío pasa por enviar.mjs.
import * as F from './flujo.mjs';
import { TEXTOS, COLORES, FORMAS_ROTULOS } from './textos.mjs';
import { crearEscena } from './escena.mjs';
import { enviar } from './enviar.mjs';
import { nombresDeFormas } from '../nucleo/formas.mjs';

// ── Formas disponibles: se leen al cargar, del núcleo tal como esté hoy ───────────────────────────────────────────
let catalogo = null;
try { catalogo = await import('../nucleo/formas-catalogo.mjs'); } catch { /* aún no existe: rótulos de reserva */ }
const FORMAS = (() => { try { return nombresDeFormas().filter(n => typeof n === 'string' && n !== F.FORMA_BASE); } catch { return []; } })();
const OPCIONES_FORMA = [F.FORMA_BASE, ...FORMAS];
const rotuloForma = n => F.rotuloForma(n, estado.idioma, { catalogo, reserva: FORMAS_ROTULOS });
const color = id => COLORES.find(c => c.id === id) ?? COLORES[0];

// ── Estado ───────────────────────────────────────────────────────────────────────────────────────────────────
const almacen = (() => { try { return window.localStorage; } catch { return null; } })();
const opcionesValidar = { formas: FORMAS };
let estado = F.cargar(almacen, opcionesValidar)
  ?? F.estadoInicial(F.elegirIdioma({ navegador: navigator.languages ?? [navigator.language] }));
const pedido = new URLSearchParams(location.search).get('lang');
if (pedido === 'es' || pedido === 'en') estado.idioma = pedido;
// Si se quedó en la ficha con algo incompleto (p. ej. una forma que ya no existe), vuelve a ese paso.
if (estado.pantalla === 'ficha') estado.pantalla = F.primerPasoIncompleto(estado.datos, opcionesValidar) ?? 'ficha';
let regresoFicha = false;                // al editar desde la ficha, «Seguir» vuelve a ella
const T = () => TEXTOS[estado.idioma];
const guarda = () => F.guardar(almacen, estado);
const fmt = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

const obtener = ruta => ruta.split('.').reduce((o, k) => o?.[k], estado.datos);
function fijar(ruta, valor) {
  const ks = ruta.split('.'), ult = ks.pop();
  ks.reduce((o, k) => o[k], estado.datos)[ult] = valor;
  guarda();
}

// ── DOM mínimo ───────────────────────────────────────────────────────────────────────────────────────────────
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value' || k === 'checked') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of hijos.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const slug = ruta => ruta.replace(/\./g, '-');
const $ = id => document.getElementById(id);

const reducido = matchMedia('(prefers-reduced-motion: reduce)');
const anchoGrande = matchMedia('(min-width: 860px)');
let escena = null, escenaFicha = null;
function montaEscena() {
  escena?.destruir();
  escena = crearEscena($('lienzo'), {
    reducido: reducido.matches,
    altoMax: () => (anchoGrande.matches ? Math.min(innerHeight * 0.7, 560) : Math.min(innerHeight * 0.3, 300)),
  });
}

// ── Campos ───────────────────────────────────────────────────────────────────────────────────────────────────
function textoCampo(ruta, { etiqueta, ejemplo, multilinea = false, filas = 3, opcional = false, autocomplete, inputmode, tipo = 'text' }) {
  const id = 'c-' + slug(ruta), eid = 'e-' + slug(ruta);
  const max = F.LIMITES[ruta]?.max;
  const campo = h(multilinea ? 'textarea' : 'input', {
    id, name: ruta, type: multilinea ? null : tipo, rows: multilinea ? filas : null, maxlength: max, placeholder: ejemplo,
    autocomplete: autocomplete ?? 'off', inputmode, spellcheck: multilinea ? 'true' : null, 'aria-describedby': eid,
    value: obtener(ruta) ?? '',
    oninput: e => { fijar(ruta, e.target.value); quitaError(ruta); },
  });
  return h('div', { class: 'campo' },
    h('label', { for: id }, etiqueta, opcional ? h('span', { class: 'opc' }, ' ' + T().opcional) : null),
    campo,
    h('p', { id: eid, class: 'error', hidden: true }));
}

// Grupo de opciones (radio o casillas) con su leyenda. opciones: [[valor, texto, extra?], …]
function grupo(ruta, { leyenda, tipo = 'radio', opciones, clase = '', alCambiar }) {
  const eid = 'e-' + slug(ruta);
  const actual = obtener(ruta);
  const marcado = v => (tipo === 'radio' ? actual === v : (actual ?? []).includes(v));
  return h('fieldset', { class: 'grupo ' + clase, id: 'g-' + slug(ruta), 'aria-describedby': eid },
    h('legend', {}, leyenda),
    h('div', { class: 'opciones' }, opciones.map(([valor, texto, extra]) => h('label', { class: 'opcion' },
      h('input', {
        type: tipo, name: ruta, value: valor, checked: marcado(valor),
        onchange: e => {
          if (tipo === 'radio') fijar(ruta, valor);
          else { const s = new Set(obtener(ruta) ?? []); e.target.checked ? s.add(valor) : s.delete(valor); fijar(ruta, [...s]); }
          quitaError(ruta);
          alCambiar?.(valor, e);
        },
      }),
      extra ?? null,
      h('span', {}, texto)))),
    h('p', { id: eid, class: 'error', hidden: true }));
}

function quitaError(ruta) {
  const e = $('e-' + slug(ruta)); if (e) { e.hidden = true; e.textContent = ''; }
  const c = $('c-' + slug(ruta)) ?? $('g-' + slug(ruta)); c?.removeAttribute('aria-invalid');
}
function muestraErrores(errores) {
  const T0 = T();
  let primero = null;
  for (const [ruta, { clave, n }] of Object.entries(errores)) {
    const e = $('e-' + slug(ruta));
    if (e) { e.textContent = fmt(T0.errores[clave], { n }); e.hidden = false; }
    const c = $('c-' + slug(ruta)) ?? $('g-' + slug(ruta));
    if (c) { c.setAttribute('aria-invalid', 'true'); primero ??= c; }
  }
  avisa(fmt(T0.errores.hay, { n: Object.keys(errores).length }));
  if (primero) {
    const foco = primero.matches('fieldset') ? primero.querySelector('input:checked, input') : primero;
    foco?.focus();
    primero.scrollIntoView({ block: 'center', behavior: reducido.matches ? 'auto' : 'smooth' });
  }
}
function avisa(texto) { const a = $('aviso'); a.textContent = ''; setTimeout(() => { a.textContent = texto; }, 30); }

// ── Cada paso ────────────────────────────────────────────────────────────────────────────────────────────────
const PASO = {
  negocio(t) {
    return [
      textoCampo('negocio.nombre', { etiqueta: t.nombre, ejemplo: t.nombreEj, opcional: true, autocomplete: 'organization' }),
      textoCampo('negocio.dedica', { etiqueta: t.dedica, ejemplo: t.dedicaEj, multilinea: true, filas: 3 }),
    ];
  },
  problema(t) {
    const anade = frase => {
      const actual = String(estado.datos.problema ?? '').trim();
      const nuevo = actual ? actual + '\n' + frase : frase;
      fijar('problema', nuevo.slice(0, F.LIMITES.problema.max));
      const area = $('c-problema'); area.value = estado.datos.problema; quitaError('problema'); area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
      escena.pulso('contento', 900);
    };
    return [
      textoCampo('problema', { etiqueta: t.campo, ejemplo: t.campoEj, multilinea: true, filas: 5 }),
      h('p', { class: 'subtitulo', id: 'ej-titulo' }, t.ejemplosTitulo),
      h('ul', { class: 'fichas-ej', 'aria-labelledby': 'ej-titulo' },
        t.ejemplos.map(frase => h('li', {}, h('button', { type: 'button', class: 'chip', onclick: () => anade(frase) }, frase)))),
    ];
  },
  canales(t) {
    const otro = textoCampo('canales.otro', { etiqueta: t.otro });
    otro.hidden = !estado.datos.canales.lista.includes('otro');
    return [
      grupo('canales.publico', { leyenda: t.publico, opciones: F.PUBLICOS.map(v => [v, t.publicos[v]]), clase: 'dos' }),
      grupo('canales.lista', {
        leyenda: t.por, tipo: 'checkbox', opciones: F.CANALES.map(v => [v, t.lista[v]]), clase: 'dos',
        alCambiar: v => { if (v === 'otro') { otro.hidden = !estado.datos.canales.lista.includes('otro'); if (!otro.hidden) otro.querySelector('input').focus(); } },
      }),
      otro,
    ];
  },
  saber(t) {
    return [
      grupo('saber.fuentes', { leyenda: t.titulo, tipo: 'checkbox', opciones: F.FUENTES.map(v => [v, t.lista[v]]), clase: 'sin-leyenda' }),
      textoCampo('saber.nota', { etiqueta: t.nota, ejemplo: t.notaEj, multilinea: true, filas: 2, opcional: true }),
    ];
  },
  autonomia(t) {
    return [
      h('div', { class: 'tabla-autonomia' }, F.ACCIONES.map(a => grupo('autonomia.acciones.' + a, {
        leyenda: t.acciones[a], opciones: F.NIVELES.map(n => [n, t.opciones[n]]), clase: 'segmento',
        alCambiar: n => escena.pulso(n === 'nunca' ? 'sorpresa' : n === 'solo' ? 'contento' : 'curioso', 700),
      }))),
      textoCampo('autonomia.extra', { etiqueta: t.extra, ejemplo: t.extraEj, multilinea: true, filas: 2, opcional: true }),
    ];
  },
  hogar(t) {
    const detalle = h('p', { class: 'detalle', 'aria-live': 'polite' }, t.detalle[estado.datos.hogar.opcion] ?? '');
    const encendido = grupo('hogar.encendido', { leyenda: t.encendido, opciones: F.ENCENDIDOS.map(v => [v, t.encendidos[v]]), clase: 'tres' });
    encendido.hidden = estado.datos.hogar.opcion !== 'propio';
    return [
      grupo('hogar.opcion', {
        leyenda: t.titulo, opciones: F.HOGARES.map(v => [v, t.lista[v]]), clase: 'sin-leyenda',
        alCambiar: v => { detalle.textContent = t.detalle[v]; encendido.hidden = v !== 'propio'; escena.pulso('contento', 800); },
      }),
      detalle,
      encendido,
    ];
  },
  apariencia(t) {
    const actualiza = () => { escena.poner(F.gestoDe('apariencia', estado.datos)); etiquetaLienzo(); };
    // Un solo grupo de radios (mismo name: las flechas recorren todas las formas), partido en familias si el catálogo las trae.
    const formas = grupo('apariencia.forma', {
      leyenda: t.forma, opciones: OPCIONES_FORMA.map(n => [n, rotuloForma(n)]), clase: 'formas',
      alCambiar: () => { actualiza(); escena.pulso('sorpresa', 600); },
    });
    const grupos = F.agruparFormas(FORMAS, catalogo);
    if (grupos.length > 1) {
      const porValor = new Map([...formas.querySelectorAll('.opcion')].map(l => [l.querySelector('input').value, l]));
      const nombreFamilia = f => t.familias[f] ?? (typeof catalogo?.FAMILIAS?.[f] === 'string' ? catalogo.FAMILIAS[f] : f);
      const caja = formas.querySelector('.opciones');
      caja.replaceChildren(...[{ familia: 'sendell', formas: [F.FORMA_BASE] }, ...grupos].map(g => h('fieldset', { class: 'familia' },
        h('legend', {}, nombreFamilia(g.familia)),
        h('div', { class: 'opciones' }, g.formas.map(n => porValor.get(n))))));
      caja.classList.replace('opciones', 'familias');
    }
    return [
      formas,
      grupo('apariencia.color', {
        leyenda: t.color, clase: 'colores', alCambiar: actualiza,
        opciones: COLORES.map(c => [c.id, c[estado.idioma], h('span', { class: 'muestra', style: `--muestra:${c.hex}`, 'aria-hidden': 'true' })]),
      }),
    ];
  },
  nombre(t) {
    return [
      textoCampo('nombre', { etiqueta: t.campo, ejemplo: t.campoEj }),
      h('p', { class: 'subtitulo', id: 'ideas' }, t.ideas),
      h('ul', { class: 'fichas-ej cortas', 'aria-labelledby': 'ideas' }, t.sugerencias.map(s => h('li', {}, h('button', {
        type: 'button', class: 'chip',
        onclick: () => { fijar('nombre', s); const c = $('c-nombre'); c.value = s; quitaError('nombre'); c.focus(); escena.pulso('contento', 900); },
      }, s)))),
    ];
  },
  contacto(t) {
    return [
      textoCampo('contacto.nombre', { etiqueta: t.nombre, autocomplete: 'name' }),
      textoCampo('contacto.medio', { etiqueta: t.medio, ejemplo: t.medioEj, autocomplete: 'email' }),
      h('div', { class: 'campo casilla' },
        h('label', { class: 'opcion' },
          h('input', {
            type: 'checkbox', id: 'c-contacto-consentimiento', checked: estado.datos.contacto.consentimiento, 'aria-describedby': 'e-contacto-consentimiento datos-uso',
            onchange: e => { fijar('contacto.consentimiento', e.target.checked); quitaError('contacto.consentimiento'); },
          }),
          h('span', {}, t.consentimiento)),
        h('p', { id: 'e-contacto-consentimiento', class: 'error', hidden: true })),
      h('p', { class: 'nota', id: 'datos-uso' }, t.datos),
    ];
  },
};

// ── Pantallas ────────────────────────────────────────────────────────────────────────────────────────────────
function intro(t) {
  return h('section', { class: 'tarjeta' },
    h('h2', { tabindex: '-1', id: 'titulo-pantalla' }, t.intro.titulo),
    h('p', { class: 'lead' }, t.intro.texto),
    h('ul', { class: 'puntos' }, t.intro.puntos.map(p => h('li', {}, p))),
    h('div', { class: 'acciones' },
      h('button', { type: 'button', class: 'primario', onclick: () => { escena.pulso('contento', 900); irA('negocio'); } }, t.empezar)));
}

function pregunta(paso, t) {
  const tp = t.pasos[paso];
  const form = h('form', { class: 'tarjeta', novalidate: true, 'aria-labelledby': 'titulo-pantalla' },
    h('h2', { tabindex: '-1', id: 'titulo-pantalla' }, tp.titulo),
    tp.ayuda ? h('p', { class: 'ayuda' }, tp.ayuda) : null,
    PASO[paso](tp),
    h('div', { class: 'acciones' },
      h('button', { type: 'button', class: 'secundario', onclick: () => irA(regresoFicha ? 'ficha' : F.anterior(paso)) }, t.volver),
      h('button', { type: 'submit', class: 'primario' }, t.seguir)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const errores = F.validar(paso, estado.datos, opcionesValidar);
    if (Object.keys(errores).length) { escena.pulso('sorpresa', 1200); muestraErrores(errores); return; }
    escena.pulso('contento', 900);
    let destino = regresoFicha ? 'ficha' : F.siguiente(paso);
    if (destino === 'ficha') destino = F.primerPasoIncompleto(estado.datos, opcionesValidar) ?? 'ficha';
    irA(destino);
  });
  return form;
}

function ficha(t) {
  const tf = t.ficha, tp = t.pasos, d = estado.datos;
  const lista = (ids, rotulos) => (ids.length ? ids.map(i => rotulos[i]).join(', ') : tf.ninguno);
  const fila = (titulo, valor, paso) => [
    h('dt', {}, titulo),
    h('dd', {}, h('span', { class: 'valor' }, valor || tf.ninguno),
      paso ? h('button', { type: 'button', class: 'enlace', onclick: () => { regresoFicha = true; irA(paso); } },
        tf.editar, h('span', { class: 'sr' }, ': ' + titulo)) : null)];
  const nivel = n => F.ACCIONES.filter(a => d.autonomia.acciones[a] === n);
  const c = color(d.apariencia.color);
  const canales = F.CANALES.filter(x => d.canales.lista.includes(x))
    .map(x => (x === 'otro' ? d.canales.otro.trim() || tp.canales.lista.otro : tp.canales.lista[x]));
  const canal = canales.length ? canales.join(', ') : tf.ninguno;
  const hogar = tp.hogar.lista[d.hogar.opcion] + (d.hogar.opcion === 'propio' && d.hogar.encendido ? ` · ${tp.hogar.enFicha[d.hogar.encendido]}` : '');
  const contacto = F.clasificarContacto(d.contacto.medio);
  const lienzoFicha = h('canvas', { id: 'lienzo-ficha', role: 'img', 'aria-label': textoLienzo() });

  const enviarBtn = h('button', { type: 'button', class: 'primario', onclick: async () => {
    enviarBtn.disabled = true;
    try {
      const r = await enviar(F.construirFicha(estado.datos, { idioma: estado.idioma }));
      if (r.ok && r.prototipo) muestraResultado(r.cuerpo);
      else if (r.ok) { F.borrar(almacen); /* en producción: pantalla «Recibido» */ }
      else avisa(r.motivo);
    } finally { enviarBtn.disabled = false; }
  } }, tf.enviar);

  return h('section', { class: 'tarjeta ficha', 'aria-labelledby': 'titulo-pantalla' },
    h('h2', { tabindex: '-1', id: 'titulo-pantalla' }, tf.titulo),
    h('p', { class: 'ayuda' }, tf.ayuda),
    h('div', { class: 'carnet', style: `--agente:${c.hex}` },
      h('div', { class: 'carnet-avatar' }, lienzoFicha),
      h('div', { class: 'carnet-id' },
        h('p', { class: 'nombre-agente' }, d.nombre.trim()),
        h('p', { class: 'apariencia' }, `${rotuloForma(d.apariencia.forma)} · ${c[estado.idioma]}`),
        h('button', { type: 'button', class: 'enlace', onclick: () => { regresoFicha = true; irA('apariencia'); } }, tf.editar, h('span', { class: 'sr' }, ': ' + tf.secciones.apariencia)),
        h('button', { type: 'button', class: 'enlace', onclick: () => { regresoFicha = true; irA('nombre'); } }, tp.nombre.campo))),
    h('p', { class: 'aprende' }, tf.aprende),
    h('dl', { class: 'datos' },
      fila(tf.secciones.negocio, [d.negocio.nombre.trim(), d.negocio.dedica.trim()].filter(Boolean).join(' — '), 'negocio'),
      fila(tf.secciones.problema, d.problema.trim(), 'problema'),
      fila(tf.secciones.canales, `${tp.canales.publicos[d.canales.publico] ?? ''} · ${canal}`, 'canales'),
      fila(tf.secciones.saber, lista(F.FUENTES.filter(f => d.saber.fuentes.includes(f)), tp.saber.lista) + (d.saber.nota.trim() ? ' · ' + d.saber.nota.trim() : ''), 'saber'),
      fila(tf.secciones.autonomia, lista(nivel('solo'), tp.autonomia.acciones), 'autonomia'),
      fila(tf.secciones.consulta, lista(nivel('consulta'), tp.autonomia.acciones) + (d.autonomia.extra.trim() ? ' · ' + d.autonomia.extra.trim() : ''), null),
      fila(tf.secciones.nunca, lista(nivel('nunca'), tp.autonomia.acciones), null),
      fila(tf.secciones.hogar, hogar, 'hogar'),
      fila(tf.secciones.contacto, `${d.contacto.nombre.trim()} · ${contacto?.valor ?? d.contacto.medio}`, 'contacto')),
    h('h3', {}, tf.despues),
    h('ol', { class: 'despues' }, tf.pasosDespues.map(p => h('li', {}, p))),
    h('p', { class: 'nota' }, tf.rapidez),
    h('div', { class: 'acciones' },
      h('button', { type: 'button', class: 'secundario', onclick: () => irA('contacto') }, t.volver),
      enviarBtn));
}

function muestraResultado(json) {
  const t = T().envio, dlg = $('resultado');
  $('resultado-titulo').textContent = t.titulo;
  $('resultado-texto').textContent = t.texto;
  $('resultado-json').textContent = json;
  const copiar = $('resultado-copiar'), cerrar = $('resultado-cerrar'), estadoCopia = $('resultado-copiado');
  copiar.textContent = t.copiar; cerrar.textContent = t.cerrar; estadoCopia.textContent = '';
  copiar.onclick = async () => {
    try { await navigator.clipboard.writeText(json); estadoCopia.textContent = t.copiado; }
    catch { const r = document.createRange(); r.selectNodeContents($('resultado-json')); getSelection().removeAllRanges(); getSelection().addRange(r); }
  };
  cerrar.onclick = () => dlg.close?.() ?? dlg.removeAttribute('open');
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}

// ── Pintar la pantalla actual ──────────────────────────────────────────────────────────────────────────────────
function textoLienzo() {
  const t = T(), g = F.gestoDe(estado.pantalla, estado.datos);
  const desc = g.forma !== F.FORMA_BASE || g.color !== 'blanco'
    ? fmt(t.avatarForma, { forma: rotuloForma(g.forma), color: color(g.color)[estado.idioma] })
    : t.avatarSendell;
  return fmt(t.avatarAria, { estado: desc });
}
function etiquetaLienzo() {
  const txt = textoLienzo();
  $('lienzo').setAttribute('aria-label', txt);
  $('lienzo-ficha')?.setAttribute('aria-label', txt);
}

function pinta({ enfocar = false } = {}) {
  const t = T(), p = estado.pantalla;
  document.documentElement.lang = estado.idioma;
  document.title = t.tituloPagina;
  $('idioma').textContent = t.cambiarIdioma;
  $('idioma').setAttribute('aria-label', t.cambiarIdiomaAria);
  $('idioma').setAttribute('lang', estado.idioma === 'es' ? 'en' : 'es');
  $('reiniciar').textContent = t.reiniciar;
  $('guardado').textContent = t.guardadoLocal;
  $('titulo-sitio').textContent = t.sitio;
  document.querySelector('.saltar').textContent = t.saltar;

  const n = F.numeroDePaso(p);
  $('progreso').hidden = n === 0;
  $('progreso-texto').textContent = fmt(t.progreso, { n, total: F.TOTAL_PASOS });
  $('progreso-barra').style.width = `${(n / F.TOTAL_PASOS) * 100}%`;

  escenaFicha?.destruir(); escenaFicha = null;
  const enFicha = p === 'ficha';
  const caja = $('escena'), estabaOculta = caja.hidden;
  caja.hidden = enFicha;
  document.body.classList.toggle('en-ficha', enFicha);
  if (estabaOculta && !enFicha) escena.medir();

  const zona = $('pantalla');
  zona.replaceChildren(p === 'intro' ? intro(t) : enFicha ? ficha(t) : pregunta(p, t));
  const gesto = F.gestoDe(p, estado.datos);
  const tinte = { ...gesto, color: color(gesto.color).hex };
  escena.poner(tinte);
  if (enFicha) {
    escenaFicha = crearEscena($('lienzo-ficha'), { reducido: reducido.matches, altoMax: () => 230, fondo: false, entrar: false });
    escenaFicha.poner(tinte);
  }
  etiquetaLienzo();
  guarda();
  if (enfocar) {
    $('titulo-pantalla')?.focus({ preventScroll: true });
    (anchoGrande.matches ? $('pantalla') : document.querySelector('header')).scrollIntoView({ block: 'start', behavior: reducido.matches ? 'auto' : 'smooth' });
  }
}

function irA(pantalla) {
  if (pantalla === 'ficha' || pantalla === 'intro') regresoFicha = false;
  estado.pantalla = pantalla;
  pinta({ enfocar: true });
}

// ── Arranque ─────────────────────────────────────────────────────────────────────────────────────────────────
$('idioma').addEventListener('click', () => { estado.idioma = estado.idioma === 'es' ? 'en' : 'es'; pinta(); $('idioma').focus(); });
$('reiniciar').addEventListener('click', () => {
  if (!confirm(T().reiniciarConfirma)) return;
  F.borrar(almacen);
  estado = F.estadoInicial(estado.idioma);
  regresoFicha = false;
  pinta({ enfocar: true });
});
reducido.addEventListener?.('change', () => { montaEscena(); pinta(); });
montaEscena();
pinta();
