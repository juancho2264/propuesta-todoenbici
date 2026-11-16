// Agrupa denuncias en zonas y aplica la regla de TodoEnBici:
// con 3 o más denuncias a menos de 150 metros entre sí, es una "zona peligrosa";
// con menos, se considera un hecho aislado.
//
// No depende del mapa ni del navegador: así se puede testear sola (ver zonas.test.js).

export const RADIO_METROS = 150;
export const MINIMO_ZONA_PELIGROSA = 3;

/**
 * Distancia aproximada en metros entre dos puntos.
 * Para distancias cortas alcanza con tratar la Tierra como plana (proyección equirectangular):
 * es mucho más simple que la fórmula exacta y el error es de centímetros.
 */
export function distanciaMetros(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const x = rad(b.lng - a.lng) * Math.cos(rad((a.lat + b.lat) / 2));
  const y = rad(b.lat - a.lat);
  return Math.hypot(x, y) * R;
}

/**
 * Devuelve una lista de zonas: { lat, lng, denuncias: [...], peligrosa }.
 *
 * Por qué no una grilla fija: si un grupo de denuncias cae justo en el borde entre dos celdas,
 * se parte en dos y ninguna mitad llega a 3. En cambio:
 *   1. buscamos la denuncia con más vecinas a menos de 150 m,
 *   2. armamos una zona con ella y esas vecinas,
 *   3. las sacamos de la lista y repetimos con las que quedan.
 * El centro de la zona es el promedio de sus denuncias: nunca un punto exacto (protege a quien denuncia).
 */
export function agruparEnZonas(denuncias, radio = RADIO_METROS) {
  let pendientes = [...denuncias];
  const zonas = [];

  while (pendientes.length) {
    const vecinas = (d) => pendientes.filter((otra) => distanciaMetros(d, otra) <= radio);
    let centro = pendientes[0];
    let grupo = vecinas(centro);
    for (const d of pendientes) {
      const suyas = vecinas(d);
      if (suyas.length > grupo.length) {
        centro = d;
        grupo = suyas;
      }
    }
    zonas.push({
      lat: promedio(grupo.map((d) => d.lat)),
      lng: promedio(grupo.map((d) => d.lng)),
      denuncias: grupo,
      peligrosa: grupo.length >= MINIMO_ZONA_PELIGROSA,
    });
    pendientes = pendientes.filter((d) => !grupo.includes(d));
  }
  return zonas;
}

/** Filtra por barrio, tipo y antigüedad. Un filtro vacío ("" o 0) no filtra nada. */
export function filtrar(denuncias, { barrio = '', tipo = '', dias = 0 } = {}) {
  return denuncias.filter((d) =>
    (!barrio || d.barrio === barrio) &&
    (!tipo || d.tipo === tipo) &&
    (!dias || d.haceDias <= dias));
}

const promedio = (numeros) => numeros.reduce((a, b) => a + b, 0) / numeros.length;
