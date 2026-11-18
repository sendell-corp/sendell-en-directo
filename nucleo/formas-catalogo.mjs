// Catálogo de las formas vivas: por forma, el nombre que ve el visitante (español e inglés) y su familia.
// Sirve a la web para que cada visitante elija la forma de su propio agente. La clave es el nombre interno de formas.mjs.
export const FAMILIAS = {
  animales: 'animales',
  maquinas: 'robots y máquinas',
  '3d': 'cuerpos en 3D',
  oficios: 'objetos de oficio',
  naturaleza: 'naturaleza',
  simbolos: 'símbolos',
};

const f = (familia, lista) => Object.fromEntries(lista.map(([n, es, en]) => [n, { es, en, familia }]));

export const CATALOGO = {
  ...f('animales', [
    ['arana', 'araña', 'spider'], ['gato', 'gato', 'cat'], ['perro', 'perro', 'dog'], ['pajaro', 'pájaro', 'bird'], ['pez', 'pez', 'fish'],
    ['pulpo', 'pulpo', 'octopus'], ['mariposa', 'mariposa', 'butterfly'], ['serpiente', 'serpiente', 'snake'], ['tortuga', 'tortuga', 'turtle'],
    ['medusa', 'medusa', 'jellyfish'], ['murcielago', 'murciélago', 'bat'], ['hormiga', 'hormiga', 'ant'], ['escorpion', 'escorpión', 'scorpion'],
    ['cangrejo', 'cangrejo', 'crab'], ['buho', 'búho', 'owl'], ['caracol', 'caracol', 'snail'], ['conejo', 'conejo', 'rabbit'],
  ]),
  ...f('maquinas', [
    ['robot', 'robot', 'robot'], ['cuadrupedo', 'perro robot', 'robot dog'], ['brazo', 'brazo robótico', 'robotic arm'], ['dron', 'dron', 'drone'],
    ['engranaje', 'engranaje', 'gear'], ['esqueleto', 'esqueleto', 'skeleton rig'],
    ['rover', 'rover', 'rover'], ['cohete', 'cohete', 'rocket'], ['satelite', 'satélite', 'satellite'], ['submarino', 'submarino', 'submarine'],
    ['mano_robot', 'mano robótica', 'robotic hand'], ['coche', 'coche', 'car'], ['tren', 'tren', 'train'], ['grua', 'grúa', 'crane'],
    ['molino', 'molino', 'windmill'], ['avion', 'avión', 'airplane'], ['helicoptero', 'helicóptero', 'helicopter'], ['velero', 'velero', 'sailboat'],
    ['ovni', 'ovni', 'UFO'], ['bicicleta', 'bicicleta', 'bicycle'],
  ]),
  ...f('3d', [
    ['cubo', 'cubo', 'cube'], ['toro', 'toro', 'torus'], ['icosaedro', 'icosaedro', 'icosahedron'], ['helice', 'doble hélice', 'double helix'],
    ['malla', 'malla', 'mesh'], ['terreno', 'terreno', 'terrain'], ['mundo', 'mundo', 'globe'], ['atomo', 'átomo', 'atom'],
    ['piramide', 'pirámide', 'pyramid'], ['tetraedro', 'tetraedro', 'tetrahedron'], ['octaedro', 'octaedro', 'octahedron'],
    ['dodecaedro', 'dodecaedro', 'dodecahedron'], ['prisma', 'prisma', 'prism'], ['cilindro', 'cilindro', 'cylinder'], ['cono', 'cono', 'cone'],
    ['esfera', 'esfera', 'sphere'], ['diamante', 'diamante', 'diamond'], ['mobius', 'cinta de Möbius', 'Möbius strip'], ['nudo', 'nudo', 'trefoil knot'],
    ['espiral', 'espiral', 'spiral'], ['galaxia', 'galaxia', 'galaxy'], ['hipercubo', 'hipercubo', 'tesseract'], ['muelle', 'muelle', 'spring'],
    ['giroscopio', 'giroscopio', 'gyroscope'],
  ]),
  ...f('oficios', [
    ['camara', 'cámara de video', 'video camera'], ['documento', 'documento', 'document'], ['lupa', 'lupa', 'magnifying glass'],
    ['libro', 'libro', 'book'], ['balanza', 'balanza', 'scales'], ['llave', 'llave', 'key'], ['martillo', 'martillo', 'hammer'],
    ['pincel', 'pincel', 'paintbrush'], ['camara_fotos', 'cámara de fotos', 'photo camera'], ['guitarra', 'guitarra', 'guitar'],
    ['microfono', 'micrófono', 'microphone'], ['taza', 'taza', 'mug'], ['carrito', 'carrito de compra', 'shopping cart'],
    ['estetoscopio', 'estetoscopio', 'stethoscope'], ['casa', 'casa', 'house'], ['tienda', 'tienda', 'shop'],
    ['caja_registradora', 'caja registradora', 'cash register'], ['telefono', 'teléfono', 'phone'], ['portatil', 'portátil', 'laptop'],
    ['bombilla', 'bombilla', 'light bulb'], ['escudo', 'escudo', 'shield'], ['candado', 'candado', 'padlock'],
    ['reloj_arena', 'reloj de arena', 'hourglass'], ['brujula', 'brújula', 'compass'], ['telescopio', 'telescopio', 'telescope'],
    ['microscopio', 'microscopio', 'microscope'], ['sobre', 'sobre', 'envelope'],
  ]),
  ...f('naturaleza', [
    ['arbol', 'árbol', 'tree'], ['palmera', 'palmera', 'palm tree'], ['flor', 'flor', 'flower'], ['hoja', 'hoja', 'leaf'],
    ['cactus', 'cactus', 'cactus'], ['seta', 'seta', 'mushroom'], ['montana', 'montaña', 'mountain'], ['volcan', 'volcán', 'volcano'],
    ['nube', 'nube con lluvia', 'rain cloud'], ['sol', 'sol', 'sun'], ['luna', 'luna', 'moon'], ['ola', 'ola', 'wave'],
    ['llama', 'llama', 'flame'], ['copo', 'copo de nieve', 'snowflake'], ['planeta', 'planeta con anillo', 'ringed planet'],
  ]),
  ...f('simbolos', [
    ['corazon', 'corazón', 'heart'], ['estrella', 'estrella', 'star'], ['infinito', 'infinito', 'infinity'], ['flecha', 'flecha', 'arrow'],
    ['diana', 'diana', 'target'], ['nota', 'notas musicales', 'music notes'], ['bocadillo', 'bocadillo de diálogo', 'speech bubble'],
    ['interrogacion', 'signo de interrogación', 'question mark'], ['moneda', 'moneda', 'coin'], ['grafica', 'gráfica que sube', 'rising chart'],
    ['peon', 'peón de ajedrez', 'chess pawn'], ['torre', 'torre de ajedrez', 'chess rook'], ['corona', 'corona', 'crown'], ['reloj', 'reloj', 'clock'],
    ['wifi', 'wifi', 'wifi'], ['ubicacion', 'ubicación', 'location pin'], ['bandera', 'bandera', 'flag'], ['trofeo', 'trofeo', 'trophy'],
    ['yinyang', 'yin y yang', 'yin and yang'],
    ['onda', 'onda de sonido', 'sound wave'], ['ok', 'visto bueno', 'check mark'], ['rayo', 'rayo', 'lightning bolt'], ['red', 'red neuronal', 'neural network'],
  ]),
};
