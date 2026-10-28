// Arma el contenido del Excel exportado, con el estilo del Excel de finanzas de la usuaria:
// letra Bahnschrift Light Condensed, lila fuerte para encabezados y totales, lila suave para
// las filas, amarillo para lo disponible, bordes finos y formato contable de pesos.
// No depende del navegador: así se puede probar también en Node.
import { calcularSaldos, medioDe, TEXTO_MEDIO } from './movimientos';

import { datosMoneda } from './moneda';
import { describirFechaPago, leerFechaPago, resumenDeuda, TIPOS_DEUDA } from './deudas';

const LILA_FUERTE = '#D5ABFF';
const LILA_SUAVE = '#EAD5FF';
const AMARILLO = '#FFF4CC'; // crema mantequilla: combina con el lila
const AMARILLO_TOTAL = '#FFF4CC';
const VERDE = '#1B7F3B'; // montos de ingresos en la hoja "Por mes"
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
/** Factura: enlace "Ver factura" a Drive, "Pendiente de subir" si aún no se sube, o vacío. */
const celdaFactura = (ref, extra = {}) => {
  if (!ref) return texto('', extra);
  if (!String(ref).startsWith('http')) return texto('Pendiente de subir', { ...extra, textColor: '#8A8A8A', fontStyle: 'italic' });
  return { ...base, type: 'Formula', value: `HYPERLINK("${ref}","Ver factura")`, textColor: '#5B21B6', textDecoration: { underline: true }, ...extra };
};
const vacia = () => null;

/**
 * "2026-10-05 14:30:00" -> fecha para Excel. Excel no maneja zonas horarias: se arma en UTC
 * para que la hora quede tal cual se registró (si no, en Colombia saldría 5 horas corrida).
 */
