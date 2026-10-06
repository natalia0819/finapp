// Tarjeta de un espacio: ícono, color, nombre, saldo y (si tiene meta) barra de progreso. Al tocarla se edita.
import { iconoDe } from '../constants/espacios';
import { pesos } from '../lib/formato';

export default function TarjetaEspacio({ espacio, saldo, onAbrir }) {
  const Icono = iconoDe(espacio.icono);
  const tieneMeta = Number(espacio.meta) > 0;
  const avance = tieneMeta ? Math.min(100, Math.max(0, (saldo / espacio.meta) * 100)) : 0;

  return (
    <button type="button" className="espacio" style={{ '--c': espacio.color }} onClick={() => onAbrir(espacio)}
      aria-label={`${espacio.nombre}: ${pesos(saldo)}. Editar espacio`}>
      <span className="espacio__icono"><Icono aria-hidden="true" /></span>
      <span className="espacio__info">
        <span className="espacio__nombre">{espacio.nombre}</span>
        <span className={`espacio__saldo ${saldo < 0 ? 'negativo' : ''}`}>{pesos(saldo)}</span>
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
