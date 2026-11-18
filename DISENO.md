# Sendell en directo: diseño y contratos

> **En esta copia pública** están el motor de dibujo (`nucleo/`), las hojas, el video, «Crea tu agente», el guardián y el contrato del evento (`captura/esquema.mjs`). La captura real (lectores de sesiones, colector, alias) y el hábitat de la red local no se incluyen: leen datos privados. Sus contratos quedan abajo como registro del diseño.

Un solo motor convierte el trabajo real de las sesiones de agentes en avatar y lenguaje ASCII. Tiene dos salidas:

1. **Hábitat privado en la red local.** Una página que solo se ve en casa y enseña en vivo lo que cada sesión hace o no hace.
2. **Video grabado.** Filtrado, narrado y aprobado por Daniel antes de publicarse. El piloto es sobre Forja.

Más adelante, el hábitat público de sendell.co lee la capa pública, y Sendell aprende a hacerlo todo con una skill.

## Reglas de Daniel (no se negocian)

- **Actividad real, no simulada.** Solo un evento confirmado mueve al avatar. Un proceso vivo no es trabajo y el silencio no es descanso: se dice «sin señal».
- **Sus prompts son privados.** Ninguna capa guarda ni enseña el texto que él escribe, ni el razonamiento de un modelo, ni la salida de un comando. Del encargo solo queda el hecho y la hora.
- **Nombres alternos** para los agentes en todo lo público. La tabla real ↔ alterno vive fuera del repo.
- **Nada se publica sin su «go».** Solo se cuenta lo que él autoriza y de valor comprobado.
- **Estilo:** blanco sobre casi negro, el del noticiero. Sin color ni música mientras él no diga otra cosa.
- **Cada video se mide** con el crítico antes de enseñarse.

## Máquina

- 8 GB de RAM, 4 núcleos, casi siempre con menos de 2 GB libres. **Nada de Chromium, builds ni dependencias pesadas.**
- Node 26 sin paquetes externos (`node:http`, `node:fs`, `node:sqlite`, `node:test`). Video: SVG → `rsvg-convert` → `ffmpeg`.
- `/tmp` es RAM: nada pesado ahí. Lo privado va en `~/.local/share/sendell-en-directo/` (permisos 700/600).

## Piezas

```
nucleo/      el dibujo, función pura del tiempo (sirve igual en Node y en el navegador)
  matriz.mjs     la figura de ceros de Sendell (fuente única)
  rejilla.mjs    la celda, utilidades, salida SVG y salida canvas
  avatar.mjs     Sendell: poses, mirada, boca movida por la voz, ánimo y cambio de forma
  formas.mjs     siluetas a las que Sendell se transforma
  lenguaje.mjs   el lenguaje procedural: un patrón animado por cada clase de actividad
captura/     de las sesiones a la bitácora
  esquema.mjs    contrato del evento y validador
  claude.mjs     sigue las transcripciones de Claude Code, por campos
  openclaw.mjs   lee la auditoría de Sendell (solo lectura)
  git.mjs        commits de los repos vigilados
  colector.mjs   une las fuentes, guarda la bitácora privada y lleva el estado de cada sesión
  alias.mjs      nombres reales y alternos (archivo privado)
guardian/    lo que impide que algo privado llegue a lo público
habitat/     servidor y página de la red local
video/       guion, compositor por tramos y voz (después del hábitat)
pruebas/     node --test
```

## Contrato del dibujo (`nucleo/`)

Todo es una lista de celdas `{ x, y, c, a?, p?, g? }` (ver `rejilla.mjs`), función pura de `(estado, t)`, con `t` en segundos. Sin `Math.random` ni relojes: cualquier cuadro se recalcula suelto.

```js
import { avatar, TAM } from './nucleo/avatar.mjs';
avatar(estado, t)   // → celdas en una caja de TAM.cols × TAM.filas (17 × 18), origen arriba a la izquierda
// estado = {
//   mira:   'frente' | 'izq' | 'der' | 'espalda',
//   pose:   'neutra' | 'camina' | 'saluda' | 'senala' | 'teclea' | 'lupa' | 'descansa',
//   voz:    0..1      apertura de la boca (sale del volumen real de la voz, o 0)
//   animo:  'neutro' | 'curioso' | 'contento' | 'cansado' | 'sorpresa',
//   forma:  null | { hacia: 'arana' | …, k: 0..1 }    cambio de forma (0 = Sendell, 1 = la forma)
//   entra:  0..1      materialización (1 = entero)
//   semilla: número   para que dos avatares no parpadeen a la vez
// }

import { patron, PATRONES } from './nucleo/lenguaje.mjs';
patron(tipo, t, { ancho, alto, semilla, fuerza, ok })   // → celdas en una caja de ancho × alto celdas
// tipo: uno de TIPOS de captura/esquema.mjs, o 'sin_senal'. fuerza 0..1 = cuánta actividad hay (eventos por minuto, normalizado).
```

