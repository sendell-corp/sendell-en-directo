// node hojas/hoja-formas.mjs [familia] [t] → hojas/familia-<familia>.png: una hoja de contacto por familia de formas.
// Sin familia, hace todas. Cada vista es el avatar ya transformado (k = 1), tal como se verá en la web.
import { avatar } from '../nucleo/avatar.mjs';
import { forma } from '../nucleo/formas.mjs';
import { CATALOGO, FAMILIAS } from '../nucleo/formas-catalogo.mjs';
import { hoja } from './hoja.mjs';
const aqui = new URL('.', import.meta.url).pathname;
const [familia, tt] = process.argv.slice(2);
const t = tt ? Number(tt) : 1.3;

for (const [clave, titulo] of Object.entries(FAMILIAS)) {
  if (familia && familia !== clave) continue;
  const nombres = Object.keys(CATALOGO).filter(n => CATALOGO[n].familia === clave);
  const vistas = nombres.map(n => ({ rotulo: `${n} (${forma(n, t).length})`, celdas: avatar({ forma: { hacia: n, k: 1 } }, t) }));
  console.log(hoja(aqui + 'familia-' + clave, `Formas · ${titulo}`, vistas, { porFila: 4, cw: 12 }).ruta);
}
