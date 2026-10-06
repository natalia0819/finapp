// Campo de dinero: solo acepta dígitos y los muestra con puntos de miles ("20.000").
import { miles } from '../lib/formato';

export default function CampoMonto({ id, etiqueta, valor, onCambio, error, compacto, oculto }) {
  function cambiar(e) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 12); // letras y signos se ignoran
    onCambio(digitos === '' ? '' : Number(digitos));
  }

  return (
    <div className={`campo ${compacto ? 'campo--compacto' : ''}`}>
      <label htmlFor={id} className={oculto ? 'solo-lector' : undefined}>{etiqueta}</label>
      <div className={`monto ${compacto ? '' : 'monto--grande'}`}>
        <span aria-hidden="true">$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={miles(valor)}
          onChange={cambiar}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && <small id={`${id}-error`} className="error">{error}</small>}
    </div>
  );
}
