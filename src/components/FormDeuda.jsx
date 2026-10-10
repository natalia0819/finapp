// Crear o editar una deuda (lo que debo / lo que me deben).
// Al crearla, la plata puede entrar a un espacio (me prestaron) o salir de uno (presté).
import { useMemo, useState } from 'react';
import { CalendarDays, Check, Trash2 } from 'lucide-react';
import Hoja from './Hoja';
import Confirmar from './Confirmar';
import CampoMonto from './CampoMonto';
import SelectorEspacio from './SelectorEspacio';
import SelectorMedio from './Medio';
import { fechaAhora, generarId, pesos } from '../lib/formato';
import { TEXTO_MEDIO, validarCambio } from '../lib/movimientos';
import { diaCorto, guardarFechaPago, leerFechaPago, proximoPago } from '../lib/deudas';

const enMedio = (medio) => `en ${TEXTO_MEDIO[medio].toLowerCase()}`;

export default function FormDeuda({ deuda, espacios, saldosMedio = {}, movimientos = [], abonos = [], onGuardar, onEliminar, onCerrar }) {
  const editando = Boolean(deuda);
  const [tipo, setTipo] = useState(deuda?.tipo ?? 'debo');
  const [nombre, setNombre] = useState(deuda?.nombre ?? '');
  const [monto, setMonto] = useState(deuda?.monto ?? '');
  const [conectar, setConectar] = useState(false);
  const [medio, setMedio] = useState('digital');
  const [espacioId, setEspacioId] = useState('');
  const fpInicial = leerFechaPago(deuda?.fecha_limite);
  const [modoFecha, setModoFecha] = useState(fpInicial.modo);
  const [fechaUna, setFechaUna] = useState(fpInicial.fecha ?? '');
  const [diaMes, setDiaMes] = useState(fpInicial.dia ?? null);
  const [eligiendoDia, setEligiendoDia] = useState(!fpInicial.dia); // la cuadrícula se recoge al elegir el día
  const [nota, setNota] = useState(deuda?.nota ?? '');
  const [errores, setErrores] = useState({});
  const [borrar, setBorrar] = useState(false);

  const activos = espacios.filter((e) => e.activo);
  const sale = tipo === 'me_deben'; // presté: la plata sale de un espacio
  const montoBloqueado = editando && Boolean(deuda.movimiento_id); // el monto ya quedó ligado a un movimiento
  const disponibles = useMemo(
    () => Object.fromEntries(Object.entries(saldosMedio).map(([id, s]) => [id, s[medio] ?? 0])),
    [saldosMedio, medio],
  );

  function enviar() {
    const e = {};
    const limpio = nombre.trim();
    if (!limpio) e.nombre = tipo === 'debo' ? 'Escribe qué es o a quién le debes.' : 'Escribe quién te debe o por qué.';
    if (!monto || monto <= 0) e.monto = 'Escribe un monto mayor a $ 0.';
    if (modoFecha === 'una' && !fechaUna) e.fecha = 'Elige la fecha del pago.';
    if (modoFecha === 'mes' && !diaMes) e.fecha = 'Elige el día del mes.';
    if (!editando && conectar && !espacioId) e.espacio = sale ? 'Elige de qué espacio salió.' : 'Elige a qué espacio entró.';
    let mov = null;
    if (!Object.keys(e).length && !editando && conectar) {
      mov = {
        id: generarId(), fecha: fechaAhora(), tipo: sale ? 'gasto' : 'ingreso', monto: Number(monto),
        espacio_id: espacioId, espacio_destino_id: '', descripcion: sale ? `Préstamo a ${limpio}` : `Préstamo: ${limpio}`,
        grupo_id: '', medio,
      };
      if (sale) {
        const problemas = validarCambio(espacios, movimientos, [], [mov]);
        if (problemas.length) e.espacio = `En ese espacio solo hay ${pesos(Math.max(0, disponibles[espacioId] ?? 0))} ${enMedio(medio)}.`;
      }
    }
    setErrores(e);
    if (Object.keys(e).length) return;
    onGuardar({
      id: deuda?.id ?? generarId(),
      nombre: limpio,
      tipo,
      monto: Number(monto),
      fecha: deuda?.fecha ?? fechaAhora(),
      fecha_limite: guardarFechaPago(modoFecha, { fecha: fechaUna, dia: diaMes }),
      nota: nota.trim(),
      movimiento_id: deuda?.movimiento_id ?? (mov ? mov.id : ''),
    }, mov);
  }

  const pie = (
    <>
      {editando && (
        <button type="button" className="boton boton--peligro" onClick={() => setBorrar(true)}><Trash2 aria-hidden="true" /> Eliminar</button>
      )}
      <button type="submit" className="boton boton--principal boton--flex"><Check aria-hidden="true" /> {editando ? 'Guardar cambios' : 'Guardar'}</button>
    </>
  );

  return (
    <Hoja titulo={editando ? 'Editar deuda' : 'Nueva deuda'} onCerrar={onCerrar} onSubmit={enviar} pie={pie}>
      {!editando && (
        <div className="segmentos segmentos--deuda" role="radiogroup" aria-label="Tipo de deuda">
          {[['debo', 'Debo'], ['me_deben', 'Me deben']].map(([id, texto]) => (
            <button key={id} type="button" role="radio" aria-checked={tipo === id} onClick={() => { setTipo(id); setErrores({}); }}>{texto}</button>
          ))}
        </div>
      )}

      <div className="campo">
        <label htmlFor="deuda-nombre">{tipo === 'debo' ? '¿Qué es o a quién le debes?' : '¿Quién te debe?'}</label>
        <input id="deuda-nombre" className="entrada" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)}
          placeholder={tipo === 'debo' ? 'Ej.: Tarjeta de crédito, préstamo' : ''}
          aria-invalid={Boolean(errores.nombre)} />
        {errores.nombre && <small className="error">{errores.nombre}</small>}
      </div>

      {montoBloqueado ? (
        <div className="campo">
          <span className="campo__etiqueta">Monto inicial</span>
          <p className="deuda__monto-fijo">{pesos(deuda.monto)}</p>
          <p className="ayuda">Este monto ya entró o salió de un espacio. Para aumentarlo usa "Sumar a la deuda".</p>
        </div>
      ) : (
        <CampoMonto id="monto" etiqueta={editando ? 'Monto inicial' : 'Monto total'} valor={monto}
          onCambio={(v) => { setMonto(v); setErrores((x) => ({ ...x, monto: undefined })); }} error={errores.monto} />
      )}

      {!editando && (
        <>
          <label className="interruptor">
            <input type="checkbox" checked={conectar} onChange={(e) => { setConectar(e.target.checked); setErrores((x) => ({ ...x, espacio: undefined })); }} />
            <span className="interruptor__pista" aria-hidden="true" />
            {sale ? 'La plata salió de uno de mis espacios' : 'La plata entró a uno de mis espacios'}
          </label>
          {conectar && (
            <>
              <SelectorMedio valor={medio} onCambio={setMedio} />
              <SelectorEspacio nombre="espacio-deuda" leyenda={sale ? '¿De qué espacio salió?' : '¿A qué espacio entró?'}
                espacios={activos} valor={espacioId} onCambio={(id) => { setEspacioId(id); setErrores((x) => ({ ...x, espacio: undefined })); }}
                saldos={sale ? disponibles : undefined} medio={medio} error={errores.espacio} />
            </>
          )}
        </>
      )}

      <div className="campo">
        <span className="campo__etiqueta" id="etiqueta-fecha-pago">Fecha de pago</span>
        <div className="segmentos segmentos--fp" role="radiogroup" aria-labelledby="etiqueta-fecha-pago">
          {[['sin', 'Sin fecha'], ['una', 'Una vez'], ['mes', 'Cada mes']].map(([id, texto]) => (
            <button key={id} type="button" role="radio" aria-checked={modoFecha === id}
              onClick={() => { setModoFecha(id); setErrores((x) => ({ ...x, fecha: undefined })); }}>{texto}</button>
          ))}
        </div>
        {modoFecha === 'una' && (
          <input id="deuda-limite" type="date" className="entrada" aria-label="Fecha del pago" value={fechaUna}
            onChange={(e) => { setFechaUna(e.target.value); setErrores((x) => ({ ...x, fecha: undefined })); }} />
        )}
        {modoFecha === 'mes' && (eligiendoDia || !diaMes) && (
          <>
            <span className="campo__sub" id="etiqueta-dia">¿Qué día del mes?</span>
            <div className="dias" role="radiogroup" aria-labelledby="etiqueta-dia">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button key={d} type="button" role="radio" aria-checked={diaMes === d} className={diaMes === d ? 'sel' : ''}
                  onClick={() => { setDiaMes(d); setEligiendoDia(false); setErrores((x) => ({ ...x, fecha: undefined })); }}>{d}</button>
              ))}
            </div>
          </>
        )}
        {modoFecha === 'mes' && diaMes && !eligiendoDia && (
          <div className="dia-elegido">
            <CalendarDays aria-hidden="true" />
            <span>
              <b>El {diaMes} de cada mes</b>
              <small>
                Próximo pago: {diaCorto(proximoPago({ id: deuda?.id ?? '', fecha: deuda?.fecha ?? fechaAhora(), fecha_limite: `cada mes el ${diaMes}` }, abonos).fecha)}
              </small>
            </span>
            <button type="button" className="enlace" onClick={() => setEligiendoDia(true)}>Cambiar</button>
          </div>
        )}
        {errores.fecha && <small className="error">{errores.fecha}</small>}
      </div>

      <div className="campo">
        <label htmlFor="deuda-nota">Nota</label>
        <input id="deuda-nota" className="entrada" value={nota} maxLength={120} onChange={(e) => setNota(e.target.value)}
          placeholder="Ej.: 12 cuotas, interés 2 % mensual" />
      </div>

      {borrar && (
        <Confirmar
          titulo={`¿Eliminar "${deuda.nombre}"?`}
          mensaje="Se borra la deuda y su historial de abonos. Los gastos e ingresos que creó en tus espacios se quedan, para que tus saldos no cambien."
          textoSi="Eliminar" peligro
          onNo={() => setBorrar(false)}
          onSi={() => onEliminar(deuda.id)}
        />
      )}
    </Hoja>
  );
}