// Servidor estático mínimo para probar «Crea tu agente» en local. Solo 127.0.0.1, solo GET/HEAD, sin listados.
// Sirve /agente/* (esta carpeta) y /nucleo/* (el motor de dibujo); «/» redirige a /agente/.
//   node agente/servir.mjs            → http://127.0.0.1:8770/agente/
//   PUERTO=8771 node agente/servir.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAICES = { agente: AQUI, nucleo: join(AQUI, '..', 'nucleo') };
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
};
// Lo que no se sirve aunque esté en la carpeta: el propio servidor y las pruebas.
const OCULTOS = new Set(['servir.mjs', 'flujo.test.mjs']);
const PUERTO = Number(process.env.PUERTO ?? 8770);

function resolver(url) {
  const ruta = decodeURIComponent(new URL(url, 'http://x').pathname);
  const [, raiz, ...resto] = ruta.split('/');
  const base = RAICES[raiz];
  if (!base) return null;
  const rel = resto.join('/') || 'index.html';
  const final = normalize(join(base, rel));
  if (final !== base && !final.startsWith(base + sep)) return null;      // nada fuera de la raíz
  if (raiz === 'agente' && OCULTOS.has(rel)) return null;
  if (rel.split('/').some(p => p.startsWith('.'))) return null;          // ni archivos ocultos
  return final;
}

const servidor = createServer(async (req, res) => {
  const cabeceras = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { ...cabeceras, allow: 'GET, HEAD' }); return res.end(); }
  if (req.url === '/' || req.url === '/agente') { res.writeHead(302, { ...cabeceras, location: '/agente/' }); return res.end(); }
  let archivo;
  try { archivo = resolver(req.url); } catch { archivo = null; }
  const tipo = archivo && TIPOS[extname(archivo)];
  try {
    if (!tipo || !(await stat(archivo)).isFile()) throw new Error('no');
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { ...cabeceras, 'content-type': tipo, 'content-length': cuerpo.length });
    res.end(req.method === 'HEAD' ? undefined : cuerpo);
  } catch {
    res.writeHead(404, { ...cabeceras, 'content-type': 'text/plain; charset=utf-8' });
    res.end('no encontrado\n');
  }
});

servidor.listen(PUERTO, '127.0.0.1', () => console.log(`Crea tu agente: http://127.0.0.1:${PUERTO}/agente/`));
