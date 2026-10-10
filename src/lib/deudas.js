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
  // Primero las que tienen fecha límite más cercana; luego las más recientes.
  const orden = (a, b) => (a.deuda.fecha_limite || '9999').localeCompare(b.deuda.fecha_limite || '9999') || b.deuda.fecha.localeCompare(a.deuda.fecha);
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

/** "Vence 15 nov" para las tarjetas (sin año si es este año). */
export function textoLimite(texto, tipo) {
  if (!texto) return '';
  const d = new Date(`${String(texto).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const opciones = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric';
  const f = d.toLocaleDateString('es-CO', opciones).replace('.', '').replace(/ de /g, ' ');
  return tipo === 'me_deben' ? `Hasta ${f}` : `Vence ${f}`;
}
