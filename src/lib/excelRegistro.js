// Arma el contenido del Excel exportado, con el estilo del Excel de finanzas de la usuaria:
// letra Bahnschrift Light Condensed, lila fuerte para encabezados y totales, lila suave para
// las filas, amarillo para lo disponible, bordes finos y formato contable de pesos.
// No depende del navegador: así se puede probar también en Node.
import { calcularSaldos, medioDe, TEXTO_MEDIO } from './movimientos';
import { leerFecha } from './formato';
import { datosMoneda } from './moneda';

const LILA_FUERTE = '#D5ABFF';
const LILA_SUAVE = '#EAD5FF';
const AMARILLO = '#FFFFAB';
const AMARILLO_TOTAL = '#FFFF99';
const FUENTE = 'Bahnschrift Light Condensed';
// Formato contable de Excel con el símbolo y los decimales de la moneda elegida.
function formatoExcel() {
  const m = datosMoneda();
  const n = m.decimales > 0 ? '#,##0.00' : '#,##0';
  const cero = m.decimales > 0 ? '"-"??' : '"-"';
  if (m.simboloDespues) return `_-* ${n} "${m.simbolo}"_-;\\-* ${n} "${m.simbolo}"_-;_-* ${cero} "${m.simbolo}"_-;_-@_-`;
  return `_-"${m.simbolo}"* ${n}_-;\\-"${m.simbolo}"* ${n}_-;_-"${m.simbolo}"* ${cero}_-;_-@_-`;
}

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const TIPO = { ingreso: 'Ingreso', gasto: 'Gasto', traslado: 'Traslado' };

// ---------- Celdas con estilo ----------
const base = { fontFamily: FUENTE, fontSize: 11, borderStyle: 'thin', borderColor: '#000000', alignVertical: 'center' };
const texto = (value, extra = {}) => ({ ...base, type: String, value: String(value ?? ''), ...extra });
const dinero = (value, extra = {}) => ({ ...base, type: Number, value: Number(value) || 0, format: formatoExcel(), ...extra });
const formula = (value, extra = {}) => ({ ...base, type: 'Formula', value, format: formatoExcel(), ...extra });
const vacia = () => null;

