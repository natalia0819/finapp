// Configuración general de la app.
export const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// drive.file: la app SOLO puede ver los archivos que ella misma creó.
// No puede leer el resto del Drive del usuario. Es el permiso mínimo
// y además Google lo considera "no sensible" (no requiere verificación).
export const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Marca oculta que ponemos en el archivo para reconocerlo en futuros inicios de sesión.
export const APP_KEY = 'finanzas-espacios-v1';
export const NOMBRE_HOJA = 'Mis finanzas (FinApp)';
