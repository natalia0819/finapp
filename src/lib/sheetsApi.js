// Todo lo que habla con Google Drive y Google Sheets.
// Los datos viven en la hoja del usuario; aquí no hay ningún servidor propio.
import { APP_KEY, NOMBRE_HOJA } from '../config';
import { obtenerToken } from './googleAuth';
import { espaciosPredeterminados } from '../constants/espacios';
import { fechaAhora } from './formato';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';

export const COLUMNAS = {
  Perfil: ['apodo', 'fecha_registro'],
  Espacios: ['id', 'nombre', 'color', 'icono', 'meta', 'activo', 'es_predeterminado', 'fecha_creacion'],
  Movimientos: ['id', 'fecha', 'tipo', 'monto', 'espacio_id', 'espacio_destino_id', 'descripcion', 'grupo_id'],
};

/** Error con el código HTTP, para que la interfaz sepa qué hacer (401 = volver a conectar, 0 = sin internet). */
export class ErrorGoogle extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

async function llamar(url, opciones = {}) {
  const token = obtenerToken();
  if (!token) throw new ErrorGoogle('Tu sesión de Google terminó. Vuelve a conectarte.', 401);

  let resp;
  try {
    resp = await fetch(url, {
      ...opciones,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    throw new ErrorGoogle('Sin conexión a internet.', 0);
  }

  if (!resp.ok) {
    let detalle = '';
    try { detalle = (await resp.json()).error?.message ?? ''; } catch { /* sin cuerpo */ }
    const mensajes = {
      401: 'Tu sesión de Google terminó. Vuelve a conectarte.',
      403: 'Google no dio permiso para esta acción. Verifica que las APIs de Drive y Sheets estén activas y que aceptaste el permiso.',
      404: 'No se encontró tu hoja de datos en Google Drive. ¿La borraste o la moviste a la papelera?',
      429: 'Demasiadas solicitudes seguidas. Espera un minuto e intenta de nuevo.',
    };
    console.error('Error de Google', resp.status, detalle);
    throw new ErrorGoogle(mensajes[resp.status] ?? `Google respondió con un error (${resp.status}). ${detalle}`, resp.status);
  }
  return resp.status === 204 ? null : resp.json();
}

const rango = (r) => encodeURIComponent(r);
const siNo = (v) => (v ? 'sí' : 'no');
const esSi = (v) => ['sí', 'si'].includes(String(v).trim().toLowerCase());

// ------------------------------------------------------------------
// Crear / encontrar / leer la hoja
// ------------------------------------------------------------------

/** Busca la hoja que esta app creó antes en el Drive del usuario. Devuelve el id o null. */
export async function buscarHoja() {
  const q = `appProperties has { key='app' and value='${APP_KEY}' } and trashed=false`;
  const datos = await llamar(`${DRIVE}?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&orderBy=createdTime`);
  return datos.files?.[0]?.id ?? null;
}

/** Crea la hoja con sus tres pestañas, encabezados y espacios predeterminados. */
export async function crearHoja() {
  // 1. Crear el archivo (sin marca todavía, por si algo falla a mitad de camino).
  const archivo = await llamar(`${DRIVE}?fields=id`, {
    method: 'POST',
    body: JSON.stringify({ name: NOMBRE_HOJA, mimeType: 'application/vnd.google-apps.spreadsheet' }),
  });
  const id = archivo.id;

  // 2. Renombrar la primera pestaña y crear las otras dos, con la fila de títulos congelada.
  const info = await llamar(`${SHEETS}/${id}?fields=sheets.properties.sheetId`);
  const primeraId = info.sheets[0].properties.sheetId;
  const congelar = { gridProperties: { frozenRowCount: 1 } };
  await llamar(`${SHEETS}/${id}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        { updateSheetProperties: { properties: { sheetId: primeraId, title: 'Perfil', ...congelar }, fields: 'title,gridProperties.frozenRowCount' } },
        { addSheet: { properties: { title: 'Espacios', ...congelar } } },
        { addSheet: { properties: { title: 'Movimientos', ...congelar } } },
      ],
    }),
  });

  // 3. Escribir encabezados y espacios predeterminados.
  const filasEspacios = espaciosPredeterminados(fechaAhora()).map(espacioAFila);
  await llamar(`${SHEETS}/${id}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: 'Perfil!A1:B1', values: [COLUMNAS.Perfil] },
        { range: 'Espacios!A1:H3', values: [COLUMNAS.Espacios, ...filasEspacios] },
        { range: 'Movimientos!A1:H1', values: [COLUMNAS.Movimientos] },
      ],
    }),
  });

  // 4. Marcar el archivo como "de la app": solo ahora que quedó completo.
  await llamar(`${DRIVE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ appProperties: { app: APP_KEY } }),
  });
  await darFormatoHoja(id).catch((e) => console.warn('No se pudo dar formato a la hoja', e));
  return id;
}

/** Lee perfil, espacios y movimientos en una sola llamada (y repara filas corridas, si las hay). */
export async function leerDatos(id) {
  const rangos = ['Perfil!A2:B2', 'Espacios!A2:I', 'Movimientos!A2:I']
    .map((r) => `ranges=${rango(r)}`).join('&');
  const datos = await llamar(`${SHEETS}/${id}/values:batchGet?${rangos}&valueRenderOption=UNFORMATTED_VALUE`);
  const [perfil, espaciosCrudos, movimientosCrudos] = datos.valueRanges.map((v) => v.values ?? []);

  // Filas que quedaron corridas una columna a la derecha (columna A vacía): se corrigen aquí y en la hoja.
  const arreglos = [];
  const corregir = (hoja, filas, estaCorrida) => filas.map((f, i) => {
    if (!estaCorrida(f)) return f;
    const buena = f.slice(1, 9);
    while (buena.length < 8) buena.push('');
    arreglos.push({ range: `${hoja}!A${i + 2}:I${i + 2}`, values: [[...buena, '']] });
    return buena;
  });
  const espacios = corregir('Espacios', espaciosCrudos, (f) => !f[0] && f[1] && String(f[3] ?? '').startsWith('#'));
  const movimientos = corregir('Movimientos', movimientosCrudos,
    (f) => !f[0] && f[1] && ['ingreso', 'gasto', 'traslado'].includes(String(f[3] ?? '')));
  if (arreglos.length) {
    try {
      await llamar(`${SHEETS}/${id}/values:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ valueInputOption: 'RAW', data: arreglos }),
      });
    } catch (e) {
      console.warn('No se pudieron reparar las filas corridas', e);
    }
  }

  return {
    perfil: { apodo: String(perfil[0]?.[0] ?? ''), fecha_registro: String(perfil[0]?.[1] ?? '') },
    espacios: espacios.filter((f) => f[0]).map(filaAEspacio),
    movimientos: movimientos.filter((f) => f[0]).map(filaAMovimiento),
  };
}

