// Avatares de la persona: dibujos SVG de 120x120 dentro de un círculo.
// La clave (texto) es lo que se guarda en la hoja (pestaña Perfil, columna "avatar").
// Si no hay avatar o la clave no existe, se muestra la inicial del nombre.
import { useId } from 'react';

const ojos = (x1, x2, y, r = 5.5, c = '#1E1B2E') =>
  `<circle cx="${x1}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${c}"/>` +
  `<circle cx="${x1 + 1.8}" cy="${y - 2}" r="${r * 0.35}" fill="#fff"/><circle cx="${x2 + 1.8}" cy="${y - 2}" r="${r * 0.35}" fill="#fff"/>`;
const mejillas = (x1, x2, y, c = '#F9A8D4') => `<circle cx="${x1}" cy="${y}" r="6" fill="${c}" opacity=".7"/><circle cx="${x2}" cy="${y}" r="6" fill="${c}" opacity=".7"/>`;
const sonrisa = (y, c = '#1E1B2E') => `<path d="M53 ${y}q3.5 4 7 0q3.5 4 7 0" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;

export const AVATARES = {
  gato: { nombre: 'Gato', fondo: '#EDE4FF', dibujo:
    `<path d="M28 58L32 22l24 22zM92 58L88 22 64 44z" fill="#7C3AED"/><path d="M34 46l2-16 12 11zM86 46l-2-16-12 11z" fill="#C4B5FD"/>
     <ellipse cx="60" cy="72" rx="36" ry="32" fill="#7C3AED"/><ellipse cx="60" cy="84" rx="16" ry="11" fill="#A78BFA"/>
     ${ojos(46, 74, 68, 6, '#FDE68A')}<circle cx="46" cy="68" r="3" fill="#1E1B2E"/><circle cx="74" cy="68" r="3" fill="#1E1B2E"/>
     <path d="M57 79h6l-3 3.5z" fill="#F472B6"/>${sonrisa(83, '#2E1065')}
     <path d="M30 76h14M30 82l14-2M90 76H76M90 82l-14-2" stroke="#C4B5FD" stroke-width="1.6" stroke-linecap="round"/>` },
  zorro: { nombre: 'Zorro', fondo: '#FFEDD5', dibujo:
    `<path d="M26 64L30 20l26 26zM94 64L90 20 64 46z" fill="#EA580C"/><path d="M33 48l1-18 13 13zM87 48l-1-18-13 13z" fill="#1E1B2E"/>
     <path d="M24 60q36-30 72 0l-8 26q-28 22-56 0z" fill="#F97316"/>
     <path d="M34 74q26-6 52 0q-6 22-26 26q-20-4-26-26z" fill="#FFF7ED"/>
     ${ojos(46, 74, 66)}<ellipse cx="60" cy="84" rx="5" ry="3.5" fill="#1E1B2E"/>${sonrisa(90)}` },
  panda: { nombre: 'Panda', fondo: '#DCFCE7', dibujo:
    `<circle cx="32" cy="38" r="13" fill="#1E1B2E"/><circle cx="88" cy="38" r="13" fill="#1E1B2E"/>
     <ellipse cx="60" cy="70" rx="38" ry="34" fill="#fff"/>
     <ellipse cx="45" cy="66" rx="9" ry="11" transform="rotate(-25 45 66)" fill="#1E1B2E"/><ellipse cx="75" cy="66" rx="9" ry="11" transform="rotate(25 75 66)" fill="#1E1B2E"/>
     <circle cx="46" cy="65" r="3.5" fill="#fff"/><circle cx="74" cy="65" r="3.5" fill="#fff"/>
     <ellipse cx="60" cy="80" rx="5.5" ry="4" fill="#1E1B2E"/>${sonrisa(86)}${mejillas(36, 84, 82)}` },
  rana: { nombre: 'Rana', fondo: '#D1FAE5', dibujo:
    `<circle cx="40" cy="44" r="15" fill="#22C55E"/><circle cx="80" cy="44" r="15" fill="#22C55E"/>
     <ellipse cx="60" cy="76" rx="40" ry="28" fill="#22C55E"/>
     <circle cx="40" cy="44" r="9" fill="#fff"/><circle cx="80" cy="44" r="9" fill="#fff"/>${ojos(41, 81, 45, 5)}
     <path d="M40 80q20 16 40 0" fill="none" stroke="#14532D" stroke-width="3" stroke-linecap="round"/>${mejillas(32, 88, 76, '#FDA4AF')}` },
  pinguino: { nombre: 'Pingüino', fondo: '#DBEAFE', dibujo:
    `<ellipse cx="60" cy="74" rx="38" ry="40" fill="#1E293B"/><path d="M60 44c-22 0-28 18-28 32 0 18 12 32 28 32s28-14 28-32c0-14-6-32-28-32z" fill="#fff"/>
     ${ojos(49, 71, 66)}<path d="M53 76h14l-7 8z" fill="#F59E0B"/>${mejillas(40, 80, 80)}` },
  conejo: { nombre: 'Conejo', fondo: '#FCE7F3', dibujo:
    `<ellipse cx="44" cy="30" rx="10" ry="26" fill="#fff"/><ellipse cx="76" cy="30" rx="10" ry="26" fill="#fff"/>
     <ellipse cx="44" cy="32" rx="5" ry="18" fill="#F9A8D4"/><ellipse cx="76" cy="32" rx="5" ry="18" fill="#F9A8D4"/>
     <ellipse cx="60" cy="76" rx="34" ry="30" fill="#fff"/>${ojos(48, 72, 72)}
     <path d="M56 80h8l-4 4z" fill="#F472B6"/>${sonrisa(86)}${mejillas(38, 82, 84)}` },
  buho: { nombre: 'Búho', fondo: '#FEF3C7', dibujo:
    `<path d="M26 40l14 14M94 40L80 54" stroke="#92400E" stroke-width="10" stroke-linecap="round"/>
     <ellipse cx="60" cy="74" rx="38" ry="36" fill="#B45309"/><ellipse cx="60" cy="90" rx="22" ry="18" fill="#FDE68A"/>
     <circle cx="44" cy="62" r="14" fill="#FEF3C7"/><circle cx="76" cy="62" r="14" fill="#FEF3C7"/>${ojos(44, 76, 62, 7)}
     <path d="M55 72h10l-5 9z" fill="#F59E0B"/>` },
  ajolote: { nombre: 'Ajolote', fondo: '#FDF2F8', dibujo:
    `<g fill="#F472B6"><path d="M22 50q-12-6-14-16q10 2 18 10z"/><path d="M20 64q-14 0-18-10q12-2 20 4z"/><path d="M24 76q-12 6-20 0q8-8 20-6z"/>
     <path d="M98 50q12-6 14-16q-10 2-18 10z"/><path d="M100 64q14 0 18-10q-12-2-20 4z"/><path d="M96 76q12 6 20 0q-8-8-20-6z"/></g>
     <ellipse cx="60" cy="68" rx="38" ry="32" fill="#FBCFE8"/>${ojos(46, 74, 64)}
     <path d="M48 78q12 10 24 0" fill="none" stroke="#1E1B2E" stroke-width="2.6" stroke-linecap="round"/>${mejillas(34, 86, 76, '#F472B6')}` },
  oso: { nombre: 'Oso', fondo: '#FEF9C3', dibujo:
    `<circle cx="32" cy="40" r="13" fill="#92400E"/><circle cx="88" cy="40" r="13" fill="#92400E"/><circle cx="32" cy="40" r="6" fill="#D97706"/><circle cx="88" cy="40" r="6" fill="#D97706"/>
     <ellipse cx="60" cy="72" rx="38" ry="34" fill="#B45309"/><ellipse cx="60" cy="84" rx="16" ry="12" fill="#FDE68A"/>
     ${ojos(46, 74, 66)}<ellipse cx="60" cy="80" rx="6" ry="4" fill="#1E1B2E"/>${sonrisa(87)}` },
  alien: { nombre: 'Alien', fondo: '#E0E7FF', dibujo:
    `<path d="M44 34L36 16M76 34l8-18" stroke="#4ADE80" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="16" r="5" fill="#FDE68A"/><circle cx="84" cy="16" r="5" fill="#FDE68A"/>
     <path d="M60 30c24 0 36 18 36 38 0 22-16 38-36 38S24 90 24 68c0-20 12-38 36-38z" fill="#4ADE80"/>
     <ellipse cx="46" cy="66" rx="9" ry="12" transform="rotate(-15 46 66)" fill="#1E1B2E"/><ellipse cx="74" cy="66" rx="9" ry="12" transform="rotate(15 74 66)" fill="#1E1B2E"/>
     <circle cx="48" cy="62" r="3" fill="#fff"/><circle cx="76" cy="62" r="3" fill="#fff"/>${sonrisa(88, '#14532D')}` },
  robot: { nombre: 'Robot', fondo: '#E0F2FE', dibujo:
    `<path d="M60 22v12" stroke="#64748B" stroke-width="4"/><circle cx="60" cy="20" r="6" fill="#F43F5E"/>
     <rect x="24" y="34" width="72" height="62" rx="20" fill="#94A3B8"/><rect x="32" y="46" width="56" height="30" rx="12" fill="#1E293B"/>
     <circle cx="47" cy="61" r="6" fill="#38BDF8"/><circle cx="73" cy="61" r="6" fill="#38BDF8"/>
     <rect x="44" y="82" width="32" height="6" rx="3" fill="#64748B"/><rect x="16" y="56" width="8" height="18" rx="4" fill="#64748B"/><rect x="96" y="56" width="8" height="18" rx="4" fill="#64748B"/>` },
  perro: { nombre: 'Perro', fondo: '#FFE4E6', dibujo:
    `<ellipse cx="60" cy="70" rx="34" ry="32" fill="#FCD34D"/>
     <ellipse cx="28" cy="62" rx="11" ry="24" transform="rotate(18 28 62)" fill="#92400E"/><ellipse cx="92" cy="62" rx="11" ry="24" transform="rotate(-18 92 62)" fill="#92400E"/>
     <ellipse cx="60" cy="84" rx="16" ry="12" fill="#FEF3C7"/>${ojos(47, 73, 66)}<ellipse cx="60" cy="78" rx="6" ry="4.5" fill="#1E1B2E"/>
     <path d="M56 86q4 8 8 0" fill="#F472B6"/>${mejillas(38, 82, 80)}` },
};


export function Avatar({ clave, apodo = '', tam = 40, className = '' }) {
  const id = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const a = AVATARES[clave];
  if (!a) {
    return (
      <span className={`avatar-inicial ${className}`} style={{ width: tam, height: tam, fontSize: tam * 0.42 }} aria-hidden="true">
        {(apodo.trim().charAt(0) || '?').toUpperCase()}
      </span>
    );
  }
  return (
    <svg className={`avatar ${className}`} width={tam} height={tam} viewBox="0 0 120 120" aria-hidden="true">
      <defs><clipPath id={id}><circle cx="60" cy="60" r="60" /></clipPath></defs>
      {/* Los dibujos son textos fijos de la app (no vienen de afuera), por eso es seguro insertarlos así. */}
      <g clipPath={`url(#${id})`} dangerouslySetInnerHTML={{ __html: `<circle cx="60" cy="60" r="60" fill="${a.fondo}"/>${a.dibujo}` }} />
    </svg>
  );
}
