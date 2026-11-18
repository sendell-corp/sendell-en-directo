// La copia de trabajo del guardián: la cadena tal como se lee, no tal como está escrita.
//   · Fuera lo que no se ve: caracteres de formato (ancho cero, guion blando), selectores de variación y controles.
//   · Cada letra con sus tildes combinadas pasa por NFKC: la anchura completa y las letras de adorno vuelven a ASCII.
//   · Todo espacio raro es un espacio y toda raya es un guion.
// Con «plegar» además se quitan las tildes (NFKD sin marcas): sirve para buscar un nombre aunque lo disfracen.
// La copia recuerda de dónde salió cada carácter, para decir las posiciones sobre la cadena original.

// Lo que no se ve en pantalla, y lo que delata un archivo mal leído.
const OCULTOS = String.raw`\p{Cf}\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F\u{E0100}-\u{E01EF}`;
const CONTROLES = String.raw`\0-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD`;
const OCULTO = new RegExp(`[${OCULTOS}]`, 'u');
const CONTROL = new RegExp(`[${CONTROLES}]`, 'u');
const SUELTO = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;   // medio par suplente
const QUITAR = new RegExp(`[${OCULTOS}${CONTROLES}]+`, 'gu');

// Caracteres que la normalización deja como están: con solo estos, la copia es la propia cadena.
const ASCII = String.raw`\t\n\r\x20-\x7E`;
const LLANOS = ASCII + String.raw`\u00A1-\u00A7\u00A9\u00AB\u00AE\u00B0\u00B1\u00B6\u00B7\u00BB\u00BF-\u00FF\u2018-\u201F\u2039\u203A\u20AC`;
const juego = clase => ({
  entera: new RegExp(`^[${clase}]*$`),
  trozos: new RegExp(`([${clase}]+)(?!\\p{M})|[${clase}]?[^${clase}]+`, 'gu'),   // un tramo llano no acaba justo antes de una tilde suelta
});
const JUEGOS = { llana: juego(LLANOS), plegada: juego(ASCII) };
const LETRA = /\P{M}\p{M}*|\p{M}+/gu;   // una letra con sus marcas

function normal(letra, plegar) {
  const limpia = letra.replace(QUITAR, '');
  const forma = plegar ? limpia.normalize('NFKD').replace(/\p{M}+/gu, '') : limpia.normalize('NFKC');
  return forma.replace(QUITAR, '').replace(/\p{Zs}/gu, ' ').replace(/\p{Pd}/gu, '-').replace(/[\u2028\u2029]/g, '\n');
}

// Primer carácter oculto y primer signo de mala codificación de una cadena: [{ regla, ini }].
export function raros(cadena) {
  const lista = [];
  const oculto = cadena.search(OCULTO), control = cadena.search(CONTROL);
  if (oculto >= 0) lista.push({ regla: 'caracter-oculto', ini: oculto });
  if (control >= 0) lista.push({ regla: 'codificacion', ini: control });
  else if (!cadena.isWellFormed()) lista.push({ regla: 'codificacion', ini: cadena.search(SUELTO) });
  return lista;
}

// copia(cadena, plegar) → { texto, origen(i), fin(i) }
//   origen(i)  posición en la cadena del carácter i de la copia
//   fin(i)     posición en la cadena donde acaba un tramo de la copia que termina en i (sin incluirlo)
export function copia(cadena, plegar = false) {
  const { entera, trozos } = plegar ? JUEGOS.plegada : JUEGOS.llana;
  if (entera.test(cadena)) return { texto: cadena, origen: i => i, fin: i => i };
  // Mapa por tramos, de tres en tres números: dónde empieza en la copia, dónde en la cadena y si avanza a la par.
  const mapa = [];
  let texto = '';
  function sumar(sale, ini, par) {
    const u = mapa.length - 3;
    const sigue = par && u >= 0 && mapa[u + 2] === 1 && mapa[u + 1] - mapa[u] === ini - texto.length;   // alarga el tramo anterior
    if (!sigue) mapa.push(texto.length, ini, par ? 1 : 0);
    texto += sale;
  }
  for (const m of cadena.matchAll(trozos)) {
    if (m[1] !== undefined) { sumar(m[1], m.index, true); continue; }
    for (const letra of m[0].matchAll(LETRA)) {
      const sale = normal(letra[0], plegar);
      if (sale) sumar(sale, m.index + letra.index, sale.length === letra[0].length);
    }
  }
  const largo = texto.length;
  function origen(i) {
    if (i >= largo) return cadena.length;
    let a = 0, b = mapa.length / 3 - 1;
    while (a < b) {
      const medio = (a + b + 1) >> 1;
      if (mapa[medio * 3] <= i) a = medio; else b = medio - 1;
    }
    return mapa[a * 3 + 2] ? mapa[a * 3 + 1] + (i - mapa[a * 3]) : mapa[a * 3 + 1];
  }
  const fin = i => (i >= largo ? cadena.length : Math.max(origen(i), i > 0 ? origen(i - 1) + 1 : 0));
  return { texto, origen, fin };
}

// Un nombre plegado igual que la copia plegada, para compararlo con ella.
export const plegar = nombre => normal(nombre, true);
