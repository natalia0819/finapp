// Modo claro / oscuro. La preferencia se guarda en este dispositivo.
const CLAVE = 'fe_tema'; // 'sistema' | 'claro' | 'oscuro'

export function leerTema() {
  try { return localStorage.getItem(CLAVE) || 'sistema'; } catch { return 'sistema'; }
}

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro') raiz.dataset.theme = 'light';
  else if (tema === 'oscuro') raiz.dataset.theme = 'dark';
  else delete raiz.dataset.theme; // sigue al sistema operativo
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento */ }
}