// ------------------------------------------------------------------
// Sincronización: aplica la cola de cambios hechos en el dispositivo
// ------------------------------------------------------------------
// Cada operación es "idempotente": si se aplica dos veces (por ejemplo,
// se cortó internet justo después de guardar) el resultado es el mismo,
// porque las filas se buscan por id antes de escribir.
//   { op: 'guardar',  hoja: 'Espacios' | 'Movimientos', objetos: [...] }
//   { op: 'eliminar', hoja: 'Espacios' | 'Movimientos', ids: [...] }
//   { op: 'perfil',   perfil: { apodo, fecha_registro } }

export async function sincronizarCola(idHoja, cola, alCompletar) {
  if (!cola.length) return;

  // Se lee cada pestaña completa (A:I) para saber qué ids hay y cuál es la última fila ocupada,
  // y los datos internos de cada pestaña (id y cuántas filas tiene la cuadrícula).
  const [columnas, info] = await Promise.all([
    llamar(`${SHEETS}/${idHoja}/values:batchGet?ranges=${rango('Espacios!A:I')}&ranges=${rango('Movimientos!A:I')}`),
    llamar(`${SHEETS}/${idHoja}?fields=sheets.properties(sheetId,title,gridProperties.rowCount)`),
  ]);
  const tabla = (i) => {
    const filas = columnas.valueRanges[i].values ?? [];
    return { ids: filas.map((f) => String(f[0] ?? '')), total: filas.length };
  };
  const tablas = { Espacios: tabla(0), Movimientos: tabla(1) };
  const pestanas = Object.fromEntries(info.sheets.map((s) => [s.properties.title, {
    id: s.properties.sheetId,
    filas: s.properties.gridProperties?.rowCount ?? 1000,
  }]));

  for (const op of cola) {
    if (op.op === 'perfil') {
      await llamar(`${SHEETS}/${idHoja}/values/${rango('Perfil!A2:B2')}?valueInputOption=RAW`, {
        method: 'PUT',
        body: JSON.stringify({ values: [[op.perfil.apodo, op.perfil.fecha_registro]] }),
      });
    } else if (op.op === 'guardar') {
      await guardarFilas(idHoja, op.hoja, op.objetos, tablas[op.hoja], pestanas[op.hoja]);
    } else if (op.op === 'eliminar') {
      await eliminarFilas(idHoja, op.ids, tablas[op.hoja], pestanas[op.hoja]);
    }
    alCompletar(op.id); // se quita de la cola apenas Google confirma
  }
}

