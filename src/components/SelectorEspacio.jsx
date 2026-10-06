// Elegir un espacio tocando su ficha (botones de radio reales, accesibles con teclado).
import { iconoDe } from '../constants/espacios';
import { pesos } from '../lib/formato';

export default function SelectorEspacio({ nombre, leyenda, espacios, valor, onCambio, saldos, error, excluir }) {
  const lista = espacios.filter((e) => e.id !== excluir);
  return (
    <fieldset className="selector" aria-describedby={error ? `${nombre}-error` : undefined}>
      <legend>{leyenda}</legend>
      {lista.length === 0 && <p className="vacio">No hay otros espacios activos.</p>}
      <div className="fichas">
        {lista.map((e) => {
          const Icono = iconoDe(e.icono);
          const saldo = saldos?.[e.id];
          return (
            <label key={e.id} className="ficha" style={{ '--c': e.color }}>
              <input type="radio" name={nombre} value={e.id} checked={valor === e.id} onChange={() => onCambio(e.id)} />
              <span className="ficha__icono"><Icono aria-hidden="true" /></span>
              <span className="ficha__texto">
                <span>{e.nombre}</span>
                {saldos && <small className={saldo < 0 ? 'negativo' : ''}>{pesos(saldo ?? 0)}</small>}
              </span>
            </label>
          );
        })}
      </div>
      {error && <small id={`${nombre}-error`} className="error">{error}</small>}
    </fieldset>
  );
}
