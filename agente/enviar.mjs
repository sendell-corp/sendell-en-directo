// El único punto de integración con el exterior. Hoy (prototipo) NO envía nada: devuelve la ficha serializada
// para enseñarla en pantalla.
//
// ── Cómo se conecta en producción ─────────────────────────────────────────────────────────────────────────────
// La web de sendell.co ya tiene un servicio que recibe la encuesta (`POST {apiUrl}/survey`):
// guarda la fila, avisa por correo, exige consentimiento, descarta el campo trampa `hp` y limita envíos por IP.
// Para usarlo sin tocar el backend, sustituir el cuerpo de enviar() por algo así:
//
//   import { aCargaEncuesta } from './flujo.mjs';
//   const { country } = await (await fetch(`${API}/survey/init`)).json();          // país, como hace /survey
//   const r = await fetch(`${API}/survey`, {
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify(aCargaEncuesta(ficha, { country, hp: campoTrampa.value, desde: document.referrer })),
//   });
//   if (r.status === 429) return { ok: false, motivo: 'limite' };
//   if (!r.ok) return { ok: false, motivo: 'red' };
//   return { ok: true };
//
// Antes de encenderlo: añadir un <input name="hp"> invisible al paso de contacto, enviar una prueba y confirmar que el
// aviso por correo llega; si el correo falla, el worker lo calla y la fila queda en la base sin que nadie la vea.
// Las solicitudes se distinguen de las encuestas por answers.origen = 'agente-a-medida'; la ficha completa va en
// answers.ficha (texto JSON) para no perder detalle.
//
// Contrato: enviar(ficha) → Promise<{ ok: true, prototipo?: true, cuerpo?: string } | { ok: false, motivo: 'red' | 'limite' }>
// No borra el guardado local: eso lo hace la página solo si ok es true y no es prototipo.
export async function enviar(ficha) {
  return { ok: true, prototipo: true, cuerpo: JSON.stringify(ficha, null, 2) };
}
