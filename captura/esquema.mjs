// Contrato de la bitácora: qué es un evento de trabajo y qué puede llevar.
// Dos capas, y nunca se mezclan:
//   · Privada (hábitat de la red local): dice de verdad qué sesión hizo qué, sobre qué archivo y cuándo.
//   · Pública (videos, hábitat de sendell.co): solo enumerados y nombres alternos. La escribe captura/publico.mjs
//     a partir de la privada, con negación por defecto, y la revisa guardian/.
// Ninguna capa guarda jamás el texto de lo que escribe el fundador, el razonamiento de un modelo ni la salida de un comando.

export const VERSION = 1;
export const FUENTES = ['claude', 'openclaw', 'git'];
export const AGENTES = ['principal', 'ayudante'];
// Qué clase de acción fue. Cerrado: lo que no encaje es 'otro'.
export const TIPOS = [
  'encargo',     // el humano pidió algo (solo el hecho y la hora; nunca el texto)
  'leer',        // abrir un archivo
  'buscar',      // buscar en archivos
  'editar',      // cambiar un archivo existente
  'escribir',    // crear o reescribir un archivo
  'consola',     // ejecutar un comando
  'web',         // buscar o leer en internet
  'delegar',     // lanzar un ayudante o un equipo de ayudantes
  'mensaje',     // mensaje entre sesiones (saliente o entrante)
  'entrega',     // enseñar un archivo al humano
  'pregunta',    // preguntar algo al humano
  'programar',   // dejar algo programado
  'commit',      // un commit en un repo vigilado
  'turno_fin',   // la sesión terminó su turno (con su duración)
  'otro',
];
// Estado honesto de una sesión, derivado solo de eventos confirmados. Un proceso vivo no es trabajo; el silencio no es descanso.
export const ESTADOS = ['activo', 'reciente', 'sin_senal'];
export const UMBRAL = { activoMs: 45_000, recienteMs: 10 * 60_000 };

// Evento privado. Campos opcionales según el tipo.
//   v        1
//   id       único y estable (fuente + sesión + posición); permite no repetir
//   ts       milisegundos desde 1970 (UTC)
//   fuente   'claude' | 'openclaw' | 'git'
//   sesion   identificador corto y estable de la sesión (8 hex del id real); el nombre humano lo pone la tabla de alias
//   agente   'principal' | 'ayudante';  ayudante = identificador corto del ayudante
//   tipo     uno de TIPOS
//   herramienta  nombre de la herramienta (Read, Edit, Bash…)
//   ruta     archivo tocado (ruta absoluta; PRIVADO)   ext = extensión   repo = raíz conocida a la que pertenece
//   mas, menos   líneas añadidas y quitadas (editar, escribir, commit)
//   ok       false si la acción falló
//   durMs    duración
//   nota     etiqueta corta y PRIVADA (p. ej. la descripción que el propio agente dio a un comando); máx. 160
//   con      la otra sesión de un mensaje (nombre real; PRIVADO)
const CAMPOS = new Set(['v', 'id', 'ts', 'fuente', 'sesion', 'agente', 'ayudante', 'tipo', 'herramienta', 'ruta', 'ext', 'repo', 'mas', 'menos', 'ok', 'durMs', 'nota', 'con']);

export function validar(ev) {
  const mal = [];
  if (!ev || typeof ev !== 'object') return ['no es un objeto'];
  for (const k of Object.keys(ev)) if (!CAMPOS.has(k)) mal.push(`campo desconocido: ${k}`);
  if (ev.v !== VERSION) mal.push('v');
  if (typeof ev.id !== 'string' || !ev.id || ev.id.length > 96) mal.push('id');
  if (!Number.isFinite(ev.ts) || ev.ts < 1.6e12 || ev.ts > 4e12) mal.push('ts');
  if (!FUENTES.includes(ev.fuente)) mal.push('fuente');
  if (typeof ev.sesion !== 'string' || !/^[0-9a-z-]{1,24}$/.test(ev.sesion)) mal.push('sesion');
  if (!AGENTES.includes(ev.agente)) mal.push('agente');
  if (!TIPOS.includes(ev.tipo)) mal.push('tipo');
  for (const k of ['herramienta', 'ruta', 'ext', 'repo', 'nota', 'con', 'ayudante']) if (k in ev && typeof ev[k] !== 'string') mal.push(k);
  if (ev.nota && ev.nota.length > 160) mal.push('nota larga');
  if (ev.ruta && ev.ruta.length > 400) mal.push('ruta larga');
  for (const k of ['mas', 'menos', 'durMs']) if (k in ev && !(Number.isFinite(ev[k]) && ev[k] >= 0)) mal.push(k);
  if ('ok' in ev && typeof ev.ok !== 'boolean') mal.push('ok');
  return mal;
}

// Estado de una sesión a partir de la hora de su último evento confirmado.
export function estadoDe(ultimoTs, ahora) {
  if (!ultimoTs) return 'sin_senal';
  const d = ahora - ultimoTs;
  return d <= UMBRAL.activoMs ? 'activo' : d <= UMBRAL.recienteMs ? 'reciente' : 'sin_senal';
}
