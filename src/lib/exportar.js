// Exportar movimientos a Excel (.xlsx) o CSV, generados en el navegador (sin servidor).
import { TEXTO_TIPO } from './movimientos';
import { fechaAhora } from './formato';
import { codigoMoneda } from './moneda';

function filas(movimientos, espacios) {
  const nombre = (id) => espacios.find((e) => e.id === id)?.nombre ?? '';
  return [...movimientos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => ({
      fecha: m.fecha,
      tipo: TEXTO_TIPO[m.tipo] ?? m.tipo,
      // Con signo: + entra, − sale. Los traslados van en positivo (no cambian tu total).
      monto: m.tipo === 'gasto' ? -m.monto : m.monto,
      espacio: nombre(m.espacio_id),
      destino: nombre(m.espacio_destino_id),
      descripcion: m.descripcion,
    }));
}

const encabezados = () => ['Fecha', 'Tipo', `Monto (${codigoMoneda()})`, 'Espacio', 'Espacio destino', 'Descripción'];

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const nombreArchivo = (ext) => `registro-finanzas-${fechaAhora().slice(0, 10)}.${ext}`;

/** CSV con ";" (Excel en español lo abre en columnas) y BOM para que se vean bien las tildes. */
export function exportarCSV(movimientos, espacios) {
  const escapar = (v) => {
    const t = String(v ?? '');
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lineas = [encabezados(), ...filas(movimientos, espacios).map(Object.values)]
    .map((f) => f.map(escapar).join(';'));
  descargar(new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), nombreArchivo('csv'));
}

/** Excel con el estilo de tu registro de finanzas. La librería se carga solo cuando se usa. */
export async function exportarExcel(movimientos, espacios, todos = movimientos) {
  const [{ default: escribirExcel }, { armarHojas }] = await Promise.all([
    import('write-excel-file/browser'),
    import('./excelRegistro'),
  ]);
  const blob = await escribirExcel(armarHojas(movimientos, espacios, todos), { fontFamily: 'Bahnschrift Light Condensed', fontSize: 11 }).toBlob();
  descargar(blob, nombreArchivo('xlsx'));
}
