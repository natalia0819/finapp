// Una fila del historial: ícono del espacio, descripción, espacio, hora y monto con signo.
import { ArrowRight } from 'lucide-react';
import { iconoDe } from '../constants/espacios';
import { fechaCorta, hora, pesos } from '../lib/formato';
import { signo, TEXTO_TIPO } from '../lib/movimientos';

export default function FilaMovimiento({ mov, espacios, onAbrir, soloHora, relativoA }) {
  const buscar = (id) => espacios.find((e) => e.id === id);
  const espacio = buscar(mov.espacio_id);
  const destino = buscar(mov.espacio_destino_id);
  const Icono = iconoDe(espacio?.icono);
  const s = signo(mov, relativoA);
  const cuando = soloHora ? hora(mov.fecha) : fechaCorta(mov.fecha);

  return (
    <li>
      <button type="button" className="mov" style={{ '--c': espacio?.color ?? '#7C3AED' }} onClick={() => onAbrir?.(mov)}>
        <span className="mov__icono"><Icono aria-hidden="true" /></span>
        <span className="mov__texto">
          <strong>{mov.descripcion || TEXTO_TIPO[mov.tipo]}</strong>
          <small>
            {mov.tipo === 'traslado'
              ? <>{espacio?.nombre ?? '—'} <ArrowRight className="flechita" aria-label="a" /> {destino?.nombre ?? '—'}</>
              : espacio?.nombre ?? 'Espacio eliminado'}
            {' · '}{cuando}
          </small>
        </span>
        <span className={`mov__monto ${s > 0 ? 'positivo' : s < 0 ? 'negativo' : 'neutro'}`}>
          {s > 0 ? '+' : s < 0 ? '−' : ''}{pesos(mov.monto)}
        </span>
      </button>
    </li>
  );
}
