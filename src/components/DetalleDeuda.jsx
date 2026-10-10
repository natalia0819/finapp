// Detalle de una deuda: cuánto falta, datos, nota, botones de abono y "sumar", e historial.
// Al tocar un registro del historial se puede borrar (también se borra su movimiento en el espacio).
import { ChevronLeft, HandCoins, Pencil, Plus, StickyNote, TrendingUp } from 'lucide-react';
import { iconoDe } from '../constants/espacios';
import { fechaCorta, pesos } from '../lib/formato';
import { describirFechaPago, diaCorto, proximoPago, registrosDe, resumenDeuda, TIPOS_DEUDA } from '../lib/deudas';
import { medioDe } from '../lib/movimientos';
import { MarcaMedio } from './Medio';

export default function DetalleDeuda({ deuda, abonos, espacios, movimientos, conVolver, onVolver, onEditar, onAbonar, onSumar, onBorrarRegistro }) {
  const r = resumenDeuda(deuda, abonos);
  const historial = registrosDe(deuda, abonos);
  const meDeben = deuda.tipo === 'me_deben';
  const prox = r.pagada ? null : proximoPago(deuda, abonos);
  let fechaPago = describirFechaPago(deuda.fecha_limite);
  if (prox?.modo === 'mes') fechaPago += prox.atrasado ? ` · atrasado desde ${diaCorto(prox.fecha)}` : ` · próximo ${diaCorto(prox.fecha)}`;
  else if (prox?.atrasado) fechaPago += ' · atrasado';

  /** Texto de la segunda línea de cada registro: de qué espacio salió o a cuál entró. */
  function lugar(reg, mov, espacio) {
    if (!mov) return reg.nota || 'Sin espacio';
    const nombre = espacio?.nombre ?? 'un espacio';
    const sale = mov.tipo === 'gasto';
    return `${sale ? 'Desde' : 'A'} ${nombre}${reg.nota ? ` · ${reg.nota}` : ''}`;
  }

  return (
    <div className={`detalle-deuda ${meDeben ? 'detalle-deuda--me' : ''}`}>
      <div className="detalle-deuda__cab">
        {conVolver && (
          <button type="button" className="detalle-deuda__btn" onClick={onVolver} aria-label="Volver a Deudas"><ChevronLeft aria-hidden="true" /></button>
        )}
        <h2>{deuda.nombre}</h2>
        <button type="button" className="detalle-deuda__btn" onClick={onEditar} aria-label="Editar deuda"><Pencil aria-hidden="true" /></button>
      </div>

      <div className="detalle-deuda__tarjeta">
        <span className="chip">{r.pagada ? '¡Saldada!' : TIPOS_DEUDA[deuda.tipo]}</span>
        <small className="detalle-deuda__etq">{meDeben ? 'Te falta recibir' : 'Pendiente'}</small>
        <span className="detalle-deuda__pend">{pesos(r.pendiente)}</span>
        <span className="barra barra--grande" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la deuda">
          <span style={{ width: `${r.pct}%` }} />
        </span>
        <div className="detalle-deuda__datos">
          <div><small>Total</small><b>{pesos(r.total)}</b></div>
          <div><small>{meDeben ? 'Te han pagado' : 'Abonado'}</small><b className="positivo">{pesos(r.abonado)}</b></div>
          <div className="detalle-deuda__dato-ancho"><small>Fecha de pago</small><b className={prox?.atrasado ? 'fp-rojo' : ''}>{fechaPago}</b></div>
        </div>
        {deuda.nota && <p className="detalle-deuda__nota"><StickyNote aria-hidden="true" /> {deuda.nota}</p>}
      </div>

      <div className="detalle-deuda__acciones">
        {!r.pagada && (
          <button type="button" className="boton boton--principal boton--grande" onClick={onAbonar}>
            <Plus aria-hidden="true" /> Registrar abono
          </button>
        )}
        <button type="button" className="boton boton--suave boton--grande" onClick={onSumar}>
          <TrendingUp aria-hidden="true" /> Sumar a la deuda
        </button>
      </div>

      <section>
        <h3 className="detalle-deuda__subtitulo">Historial ({historial.length})</h3>
        {historial.length === 0 ? (
          <p className="vacio">Todavía no hay abonos.</p>
        ) : (
          <ul className="lista">
            {historial.map((reg) => {
              const mov = movimientos.find((m) => m.id === reg.movimiento_id);
              const espacio = mov && espacios.find((e) => e.id === mov.espacio_id);
              const Icono = espacio ? iconoDe(espacio.icono) : HandCoins;
              const esAbono = reg.tipo === 'abono';
              const signo = esAbono ? (meDeben ? '+' : '−') : '+';
              const clase = esAbono ? (meDeben ? 'positivo' : 'negativo') : 'neutro';
              return (
                <li key={reg.id}>
                  <button type="button" className="mov" style={{ '--c': espacio?.color ?? '#7C3AED' }} onClick={() => onBorrarRegistro(reg)}
                    aria-label={`${esAbono ? 'Abono' : 'Sumó a la deuda'} de ${pesos(reg.monto)}. Tocar para borrar`}>
                    <span className="mov__icono"><Icono aria-hidden="true" /></span>
                    <span className="mov__texto">
                      <strong>{esAbono ? 'Abono' : 'Sumó a la deuda'}</strong>
                      <small>
                        {mov && <MarcaMedio medio={medioDe(mov)} className="marca-medio--mini" />}
                        {lugar(reg, mov, espacio)} · {fechaCorta(reg.fecha)}
                      </small>
                    </span>
                    <span className={`mov__monto ${clase}`}>{signo}{pesos(reg.monto)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}