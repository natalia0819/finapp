// Inicio de sesión con Google Identity Services (flujo de token en el navegador).
// No hay servidor: el token vive solo en esta pestaña (sessionStorage) y dura ~1 hora.
import { CLIENT_ID, SCOPES } from '../config';

const CLAVE_TOKEN = 'fe_token';
let clienteToken = null;
let pendiente = null; // { resolve, reject } del inicio de sesión en curso

/** Espera a que cargue el script de Google y prepara el cliente. Llamar al abrir la app. */
export function prepararCliente() {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error('Falta VITE_GOOGLE_CLIENT_ID en el archivo .env.local. Revisa el README.'));
      return;
    }
    const inicio = Date.now();
    (function revisar() {
      if (window.google?.accounts?.oauth2) {
        clienteToken = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: manejarRespuesta,
          error_callback: manejarErrorVentana,
        });
        resolve();
      } else if (Date.now() - inicio > 10000) {
        reject(new Error('No se pudo cargar Google. Revisa tu conexión a internet y recarga la página.'));
      } else {
        setTimeout(revisar, 100);
      }
    })();
  });
}

function manejarRespuesta(resp) {
  if (!pendiente) return;
  const { resolve, reject } = pendiente;
  pendiente = null;
  if (resp.error) {
    reject(new Error('Google no autorizó el acceso. Intenta de nuevo.'));
    return;
  }
  if (!window.google.accounts.oauth2.hasGrantedAllScopes(resp, SCOPES)) {
    reject(new Error('Para guardar tus datos necesitamos permiso de acceso a Google Drive. Marca la casilla de permiso e intenta de nuevo.'));
    return;
  }
  const expira = Date.now() + (Number(resp.expires_in) - 60) * 1000;
  sessionStorage.setItem(CLAVE_TOKEN, JSON.stringify({ token: resp.access_token, expira }));
  resolve(resp.access_token);
}

function manejarErrorVentana(err) {
  if (!pendiente) return;
  const { reject } = pendiente;
  pendiente = null;
  if (err?.type === 'popup_closed') reject(new Error('Cerraste la ventana de Google antes de terminar.'));
  else if (err?.type === 'popup_failed_to_open') reject(new Error('El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio.'));
  else reject(new Error('No se pudo iniciar sesión con Google.'));
}

/**
 * Abre la ventana de Google. Debe llamarse directo desde un clic
 * (si no, el navegador bloquea la ventana emergente).
 */
export function iniciarSesion({ elegirCuenta = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!clienteToken) {
      reject(new Error('Google todavía está cargando. Espera un momento.'));
      return;
    }
    pendiente = { resolve, reject };
    clienteToken.requestAccessToken(elegirCuenta ? { prompt: 'select_account' } : {});
  });
}

/** Devuelve el token si sigue vigente, o null. */
export function obtenerToken() {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_TOKEN));
    if (guardado && guardado.expira > Date.now()) return guardado.token;
  } catch {
    /* sin token guardado */
  }
  return null;
}

export function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_TOKEN);
}