## Contrato de la captura (`captura/`)

El evento privado está definido y validado en `captura/esquema.mjs`. Reglas de lectura:

- **Por campos, no por texto.** De una transcripción de Claude Code solo se leen: `type`, `timestamp`, `sessionId`, las entradas `tool_use` (`name` y, de `input`, únicamente `file_path`/`path`/`notebook_path`, `description`, `subagent_type`, `to`), `is_error` de los `tool_result`, `toolUseResult.structuredPatch` (solo para contar líneas), `origin.kind` de los mensajes de usuario y `durationMs` de `system/turn_duration`.
- **Nunca se leen ni se guardan:** el contenido de mensajes de usuario o de otras sesiones, bloques `thinking`, texto del asistente, `stdout`/`stderr`, el comando de Bash, resúmenes de compactación, `queue-operation`, `last-prompt`, `attachment`, ni las líneas `api-request*`.
- Las transcripciones pesan cientos de MB y tienen líneas de varios MB: se leen en flujo desde una posición guardada, sin cargar el archivo ni analizar las líneas que no interesan.
- La auditoría de OpenClaw se abre en solo lectura y por columnas (`occurred_at`, `kind`, `action`, `status`, `session_key`, `tool_name`, `duration_ms`). Esa base guarda llaves en otras tablas: no se tocan.
- De git solo el asunto (`%s`), la fecha y `--numstat`. Nunca el cuerpo ni el autor.

```js
import { crearColector } from './captura/colector.mjs';
const col = crearColector(opciones);       // opciones por defecto en captura/config.mjs
col.alEvento(fn);                          // cada evento privado válido, en orden de llegada
await col.iniciar({ desdeMs });            // rellena desde desdeMs (por defecto, las últimas 6 h) y luego sigue en vivo
col.estado();                              // { ahora, sesiones: [{ sesion, nombre, fuente, ultimoTs, estado, ayudantes, conteo, ultimo }] }
col.recientes(n);                          // los últimos n eventos
col.detener();
```

`estado` se calcula con `estadoDe()` de `esquema.mjs`. `conteo` es el número de eventos por tipo en los últimos 10 minutos. `ayudantes` es cuántos ayudantes de esa sesión tuvieron un evento en los últimos 45 s.

## Contrato del hábitat local (`habitat/`)

- `node habitat/servidor.mjs` escucha en `127.0.0.1:8765`; con `--lan` escucha además en la IP de la red local.
- **Acceso:** una clave larga en `~/.local/share/sendell-en-directo/clave` (se crea sola, permisos 600). La primera visita es `/?k=<clave>`; el servidor responde con una cookie `HttpOnly; SameSite=Strict` y redirige a `/`. Sin cookie válida, todo responde 403. Solo `GET`. Sin listado de carpetas ni rutas fuera de `habitat/web` y `nucleo`.
- **Rutas:** `/` (la página), `/nucleo/*.mjs` y `/web/*` (estáticos), `/estado` (JSON de `col.estado()`), `/eventos` (SSE: primero los últimos 200 eventos, luego en vivo, con latido cada 15 s).
- **La página** es un `<canvas>` que usa los mismos módulos de `nucleo/`. Se lee bien en un teléfono en vertical.
- Aunque sea privada, **nunca enseña el texto de un encargo ni secretos**: pasa cada cadena por `guardian/` en modo «privado» (solo enmascara secretos).

## Contrato del guardián (`guardian/`)

```js
import { revisar, enmascarar } from './guardian/guardian.mjs';
revisar(cadena, { modo: 'publico' })   // → { ok, reglas: ['ruta-absoluta', 'correo', …] }  (nunca devuelve la cadena ofensora)
enmascarar(cadena)                     // modo privado: sustituye secretos por «‹secreto›» y deja lo demás
```

Se prueba con canarios: secretos falsos sembrados que, si llegan a la salida, hacen fallar la prueba.
