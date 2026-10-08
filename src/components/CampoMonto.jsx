// Campo de dinero: acepta solo números y los muestra con los separadores de la moneda elegida.
// En monedas con centavos (dólar, euro...) permite hasta 2 decimales; en pesos colombianos, solo enteros.
import { useEffect, useState } from 'react';
import { datosMoneda, separadores } from '../lib/moneda';

/**
 * Convierte lo que la persona escribió en { texto para mostrar, número }.
 * Si aparece el separador decimal de la moneda (coma en euros, punto en dólares), ese marca los centavos.
 * Si no, se acepta también el otro signo como decimal cuando lleva 0, 1 o 2 dígitos después
 * (con 3 dígitos es separador de miles). Los decimales de más se ignoran.
 */
function interpretar(crudo) {
  const m = datosMoneda();
  const { miles, decimal } = separadores();
  const limpio = String(crudo).replace(/[^\d.,]/g, '');
  let entero = limpio;
  let decimales = null;
  if (m.decimales > 0) {
    const conDecimal = limpio.lastIndexOf(decimal);
    const otro = Math.max(limpio.lastIndexOf('.'), limpio.lastIndexOf(','));
    const pos = conDecimal >= 0 ? conDecimal : (otro >= 0 && limpio.length - otro - 1 < 3 ? otro : -1);
    if (pos >= 0) {
      entero = limpio.slice(0, pos);
      decimales = limpio.slice(pos + 1).replace(/\D/g, '').slice(0, m.decimales);
    }
  }
  entero = entero.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
  if (entero === '' && decimales === null) return { texto: '', numero: '' };
  const enteroTexto = (entero || '0').replace(/\B(?=(\d{3})+(?!\d))/g, miles);
  const texto = decimales === null ? enteroTexto : `${enteroTexto}${decimal}${decimales}`;
  const numero = Number(`${entero || '0'}${decimales ? `.${decimales}` : ''}`);
  return { texto, numero };
}

/** Texto inicial a partir de un número (por ejemplo, al editar un movimiento). */
function textoDe(valor) {
  if (valor === '' || valor == null) return '';
  const { decimal } = separadores();
  const [entero, dec] = String(Number(valor)).split('.');
  return interpretar(dec ? `${entero}${decimal}${dec}` : entero).texto;
}

export default function CampoMonto({ id, etiqueta, valor, onCambio, error, compacto, oculto }) {
  const m = datosMoneda();
  const [texto, setTexto] = useState(() => textoDe(valor));

  // Si el valor cambia desde afuera (por ejemplo, se limpia el formulario), se actualiza el texto.
  useEffect(() => {
    const actual = interpretar(texto).numero;
    if (actual !== valor && !(actual === '' && valor == null)) setTexto(textoDe(valor));
  }, [valor]); // eslint-disable-line react-hooks/exhaustive-deps

  function cambiar(e) {
    const { texto: nuevo, numero } = interpretar(e.target.value);
    setTexto(nuevo);
    onCambio(numero);
  }

  const simbolo = <span aria-hidden="true">{m.simbolo}</span>;
  return (
    <div className={`campo ${compacto ? 'campo--compacto' : ''}`}>
      <label htmlFor={id} className={oculto ? 'solo-lector' : undefined}>{etiqueta}</label>
      <div className={`monto ${compacto ? '' : 'monto--grande'}`}>
        {!m.simboloDespues && simbolo}
        <input
          id={id}
          inputMode={m.decimales > 0 ? 'decimal' : 'numeric'}
          autoComplete="off"
          placeholder="0"
          value={texto}
          onChange={cambiar}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {m.simboloDespues && simbolo}
      </div>
      {error && <small id={`${id}-error`} className="error">{error}</small>}
    </div>
  );
}
