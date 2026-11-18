// Lógica pura de «Crea tu agente»: pasos, validación, ficha, guardado y la actitud de Sendell en cada paso.
// Sin DOM ni red: se importa igual en el navegador y en Node (flujo.test.mjs).

export const VERSION = 1;
export const CLAVE_GUARDADO = 'sendell-agente-v1';

// Las nueve preguntas, en orden. 'intro' y 'ficha' son pantallas, no pasos: no cuentan en el progreso.
export const PASOS = ['negocio', 'problema', 'canales', 'saber', 'autonomia', 'hogar', 'apariencia', 'nombre', 'contacto'];
export const PANTALLAS = ['intro', ...PASOS, 'ficha'];

// Valores permitidos (los ids viajan en la ficha; los rótulos están en textos.mjs).
export const PUBLICOS = ['clientes', 'equipo', 'ambos', 'solo_yo'];
export const CANALES = ['whatsapp', 'instagram', 'web', 'correo', 'telegram', 'discord', 'interno', 'otro'];
export const FUENTES = ['documentos', 'web', 'hojas', 'conversaciones', 'sistema', 'cabeza'];
export const ACCIONES = ['responder', 'agendar', 'recordar', 'registrar', 'precios', 'pagos', 'borrar'];
export const NIVELES = ['solo', 'consulta', 'nunca'];
export const HOGARES = ['propio', 'preparado', 'no_se'];
export const ENCENDIDOS = ['si', 'no', 'no_se'];
export const COLORES_IDS = ['blanco', 'ambar', 'menta', 'cian', 'celeste', 'lila', 'rosa', 'lima'];
export const FORMA_BASE = 'sendell';

// Topes de cada campo de texto (min solo en los obligatorios).
export const LIMITES = {
  'negocio.nombre': { max: 120 },
  'negocio.dedica': { min: 3, max: 400 },
  problema: { min: 15, max: 2000 },
  'canales.otro': { max: 60 },
  'saber.nota': { max: 600 },
  'autonomia.extra': { max: 400 },
  nombre: { min: 1, max: 30 },
  'contacto.nombre': { min: 1, max: 80 },
  'contacto.medio': { max: 120 },
};

// Punto de partida prudente: lo que mueve dinero o borra datos, consultado o prohibido.
export const AUTONOMIA_INICIAL = { responder: 'solo', agendar: 'consulta', recordar: 'solo', registrar: 'solo', precios: 'consulta', pagos: 'consulta', borrar: 'nunca' };

export function datosIniciales() {
  return {
    negocio: { nombre: '', dedica: '' },
    problema: '',
    canales: { publico: '', lista: [], otro: '' },
    saber: { fuentes: [], nota: '' },
    autonomia: { acciones: { ...AUTONOMIA_INICIAL }, extra: '' },
    hogar: { opcion: '', encendido: '' },
    apariencia: { forma: FORMA_BASE, color: 'blanco' },
    nombre: '',
    contacto: { nombre: '', medio: '', consentimiento: false },
  };
}

export const estadoInicial = (idioma = 'es') => ({ version: VERSION, pantalla: 'intro', idioma, datos: datosIniciales() });

// ── Navegación ─────────────────────────────────────────────────────────────────────────────────────────────────
export const numeroDePaso = pantalla => PASOS.indexOf(pantalla) + 1;          // 0 en intro y ficha
export const TOTAL_PASOS = PASOS.length;
export function siguiente(pantalla) { const i = PANTALLAS.indexOf(pantalla); return PANTALLAS[Math.min(i + 1, PANTALLAS.length - 1)] ?? 'intro'; }
export function anterior(pantalla) { const i = PANTALLAS.indexOf(pantalla); return PANTALLAS[Math.max(i - 1, 0)] ?? 'intro'; }
// Primer paso que no pasa la validación (para no dejar llegar a la ficha con huecos). null si todos están bien.
export function primerPasoIncompleto(datos, opciones) {
  return PASOS.find(p => Object.keys(validar(p, datos, opciones)).length > 0) ?? null;
}

// ── Contacto ───────────────────────────────────────────────────────────────────────────────────────────────────
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Un correo, o un número de WhatsApp (7 a 15 cifras, con + opcional). Devuelve null si no es ninguno de los dos.
export function clasificarContacto(texto) {
  const s = String(texto ?? '').trim();
  if (!s) return null;
  if (s.includes('@')) return CORREO.test(s) && s.length <= 120 ? { tipo: 'correo', valor: s.toLowerCase() } : null;
  if (!/^[+\d\s().-]+$/.test(s)) return null;
  const cifras = s.replace(/\D/g, '');
  if (cifras.length < 7 || cifras.length > 15) return null;
  return { tipo: 'whatsapp', valor: (s.trim().startsWith('+') ? '+' : '') + cifras };
}

