// Rejilla de celdas: el idioma común del núcleo. Todo lo que se dibuja (avatar, formas, lenguaje de actividad) es una
// lista de celdas, función pura del tiempo. Dos salidas pintan lo mismo: SVG (video, sin Chromium) y canvas (hábitat).
//
// Celda: { x, y, c, a?, p?, g? }
//   x, y  posición en unidades de celda (columna, fila; fraccionarias mientras viaja); y crece hacia abajo
//   c     un carácter
//   a     opacidad 0..1 (por defecto 1)
//   p     papel: 'n' cuerpo · 'o' ojo · 'b' boca · 'd' decorado tenue · 'x' acento
//   g     true = lleva halo
// Proporción de celda del hábitat: alto = 1,2 × ancho; cuerpo de letra = ancho / 0,6.
export const ALTO = 1.2;
export const FUENTE = 'Nimbus Mono PS';
export const FUENTE_WEB = '"Nimbus Mono PS", "Courier New", "DejaVu Sans Mono", monospace';

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));           // salida suave (la del noticiero)
export const suave = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };   // entrada y salida suaves
export const rebote = x => { x = clamp(x); const s = 1.70158; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
// Azar determinista: mismo k, mismo valor (0..1). Nada de Math.random: cada cuadro se puede recalcular suelto.
export const rnd = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const rnd2 = (a, b) => rnd(a * 157.31 + b * 89.17 + 0.5);
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Desplaza y escala un grupo de celdas (devuelve copia).
export const mover = (celdas, dx = 0, dy = 0) => celdas.map(q => ({ ...q, x: q.x + dx, y: q.y + dy }));
export const atenuar = (celdas, k) => celdas.map(q => ({ ...q, a: (q.a ?? 1) * k }));

// Texto corrido como celdas (para rótulos dentro de la rejilla).
export function rotulo(str, x, y, { a = 1, p = 'd' } = {}) {
  return [...String(str)].map((c, i) => ({ x: x + i, y, c, a, p })).filter(q => q.c !== ' ');
}

// ── SVG ──────────────────────────────────────────────────────────────────────────────────────────────
// Los <text> de un grupo de celdas. cw = ancho de celda en px; (ox, oy) = esquina del origen de la rejilla en px.
export function aSVG(celdas, { cw, ox = 0, oy = 0, brillo = true } = {}) {
  const rh = cw * ALTO, fs = cw / 0.6;
  let s = '';
  for (const q of celdas) {
    const a = q.a ?? 1;
    if (a <= 0.01 || q.c === ' ') continue;
    const x = ox + q.x * cw + cw / 2;
    const y = oy + q.y * rh + rh * (q.c === '_' ? 0.62 : 0.86);
    s += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${a < 0.995 ? ` fill-opacity="${a.toFixed(2)}" stroke-opacity="${a.toFixed(2)}"` : ''}>${esc(q.c)}</text>`;
  }
  return `<g text-anchor="middle" font-size="${fs.toFixed(1)}" stroke="#fff" stroke-width="${(fs * 0.035).toFixed(2)}"${brillo ? ' filter="url(#g)"' : ''}>${s}</g>`;
}

const DEFS = `<defs><radialGradient id="bg" cx="0.5" cy="0.6" r="0.75"><stop offset="0" stop-color="#1c1c1c"/><stop offset="1" stop-color="#090909"/></radialGradient>
<filter id="g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/><feComponentTransfer in="b" result="b2"><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
// Cuadro completo con el fondo aprobado del noticiero (blanco sobre casi negro).
export const marco = (w, h, cuerpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}<rect width="100%" height="100%" fill="url(#bg)"/><g font-family="${FUENTE}" font-weight="bold" fill="#fff">${cuerpo}</g></svg>`;
export const textoSVG = (x, y, str, fs, o = 1, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${fs}" fill-opacity="${o}" ${extra}>${esc(str)}</text>`;

// ── Canvas (navegador) ───────────────────────────────────────────────────────────────────────────────
// Pinta las mismas celdas en un contexto 2D. El halo se hace con shadowBlur solo en las celdas con g.
export function pintar(ctx, celdas, { cw, ox = 0, oy = 0, color = '#fff' } = {}) {
  const rh = cw * ALTO, fs = cw / 0.6;
  ctx.font = `bold ${fs.toFixed(1)}px ${FUENTE_WEB}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  for (const q of celdas) {
    const a = q.a ?? 1;
    if (a <= 0.01 || q.c === ' ') continue;
    ctx.globalAlpha = a;
    if (q.g) { ctx.shadowColor = color; ctx.shadowBlur = cw * 0.9; } else { ctx.shadowBlur = 0; }
    ctx.fillText(q.c, ox + q.x * cw + cw / 2, oy + q.y * rh + rh * (q.c === '_' ? 0.62 : 0.86));
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}
