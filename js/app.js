// Maqueta de propuesta para TodoEnBici: mapa de alertas con filtros, lista y formulario de denuncia.
// Leaflet (L) se carga como script normal en el HTML; este archivo es un módulo.
import { agruparEnZonas, filtrar, RADIO_METROS } from './zonas.js';

const CENTRO_CABA = [-34.605, -58.43];
const TIPOS = { robo_arma: 'Robo con arma', robo: 'Robo sin arma', intento: 'Intento de robo' };
const COLORES = { zona: '#d6402b', aislado: '#f08c2b', pendiente: '#6b7280' };

const estado = { denuncias: [], pendientes: [], filtros: { barrio: '', tipo: '', dias: 30 } };
let mapa, capa, miniMapa, marcadorElegido;

// ---------- Utilidades ----------

/** Crea un elemento con texto seguro (nunca innerHTML con datos: evita inyección de código). */
function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto != null) nodo.textContent = texto;
  return nodo;
}

const haceCuanto = (dias) => (dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`);
const plural = (n, palabra, plural_ = `${palabra}s`) => `${n} ${n === 1 ? palabra : plural_}`;

// ---------- Mapa principal ----------

// Mapas base. Todos usan datos de OpenStreetMap; cambia el estilo con que se dibujan.
const OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAPAS_BASE = {
  // CyclOSM: estilo pensado para bicicletas, resalta ciclovías y bicisendas
  Ciclovías: () => L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 19, subdomains: 'abc', attribution: `${OSM} · Estilo <a href="https://www.cyclosm.org">CyclOSM</a>`,
  }),
  Calles: () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM }),
};

/** Crea un mapa con un mapa base inicial y un selector para cambiarlo. */
function crearMapa(id, { base = 'Calles', selector = true, ...opciones } = {}) {
  const m = L.map(id, { zoomControl: true, scrollWheelZoom: false, ...opciones }).setView(CENTRO_CABA, 12);
  // Leaflet muestra por defecto una banderita junto a su nombre: dejamos solo el crédito, que es lo que pide su licencia
  m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  const capas = Object.fromEntries(Object.entries(MAPAS_BASE).map(([nombre, crear]) => [nombre, crear()]));
  capas[base].addTo(m);
  if (selector) L.control.layers(capas, null, { position: 'topright' }).addTo(m);
  return m;
}

function dibujarMapa() {
  const visibles = filtrar(estado.denuncias, estado.filtros);
  const zonas = agruparEnZonas(visibles);
  capa.clearLayers();

  for (const zona of zonas) {
    const cantidad = zona.denuncias.length;
    const marca = zona.peligrosa
      ? L.circle([zona.lat, zona.lng], { radius: RADIO_METROS, color: COLORES.zona, weight: 2, fillOpacity: 0.25 })
      : L.circleMarker([zona.lat, zona.lng], { radius: 6, color: '#fff', weight: 1.5, fillColor: COLORES.aislado, fillOpacity: 0.95 });
    marca.bindPopup(contenidoPopup(zona));
    marca.addTo(capa);
    if (zona.peligrosa) {
      L.marker([zona.lat, zona.lng], {
        icon: L.divIcon({ className: 'icono-zona', html: `<span>⚠ ${cantidad}</span>`, iconSize: [46, 24] }),
        keyboard: false,
      }).bindPopup(contenidoPopup(zona)).addTo(capa);
    }
  }

  // Las denuncias que la persona cargó en esta maqueta: grises, "pendientes de revisión"
  for (const d of estado.pendientes) {
    L.circleMarker([d.lat, d.lng], { radius: 8, color: COLORES.pendiente, dashArray: '3 3', weight: 2, fillOpacity: 0.2 })
      .bindPopup(contenidoPopup({ denuncias: [d], pendiente: true }))
      .addTo(capa);
  }

  dibujarLista(visibles);
  actualizarCifras();
}

function contenidoPopup(zona) {
  const caja = el('div', 'popup');
  if (zona.pendiente) {
    caja.append(el('strong', null, 'Tu denuncia · pendiente de revisión'));
  } else if (zona.peligrosa) {
    caja.append(el('strong', null, `Zona peligrosa · ${plural(zona.denuncias.length, 'denuncia')}`));
  } else {
    caja.append(el('strong', null, zona.denuncias.length > 1 ? `${zona.denuncias.length} hechos aislados` : 'Hecho aislado'));
  }
  const lista = el('ul');
  for (const d of [...zona.denuncias].sort((a, b) => a.haceDias - b.haceDias).slice(0, 4)) {
    lista.append(el('li', null, `${TIPOS[d.tipo]} · ${d.franja.toLowerCase()} · ${haceCuanto(d.haceDias)}`));
  }
  caja.append(lista);
  return caja;
}

// ---------- Lista de últimas alertas ----------

function dibujarLista(visibles) {
  const lista = document.getElementById('lista-alertas');
  const ultimas = [...visibles].sort((a, b) => a.haceDias - b.haceDias).slice(0, 8);
  if (!ultimas.length) {
    lista.replaceChildren(el('li', 'alertas__vacia', 'No hay denuncias con estos filtros.'));
    return;
  }
  lista.replaceChildren(...ultimas.map((d) => {
    const item = el('li');
    const boton = el('button', `alerta alerta--${d.tipo}`);
    boton.type = 'button';
    boton.append(
      el('span', 'alerta__tipo', TIPOS[d.tipo]),
      el('span', 'alerta__lugar', `${d.barrio} · ${d.franja.toLowerCase()} · ${haceCuanto(d.haceDias)}`),
      el('span', 'alerta__detalle', d.detalle),
    );
    // Tocar una alerta lleva el mapa a esa zona
    boton.addEventListener('click', () => {
      mapa.flyTo([d.lat, d.lng], 16, { duration: 0.8 });
      document.getElementById('mapa-principal').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    item.append(boton);
    return item;
  }));
}

function actualizarCifras() {
  const ultimos30 = filtrar(estado.denuncias, { dias: 30 });
  document.getElementById('cifra-30').textContent = ultimos30.length;
  document.getElementById('cifra-zonas').textContent = agruparEnZonas(ultimos30).filter((z) => z.peligrosa).length;
}

// ---------- Filtros ----------

function iniciarFiltros(barrios) {
  const form = document.getElementById('filtros');
  form.barrio.append(...barrios.map((b) => new Option(b, b)));
  form.addEventListener('change', () => {
    estado.filtros = { barrio: form.barrio.value, tipo: form.tipo.value, dias: Number(form.dias.value) };
    dibujarMapa();
  });
}

// ---------- Formulario de denuncia ----------

function iniciarDenuncia(barrios) {
  const dialogo = document.getElementById('dialogo-denuncia');
  const form = document.getElementById('form-denuncia');
  const enviada = document.getElementById('denuncia-enviada');
  const error = document.getElementById('error-denuncia');
  form.barrio.append(...barrios.map((b) => new Option(b, b)));
  form.fecha.max = new Date().toISOString().slice(0, 10);

  const abrir = () => {
    form.reset();
    form.hidden = false;
    enviada.hidden = true;
    error.textContent = '';
    form.fecha.value = form.fecha.max;
    dialogo.showModal();
    // El mini mapa se crea recién cuando el diálogo es visible (Leaflet necesita saber el tamaño)
    if (!miniMapa) {
      miniMapa = crearMapa('mini-mapa', { scrollWheelZoom: true, selector: false, base: 'Calles' });
      miniMapa.on('click', (e) => {
        error.textContent = '';
        if (marcadorElegido) marcadorElegido.setLatLng(e.latlng);
        else marcadorElegido = L.circleMarker(e.latlng, { radius: 9, color: COLORES.zona, weight: 3 }).addTo(miniMapa);
      });
    }
    if (marcadorElegido) {
      marcadorElegido.remove();
      marcadorElegido = null;
    }
    setTimeout(() => miniMapa.invalidateSize(), 50);
  };

  document.querySelectorAll('[data-abrir-denuncia]').forEach((b) => b.addEventListener('click', abrir));
  // El aviso de "falta completar" se borra apenas la persona empieza a corregir
  form.addEventListener('input', () => { error.textContent = ''; });
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo || e.target.closest('[data-cerrar]')) dialogo.close();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const faltan = [];
    if (!form.tipo.value) faltan.push('qué pasó');
    if (!form.barrio.value) faltan.push('el barrio');
    if (!marcadorElegido) faltan.push('dónde fue (tocá el mapa)');
    if (faltan.length) {
      error.textContent = `Falta completar: ${faltan.join(', ')}.`;
      return;
    }
    const { lat, lng } = marcadorElegido.getLatLng();
    const dias = Math.max(0, Math.round((Date.now() - new Date(`${form.fecha.value}T12:00`)) / 864e5));
    estado.pendientes.push({
      tipo: form.tipo.value, barrio: form.barrio.value, franja: form.franja.value,
      haceDias: dias, detalle: form.detalle.value.trim(), lat, lng,
    });
    form.hidden = true;
    enviada.hidden = false;
    dibujarMapa();
  });

  dialogo.addEventListener('close', () => {
    const ultima = estado.pendientes.at(-1);
    if (!enviada.hidden && ultima) mapa.flyTo([ultima.lat, ultima.lng], 15, { duration: 0.8 });
  });
}

// ---------- Arranque ----------

async function iniciar() {
  const respuesta = await fetch('data/denuncias-ejemplo.json');
  estado.denuncias = (await respuesta.json()).denuncias;
  const barrios = [...new Set(estado.denuncias.map((d) => d.barrio))].sort((a, b) => a.localeCompare(b, 'es'));

  mapa = crearMapa('mapa-principal');
  capa = L.layerGroup().addTo(mapa);
  crearMapa('mapa-ciclovias', { base: 'Ciclovías' });
  iniciarFiltros(barrios);
  iniciarDenuncia(barrios);
  dibujarMapa();
}

// Leaflet se carga con "defer": esperamos a que el documento termine de cargar
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
