// Navegación: barra inferior en el celular, riel compacto en laptops y barra lateral completa en pantallas grandes.
import { LayoutGrid, ListOrdered, Settings } from 'lucide-react';
import { Avatar } from '../constants/avatares';

const PESTANAS = [
  { id: 'inicio', texto: 'Inicio', Icono: LayoutGrid },
  { id: 'movimientos', texto: 'Movimientos', Icono: ListOrdered },
  { id: 'ajustes', texto: 'Ajustes', Icono: Settings },
];

export default function Navegacion({ actual, onCambiar, apodo = '', avatar = '', pendientes = 0 }) {
  return (
    <nav className="nav" aria-label="Secciones">
      <div className="nav__marca">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="40" height="40" />
        <span>FinApp</span>
      </div>

      <div className="nav__items">
        {PESTANAS.map(({ id, texto, Icono }) => (
          <button
            key={id}
            className="nav__item"
            aria-current={actual === id ? 'page' : undefined}
            onClick={() => onCambiar(id)}
          >
            <Icono aria-hidden="true" />
            <span>{texto}</span>
          </button>
        ))}
      </div>

      {apodo && (
        <div className="nav__pie">
          <Avatar clave={avatar} apodo={apodo} tam={40} className="nav__avatar" />
          <span className="nav__usuario">
            <strong>{apodo}</strong>
            <small>{pendientes ? `${pendientes} sin sincronizar` : 'Datos en tu Google Drive'}</small>
          </span>
        </div>
      )}
    </nav>
  );
}
