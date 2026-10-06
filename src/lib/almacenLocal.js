// Copia local en el dispositivo: permite abrir la app y registrar movimientos sin internet.
// Vive solo en el navegador del usuario (nunca en un servidor) y se borra al cerrar sesión.
const CLAVE = 'fe_local_v1';

export function cargarLocal() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? null;
  } catch {
    return null;
  }
}

export function guardarLocal(estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) {
    console.error('No se pudo guardar la copia local', e);
  }
}

export function borrarLocal() {
  try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
}