function leerFecha(texto) {
  const m = String(texto ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
}

/** Índice de columna (0 = A) a letra: 0→A, 27→AB */
function letra(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Mitad del mes de una fecha: "2026-10-1" (del 1 al 15) o "2026-10-2" (del 16 a fin de mes). */
const quincenaDe = (fecha) => `${fecha.slice(0, 7)}-${Number(fecha.slice(8, 10)) <= 15 ? 1 : 2}`;

// ---------- Hoja 1: Por mes, partido en dos: del 1 al 15 y del 16 a fin de mes (bloques lado a lado) ----------
function hojaPorQuincena(movimientos, espacios) {
  const quincenas = [...new Set(movimientos.map((m) => quincenaDe(m.fecha)))].sort();
  const FILA_INICIO = 2; // fila 2, como en el Excel original (la 1 queda de aire)
  const bloques = []; // cada bloque: lista de filas de 2 celdas [concepto, monto]

  quincenas.forEach((quincena, i) => {
    const col = 1 + i * 3; // B, E, H... (dos columnas por mes y una de separación)
    const L = letra(col);
    const M = letra(col + 1);
    const filas = [];
    const fila = () => FILA_INICIO + filas.length; // número de fila (1-based) de la siguiente fila
    const delMes = movimientos.filter((m) => quincenaDe(m.fecha) === quincena);
    const [anio, numMes, parte] = quincena.split('-');
    const ultimoDia = new Date(Number(anio), Number(numMes), 0).getDate();
    const dias = parte === '1' ? 'DEL 1 AL 15' : `DEL 16 AL ${ultimoDia}`;

    filas.push([texto(`${MESES[Number(numMes) - 1]} ${anio} · ${dias}`, { align: 'center', columnSpan: 2, fontWeight: 'bold' }), vacia()]);
    const filaEntroMes = fila();
    const ingresosMes = delMes.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
    filas.push([texto(`ENTRÓ ${dias}`, { backgroundColor: LILA_FUERTE }), dinero(ingresosMes, { backgroundColor: LILA_FUERTE })]);
    filas.push([null, null]);

    const filasTotalGasto = [];
    for (const e of espacios) {
      const suyos = delMes.filter((m) => m.espacio_id === e.id || m.espacio_destino_id === e.id);
      if (!suyos.length) continue;
      const entradas = suyos
        .filter((m) => (m.tipo === 'ingreso' && m.espacio_id === e.id) || (m.tipo === 'traslado' && m.espacio_destino_id === e.id))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const salidas = suyos
        .filter((m) => (m.tipo === 'gasto' && m.espacio_id === e.id) || (m.tipo === 'traslado' && m.espacio_id === e.id))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      filas.push([texto(e.nombre.toUpperCase() + (e.activo ? '' : ' (ARCHIVADO)'), { align: 'center', columnSpan: 2, backgroundColor: LILA_FUERTE }), vacia()]);
      // Ingresos uno por uno (los montos en verde para distinguirlos de los gastos), y su total.
      const desdeIngreso = fila();
      for (const m of entradas) {
        const concepto = m.tipo === 'traslado'
          ? `Traslado desde ${espacios.find((x) => x.id === m.espacio_id)?.nombre ?? 'otro espacio'}`
          : (m.descripcion || 'Ingreso');
        filas.push([texto(concepto, { backgroundColor: LILA_SUAVE }), dinero(m.monto, { backgroundColor: LILA_SUAVE, textColor: VERDE })]);
      }
      if (!entradas.length) filas.push([texto('Sin ingresos', { backgroundColor: LILA_SUAVE, textColor: '#7A6A8F' }), dinero(0, { backgroundColor: LILA_SUAVE })]);
      const filaEntro = fila();
      filas.push([texto('TOTAL INGRESOS', { backgroundColor: LILA_FUERTE }), formula(`=SUM(${M}${desdeIngreso}:${M}${filaEntro - 1})`, { backgroundColor: LILA_FUERTE })]);

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

    // Pie de cada parte: solo cuentan los gastos (los traslados mueven plata entre espacios, no la gastan).
    const gastosMes = delMes.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
    const filaGastado = fila();
    filas.push([texto(`TOTAL GASTADO ${dias}`, { backgroundColor: LILA_FUERTE }), dinero(gastosMes, { backgroundColor: LILA_FUERTE })]);
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
  bloques.forEach(() => columnas.push({ width: 30 }, { width: 18 }, { width: 4.7 }));
  return { sheet: 'Por mes', data: datos, columns: columnas };
}

// ---------- Hoja 2: Movimientos (detalle) ----------
function hojaMovimientos(movimientos, espacios) {
  const nombre = (id) => espacios.find((e) => e.id === id)?.nombre ?? '';
  const encabezado = ['Fecha', 'Tipo', 'Espacio', 'Hacia (traslados)', 'Descripción', 'Medio', 'Entró', 'Salió', 'Factura']
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
      celdaFactura(m.factura, fondo),
    ];
  });
  const ultima = filas.length + 1;
  const totales = [
    texto('TOTAL', { backgroundColor: LILA_FUERTE, columnSpan: 6, fontWeight: 'bold' }), null, null, null, null, null,
    formula(`=SUM(G2:G${Math.max(2, ultima)})`, { backgroundColor: LILA_FUERTE, fontWeight: 'bold' }),
    formula(`=SUM(H2:H${Math.max(2, ultima)})`, { backgroundColor: LILA_FUERTE, fontWeight: 'bold' }),
    texto('', { backgroundColor: LILA_FUERTE }),
  ];
  const disponible = [
    texto('DISPONIBLE (entró − salió)', { backgroundColor: AMARILLO, columnSpan: 6, fontWeight: 'bold' }), null, null, null, null, null,
    formula(`=G${ultima + 1}-H${ultima + 1}`, { backgroundColor: AMARILLO, fontWeight: 'bold', columnSpan: 2 }), null,
    texto('', { backgroundColor: AMARILLO }),
  ];
  return {
    sheet: 'Movimientos',
    data: [encabezado, ...filas, totales, disponible],
    columns: [{ width: 17 }, { width: 10 }, { width: 24 }, { width: 22 }, { width: 34 }, { width: 11 }, { width: 16 }, { width: 16 }, { width: 20 }],
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

// ---------- Hoja 4: Deudas (lo que debo, lo que me deben y sus abonos) ----------
function hojaDeudas(deudas, abonos, espacios, movimientos) {
  const titulo = (t) => texto(t, { backgroundColor: LILA_FUERTE, align: 'center', fontWeight: 'bold' });
  const fondo = { backgroundColor: LILA_SUAVE };
  const encabezado = ['Deuda', 'Tipo', 'Total', 'Abonado', 'Pendiente', 'Avance', 'Fecha de pago', 'Nota', 'Estado', 'Factura'].map(titulo);
  const orden = [...deudas].sort((a, b) => (a.tipo === b.tipo ? a.fecha.localeCompare(b.fecha) : a.tipo === 'debo' ? -1 : 1));
  const filas = orden.map((d, i) => {
    const r = i + 2;
    const res = resumenDeuda(d, abonos);
    const fp = leerFechaPago(d.fecha_limite);
    const limite = fp.modo === 'una' ? leerFecha(`${fp.fecha} 00:00:00`) : null;
    return [
      texto(d.nombre, fondo),
      texto(TIPOS_DEUDA[d.tipo], fondo),
      dinero(res.total, fondo),
      dinero(res.abonado, fondo),
      formula(`=MAX(0,C${r}-D${r})`, fondo),
      { ...base, ...fondo, type: 'Formula', value: `=IF(C${r}>0,D${r}/C${r},"")`, format: '0%', align: 'center' },
      limite ? { ...base, ...fondo, type: Date, value: limite, format: 'dd/mm/yyyy' } : texto(fp.modo === 'mes' ? describirFechaPago(d.fecha_limite) : '', fondo),
      texto(d.nota, fondo),
      texto(res.pagada ? 'Saldada' : 'Activa', fondo),
      celdaFactura(d.factura, fondo),
    ];
  });
  const n = Math.max(2, filas.length + 1);
  const amarillo = { backgroundColor: AMARILLO_TOTAL, fontWeight: 'bold' };
  const totalFila = (rotulo, tipo) => [
    texto(rotulo, amarillo), texto('', amarillo), texto('', amarillo), texto('', amarillo),
    formula(`=SUMIF(B2:B${n},"${tipo}",E2:E${n})`, amarillo),
    texto('', amarillo), texto('', amarillo), texto('', amarillo), texto('', amarillo), texto('', amarillo),
  ];

  // Historial: abonos y lo que se sumó a cada deuda.
  const nombre = (id) => deudas.find((d) => d.id === id)?.nombre ?? '';
  const historial = [...abonos].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((a) => {
    const mov = movimientos.find((m) => m.id === a.movimiento_id);
    const espacio = mov ? espacios.find((e) => e.id === mov.espacio_id)?.nombre ?? '' : '';
    const fecha = leerFecha(a.fecha);
    return [
      fecha ? { ...base, ...fondo, type: Date, value: fecha, format: 'dd/mm/yyyy' } : texto(a.fecha, fondo),
      texto(nombre(a.deuda_id) || a.deuda, fondo),
      texto(a.tipo === 'aumento' ? 'Sumó a la deuda' : 'Abono', fondo),
      texto(espacio, fondo),
      texto(mov ? TEXTO_MEDIO[medioDe(mov)] : '', fondo),
      dinero(a.monto, fondo),
      texto(a.nota, fondo),
      celdaFactura(a.factura, fondo),
      null, null,
    ];
  });

  const data = [encabezado, ...filas, totalFila('TOTAL QUE DEBES', 'Debo'), totalFila('TOTAL QUE TE DEBEN', 'Me deben')];
  if (historial.length) {
    data.push(Array(10).fill(null));
    data.push([texto('Historial de abonos', { fontWeight: 'bold', borderStyle: undefined }), null, null, null, null, null, null, null, null, null]);
    data.push([...['Fecha', 'Deuda', 'Tipo', 'Espacio', 'Medio', 'Monto', 'Nota', 'Factura'].map(titulo), null, null]);
    data.push(...historial);
  }
  return {
    sheet: 'Deudas',
    data,
    columns: [{ width: 26 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 30 }, { width: 10 }, { width: 20 }],
    stickyRowsCount: 1,
  };
}

/**
 * Hojas del Excel.
 * movimientos: lo que se exporta (puede venir filtrado).
 * todos: todos los movimientos, para que la hoja Espacios muestre el saldo real.
 */
export function armarHojas(movimientos, espacios, todos = movimientos, deudas = [], abonos = []) {
  const saldos = calcularSaldos(espacios, todos);
  const hojas = [hojaPorQuincena(movimientos, espacios), hojaMovimientos(movimientos, espacios), hojaEspacios(espacios, saldos)];
  if (deudas.length) hojas.push(hojaDeudas(deudas, abonos, espacios, todos));
  return hojas;
}
