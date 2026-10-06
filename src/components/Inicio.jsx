// Pantalla 3: inicio.
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus } from 'lucide-react';
import TarjetaEspacio from './TarjetaEspacio';
import FilaMovimiento from './FilaMovimiento';
import { fechaAhora, pesos } from '../lib/formato';
import { filtrar, ordenarRecientes, resumen } from '../lib/movimientos';

function hoyTexto() {
  const t = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Inicio({ apodo, espacios, movimientos, saldos, onRegistrar, onAbrirEspacio, onNuevoEspacio, onAbrirMovimiento, onVerTodos }) {
  const activos = espacios.filter((e) => e.activo);
  const total = activos.reduce((suma, e) => suma + (saldos[e.id] ?? 0), 0);
  const recientes = ordenarRecientes(movimientos).slice(0, 6);
  const ultimo = recientes[0];
  const mes = resumen(filtrar(movimientos, { mes: fechaAhora().slice(0, 7) }));

  return (
    <div className="inicio">
      <section className="inicio__resumen" aria-label="Resumen">
        <div className="inicio__cabecera">
          <p className="saludo">Hola, {apodo}</p>
          <p className="fecha-hoy">{hoyTexto()}</p>
        </div>

        <div className="balance">
          <p className="balance__etiqueta">Dinero total</p>
          <p className="total">{pesos(total)}</p>
          <p className="total__nota">en {activos.length} {activos.length === 1 ? 'espacio' : 'espacios'}</p>
          <div className="balance__mes" aria-label="Este mes">
            <span><small>Entró este mes</small><strong>+{pesos(mes.entro)}</strong></span>
            <span><small>Salió este mes</small><strong>−{pesos(mes.salio)}</strong></span>
          </div>
          <p className="ultimo">
            {ultimo ? mensajeUltimo(ultimo, espacios) : 'Todavía no hay movimientos. Registra tu primer ingreso para empezar.'}
          </p>
        </div>

        <div className="acciones">
          <button className="boton boton--grande boton--principal" onClick={() => onRegistrar('ingreso')}>
            <ArrowDownLeft aria-hidden="true" /> Ingresos
          </button>
          <button className="boton boton--grande boton--contorno" onClick={() => onRegistrar('gasto')}>
            <ArrowUpRight aria-hidden="true" /> Gastos
          </button>
          <button className="boton boton--texto acciones__traslado" onClick={() => onRegistrar('traslado')}>
            <ArrowLeftRight aria-hidden="true" /> Traslados<span className="solo-movil">&nbsp;entre espacios</span>
          </button>
        </div>
      </section>

      <section className="inicio__espacios" aria-labelledby="titulo-espacios">
        <h2 id="titulo-espacios">Mis espacios</h2>
        <div className="rejilla">
          {activos.map((e) => <TarjetaEspacio key={e.id} espacio={e} saldo={saldos[e.id] ?? 0} onAbrir={onAbrirEspacio} />)}
          <button className="espacio espacio--nuevo" onClick={onNuevoEspacio}>
            <span className="espacio__icono"><Plus aria-hidden="true" /></span>
            <span className="espacio__nombre">Nuevo espacio</span>
          </button>
        </div>
      </section>

      <section className="inicio__recientes" aria-labelledby="titulo-recientes">
        <div className="titulo-con-accion">
          <h2 id="titulo-recientes">Últimos movimientos</h2>
          {recientes.length > 0 && <button className="enlace" onClick={onVerTodos}>Ver todos</button>}
        </div>
        {recientes.length ? (
          <ul className="lista">{recientes.map((m) => <FilaMovimiento key={m.id} mov={m} espacios={espacios} onAbrir={onAbrirMovimiento} />)}</ul>
        ) : (
          <p className="vacio">Aquí aparecerán tus ingresos y gastos.</p>
        )}
      </section>
    </div>
  );
}

function mensajeUltimo(m, espacios) {
  const nombre = (id) => espacios.find((e) => e.id === id)?.nombre ?? 'un espacio';
  if (m.tipo === 'ingreso') return `Lo último: entraron ${pesos(m.monto)} a ${nombre(m.espacio_id)}. ¡Bien!`;
  if (m.tipo === 'gasto') return `Lo último: salieron ${pesos(m.monto)} de ${nombre(m.espacio_id)}${m.descripcion ? ` en ${m.descripcion.toLowerCase()}` : ''}.`;
  return `Lo último: moviste ${pesos(m.monto)} de ${nombre(m.espacio_id)} a ${nombre(m.espacio_destino_id)}.`;
}