// ── Validación ─────────────────────────────────────────────────────────────────────────────────────────────────
// validar(paso, datos) → { 'campo': { clave, n? } }   (vacío = el paso está bien). clave = una de textos.errores.
const largo = s => String(s ?? '').trim().length;
function texto(err, campo, valor, { obligatorio = false } = {}) {
  const { min = 0, max = Infinity } = LIMITES[campo] ?? {};
  const n = largo(valor);
  if (n === 0) { if (obligatorio) err[campo] = { clave: 'requerido' }; return; }
  if (n < min) err[campo] = { clave: 'corto', n: min };
  else if (n > max) err[campo] = { clave: 'largo', n: max };
}

export function validar(paso, datos, { formas } = {}) {
  const d = datos ?? datosIniciales(), err = {};
  switch (paso) {
    case 'negocio':
      texto(err, 'negocio.nombre', d.negocio?.nombre);
      texto(err, 'negocio.dedica', d.negocio?.dedica, { obligatorio: true });
      break;
    case 'problema':
      texto(err, 'problema', d.problema, { obligatorio: true });
      break;
    case 'canales': {
      if (!PUBLICOS.includes(d.canales?.publico)) err['canales.publico'] = { clave: 'eligeUna' };
      const lista = (d.canales?.lista ?? []).filter(c => CANALES.includes(c));
      if (!lista.length) err['canales.lista'] = { clave: 'elige' };
      if (lista.includes('otro')) texto(err, 'canales.otro', d.canales?.otro, { obligatorio: true });
      break;
    }
    case 'saber':
      if (!(d.saber?.fuentes ?? []).some(f => FUENTES.includes(f))) err['saber.fuentes'] = { clave: 'elige' };
      texto(err, 'saber.nota', d.saber?.nota);
      break;
    case 'autonomia':
      for (const a of ACCIONES) if (!NIVELES.includes(d.autonomia?.acciones?.[a])) err['autonomia.acciones.' + a] = { clave: 'eligeUna' };
      texto(err, 'autonomia.extra', d.autonomia?.extra);
      break;
    case 'hogar':
      if (!HOGARES.includes(d.hogar?.opcion)) err['hogar.opcion'] = { clave: 'eligeUna' };
      break;
    case 'apariencia': {
      const validas = [FORMA_BASE, ...(formas ?? [])];
      if (formas && !validas.includes(d.apariencia?.forma)) err['apariencia.forma'] = { clave: 'eligeUna' };
      if (!COLORES_IDS.includes(d.apariencia?.color)) err['apariencia.color'] = { clave: 'eligeUna' };
      break;
    }
    case 'nombre':
      texto(err, 'nombre', d.nombre, { obligatorio: true });
      break;
    case 'contacto':
      texto(err, 'contacto.nombre', d.contacto?.nombre, { obligatorio: true });
      if (!largo(d.contacto?.medio)) err['contacto.medio'] = { clave: 'requerido' };
      else if (!clasificarContacto(d.contacto.medio)) err['contacto.medio'] = { clave: 'contacto' };
      if (d.contacto?.consentimiento !== true) err['contacto.consentimiento'] = { clave: 'consentimiento' };
      break;
  }
  return err;
}

// ── La ficha ───────────────────────────────────────────────────────────────────────────────────────────────────
// Lo que se envía. Solo lo que la persona escribió o eligió, recortado; nada del navegador ni de su equipo.
const limpio = s => String(s ?? '').trim().replace(/\s+\n/g, '\n');
export function construirFicha(datos, { idioma = 'es', creada = new Date().toISOString() } = {}) {
  const d = datos;
  const canales = CANALES.filter(c => d.canales.lista.includes(c));
  const acciones = Object.fromEntries(ACCIONES.map(a => [a, d.autonomia.acciones[a]]));
  const porNivel = n => ACCIONES.filter(a => acciones[a] === n);
  const contacto = clasificarContacto(d.contacto.medio);
  const ficha = {
    version: VERSION,
    origen: 'crea-tu-agente',
    idioma,
    creada,
    agente: {
      nombre: limpio(d.nombre),
      forma: d.apariencia.forma,
      color: d.apariencia.color,
    },
    negocio: { nombre: limpio(d.negocio.nombre), dedica: limpio(d.negocio.dedica) },
    problema: limpio(d.problema),
    conversa: { con: d.canales.publico, canales, ...(canales.includes('otro') ? { otroCanal: limpio(d.canales.otro) } : {}) },
    aprende: { fuentes: FUENTES.filter(f => d.saber.fuentes.includes(f)), nota: limpio(d.saber.nota) },
    autonomia: { solo: porNivel('solo'), consulta: porNivel('consulta'), nunca: porNivel('nunca'), siempreConsultar: limpio(d.autonomia.extra) },
    hogar: { opcion: d.hogar.opcion, ...(d.hogar.opcion === 'propio' && ENCENDIDOS.includes(d.hogar.encendido) ? { encendidoTodoElDia: d.hogar.encendido } : {}) },
    contacto: { nombre: limpio(d.contacto.nombre), medio: contacto?.tipo ?? null, valor: contacto?.valor ?? limpio(d.contacto.medio) },
    consentimiento: d.contacto.consentimiento === true,
  };
  if (!ficha.negocio.nombre) delete ficha.negocio.nombre;
  if (!ficha.aprende.nota) delete ficha.aprende.nota;
  if (!ficha.autonomia.siempreConsultar) delete ficha.autonomia.siempreConsultar;
  return ficha;
}