/**
 * Escribe filas en posiciones exactas: las que ya existen se actualizan en su fila,
 * las nuevas van justo debajo de la última fila ocupada (columna A en adelante, siempre).
 */
async function guardarFilas(idHoja, hoja, objetos, tabla, pestana) {
  const aFila = hoja === 'Espacios' ? espacioAFila : movimientoAFila;
  const escrituras = [];
  const nuevos = [];
  for (const obj of objetos) {
    const indice = tabla.ids.indexOf(obj.id);
    if (indice >= 1) escrituras.push({ range: `${hoja}!A${indice + 1}:H${indice + 1}`, values: [aFila(obj)] });
    else nuevos.push(obj);
  }

  const primera = tabla.total + 1; // número de fila (desde 1) donde empiezan las nuevas
  const ultima = tabla.total + nuevos.length;
  if (nuevos.length) {
    // Si la cuadrícula se queda corta, se le agregan filas antes de escribir.
    if (pestana && ultima > pestana.filas) {
      const faltan = ultima - pestana.filas + 100;
      await llamar(`${SHEETS}/${idHoja}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: [{ appendDimension: { sheetId: pestana.id, dimension: 'ROWS', length: faltan } }] }),
      });
      pestana.filas += faltan;
    }
    nuevos.forEach((obj, i) => {
      const fila = primera + i;
      escrituras.push({ range: `${hoja}!A${fila}:H${fila}`, values: [aFila(obj)] });
    });
  }

  if (escrituras.length) {
    await llamar(`${SHEETS}/${idHoja}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data: escrituras }),
    });
  }

  if (nuevos.length) {
    nuevos.forEach((obj, i) => { tabla.ids[primera - 1 + i] = obj.id; });
    tabla.total = ultima;
    // Dar el estilo lila a las filas nuevas. Si falla, los datos ya quedaron guardados.
    if (pestana) {
      try {
        await llamar(`${SHEETS}/${idHoja}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({ requests: estiloFilas(pestana.id, hoja, primera - 1, ultima) }),
        });
      } catch (e) {
        console.warn('No se pudo dar formato a las filas nuevas', e);
      }
    }
  }
}

async function eliminarFilas(idHoja, idsBorrar, tabla, pestana) {
  // Se borra de abajo hacia arriba para que los números de fila no se corran.
  const indices = idsBorrar.map((id) => tabla.ids.indexOf(id)).filter((i) => i >= 1).sort((a, b) => b - a);
  if (!indices.length || !pestana) return; // ya no estaban: nada que hacer
  await llamar(`${SHEETS}/${idHoja}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: indices.map((i) => ({
        deleteDimension: { range: { sheetId: pestana.id, dimension: 'ROWS', startIndex: i, endIndex: i + 1 } },
      })),
    }),
  });
  indices.forEach((i) => tabla.ids.splice(i, 1));
  tabla.total -= indices.length;
}

