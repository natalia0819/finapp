// Funciones puras sobre la lista de movimientos (ordenar, filtrar, agrupar, resumir).
import { redondear } from './moneda';

export const TEXTO_TIPO = { ingreso: 'Ingreso', gasto: 'Gasto', traslado: 'Traslado' };

/** Más reciente primero. El texto "AAAA-MM-DD HH:MM:SS" se ordena bien alfabéticamente. */
export const ordenarRecientes = (movs) => [...movs].sort((a, b) => b.fecha.localeCompare(a.fecha));

/** Meses con movimientos, más el actual, del más nuevo al más viejo: ["2026-10", "2026-09", ...] */
export function mesesDisponibles(movs, mesActual) {
  return [...new Set([mesActual, ...movs.map((m) => m.fecha.slice(0, 7))])].sort().reverse();
}

export function filtrar(movs, { mes, espacio, tipo }) {
  return movs.filter((m) =>
    (!mes || m.fecha.startsWith(mes)) &&
    (!tipo || m.tipo === tipo) &&
    (!espacio || m.espacio_id === espacio || m.espacio_destino_id === espacio));
}

/**
 * Total que entró y que salió.
 * Sin filtro de espacio, los traslados no cuentan (la plata no sale de tus espacios, solo se mueve).
 * Con filtro de espacio, un traslado cuenta como entrada o salida de ese espacio.
 */
export function resumen(movs, espacio) {
  let entro = 0;
  let salio = 0;
  for (const m of movs) {
    if (m.tipo === 'ingreso') entro += m.monto;
    else if (m.tipo === 'gasto') salio += m.monto;
    else if (m.tipo === 'traslado' && espacio) {
      if (m.espacio_destino_id === espacio) entro += m.monto;
      if (m.espacio_id === espacio) salio += m.monto;
    }
  }
  return { entro: redondear(entro), salio: redondear(salio) };
}

/** Agrupa por día: [{ dia: "2026-10-05", movs: [...] }, ...] */
export function agruparPorDia(movs) {
  const grupos = [];
  for (const m of ordenarRecientes(movs)) {
    const dia = m.fecha.slice(0, 10);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.movs.push(m);
    else grupos.push({ dia, movs: [m] });
  }
  return grupos;
}

/** Signo de un movimiento: +1 entra, −1 sale, 0 neutro. Con "relativoA", el traslado toma signo. */
export function signo(m, relativoA) {
  if (m.tipo === 'ingreso') return 1;
  if (m.tipo === 'gasto') return -1;
  if (relativoA === m.espacio_destino_id) return 1;
  if (relativoA === m.espacio_id) return -1;
  return 0;
}

/** El saldo NO se guarda: se calcula a partir de los movimientos. */
export function calcularSaldos(espacios, movimientos) {
  const saldos = Object.fromEntries(espacios.map((e) => [e.id, 0]));
  const sumar = (id, v) => { if (id in saldos) saldos[id] += v; };
  for (const m of movimientos) {
    if (m.tipo === 'ingreso') sumar(m.espacio_id, m.monto);
    else if (m.tipo === 'gasto') sumar(m.espacio_id, -m.monto);
    else if (m.tipo === 'traslado') {
      sumar(m.espacio_id, -m.monto);
      sumar(m.espacio_destino_id, m.monto);
    }
  }
  for (const id in saldos) saldos[id] = redondear(saldos[id]); // sin errores de centavos
  return saldos;
}

/**
 * Revisa si un cambio deja algún espacio en negativo.
 * quitar: ids de movimientos que se eliminan o se reemplazan; poner: movimientos nuevos o editados.
 * Solo se bloquea si un espacio termina en negativo Y queda peor que antes
 * (así, si ya había un negativo viejo, se puede corregir con ingresos o traslados hacia él).
 * Devuelve [{ espacio, saldo }] con los espacios que quedarían mal (vacío = todo bien).
 */
export function validarCambio(espacios, movimientos, quitar = [], poner = []) {
  const antes = calcularSaldos(espacios, movimientos);
  const despues = calcularSaldos(espacios, [...movimientos.filter((m) => !quitar.includes(m.id)), ...poner]);
  return Object.keys(despues)
    .filter((id) => despues[id] < 0 && despues[id] < antes[id])
    .map((id) => ({ espacio: espacios.find((e) => e.id === id), saldo: despues[id] }));
}
