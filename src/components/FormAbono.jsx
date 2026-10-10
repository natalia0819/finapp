// Registrar un abono a una deuda, o "sumar a la deuda".
// - Abono de lo que debo: sale de un espacio (queda como gasto).
// - Abono de lo que me deben: entra a un espacio (queda como ingreso).
// - Sumar a la deuda: sube el total; si la plata entró o salió de un espacio, se elige cuál.
import { useMemo, useState } from 'react';
import { CalendarClock, Check, CreditCard, HandCoins } from 'lucide-react';
import Hoja from './Hoja';
import CampoMonto from './CampoMonto';
import SelectorEspacio from './SelectorEspacio';
import SelectorMedio from './Medio';
import { fechaAInput, fechaAhora, fechaCorta, generarId, inputAFecha, pesos } from '../lib/formato';
import { TEXTO_MEDIO, validarCambio } from '../lib/movimientos';
import { resumenDeuda } from '../lib/deudas';

const enMedio = (medio) => `en ${TEXTO_MEDIO[medio].toLowerCase()}`;

export default function FormAbono({ deuda, modo = 'abono', abonos, espacios, saldosMedio = {}, movimientos = [], onGuardar, onCerrar }) {
  const esAbono = modo === 'abono';
  const meDeben = deuda.tipo === 'me_deben';
  const r = resumenDeuda(deuda, abonos);

  const [monto, setMonto] = useState('');
  const [conectar, setConectar] = useState(esAbono); // el abono siempre va a un espacio; "sumar" es opcional
  const [medio, setMedio] = useState('digital');
  const [espacioId, setEspacioId] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(null); // null = ahora
  const [cambiandoFecha, setCambiandoFecha] = useState(false);
  const [errores, setErrores] = useState({});

  // ¿La plata sale de un espacio? Abono de lo que debo, o prestar más (sumar a lo que me deben).
  const sale = esAbono ? !meDeben : meDeben;
  const activos = espacios.filter((e) => e.activo);
  const disponibles = useMemo(
    () => Object.fromEntries(Object.entries(saldosMedio).map(([id, s]) => [id, s[medio] ?? 0])),
    [saldosMedio, medio],
  );
  const supera = conectar && sale && espacioId && Number(monto) > (disponibles[espacioId] ?? 0);

  function descripcion() {
    if (esAbono) return meDeben ? `Abono de ${deuda.nombre}` : `Abono: ${deuda.nombre}`;
    return meDeben ? `Préstamo a ${deuda.nombre}` : `Préstamo: ${deuda.nombre}`;
  }

  function enviar() {
    const e = {};
    if (!monto || monto <= 0) e.monto = 'Escribe un monto mayor a $ 0.';
    else if (esAbono && Number(monto) > r.pendiente) e.monto = `Solo ${meDeben ? 'te deben' : 'faltan'} ${pesos(r.pendiente)}.`;
    if (conectar && !espacioId) e.espacio = sale ? 'Elige de qué espacio sale.' : 'Elige a qué espacio entra.';
    const cuando = fecha ?? fechaAhora();
    let mov = null;
    if (!Object.keys(e).length && conectar) {
      mov = {
        id: generarId(), fecha: cuando, tipo: sale ? 'gasto' : 'ingreso', monto: Number(monto),
        espacio_id: espacioId, espacio_destino_id: '', descripcion: descripcion(), grupo_id: '', medio,
      };
      if (sale && validarCambio(espacios, movimientos, [], [mov]).length) {
        e.espacio = `En ese espacio solo hay ${pesos(Math.max(0, disponibles[espacioId] ?? 0))} ${enMedio(medio)}.`;
      }
    }
    setErrores(e);
    if (Object.keys(e).length) return;
    onGuardar({
      id: generarId(), deuda_id: deuda.id, deuda: deuda.nombre, tipo: modo, fecha: cuando,
      monto: Number(monto), nota: nota.trim(), movimiento_id: mov ? mov.id : '',
    }, mov);
  }

  const pie = <button type="submit" className="boton boton--principal boton--flex"><Check aria-hidden="true" /> Guardar</button>;

  return (
    <Hoja titulo={esAbono ? 'Registrar abono' : 'Sumar a la deuda'} onCerrar={onCerrar} onSubmit={enviar} pie={pie}>
      <div className={`info-deuda ${meDeben ? 'info-deuda--me' : ''}`}>
        <span className="info-deuda__ico">{meDeben ? <HandCoins aria-hidden="true" /> : <CreditCard aria-hidden="true" />}</span>
        <span><b>{deuda.nombre}</b><small>{meDeben ? 'Te deben' : 'Pendiente'}: {pesos(r.pendiente)}</small></span>
      </div>

      <CampoMonto id="monto" etiqueta={esAbono ? 'Monto del abono' : '¿Cuánto se suma?'} valor={monto}
        onCambio={(v) => { setMonto(v); setErrores((x) => ({ ...x, monto: undefined })); }} error={errores.monto} />

      {!esAbono && (
        <label className="interruptor">
          <input type="checkbox" checked={conectar} onChange={(e) => { setConectar(e.target.checked); setErrores((x) => ({ ...x, espacio: undefined })); }} />
          <span className="interruptor__pista" aria-hidden="true" />
          {sale ? 'La plata salió de uno de mis espacios' : 'La plata entró a uno de mis espacios'}
        </label>
      )}

      {conectar && (
        <>
          <SelectorMedio valor={medio} onCambio={(m) => { setMedio(m); setErrores((x) => ({ ...x, espacio: undefined })); }} />
          <SelectorEspacio nombre="espacio-abono" leyenda={sale ? '¿De qué espacio sale?' : '¿A qué espacio entra?'}
            espacios={activos} valor={espacioId} onCambio={(id) => { setEspacioId(id); setErrores((x) => ({ ...x, espacio: undefined })); }}
            saldos={sale ? disponibles : undefined} medio={medio} error={errores.espacio} />
          {supera && <p className="advertencia advertencia--error" role="status">En este espacio solo hay {pesos(Math.max(0, disponibles[espacioId] ?? 0))} {enMedio(medio)}.</p>}
          <p className="nota-abono">También queda como {sale ? 'gasto' : 'ingreso'} en el espacio que elijas, para que tus saldos cuadren.</p>
        </>
      )}

      <div className="campo">
        <label htmlFor="abono-nota">{esAbono ? 'Nota (opcional)' : '¿Por qué? (opcional)'}</label>
        <input id="abono-nota" className="entrada" value={nota} maxLength={80} onChange={(e) => setNota(e.target.value)}
          placeholder={esAbono ? 'Ej.: Cuota de octubre' : 'Ej.: Compra en el súper, intereses del mes'} />
      </div>

      <div className="campo">
        <span className="campo__etiqueta" id="etiqueta-fecha-abono">Fecha</span>
        {cambiandoFecha ? (
          <input type="datetime-local" className="entrada" aria-labelledby="etiqueta-fecha-abono"
            value={fechaAInput(fecha ?? fechaAhora())} onChange={(e) => e.target.value && setFecha(inputAFecha(e.target.value))} />
        ) : (
          <div className="fecha-fija">
            <CalendarClock aria-hidden="true" />
            <span>{fecha ? fechaCorta(fecha) : 'Ahora'}</span>
            <button type="button" className="enlace" onClick={() => { setFecha(fecha ?? fechaAhora()); setCambiandoFecha(true); }}>Cambiar</button>
          </div>
        )}
      </div>
    </Hoja>
  );
}