/** Índice de columna (0 = A) a letra: 0→A, 27→AB */
function letra(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ---------- Hoja 1: Por mes (bloques lado a lado, como las quincenas del Excel original) ----------
function hojaPorMes(movimientos, espacios) {
  const meses = [...new Set(movimientos.map((m) => m.fecha.slice(0, 7)))].sort();
  const FILA_INICIO = 2; // fila 2, como en el Excel original (la 1 queda de aire)
  const bloques = []; // cada bloque: lista de filas de 2 celdas [concepto, monto]

  meses.forEach((mes, i) => {
    const col = 1 + i * 3; // B, E, H... (dos columnas por mes y una de separación)
    const L = letra(col);
    const M = letra(col + 1);
    const filas = [];
    const fila = () => FILA_INICIO + filas.length; // número de fila (1-based) de la siguiente fila
    const delMes = movimientos.filter((m) => m.fecha.startsWith(mes));
    const [anio, numMes] = mes.split('-');

    filas.push([texto(`${MESES[Number(numMes) - 1]} ${anio}`, { align: 'center', columnSpan: 2, fontWeight: 'bold' }), vacia()]);
    const filaEntroMes = fila();
    const ingresosMes = delMes.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    filas.push([texto('ENTRÓ EN EL MES', { backgroundColor: LILA_FUERTE }), dinero(ingresosMes, { backgroundColor: LILA_FUERTE })]);
    filas.push([null, null]);

    const filasTotalGasto = [];
    for (const e of espacios) {
      const suyos = delMes.filter((m) => m.espacio_id === e.id || m.espacio_destino_id === e.id);
      if (!suyos.length) continue;
      const entro = suyos.reduce((s, m) =>
        s + (m.tipo === 'ingreso' && m.espacio_id === e.id ? m.monto : 0)
          + (m.tipo === 'traslado' && m.espacio_destino_id === e.id ? m.monto : 0), 0);
      const salidas = suyos
        .filter((m) => (m.tipo === 'gasto' && m.espacio_id === e.id) || (m.tipo === 'traslado' && m.espacio_id === e.id))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      filas.push([texto(e.nombre.toUpperCase() + (e.activo ? '' : ' (ARCHIVADO)'), { align: 'center', columnSpan: 2, backgroundColor: LILA_FUERTE }), vacia()]);
      const filaEntro = fila();
      filas.push([texto('INGRESOS', { backgroundColor: LILA_FUERTE }), dinero(entro, { backgroundColor: LILA_FUERTE })]);

      const desde = fila();
      for (const m of salidas) {
        const concepto = m.tipo === 'traslado'
          ? `Traslado a ${espacios.find((x) => x.id === m.espacio_destino_id)?.nombre ?? 'otro espacio'}`
          : (m.descripcion || 'Gasto');
        filas.push([texto(concepto, { backgroundColor: LILA_SUAVE }), dinero(m.monto, { backgroundColor: LILA_SUAVE })]);
      }
      if (!salidas.length) filas.push([texto('Sin gastos', { backgroundColor: LILA_SUAVE, textColor: '#7A6A8F' }), dinero(0, { backgroundColor: LILA_SUAVE })]);
      const hasta = fila() - 1;

      const filaTotal = fila();
      filasTotalGasto.push(filaTotal);
      filas.push([texto('TOTAL SALIDAS', { backgroundColor: LILA_FUERTE }), formula(`=SUM(${M}${desde}:${M}${hasta})`, { backgroundColor: LILA_FUERTE })]);
      filas.push([texto('RESTANTE', { backgroundColor: LILA_SUAVE }), formula(`=${M}${filaEntro}-${M}${filaTotal}`, { backgroundColor: LILA_SUAVE })]);
      filas.push([null, null]);
    }

    // Pie del mes: solo cuentan los gastos (los traslados mueven plata entre espacios, no la gastan).
    const gastosMes = delMes.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    const filaGastado = fila();
    filas.push([texto('TOTAL GASTADO EN EL MES', { backgroundColor: LILA_FUERTE }), dinero(gastosMes, { backgroundColor: LILA_FUERTE })]);
    filas.push([texto('DISPONIBLE', { backgroundColor: AMARILLO, fontWeight: 'bold' }),
      formula(`=${M}${filaEntroMes}-${M}${filaGastado}`, { backgroundColor: AMARILLO, fontWeight: 'bold' })]);

    bloques.push({ col, filas, L });
  });

  // Unir los bloques en una sola cuadrícula.
  const alto = Math.max(1, ...bloques.map((b) => b.filas.length));
  const ancho = 1 + bloques.length * 3;
  const datos = [Array(ancho).fill(null)]; // fila 1 vacía
  for (let r = 0; r < alto; r++) {
    const fila = Array(ancho).fill(null);
    for (const b of bloques) {
      const celdas = b.filas[r];
      if (celdas) { fila[b.col] = celdas[0]; fila[b.col + 1] = celdas[1]; }
    }
    datos.push(fila);
  }
  const columnas = [{ width: 4.7 }];
  bloques.forEach(() => columnas.push({ width: 26 }, { width: 18 }, { width: 4.7 }));
  return { sheet: 'Por mes', data: datos, columns: columnas };
}

// ---------- Hoja 2: Movimientos (detalle) ----------
function hojaMovimientos(movimientos, espacios) {
  const nombre = (id) => espacios.find((e) => e.id === id)?.nombre ?? '';
  const encabezado = ['Fecha', 'Tipo', 'Espacio', 'Hacia (traslados)', 'Descripción', 'Medio', 'Entró', 'Salió']
    .map((t) => texto(t, { backgroundColor: LILA_FUERTE, align: 'center', fontWeight: 'bold' }));
  const filas = [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((m) => {
    const fondo = { backgroundColor: LILA_SUAVE };
    const d = leerFecha(m.fecha);
    return [
      d ? { ...base, ...fondo, type: Date, value: d, format: 'dd/mm/yyyy hh:mm' } : texto(m.fecha, fondo),
      texto(TIPO[m.tipo] ?? m.tipo, fondo),
      texto(nombre(m.espacio_id), fondo),
      texto(nombre(m.espacio_destino_id), fondo),
      texto(m.descripcion, fondo),
      texto(TEXTO_MEDIO[medioDe(m)], fondo),
      m.tipo === 'ingreso' ? dinero(m.monto, fondo) : texto('', fondo),
      m.tipo === 'gasto' ? dinero(m.monto, fondo) : texto('', fondo),
    ];
  });
  const ultima = filas.length + 1;
  const totales = [
    texto('TOTAL', { backgroundColor: LILA_FUERTE, columnSpan: 6, fontWeight: 'bold' }), null, null, null, null, null,
    formula(`=SUM(G2:G${Math.max(2, ultima)})`, { backgroundColor: LILA_FUERTE, fontWeight: 'bold' }),
    formula(`=SUM(H2:H${Math.max(2, ultima)})`, { backgroundColor: LILA_FUERTE, fontWeight: 'bold' }),
  ];
  const disponible = [
    texto('DISPONIBLE (entró − salió)', { backgroundColor: AMARILLO, columnSpan: 6, fontWeight: 'bold' }), null, null, null, null, null,
    formula(`=G${ultima + 1}-H${ultima + 1}`, { backgroundColor: AMARILLO, fontWeight: 'bold', columnSpan: 2 }), null,
  ];
  return {
    sheet: 'Movimientos',
    data: [encabezado, ...filas, totales, disponible],
    columns: [{ width: 17 }, { width: 10 }, { width: 24 }, { width: 22 }, { width: 34 }, { width: 11 }, { width: 16 }, { width: 16 }],
    stickyRowsCount: 1,
  };
}

// ---------- Hoja 3: Espacios (saldo actual y metas) ----------
function hojaEspacios(espacios, saldos) {
  const encabezado = ['Espacio', 'Saldo actual', 'Meta', 'Avance']
    .map((t) => texto(t, { backgroundColor: LILA_FUERTE, align: 'center', fontWeight: 'bold' }));
  const activos = espacios.filter((e) => e.activo);
  const filas = activos.map((e, i) => {
    const r = i + 2;
    const fondo = { backgroundColor: LILA_SUAVE };
    return [
      texto(e.nombre, fondo),
      dinero(saldos[e.id] ?? 0, fondo),
      Number(e.meta) > 0 ? dinero(e.meta, fondo) : texto('', fondo),
      Number(e.meta) > 0 ? { ...base, ...fondo, type: 'Formula', value: `=IF(C${r}>0,B${r}/C${r},"")`, format: '0%', align: 'center' } : texto('', fondo),
    ];
  });
  const ultima = filas.length + 1;
  return {
    sheet: 'Espacios',
    data: [encabezado, ...filas, [
      texto('TOTAL EN ESPACIOS', { backgroundColor: AMARILLO_TOTAL, fontWeight: 'bold' }),
      formula(`=SUM(B2:B${Math.max(2, ultima)})`, { backgroundColor: AMARILLO_TOTAL, fontWeight: 'bold' }),
      texto('', { backgroundColor: AMARILLO_TOTAL }), texto('', { backgroundColor: AMARILLO_TOTAL }),
    ]],
    columns: [{ width: 28 }, { width: 18 }, { width: 18 }, { width: 10 }],
  };
}

/**
 * Hojas del Excel.
 * movimientos: lo que se exporta (puede venir filtrado).
 * todos: todos los movimientos, para que la hoja Espacios muestre el saldo real.
 */
export function armarHojas(movimientos, espacios, todos = movimientos) {
  const saldos = calcularSaldos(espacios, todos);
  return [hojaPorMes(movimientos, espacios), hojaMovimientos(movimientos, espacios), hojaEspacios(espacios, saldos)];
}
