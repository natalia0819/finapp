// Facturas adjuntas (fotos o PDF) de movimientos, deudas y abonos.
//
// Cómo funciona:
//   1. Al guardar, la factura se guarda primero en el dispositivo (IndexedDB) y el registro queda con
//      factura = "pendiente:<id>". Así se puede adjuntar sin internet.
//   2. Al sincronizar, cada factura pendiente se sube a la carpeta "FinApp · Facturas" del Drive
//      y el registro pasa a tener el enlace de Drive (https://drive.google.com/file/d/<id>/view).
//   3. Si un registro se borra o se le quita la factura y ya nadie más la usa, el archivo va a la papelera de Drive.
// En el dispositivo también queda una copia de cada factura ya subida, para verla rápido y sin internet.
import { generarId } from './formato';

const BD = 'finapp-facturas';
const ALMACEN = 'archivos';
const LADO_MAXIMO = 1600; // px: suficiente para leer una factura
const CALIDAD = 0.75;
export const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB (para PDF)

export const esPendiente = (ref) => String(ref ?? '').startsWith('pendiente:');
/** Id del archivo en Drive a partir del enlace guardado en la hoja. */
export const idDrive = (ref) => String(ref ?? '').match(/\/d\/([^/?#]+)/)?.[1] ?? '';
export const enlaceDrive = (id) => `https://drive.google.com/file/d/${id}/view`;

// ---------------- IndexedDB ----------------
let conexion = null;
function abrir() {
  if (conexion) return conexion;
  conexion = new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BD, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => { conexion = null; rechazar(pedido.error); };
  });
  return conexion;
}

async function transaccion(modo, accion) {
  const bd = await abrir();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const resultado = accion(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(resultado?.result);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

/** { blob, tipo, nombre } guardado con esa clave ("pendiente:..." o el enlace de Drive). */
export const leerArchivo = (clave) => transaccion('readonly', (s) => s.get(clave)).catch(() => undefined);
export const guardarArchivo = (clave, valor) => transaccion('readwrite', (s) => s.put(valor, clave));
export const borrarArchivo = (clave) => transaccion('readwrite', (s) => s.delete(clave)).catch(() => {});
export const clavesGuardadas = () => transaccion('readonly', (s) => s.getAllKeys()).catch(() => []);
/** Al cerrar sesión: no dejar facturas de esta cuenta en el dispositivo. */
export const borrarTodo = () => transaccion('readwrite', (s) => s.clear()).catch(() => {});

// ---------------- Preparar el archivo ----------------

/**
 * Deja la factura lista para guardar: las fotos se achican (lado mayor 1600 px, JPG) para que suban rápido
 * y no llenen el Drive; los PDF quedan igual. Devuelve { blob, tipo, nombre }.
 */
export async function prepararArchivo(archivo) {
  const esPdf = archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name);
  if (esPdf) {
    if (archivo.size > TAMANO_MAXIMO) throw new Error('El PDF pesa más de 10 MB. Intenta con uno más liviano.');
    return { blob: archivo, tipo: 'application/pdf', nombre: archivo.name };
  }
  if (!archivo.type.startsWith('image/')) throw new Error('Elige una foto o un PDF.');
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#ffffff'; // por si la imagen tiene fondo transparente
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close?.();
    const blob = await new Promise((r) => lienzo.toBlob(r, 'image/jpeg', CALIDAD));
    if (blob && blob.size < archivo.size) return { blob, tipo: 'image/jpeg', nombre: archivo.name.replace(/\.[^.]+$/, '') + '.jpg' };
  } catch {
    // El navegador no pudo leer la imagen (formato raro): se guarda tal cual.
  }
  if (archivo.size > TAMANO_MAXIMO) throw new Error('La imagen pesa más de 10 MB.');
  return { blob: archivo, tipo: archivo.type, nombre: archivo.name };
}

/** Nombre con que queda en Drive: "2026-10-27 · Mercado · $ 83.000.jpg" */
export function nombreFactura(partes, tipo) {
  const limpio = partes.filter(Boolean).join(' · ').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return `${limpio || 'Factura'}.${tipo === 'application/pdf' ? 'pdf' : 'jpg'}`;
}

/**
 * Lo que devuelve el campo de factura de un formulario, convertido en lo que se guarda en el registro:
 *   null                 -> '' (sin factura)
 *   { ref }              -> la misma referencia (no cambió)
 *   { nuevo: {blob,...} } -> se guarda en el dispositivo y queda "pendiente:<id>" hasta que se suba
 */
export async function confirmarFactura(valor, partesNombre) {
  if (!valor) return '';
  if (valor.ref) return valor.ref;
  const ref = `pendiente:${generarId()}`;
  const { blob, tipo } = valor.nuevo;
  await guardarArchivo(ref, { blob, tipo, nombre: nombreFactura(partesNombre, tipo), creado: Date.now() });
  return ref;
}

/** Todas las facturas que usan los datos (para saber cuáles ya nadie usa). */
export function facturasEnUso(datos) {
  const refs = new Set();
  for (const lista of [datos.movimientos, datos.abonos, datos.deudas]) {
    for (const x of lista ?? []) if (x.factura) refs.add(x.factura);
  }
  return refs;
}
