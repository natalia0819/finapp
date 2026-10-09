// Tarjeta de un espacio: ícono, color, nombre, saldo y (si tiene meta) barra de progreso. Al tocarla se edita.
// Si toda la plata es digital o toda en efectivo, el dibujo de ese medio va al lado del ícono;
// si tiene de los dos, debajo del saldo se ve cuánto hay en cada uno.
import { iconoDe } from '../constants/espacios';
import { pesos } from '../lib/formato';
import { TEXTO_MEDIO } from '../lib/movimientos';
import { IconoMedio, MarcaMedio } from './Medio';

export default function TarjetaEspacio({ espacio, saldo, porMedio, onAbrir }) {
  const Icono = iconoDe(espacio.icono);
  const tieneMeta = Number(espacio.meta) > 0;
  const avance = tieneMeta ? Math.min(100, Math.max(0, (saldo / espacio.meta) * 100)) : 0;

  const efectivo = porMedio?.efectivo ?? 0;
  const digital = porMedio?.digital ?? saldo;
  const mixto = efectivo !== 0 && digital !== 0;
  const solo = mixto ? null : efectivo !== 0 ? 'efectivo' : digital !== 0 ? 'digital' : null;
  const detalle = mixto
    ? ` (${pesos(efectivo)} en efectivo y ${pesos(digital)} en digital)`
    : solo ? `, todo en ${TEXTO_MEDIO[solo].toLowerCase()}` : '';

  return (
    <button type="button" className="espacio" style={{ '--c': espacio.color }} onClick={() => onAbrir(espacio)}
      aria-label={`${espacio.nombre}: ${pesos(saldo)}${detalle}. Editar espacio`}>
      <span className="espacio__arriba">
        <span className="espacio__icono"><Icono aria-hidden="true" /></span>
        {solo && <MarcaMedio medio={solo} />}
      </span>
      <span className="espacio__info">
        <span className="espacio__nombre">{espacio.nombre}</span>
        <span className={`espacio__saldo ${saldo < 0 ? 'negativo' : ''}`}>{pesos(saldo)}</span>
        {mixto && (
          <span className="espacio__medios">
            <span><IconoMedio medio="efectivo" />{pesos(efectivo)}</span>
            <span><IconoMedio medio="digital" />{pesos(digital)}</span>
          </span>
        )}
        {tieneMeta && (
          <span className="meta">
            <span className="meta__barra" role="progressbar" aria-valuenow={Math.round(avance)} aria-valuemin={0} aria-valuemax={100}
              aria-label={`Avance de la meta de ${espacio.nombre}`}>
              <span style={{ width: `${avance}%` }} />
            </span>
            <small>{Math.round(avance)}{'\u00A0'}% de {pesos(espacio.meta)}</small>
          </span>
        )}
      </span>
    </button>
  );
}
