// Deudas: lo que debo y lo que me deben. Funciones puras (no hablan con Google).
//
// Cada deuda tiene un monto inicial. En la pestaña "Abonos" se anotan dos clases de registros:
//   - abono:   un pago (baja lo pendiente)
//   - aumento: "sumar a la deuda" (una compra con la tarjeta, intereses, otro préstamo)
// Lo pendiente NO se guarda: se calcula = monto inicial + aumentos − abonos.
import { redondear } from './moneda';

export const TIPOS_DEUDA = { debo: 'Debo', me_deben: 'Me deben' };

/** Totales de una deuda a partir de sus registros. */
export function resumenDeuda(deuda, registros) {
  let aumentos = 0;
  let abonado = 0;
  for (const r of registros) {
    if (r.deuda_id !== deuda.id) continue;
    if (r.tipo === 'aumento') aumentos += r.monto;
    else abonado += r.monto;
  }
  const total = redondear(Number(deuda.monto || 0) + aumentos);
  abonado = redondear(abonado);
  const pendiente = redondear(Math.max(0, total - abonado));
  const pct = total > 0 ? Math.min(100, Math.round((abonado / total) * 100)) : 0;
  return { total, abonado, pendiente, pct, pagada: total > 0 && pendiente === 0 };
}

/** Registros de una deuda, del más reciente al más viejo. */
export const registrosDe = (deuda, registros) =>
  registros.filter((r) => r.deuda_id === deuda.id).sort((a, b) => b.fecha.localeCompare(a.fecha));

/** Agrupa las deudas para la pantalla: lo que debo, lo que me deben y las pagadas, con sus totales. */
export function agruparDeudas(deudas, registros) {
  const grupos = { debo: [], me_deben: [], pagadas: [] };
  const totales = { debo: 0, me_deben: 0 };
  for (const d of deudas) {
    const r = resumenDeuda(d, registros);
    const item = { deuda: d, ...r };
    if (r.pagada) grupos.pagadas.push(item);
    else {
      grupos[d.tipo === 'me_deben' ? 'me_deben' : 'debo'].push(item);
      totales[d.tipo === 'me_deben' ? 'me_deben' : 'debo'] += r.pendiente;
    }
  }
  // Primero las que tienen el próximo pago más cercano; luego las más recientes.
  const cuando = (x) => { const p = proximoPago(x.deuda, registros); return p ? aTexto(p.fecha) : '9999'; };
  const orden = (a, b) => cuando(a).localeCompare(cuando(b)) || b.deuda.fecha.localeCompare(a.deuda.fecha);
  grupos.debo.sort(orden);
  grupos.me_deben.sort(orden);
  grupos.pagadas.sort((a, b) => b.deuda.fecha.localeCompare(a.deuda.fecha));
  return { grupos, totales: { debo: redondear(totales.debo), me_deben: redondear(totales.me_deben) } };
}

/** "2026-11-15" -> "15 nov 2026" */
export function fechaDia(texto) {
  if (!texto) return '';
  const d = new Date(`${String(texto).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(texto);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '').replace(/ de /g, ' ');
}

// ---------------- Fecha de pago ----------------
// Se guarda en la columna "fecha_limite" de la hoja:
//   ""                -> sin fecha
//   "2026-10-30"      -> una sola vez
//   "cada mes el 30"  -> todos los meses ese día

/** Lee lo guardado: { modo: 'sin' | 'una' | 'mes', fecha?: "AAAA-MM-DD", dia?: número } */
export function leerFechaPago(valor) {
  const t = String(valor ?? '').trim();
  if (!t) return { modo: 'sin' };
  if (/mes/i.test(t)) {
    const dia = Math.min(31, Math.max(1, parseInt(t.match(/\d+/)?.[0] ?? '1', 10)));
    return { modo: 'mes', dia };
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return { modo: 'una', fecha: t.slice(0, 10) };
  return { modo: 'sin' };
}

/** Lo que se guarda en la hoja. */
export function guardarFechaPago(modo, { fecha, dia } = {}) {
  if (modo === 'una' && fecha) return fecha;
  if (modo === 'mes' && dia) return `cada mes el ${dia}`;
  return '';
}

const aTexto = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** El día "dia" del mes (año, mes), o el último día si ese mes es más corto (30 de febrero -> 28/29). */
const diaDelMes = (anio, mes, dia) => new Date(anio, mes, Math.min(dia, new Date(anio, mes + 1, 0).getDate()));

/** "30 oct" (con año solo si no es este año). */
export function diaCorto(d) {
  const opciones = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric';
  return d.toLocaleDateString('es-CO', opciones).replace('.', '').replace(/ de /g, ' ');
}

/**
 * Próxima fecha de pago y si está atrasada.
 * Cada mes: si ya hubo un abono este mes, el próximo es el mes siguiente; si no, el de este mes
 * (atrasado si ya pasó). Los meses antes de crear la deuda no cuentan.
 * Devuelve null si la deuda no tiene fecha.
 */
export function proximoPago(deuda, registros, hoy = new Date()) {
  const fp = leerFechaPago(deuda.fecha_limite);
  const hoyCero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (fp.modo === 'una') {
    const d = new Date(`${fp.fecha}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return { fecha: d, atrasado: d < hoyCero, modo: 'una' };
  }
  if (fp.modo !== 'mes') return null;
  const mesActual = aTexto(hoyCero).slice(0, 7);
  const abonoEsteMes = registros.some((r) => r.deuda_id === deuda.id && r.tipo === 'abono' && r.fecha.startsWith(mesActual));
  let fecha = diaDelMes(hoyCero.getFullYear(), hoyCero.getMonth(), fp.dia);
  const creada = new Date(`${String(deuda.fecha).slice(0, 10)}T00:00:00`);
  // Si ya abonó este mes, o la deuda se creó después del día de pago de este mes: toca el mes siguiente.
  if (abonoEsteMes || (!Number.isNaN(creada.getTime()) && fecha < creada)) {
    fecha = diaDelMes(hoyCero.getFullYear(), hoyCero.getMonth() + 1, fp.dia);
  }
  return { fecha, atrasado: fecha < hoyCero, modo: 'mes', dia: fp.dia };
}

/** Texto corto para la lista: "Cada mes, el 5 · próximo 5 nov", "Pago 30 oct" o "Pago atrasado · 1 oct". */
export function textoPago(deuda, registros) {
  const p = proximoPago(deuda, registros);
  if (!p) return { texto: '', atrasado: false };
  if (p.atrasado) return { texto: `Pago atrasado · ${diaCorto(p.fecha)}`, atrasado: true };
  if (p.modo === 'mes') return { texto: `Cada mes, el ${p.dia} · próximo ${diaCorto(p.fecha)}`, atrasado: false };
  return { texto: `Pago ${diaCorto(p.fecha)}`, atrasado: false };
}

/** Texto para el detalle y el Excel: "5 de cada mes", "30 oct" o "Sin fecha". */
export function describirFechaPago(valor) {
  const fp = leerFechaPago(valor);
  if (fp.modo === 'mes') return `${fp.dia} de cada mes`;
  if (fp.modo === 'una') return diaCorto(new Date(`${fp.fecha}T00:00:00`));
  return 'Sin fecha';
}