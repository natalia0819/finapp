// Digital o efectivo: el dibujo de cada uno y los botones para elegirlo en los formularios.
import { Banknote, CreditCard } from 'lucide-react';
import { MEDIOS, TEXTO_MEDIO } from '../lib/movimientos';

const DIBUJOS = { digital: CreditCard, efectivo: Banknote };

/** Dibujo del medio: tarjeta para digital, billete para efectivo. */
export function IconoMedio({ medio, className }) {
  const Dibujo = DIBUJOS[medio] ?? CreditCard;
  return <Dibujo className={className} aria-hidden="true" />;
}

/** Dibujo pequeño con fondo, con el nombre del medio para lectores de pantalla (y al dejar el puntero encima). */
export function MarcaMedio({ medio, className = '' }) {
  return (
    <span className={`marca-medio ${className}`} title={TEXTO_MEDIO[medio]} role="img" aria-label={TEXTO_MEDIO[medio]}>
      <IconoMedio medio={medio} />
    </span>
  );
}

/** Botones Digital / Efectivo. */
export default function SelectorMedio({ valor, onCambio }) {
  return (
    <div className="segmentos segmentos--medio" role="radiogroup" aria-label="Digital o efectivo">
      {MEDIOS.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={valor === m} onClick={() => onCambio(m)}>
          <IconoMedio medio={m} /> {TEXTO_MEDIO[m]}
        </button>
      ))}
    </div>
  );
}