// Traducción de la ficha al cuerpo que ya acepta POST {apiUrl}/survey en producción.
// country lo da GET {apiUrl}/survey/init; hp es el campo trampa (vacío si lo llenó una persona).
export function aCargaEncuesta(ficha, { country = 'co', hp = '', desde = '' } = {}) {
  const answers = {
    origen: 'agente-a-medida',
    problema: ficha.problema,
    nombre: ficha.contacto.nombre,
    negocio: [ficha.negocio.nombre, ficha.negocio.dedica].filter(Boolean).join(' — '),
    ficha: JSON.stringify(ficha),
  };
  if (ficha.contacto.medio === 'correo') answers.email = ficha.contacto.valor;
  else answers.whatsapp = ficha.contacto.valor;
  if (desde) answers.desde = desde;
  return { survey_type: 'business', country, language: ficha.idioma, consent: ficha.consentimiento, hp, answers };
}

// ── Guardado (localStorage u otro con getItem/setItem) ───────────────────────────────────────────────────────────
// Todo lo que viene del almacenamiento se sanea: un valor raro no rompe la página, vuelve al de partida.
const cadena = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
const de = (v, lista, porDefecto = '') => (lista.includes(v) ? v : porDefecto);
const listaDe = (v, lista) => (Array.isArray(v) ? lista.filter(x => v.includes(x)) : []);

export function sanear(crudo, { formas } = {}) {
  const base = estadoInicial();
  if (!crudo || typeof crudo !== 'object' || crudo.version !== VERSION) return base;
  const c = crudo.datos ?? {}, d = base.datos;
  d.negocio.nombre = cadena(c.negocio?.nombre); d.negocio.dedica = cadena(c.negocio?.dedica);
  d.problema = cadena(c.problema);
  d.canales.publico = de(c.canales?.publico, PUBLICOS); d.canales.lista = listaDe(c.canales?.lista, CANALES); d.canales.otro = cadena(c.canales?.otro);
  d.saber.fuentes = listaDe(c.saber?.fuentes, FUENTES); d.saber.nota = cadena(c.saber?.nota);
  for (const a of ACCIONES) d.autonomia.acciones[a] = de(c.autonomia?.acciones?.[a], NIVELES, AUTONOMIA_INICIAL[a]);
  d.autonomia.extra = cadena(c.autonomia?.extra);
  d.hogar.opcion = de(c.hogar?.opcion, HOGARES); d.hogar.encendido = de(c.hogar?.encendido, ENCENDIDOS);
  const forma = cadena(c.apariencia?.forma, 60);
  d.apariencia.forma = forma && (!formas || formas.includes(forma) || forma === FORMA_BASE) ? forma : FORMA_BASE;
  d.apariencia.color = de(c.apariencia?.color, COLORES_IDS, 'blanco');
  d.nombre = cadena(c.nombre, 200);
  d.contacto.nombre = cadena(c.contacto?.nombre, 200); d.contacto.medio = cadena(c.contacto?.medio, 200);
  d.contacto.consentimiento = c.contacto?.consentimiento === true;
  return { version: VERSION, pantalla: de(crudo.pantalla, PANTALLAS, 'intro'), idioma: de(crudo.idioma, ['es', 'en'], 'es'), datos: d };
}

export function cargar(almacen, opciones) {
  try { const s = almacen?.getItem(CLAVE_GUARDADO); return s ? sanear(JSON.parse(s), opciones) : null; } catch { return null; }
}
export function guardar(almacen, estado) {
  try { almacen?.setItem(CLAVE_GUARDADO, JSON.stringify(estado)); return true; } catch { return false; }
}
export function borrar(almacen) { try { almacen?.removeItem(CLAVE_GUARDADO); } catch { /* sin almacenamiento */ } }

