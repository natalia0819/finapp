// Ventana para elegir el avatar de la persona.
import { useState } from 'react';
import { Check } from 'lucide-react';
import Hoja from './Hoja';
import { AVATARES, Avatar } from '../constants/avatares';

export default function SelectorAvatar({ actual, apodo, onGuardar, onCerrar }) {
  const [elegido, setElegido] = useState(AVATARES[actual] ? actual : 'inicial');
  const opciones = ['inicial', ...Object.keys(AVATARES)];

  return (
    <Hoja
      titulo="Elige tu avatar"
      onCerrar={onCerrar}
      onSubmit={() => onGuardar(elegido === 'inicial' ? '' : elegido)}
      pie={<button type="submit" className="boton boton--principal boton--flex">Guardar</button>}
    >
      <div className="avatar-vista">
        <Avatar clave={elegido} apodo={apodo} tam={96} />
        <strong>{apodo}</strong>
      </div>

      <fieldset className="selector">
        <legend className="solo-lector">Avatares disponibles</legend>
        <div className="avatares">
          {opciones.map((clave) => (
            <label key={clave} className="avatar-op">
              <input
                type="radio"
                name="avatar"
                value={clave}
                checked={elegido === clave}
                onChange={() => setElegido(clave)}
                aria-label={clave === 'inicial' ? 'Tu inicial' : AVATARES[clave].nombre}
              />
              <Avatar clave={clave} apodo={apodo} tam={64} />
              <span className="avatar-op__chulo" aria-hidden="true"><Check /></span>
            </label>
          ))}
        </div>
      </fieldset>
    </Hoja>
  );
}
