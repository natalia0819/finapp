// Exportar movimientos a Excel (.xlsx), generado en el navegador (sin servidor).
import { fechaAhora } from './formato';

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

const nombreArchivo = () => `registro-finanzas-${fechaAhora().slice(0, 10)}.xlsx`;

/** Excel con el estilo de tu registro de finanzas. La librería se carga solo cuando se usa. */
export async function exportarExcel(movimientos, espacios, todos = movimientos, deudas = [], abonos = []) {
  const [{ default: escribirExcel }, { armarHojas }] = await Promise.all([
    import('write-excel-file/browser'),
    import('./excelRegistro'),
  ]);
  const blob = await escribirExcel(armarHojas(movimientos, espacios, todos, deudas, abonos), { fontFamily: 'Bahnschrift Light Condensed', fontSize: 11 }).toBlob();
  descargar(blob, nombreArchivo());
}