// Idioma de partida: ?lang= manda, luego lo guardado, luego el navegador; si nada encaja, español.
export function elegirIdioma({ query = '', guardado = null, navegador = [] } = {}) {
  const q = new URLSearchParams(query).get('lang');
  if (q === 'es' || q === 'en') return q;
  if (guardado === 'es' || guardado === 'en') return guardado;
  for (const l of navegador) { const c = String(l).slice(0, 2).toLowerCase(); if (c === 'es' || c === 'en') return c; }
  return 'es';
}

// ── Formas ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Rótulo visible de una forma. `catalogo` es lo que exporte nucleo/formas-catalogo.mjs si existe (se aceptan varias
// maneras: una función nombreVisible(nombre, idioma), o un objeto nombre → texto | { es, en } | { nombre, … }).
export function rotuloForma(nombre, idioma, { catalogo = null, reserva = {} } = {}) {
  const txt = v => (typeof v === 'string' ? v : v && typeof v === 'object' ? (v[idioma] ?? v.nombre?.[idioma] ?? (typeof v.nombre === 'string' ? v.nombre : null) ?? v.es ?? null) : null);
  if (catalogo) {
    for (const f of ['nombreVisible', 'rotulo', 'etiqueta']) {
      if (typeof catalogo[f] === 'function') { try { const r = catalogo[f](nombre, idioma); if (typeof r === 'string' && r) return r; } catch { /* sigue */ } }
    }
    for (const v of Object.values(catalogo)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && nombre in v) { const r = txt(v[nombre]); if (r) return r; }
      if (Array.isArray(v)) { const e = v.find(x => x && (x.id === nombre || x.nombre === nombre || x.clave === nombre)); if (e) { const r = txt(e.visible ?? e.rotulo ?? e.etiqueta ?? e[idioma] ?? e); if (r) return r; } }
    }
  }
  const r = txt(reserva[nombre]);
  if (r) return r;
  return nombre.charAt(0).toUpperCase() + nombre.slice(1).replace(/[-_]/g, ' ');
}

// Las formas agrupadas por familia si el catálogo trae una ({ familia } en cada entrada); si no, un solo grupo.
// Devuelve [{ familia, formas: [nombre…] }] en el orden en que aparecen; las que no tienen familia van al final ('otras').
export function agruparFormas(nombres, catalogo) {
  const tabla = catalogo && Object.values(catalogo).find(v => v && typeof v === 'object' && !Array.isArray(v) && nombres.some(n => v[n]?.familia));
  if (!tabla) return [{ familia: null, formas: [...nombres] }];
  const grupos = new Map();
  for (const n of nombres) {
    const fam = typeof tabla[n]?.familia === 'string' ? tabla[n].familia : 'otras';
    if (!grupos.has(fam)) grupos.set(fam, []);
    grupos.get(fam).push(n);
  }
  const orden = [...grupos.keys()].filter(f => f !== 'otras').concat(grupos.has('otras') ? ['otras'] : []);
  return orden.map(familia => ({ familia, formas: grupos.get(familia) }));
}

// ── Sendell en cada paso ──────────────────────────────────────────────────────────────────────────────────────
// Antes de elegir forma, Sendell toma nota con su propio cuerpo, con un gesto por pregunta. Desde «apariencia»
// en adelante ya es el agente: tiene la forma y el color elegidos.
const GESTO = {
  intro: { pose: 'saluda', animo: 'contento' },
  negocio: { pose: 'neutra', animo: 'curioso', mira: 'frente' },
  problema: { pose: 'lupa', animo: 'curioso' },
  canales: { pose: 'senala', animo: 'neutro' },
  saber: { pose: 'teclea', animo: 'curioso' },
  autonomia: { pose: 'senala', animo: 'neutro', lado: 'izq' },
  hogar: { pose: 'camina', animo: 'curioso', mira: 'der' },
  apariencia: { pose: 'neutra', animo: 'contento' },
  nombre: { pose: 'neutra', animo: 'contento' },
  contacto: { pose: 'saluda', animo: 'neutro' },
  ficha: { pose: 'saluda', animo: 'contento' },
};
export const DESDE_APARIENCIA = new Set(['apariencia', 'nombre', 'contacto', 'ficha']);
export function gestoDe(pantalla, datos) {
  const g = { ...(GESTO[pantalla] ?? GESTO.intro) };
  const esAgente = DESDE_APARIENCIA.has(pantalla);
  return { ...g, forma: esAgente ? datos.apariencia.forma : FORMA_BASE, color: esAgente ? datos.apariencia.color : 'blanco' };
}
