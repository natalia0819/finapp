// Pantalla Deudas: totales, "Nueva deuda" y tres secciones que se abren y se recogen
// (lo que debo, lo que me deben y las pagadas). En el celular, al tocar una deuda se ve su detalle;
// en PC la lista queda a la izquierda y el detalle a la derecha.
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, CircleCheck, HandCoins, Plus } from 'lucide-react';
import DetalleDeuda from './DetalleDeuda';
import { pesos } from '../lib/formato';
import { agruparDeudas, textoPago } from '../lib/deudas';

const CUANTOS = 3; // deudas visibles por sección antes de "Ver más"
const CLAVE_ABIERTAS = 'fe_deudas_abiertas';

function usarEsPC() {
  const consulta = '(min-width: 900px)';
  const [esPC, setEsPC] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const alCambiar = () => setEsPC(m.matches);
    m.addEventListener('change', alCambiar);
    return () => m.removeEventListener('change', alCambiar);
  }, []);
  return esPC;
}

const leerAbiertas = () => { try { return JSON.parse(localStorage.getItem(CLAVE_ABIERTAS)) ?? []; } catch { return []; } };

const SECCIONES = [
  { id: 'debo', titulo: 'Lo que debo', Icono: ArrowUp, clase: 'negativo', sub: (n) => (n === 1 ? '1 deuda activa' : `${n} deudas activas`) },
  { id: 'me_deben', titulo: 'Lo que me deben', Icono: ArrowDown, clase: 'positivo', sub: (n) => (n === 1 ? '1 deuda activa' : `${n} deudas activas`) },
  { id: 'pagadas', titulo: 'Pagadas', Icono: CircleCheck, clase: 'neutro', sub: (n) => (n === 1 ? '1 deuda saldada' : `${n} deudas saldadas`) },
];

export default function Deudas({ deudas, abonos, espacios, movimientos, seleccion, onSeleccionar, onNueva, onEditar, onAbonar, onSumar, onBorrarRegistro }) {
  const esPC = usarEsPC();
  // En PC se recuerda qué secciones dejaste abiertas; en el celular siempre empieza todo recogido.
  const [abiertas, setAbiertas] = useState(() => (window.matchMedia('(min-width: 900px)').matches ? leerAbiertas() : []));
  const [completas, setCompletas] = useState([]); // secciones con "Ver más" activado

  useEffect(() => {
    if (esPC) { try { localStorage.setItem(CLAVE_ABIERTAS, JSON.stringify(abiertas)); } catch { /* nada */ } }
  }, [abiertas, esPC]);

  const { grupos, totales } = agruparDeudas(deudas, abonos);
  const elegida = deudas.find((d) => d.id === seleccion) ?? null;
  const alternar = (lista, id) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  const detalle = elegida && (
    <DetalleDeuda
      deuda={elegida}
      abonos={abonos}
      espacios={espacios}
      movimientos={movimientos}
      conVolver={!esPC}
      onVolver={() => onSeleccionar(null)}
      onEditar={() => onEditar(elegida)}
      onAbonar={() => onAbonar(elegida)}
      onSumar={() => onSumar(elegida)}
      onBorrarRegistro={onBorrarRegistro}
    />
  );

  // Celular con una deuda elegida: solo su detalle.
  if (!esPC && elegida) return <div className="deudas">{detalle}</div>;

  const lista = (
    <div className="deudas">
      <h1 className="titulo-pantalla deudas__titulo">Deudas</h1>
      <div className="deudas__totales">
        <div><small>Debes</small><strong className="negativo">{pesos(totales.debo)}</strong></div>
        <div><small>Te deben</small><strong className="positivo">{pesos(totales.me_deben)}</strong></div>
      </div>
      <button type="button" className="boton boton--principal boton--grande deudas__nueva" onClick={onNueva}>
        <Plus aria-hidden="true" /> Nueva deuda
      </button>

      {deudas.length === 0 ? (
        <div className="deudas__vacio">
          <HandCoins aria-hidden="true" />
          <p>Aquí vas a llevar lo que debes y lo que te deben. Registra tu primera deuda con el botón de arriba.</p>
        </div>
      ) : (
        <div className="acordeones">
          {SECCIONES.map(({ id, titulo, Icono, clase, sub }) => {
            const items = grupos[id];
            if (id === 'pagadas' && items.length === 0) return null;
            const abierta = abiertas.includes(id);
            const todas = completas.includes(id);
            const visibles = todas ? items : items.slice(0, CUANTOS);
            const total = id === 'pagadas' ? null : totales[id];
            return (
              <section key={id} className={`acord acord--${id} ${abierta ? 'abierto' : ''}`}>
                <button type="button" className="acord__cab" aria-expanded={abierta} onClick={() => setAbiertas((a) => alternar(a, id))}>
                  <span className="acord__ico"><Icono aria-hidden="true" /></span>
                  <span className="acord__txt"><strong>{titulo}</strong><small>{items.length ? sub(items.length) : 'Nada por ahora'}</small></span>
                  {total != null && <span className={`acord__monto ${clase}`}>{pesos(total)}</span>}
                  <ChevronRight className="acord__flecha" aria-hidden="true" />
                </button>
                {abierta && (
                  <div className="acord__cuerpo">
                    {items.length === 0 && <p className="acord__vacio">No tienes deudas aquí.</p>}
                    {visibles.map(({ deuda, total: t, pendiente, pct }) => (
                      <button key={deuda.id} type="button"
                        className={`deuda-fila ${deuda.tipo === 'me_deben' ? 'deuda-fila--me' : ''} ${seleccion === deuda.id && esPC ? 'sel' : ''}`}
                        onClick={() => onSeleccionar(deuda.id)}>
                        <span className="deuda-fila__arriba"><strong>{deuda.nombre}</strong><b>{pesos(pendiente)}</b></span>
                        <span className="barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avance de ${deuda.nombre}`}>
                          <span style={{ width: `${pct}%` }} />
                        </span>
                        <small><span>{pct}{' '}% de {pesos(t)}</span>{id === 'pagadas' ? <span>Saldada</span> : (() => {
                          const p = textoPago(deuda, abonos);
                          return <span className={p.atrasado ? 'fp-rojo' : ''}>{p.texto}</span>;
                        })()}</small>
                      </button>
                    ))}
                    {items.length > CUANTOS && (
                      <button type="button" className="acord__mas" onClick={() => setCompletas((c) => alternar(c, id))}>
                        {todas ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!esPC) return lista;
  return (
    <div className="deudas-pc">
      {lista}
      <div className="deudas-pc__detalle">
        {detalle ?? (deudas.length > 0 && <p className="vacio deudas__elige">Elige una deuda para ver su detalle y sus abonos.</p>)}
      </div>
    </div>
  );
}