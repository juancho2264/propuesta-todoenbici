# Propuesta de rediseño · Mapa de alertas para ciclistas

> **Maqueta de propuesta.** No es el sitio oficial de TodoEnBici. Las denuncias son **datos de ejemplo inventados**.

Idea: que las denuncias de robos lleguen al mapa **sin cargarlas a mano**, con moderación, y que el mapa marque solo las zonas peligrosas.

## Qué muestra la maqueta

- **Mapa de alertas** (Leaflet + OpenStreetMap) con filtros por barrio, tipo y período.
- **Zonas peligrosas automáticas:** con 3 o más denuncias a menos de 150 m, la zona se marca sola (la misma regla que hoy se aplica a mano).
- **Lista de últimas alertas:** tocar una lleva el mapa a esa zona.
- **Formulario de denuncia** con ubicación en el mapa. En la maqueta no envía nada: muestra la denuncia como "pendiente de revisión" solo en tu pantalla.
- **Privacidad:** nunca se muestra el punto exacto; cada zona se ubica en el promedio de sus denuncias.

## Cómo funcionaría la versión real

1. El ciclista denuncia desde la web (el WhatsApp sigue disponible).
2. La denuncia se guarda en una **planilla de Google Sheets** del equipo.
3. El equipo la **aprueba** con un clic: nada se publica sin moderación.
4. El mapa se actualiza solo y recalcula las zonas peligrosas.

Se lanzaría **en paralelo** al mapa actual, importando sus datos históricos, para no arriesgar nada.

## Técnico

- HTML, CSS y JavaScript (módulos), sin frameworks ni compilación. Leaflet incluido en `vendor/`.
- La lógica de zonas está aislada en `js/zonas.js` y tiene tests:
  ```bash
  node --test js/zonas.test.js
  ```
- Para verla en tu compu: `npx serve .` (los módulos no funcionan abriendo el archivo con doble clic).

---

Hecho por [Juan Cruz Ferrandini](https://juancho2264.github.io/Portafolio/).
