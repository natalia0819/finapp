// Utilidades de formato: dinero (según la moneda elegida), fechas e ids.
import { datosMoneda, redondear } from './moneda';

/** Monto con símbolo y formato de la moneda actual: "$ 20.000", "US$ 6.75", "4,50 €". Negativos con "−". */
export function pesos(valor) {
  const m = datosMoneda();
  const n = redondear(valor);
  const numero = new Intl.NumberFormat(m.locale, {
    minimumFractionDigits: m.decimales, maximumFractionDigits: m.decimales, useGrouping: 'always',
  }).format(Math.abs(n));
  const texto = m.simboloDespues ? `${numero}\u00A0${m.simbolo}` : `${m.simbolo}\u00A0${numero}`; // espacio que no se parte
  return n < 0 ? `−${texto}` : texto;
}

/** Número sin símbolo, con separadores de la moneda actual: 20000 -> "20.000" */
export function miles(valor) {
  if (valor === '' || valor == null) return '';
  const m = datosMoneda();
  return new Intl.NumberFormat(m.locale, { maximumFractionDigits: m.decimales, useGrouping: 'always' }).format(Number(valor));
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