// ------------------------------------------------------------------
// Conversión entre filas de la hoja y objetos de la app
// ------------------------------------------------------------------

function espacioAFila(e) {
  return [e.id, e.nombre, e.color, e.icono, e.meta === '' || e.meta == null ? '' : Number(e.meta),
    siNo(e.activo), siNo(e.es_predeterminado), e.fecha_creacion];
}

function filaAEspacio(f) {
  return {
    id: String(f[0]),
    nombre: String(f[1] ?? ''),
    color: f[2] || '#7C3AED',
    icono: f[3] || 'wallet',
    meta: f[4] === '' || f[4] == null ? '' : Number(f[4]),
    activo: esSi(f[5] ?? 'sí'),
    es_predeterminado: esSi(f[6]),
    fecha_creacion: String(f[7] ?? ''),
  };
}

function movimientoAFila(m) {
  return [m.id, m.fecha, m.tipo, Number(m.monto), m.espacio_id, m.espacio_destino_id || '',
    m.descripcion || '', m.grupo_id || ''];
}

function filaAMovimiento(f) {
  return {
    id: String(f[0]),
    fecha: String(f[1] ?? ''),
    tipo: String(f[2] ?? ''),
    monto: Math.abs(Number(f[3])) || 0,
    espacio_id: String(f[4] ?? ''),
    espacio_destino_id: String(f[5] ?? ''),
    descripcion: String(f[6] ?? ''),
    grupo_id: String(f[7] ?? ''),
  };
}

// El cálculo de saldos vive en movimientos.js (función pura); se re-exporta para no romper imports.
export { calcularSaldos } from './movimientos';

// ------------------------------------------------------------------
// Estilo de la hoja: el mismo del Excel exportado (lila, bordes, pesos)
// ------------------------------------------------------------------
const rgb = (hex) => ({ red: parseInt(hex.slice(1, 3), 16) / 255, green: parseInt(hex.slice(3, 5), 16) / 255, blue: parseInt(hex.slice(5, 7), 16) / 255 });
const LILA_FUERTE = rgb('#D5ABFF');
const LILA_SUAVE = rgb('#EAD5FF');
// Google Sheets no tiene Bahnschrift (es de Windows); Roboto Condensed es la más parecida que ofrece.
const FUENTE_SHEETS = 'Roboto Condensed';
const BORDE = { style: 'SOLID', color: rgb('#000000') };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
const FORMATO_PESOS = { type: 'CURRENCY', pattern: '"$" #,##0' };
const ANCHO_TABLA = { Perfil: 2, Espacios: 8, Movimientos: 8 };
const COLUMNA_PESOS = { Espacios: 4, Movimientos: 3 }; // meta (E) y monto (D)
const ANCHOS = {
  Perfil: [200, 170],
  Espacios: [110, 220, 90, 120, 130, 70, 140, 160],
  Movimientos: [110, 160, 90, 130, 150, 170, 260, 110],
};
const OCULTAS = { Espacios: [0], Movimientos: [0, 7] }; // ids internos: la app los usa, la persona no los necesita ver

function rangoTabla(sheetId, hoja, desde, hasta) {
  return { sheetId, startRowIndex: desde, endRowIndex: hasta, startColumnIndex: 0, endColumnIndex: ANCHO_TABLA[hoja] };
}

