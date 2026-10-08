// Monedas que puede elegir cada persona. La clave (código ISO) se guarda en la hoja (pestaña Perfil, columna "moneda").
// Cambiar la moneda NO convierte los montos: solo cambia cómo se muestran y si se permiten centavos.

export const MONEDAS = {
  COP: { nombre: 'Peso colombiano', simbolo: '$', locale: 'es-CO', decimales: 0 },
  USD: { nombre: 'Dólar', simbolo: 'US$', locale: 'en-US', decimales: 2 },
  EUR: { nombre: 'Euro', simbolo: '€', locale: 'es-ES', decimales: 2, simboloDespues: true },
  MXN: { nombre: 'Peso mexicano', simbolo: '$', locale: 'es-MX', decimales: 2 },
  PEN: { nombre: 'Sol peruano', simbolo: 'S/', locale: 'es-PE', decimales: 2 },
  VES: { nombre: 'Bolívar', simbolo: 'Bs.', locale: 'es-VE', decimales: 2 },
  CLP: { nombre: 'Peso chileno', simbolo: '$', locale: 'es-CL', decimales: 0 },
  ARS: { nombre: 'Peso argentino', simbolo: '$', locale: 'es-AR', decimales: 2 },
};

export const MONEDA_POR_DEFECTO = 'COP';

let actual = MONEDA_POR_DEFECTO;

/** Cambia la moneda con la que se muestran los montos en toda la app. */
export function usarMoneda(codigo) {
  actual = MONEDAS[codigo] ? codigo : MONEDA_POR_DEFECTO;
}

/** Código de la moneda actual ("COP", "EUR"...). */
export const codigoMoneda = () => actual;

/** Datos de la moneda actual (o de la que se pida). */
export const datosMoneda = (codigo = actual) => MONEDAS[codigo] ?? MONEDAS[MONEDA_POR_DEFECTO];

/** Redondea al número de decimales de la moneda (evita errores como 0.1 + 0.2 = 0.30000000000000004). */
export function redondear(valor, codigo = actual) {
  const f = 10 ** datosMoneda(codigo).decimales;
  return Math.round((Number(valor) || 0) * f) / f;
}

/** Separadores de miles y de decimales de la moneda: { miles: '.', decimal: ',' } */
export function separadores(codigo = actual) {
  const partes = new Intl.NumberFormat(datosMoneda(codigo).locale, { useGrouping: 'always' }).formatToParts(12345.6);
  return {
    miles: partes.find((p) => p.type === 'group')?.value ?? '.',
    decimal: partes.find((p) => p.type === 'decimal')?.value ?? ',',
  };
}
