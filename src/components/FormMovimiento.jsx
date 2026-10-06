// Pantallas 5 y 6: registrar ingreso, gasto o traslado (y editar un movimiento existente).
import { useMemo, useState } from 'react';
import { CalendarClock, Check, Split, Trash2, TriangleAlert } from 'lucide-react';
import Hoja from './Hoja';
import Confirmar from './Confirmar';
import CampoMonto from './CampoMonto';
import SelectorEspacio from './SelectorEspacio';
import { fechaAInput, fechaAhora, fechaCorta, generarId, inputAFecha, pesos } from '../lib/formato';

const TITULOS = {
  ingreso: { nuevo: 'Registrar ingreso', editar: 'Editar ingreso' },
  gasto: { nuevo: 'Registrar gasto', editar: 'Editar gasto' },
  traslado: { nuevo: 'Trasladar entre espacios', editar: 'Editar traslado' },
};

export default function FormMovimiento({ tipoInicial = 'ingreso', movimiento, espacios, saldos, onGuardar, onEliminar, onCerrar }) {
  const editando = Boolean(movimiento);
  const [tipo, setTipo] = useState(movimiento?.tipo ?? tipoInicial);
  const [monto, setMonto] = useState(movimiento?.monto ?? '');
  const [espacioId, setEspacioId] = useState(movimiento?.espacio_id ?? '');
  const [destinoId, setDestinoId] = useState(movimiento?.espacio_destino_id ?? '');
  const [descripcion, setDescripcion] = useState(movimiento?.descripcion ?? '');
  const [fecha, setFecha] = useState(movimiento?.fecha ?? null); // null = "ahora" al guardar
  const [cambiandoFecha, setCambiandoFecha] = useState(false);
  const [repartir, setRepartir] = useState(false);
  const [reparto, setReparto] = useState({});
  const [errores, setErrores] = useState({});
  const [confirmar, setConfirmar] = useState(null); // 'eliminar' | null

  // Espacios que se pueden elegir: los activos, más el del movimiento si ya está archivado.
  const opciones = espacios.filter((e) => e.activo || e.id === movimiento?.espacio_id || e.id === movimiento?.espacio_destino_id);
  const activos = espacios.filter((e) => e.activo);

  // Saldo disponible: al editar un gasto o traslado, su propio monto "vuelve" al espacio de origen.
  const disponibles = useMemo(() => {
    const copia = { ...saldos };
    if (movimiento && movimiento.tipo !== 'ingreso' && movimiento.espacio_id in copia) copia[movimiento.espacio_id] += movimiento.monto;
    return copia;
  }, [saldos, movimiento]);

  const totalRepartido = Object.values(reparto).reduce((s, v) => s + (Number(v) || 0), 0);
  const diferencia = (Number(monto) || 0) - totalRepartido;
  const saleDe = tipo === 'gasto' || tipo === 'traslado';
  const superaSaldo = saleDe && espacioId && Number(monto) > (disponibles[espacioId] ?? 0);

  function cambiarTipo(t) {
    setTipo(t);
    setErrores({});
    setRepartir(false);
    if (t !== 'traslado') setDestinoId('');
  }

  function validar() {
    const e = {};
    if (!monto || monto <= 0) e.monto = 'Escribe un monto mayor a $ 0.';
    if (tipo === 'ingreso' && repartir) {
      if (totalRepartido === 0) e.reparto = 'Indica cuánto va a cada espacio.';
      else if (diferencia !== 0) e.reparto = diferencia > 0 ? `Faltan ${pesos(diferencia)} por repartir.` : `Te pasaste por ${pesos(-diferencia)}.`;
    } else if (!espacioId) {
      e.espacio = tipo === 'ingreso' ? 'Elige a qué espacio entra.' : 'Elige de dónde sale.';
    }
    if (tipo === 'traslado') {
      if (!destinoId) e.destino = 'Elige a qué espacio va.';
      else if (destinoId === espacioId) e.destino = 'El origen y el destino deben ser diferentes.';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function enviar() {
    if (!validar()) return;
    guardar();
  }

  function guardar() {
    const cuando = fecha ?? fechaAhora();
    const texto = descripcion.trim();
    if (tipo === 'ingreso' && repartir) {
      const grupo = generarId();
      const movs = activos
        .filter((e) => Number(reparto[e.id]) > 0)
        .map((e) => ({
          id: generarId(), fecha: cuando, tipo: 'ingreso', monto: Number(reparto[e.id]),
          espacio_id: e.id, espacio_destino_id: '', descripcion: texto, grupo_id: grupo,
        }));
      onGuardar(movs);
      return;
    }
    onGuardar([{
      id: movimiento?.id ?? generarId(),
      fecha: cuando,
      tipo,
      monto: Number(monto),
      espacio_id: espacioId,
      espacio_destino_id: tipo === 'traslado' ? destinoId : '',
      descripcion: texto,
      grupo_id: movimiento?.grupo_id ?? '',
    }]);
  }

  const pie = (
    <>
      {editando && (
        <button type="button" className="boton boton--peligro" onClick={() => setConfirmar('eliminar')}>
          <Trash2 aria-hidden="true" /> Eliminar
        </button>
      )}
      <button type="submit" className="boton boton--principal boton--flex">
        <Check aria-hidden="true" /> {editando ? 'Guardar cambios' : 'Guardar'}
      </button>
    </>
  );

  return (
    <Hoja titulo={TITULOS[tipo][editando ? 'editar' : 'nuevo']} onCerrar={onCerrar} onSubmit={enviar} pie={pie}>
      {!editando && (
        <div className="segmentos segmentos--tipo" role="radiogroup" aria-label="Tipo de movimiento">
          {['ingreso', 'gasto', 'traslado'].map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tipo === t} data-tipo={t} onClick={() => cambiarTipo(t)}>
              {t === 'ingreso' ? 'Ingreso' : t === 'gasto' ? 'Gasto' : 'Traslado'}
            </button>
          ))}
        </div>
      )}

      <CampoMonto id="monto" etiqueta={repartir ? 'Monto total' : 'Monto'} valor={monto}
        onCambio={(v) => { setMonto(v); setErrores((x) => ({ ...x, monto: undefined })); }} error={errores.monto} />

      {tipo === 'ingreso' && !editando && (
        <label className="interruptor">
          <input type="checkbox" checked={repartir} onChange={(e) => { setRepartir(e.target.checked); setErrores({}); }} />
          <span className="interruptor__pista" aria-hidden="true" />
          <Split aria-hidden="true" /> Repartir en varios espacios
        </label>
      )}

      {tipo === 'ingreso' && repartir ? (
        <fieldset className="selector" aria-describedby={errores.reparto ? 'reparto-error' : undefined}>
          <legend>¿Cuánto va a cada espacio?</legend>
          <div className="reparto">
            {activos.map((e) => (
              <div key={e.id} className="reparto__fila" style={{ '--c': e.color }}>
                <span className="reparto__nombre"><i aria-hidden="true" />{e.nombre}</span>
                <CampoMonto id={`reparto-${e.id}`} etiqueta={`Monto para ${e.nombre}`} oculto compacto valor={reparto[e.id] ?? ''}
                  onCambio={(v) => { setReparto((r) => ({ ...r, [e.id]: v })); setErrores((x) => ({ ...x, reparto: undefined })); }} />
              </div>
            ))}
          </div>
          <p className={`reparto__estado ${diferencia === 0 && totalRepartido > 0 ? 'positivo' : diferencia < 0 ? 'negativo' : ''}`} aria-live="polite">
            Repartido {pesos(totalRepartido)} de {pesos(monto || 0)}
            {diferencia > 0 && ` · faltan ${pesos(diferencia)}`}
            {diferencia < 0 && ` · sobran ${pesos(-diferencia)}`}
            {diferencia === 0 && totalRepartido > 0 && ' · ¡cuadra!'}
          </p>
          {errores.reparto && <small id="reparto-error" className="error">{errores.reparto}</small>}
        </fieldset>
      ) : (
        <SelectorEspacio
          nombre="espacio"
          leyenda={tipo === 'ingreso' ? '¿A qué espacio entra?' : tipo === 'gasto' ? '¿De dónde sale?' : 'Desde'}
          espacios={opciones}
          valor={espacioId}
          onCambio={(id) => { setEspacioId(id); setErrores((x) => ({ ...x, espacio: undefined })); }}
          saldos={saleDe ? disponibles : undefined}
          error={errores.espacio}
        />
      )}

      {tipo === 'traslado' && (
        <SelectorEspacio nombre="destino" leyenda="Hacia" espacios={opciones} excluir={espacioId} valor={destinoId}
          onCambio={(id) => { setDestinoId(id); setErrores((x) => ({ ...x, destino: undefined })); }} error={errores.destino} />
      )}

      {superaSaldo && (
        <p className="advertencia" role="status">
          <TriangleAlert aria-hidden="true" />
          Supera el saldo de este espacio ({pesos(disponibles[espacioId])}). Quedaría en {pesos(disponibles[espacioId] - monto)}.
        </p>
      )}

      <div className="campo">
        <label htmlFor="descripcion">{tipo === 'gasto' ? '¿En qué?' : 'Descripción (opcional)'}</label>
        <input id="descripcion" className="entrada" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={80}
          placeholder={tipo === 'gasto' ? 'Ej.: Mercado, pasajes, almuerzo' : tipo === 'ingreso' ? 'Ej.: Sueldo, venta, regalo' : 'Ej.: Para completar la meta'} />
      </div>

      <div className="campo">
        <span className="campo__etiqueta" id="etiqueta-fecha">Fecha</span>
        {cambiandoFecha ? (
          <input type="datetime-local" className="entrada" aria-labelledby="etiqueta-fecha"
            value={fechaAInput(fecha ?? fechaAhora())}
            onChange={(e) => e.target.value && setFecha(inputAFecha(e.target.value))} />
        ) : (
          <div className="fecha-fija">
            <CalendarClock aria-hidden="true" />
            <span>{fecha ? fechaCorta(fecha) : 'Ahora'}</span>
            <button type="button" className="enlace" onClick={() => { setFecha(fecha ?? fechaAhora()); setCambiandoFecha(true); }}>Cambiar</button>
          </div>
        )}
      </div>

      {confirmar === 'eliminar' && (
        <Confirmar titulo="¿Eliminar este movimiento?" mensaje="Los saldos se recalculan. Esto no se puede deshacer." textoSi="Eliminar" peligro
          onNo={() => setConfirmar(null)} onSi={() => onEliminar(movimiento.id)} />
      )}
    </Hoja>
  );
}