/** Estilo de filas de datos (índices desde 0; "hasta" no incluido). */
function estiloFilas(sheetId, hoja, desde, hasta) {
  const pedidos = [{
    repeatCell: {
      range: rangoTabla(sheetId, hoja, desde, hasta),
      cell: { userEnteredFormat: { backgroundColor: LILA_SUAVE, verticalAlignment: 'MIDDLE', borders: BORDES } },
      fields: 'userEnteredFormat(backgroundColor,verticalAlignment,borders)',
    },
  }];
  if (hoja in COLUMNA_PESOS) {
    const c = COLUMNA_PESOS[hoja];
    pedidos.push({
      repeatCell: {
        range: { sheetId, startRowIndex: desde, endRowIndex: hasta, startColumnIndex: c, endColumnIndex: c + 1 },
        cell: { userEnteredFormat: { numberFormat: FORMATO_PESOS } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }
  return pedidos;
}

/**
 * Da el estilo a toda la hoja: encabezados lila fuerte, filas lila suave con bordes,
 * pesos colombianos, anchos de columna y columnas de ids ocultas.
 * Se puede repetir sin problema: siempre deja el mismo resultado.
 */
export async function darFormatoHoja(idHoja) {
  const [info, columnas] = await Promise.all([
    llamar(`${SHEETS}/${idHoja}?fields=sheets.properties(sheetId,title)`),
    llamar(`${SHEETS}/${idHoja}/values:batchGet?ranges=${rango('Perfil!A:A')}&ranges=${rango('Espacios!A:A')}&ranges=${rango('Movimientos!A:A')}`),
  ]);
  const pestanas = Object.fromEntries(info.sheets.map((x) => [x.properties.title, x.properties.sheetId]));
  const filasCon = ['Perfil', 'Espacios', 'Movimientos'].map((_, i) => (columnas.valueRanges[i].values ?? []).length);

  const pedidos = [{ updateSpreadsheetProperties: { properties: { locale: 'es_CO' }, fields: 'locale' } }];
  ['Perfil', 'Espacios', 'Movimientos'].forEach((hoja, i) => {
    const id = pestanas[hoja];
    if (id == null) return;
    // Encabezado
    pedidos.push({
      repeatCell: {
        range: rangoTabla(id, hoja, 0, 1),
        cell: { userEnteredFormat: {
          backgroundColor: LILA_FUERTE, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', borders: BORDES,
          textFormat: { bold: true },
        } },
        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,borders,textFormat)',
      },
    });
    // Filas con datos (Perfil siempre tiene su fila 2)
    const ultima = Math.max(filasCon[i], hoja === 'Perfil' ? 2 : 1);
    if (ultima > 1) pedidos.push(...estiloFilas(id, hoja, 1, ultima));
    // Anchos y columnas ocultas
    ANCHOS[hoja].forEach((px, c) => pedidos.push({
      updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: c, endIndex: c + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' },
    }));
    (OCULTAS[hoja] ?? []).forEach((c) => pedidos.push({
      updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: c, endIndex: c + 1 }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' },
    }));
    pedidos.push({
      updateDimensionProperties: { range: { sheetId: id, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 30 }, fields: 'pixelSize' },
    });
  });
  await llamar(`${SHEETS}/${idHoja}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: pedidos }) });

  // La letra va aparte: si Google no la reconociera, el resto del estilo igual queda aplicado.
  try {
    await llamar(`${SHEETS}/${idHoja}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: Object.values(pestanas).map((sheetId) => ({
        repeatCell: { range: { sheetId }, cell: { userEnteredFormat: { textFormat: { fontFamily: FUENTE_SHEETS, fontSize: 11 } } }, fields: 'userEnteredFormat.textFormat.fontFamily,userEnteredFormat.textFormat.fontSize' },
      })) }),
    });
  } catch (e) {
    console.warn('No se pudo cambiar la letra de la hoja', e);
  }
}