// Gestionar espacios desde Ajustes: activos y archivados (con opción de reactivar).
import { ArchiveRestore, ChevronRight, Plus } from 'lucide-react';
import Hoja from './Hoja';
import { iconoDe } from '../constants/espacios';
import { pesos } from '../lib/formato';

export default function GestionEspacios({ espacios, saldos, onAbrir, onNuevo, onReactivar, onCerrar }) {
  const activos = espacios.filter((e) => e.activo);
  const archivados = espacios.filter((e) => !e.activo);

  const Fila = ({ e, children }) => {
    const Icono = iconoDe(e.icono);
    return (
      <li className="gestion__fila" style={{ '--c': e.color }}>
        <span className="mov__icono"><Icono aria-hidden="true" /></span>
        <span className="mov__texto"><strong>{e.nombre}</strong><small>{pesos(saldos[e.id] ?? 0)}{e.es_predeterminado ? ' · predeterminado' : ''}</small></span>
        {children}
      </li>
    );
  };

  return (
    <Hoja titulo="Gestionar espacios" onCerrar={onCerrar}>
      <button className="boton boton--principal boton--ancho" onClick={onNuevo} data-autofocus><Plus aria-hidden="true" /> Nuevo espacio</button>

      <h3 className="subtitulo">Activos</h3>
      <ul className="lista">
        {activos.map((e) => (
          <Fila key={e.id} e={e}>
            <button className="icono-boton" onClick={() => onAbrir(e)} aria-label={`Editar ${e.nombre}`}><ChevronRight aria-hidden="true" /></button>
          </Fila>
        ))}
      </ul>

      <h3 className="subtitulo">Archivados</h3>
      {archivados.length === 0 ? (
        <p className="vacio">No tienes espacios archivados.</p>
      ) : (
        <ul className="lista">
          {archivados.map((e) => (
            <Fila key={e.id} e={e}>
              <button className="boton boton--suave boton--chico" onClick={() => onReactivar(e)}>
                <ArchiveRestore aria-hidden="true" /> Reactivar
              </button>
            </Fila>
          ))}
        </ul>
      )}
    </Hoja>
  );
}
