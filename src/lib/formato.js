// Utilidades de formato: pesos colombianos, fechas e ids.

const formatoCOP = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** 20000 -> "$ 20.000" ; -5000 -> "−$ 5.000" (con espacio que no se parte) */
export function pesos(valor) {
  const n = Math.round(Number(valor) || 0);
  const texto = `$\u00A0${formatoCOP.format(Math.abs(n))}`;
  return n < 0 ? `−${texto}` : texto;
}

/** 20000 -> "20.000" (para los campos de monto) */
export function miles(valor) {
  return valor === '' || valor == null ? '' : formatoCOP.format(Number(valor));
}

const dos = (n) => String(n).padStart(2, '0');

/** Fecha y hora local en texto legible y ordenable: "2026-10-05 14:30:00" */
export function fechaAhora(d = new Date()) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ` +
    `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

/** "2026-10-05 14:30:00" -> Date */
export function leerFecha(texto) {
  if (!texto) return null;
  const d = new Date(String(texto).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Para <input type="datetime-local">: "2026-10-05T14:30" */
export const fechaAInput = (texto) => String(texto).slice(0, 16).replace(' ', 'T');
/** De <input type="datetime-local"> a nuestro formato */
export const inputAFecha = (valor) => `${valor.replace('T', ' ')}:00`;

export function hora(texto) {
  const d = leerFecha(texto);
  return d ? d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }) : '';
}

/** "Hoy", "Ayer" o "lunes, 5 de octubre" (con año si no es el actual) */
export function etiquetaDia(clave) {
  const d = leerFecha(`${clave} 00:00:00`);
  if (!d) return clave;
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (clave === fechaAhora(hoy).slice(0, 10)) return 'Hoy';
  if (clave === fechaAhora(ayer).slice(0, 10)) return 'Ayer';
  const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== hoy.getFullYear()) opciones.year = 'numeric';
  const texto = d.toLocaleDateString('es-CO', opciones);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Hoy, 3:45 p. m." / "5 oct 2026, 3:45 p. m." */
export function fechaCorta(texto) {
  const dia = etiquetaDia(String(texto).slice(0, 10));
  return `${dia}, ${hora(texto)}`;
}

/** "2026-10" -> "Octubre 2026" */
export function nombreMes(clave) {
  const d = leerFecha(`${clave}-01 00:00:00`);
  if (!d) return clave;
  const t = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function generarId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
