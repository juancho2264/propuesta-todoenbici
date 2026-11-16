// Tests con el runner que trae Node (sin instalar nada):  node --test js/zonas.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { agruparEnZonas, distanciaMetros, filtrar } from './zonas.js';

const denuncia = (lat, lng, extra = {}) => ({ lat, lng, barrio: 'Palermo', tipo: 'robo', haceDias: 1, ...extra });

test('tres denuncias a pocos metros forman una zona peligrosa', () => {
  const zonas = agruparEnZonas([
    denuncia(-34.58101, -58.42101), denuncia(-34.58105, -58.42108), denuncia(-34.58109, -58.42103),
  ]);
  assert.equal(zonas.length, 1);
  assert.equal(zonas[0].peligrosa, true);
});

test('dos denuncias juntas son hechos aislados, no zona peligrosa', () => {
  const [zona] = agruparEnZonas([denuncia(-34.58101, -58.42101), denuncia(-34.58105, -58.42108)]);
  assert.equal(zona.peligrosa, false);
});

test('denuncias a más de 150 m caen en zonas distintas', () => {
  const zonas = agruparEnZonas([denuncia(-34.581, -58.421), denuncia(-34.592, -58.421)]);
  assert.equal(zonas.length, 2);
});

test('un grupo no se parte aunque caiga en el borde de una cuadrícula', () => {
  // Cinco denuncias en ~80 m alrededor de un punto: con una grilla fija se partían en dos
  const base = { lat: -34.5810, lng: -58.4210 };
  const zonas = agruparEnZonas([0, 1, 2, 3, 4].map((i) =>
    denuncia(base.lat + (i - 2) * 0.0003, base.lng + (i % 2 ? 0.0003 : -0.0003))));
  assert.equal(zonas.filter((z) => z.peligrosa).length, 1);
});

test('la distancia es razonable: una cuadra de Buenos Aires mide ~100 m', () => {
  const metros = distanciaMetros({ lat: -34.6000, lng: -58.4000 }, { lat: -34.6009, lng: -58.4000 });
  assert.ok(metros > 95 && metros < 105, metros);
});

test('el centro de la zona es el promedio, no una dirección exacta', () => {
  const [zona] = agruparEnZonas([denuncia(-34.58100, -58.42100), denuncia(-34.58110, -58.42110)]);
  assert.ok(Math.abs(zona.lat - -34.58105) < 1e-9);
});

test('los filtros se combinan y un filtro vacío no filtra', () => {
  const lista = [
    denuncia(0, 0, { barrio: 'Palermo', tipo: 'robo', haceDias: 3 }),
    denuncia(0, 0, { barrio: 'Flores', tipo: 'robo_arma', haceDias: 40 }),
  ];
  assert.equal(filtrar(lista).length, 2);
  assert.equal(filtrar(lista, { barrio: 'Flores' }).length, 1);
  assert.equal(filtrar(lista, { dias: 30 }).length, 1);
  assert.equal(filtrar(lista, { barrio: 'Palermo', tipo: 'robo_arma' }).length, 0);
});
