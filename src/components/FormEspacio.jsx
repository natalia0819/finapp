// Pantalla 7: crear / editar espacio, y eliminar o archivar.
import { useState } from 'react';
import { Archive, Check, Trash2 } from 'lucide-react';
import Hoja from './Hoja';
import Confirmar from './Confirmar';
import CampoMonto from './CampoMonto';
import SelectorEspacio from './SelectorEspacio';
import { ICONOS, PALETA } from '../constants/espacios';
import { fechaAhora, generarId, pesos } from '../lib/formato';

export default function FormEspacio({ espacio, espacios, saldos, movimientos, onGuardar, onEliminar, onArchivar, onCerrar }) {
  const nuevo = !espacio;
  const [nombre, setNombre] = useState(espacio?.nombre ?? '');
  const [color, setColor] = useState(espacio?.color ?? PALETA[0].hex);
  const [icono, setIcono] = useState(espacio?.icono ?? 'wallet');
  const [meta, setMeta] = useState(espacio?.meta ?? '');
  const [error, setError] = useState('');
  // Flujo de eliminar: null | 'confirmar-borrar' | 'confirmar-archivar' | 'trasladar'
  const [paso, setPaso] = useState(null);
  const [destino, setDestino] = useState('');
  const [errorDestino, setErrorDestino] = useState('');

  const saldo = espacio ? saldos[espacio.id] ?? 0 : 0;
  const tieneMovimientos = espacio
    ? movimientos.some((m) => m.espacio_id === espacio.id || m.espacio_destino_id === espacio.id)
    : false;
  const otrosActivos = espacios.filter((e) => e.activo && e.id !== espacio?.id);

  function guardar() {
    const limpio = nombre.trim();
    if (!limpio) { setError('Escribe un nombre para el espacio.'); return; }
    const repetido = espacios.some((e) => e.activo && e.id !== espacio?.id && e.nombre.trim().toLowerCase() === limpio.toLowerCase());
    if (repetido) { setError('Ya tienes un espacio con ese nombre.'); return; }
    onGuardar({
      id: espacio?.id ?? generarId(),
      nombre: limpio,
      color,
      icono,
      meta: meta === '' || meta === 0 ? '' : meta,
      activo: espacio?.activo ?? true,
      es_predeterminado: espacio?.es_predeterminado ?? false,
      fecha_creacion: espacio?.fecha_creacion ?? fechaAhora(),
    });
  }

  function pedirEliminar() {
    if (!tieneMovimientos && saldo === 0) setPaso('confirmar-borrar');
    else if (saldo > 0) setPaso('trasladar');
    else if (saldo < 0) setError(`Este espacio está en ${pesos(saldo)}. Registra un ingreso o un traslado para dejarlo en $ 0 antes de archivarlo.`);
    else setPaso('confirmar-archivar');
  }

  function trasladarYArchivar() {
    if (!destino) { setErrorDestino('Elige a qué espacio pasa la plata.'); return; }
    onArchivar(espacio, saldo, destino);
  }

  const IconoPrevia = ICONOS[icono].componente;

  const pie = (
    <>
      {!nuevo && !espacio.es_predeterminado && espacio.activo && (
        <button type="button" className="boton boton--peligro" onClick={pedirEliminar}>
          <Trash2 aria-hidden="true" /> Eliminar
        </button>
      )}
      <button type="submit" className="boton boton--principal boton--flex">
        <Check aria-hidden="true" /> {nuevo ? 'Crear espacio' : 'Guardar'}
      </button>
    </>
  );

  return (
    <Hoja titulo={nuevo ? 'Nuevo espacio' : 'Editar espacio'} onCerrar={onCerrar} onSubmit={guardar} pie={pie}>
      {/* Vista previa en vivo */}
      <div className="vista-previa" style={{ '--c': color }}>
        <span className="espacio__icono"><IconoPrevia aria-hidden="true" /></span>
        <strong>{nombre.trim() || 'Nombre del espacio'}</strong>
      </div>

      <div className="campo">
        <label htmlFor="nombre-espacio">Nombre</label>
        <input
          id="nombre-espacio"
          className="entrada"
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError(''); }}
          maxLength={30}
          placeholder="Ej.: Viaje, Mercado, Emergencias"
          aria-invalid={Boolean(error)}
          required
        />
      </div>
      {error && <p className="alerta" role="alert">{error}</p>}

      <fieldset className="selector">
        <legend>Color</legend>
        <div className="paleta">
          {PALETA.map((c) => (
            <label key={c.hex} className="muestra" style={{ '--c': c.hex }} title={c.nombre}>
              <input type="radio" name="color" value={c.hex} checked={color === c.hex} onChange={() => setColor(c.hex)} aria-label={c.nombre} />
              <Check aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="selector">
        <legend>Ícono</legend>
        <div className="galeria" style={{ '--c': color }}>
          {Object.entries(ICONOS).map(([clave, { componente: I, nombre: n }]) => (
            <label key={clave} className="galeria__item" title={n}>
              <input type="radio" name="icono" value={clave} checked={icono === clave} onChange={() => setIcono(clave)} aria-label={n} />
              <I aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>

      <CampoMonto id="meta-espacio" etiqueta="Meta (opcional)" valor={meta} onCambio={setMeta} compacto />
      <p className="ayuda">Si pones una meta, la tarjeta muestra una barra con tu avance.</p>

      {!nuevo && espacio.es_predeterminado && (
        <p className="ayuda">Los espacios predeterminados no se pueden eliminar, pero sí cambiarles el nombre, el color, el ícono y la meta.</p>
      )}

      {paso === 'trasladar' && (
        <div className="panel-aviso">
          <p><strong>{espacio.nombre}</strong> tiene {pesos(saldo)}. Elige a dónde trasladarlos; después el espacio se archiva y su historial se conserva.</p>
          <SelectorEspacio nombre="destino-archivar" leyenda="¿A dónde pasa la plata?" espacios={otrosActivos} valor={destino}
            onCambio={(id) => { setDestino(id); setErrorDestino(''); }} saldos={saldos} error={errorDestino} />
          <div className="ventana__acciones">
            <button type="button" className="boton boton--suave" onClick={() => setPaso(null)}>Cancelar</button>
            <button type="button" className="boton boton--rojo" onClick={trasladarYArchivar}><Archive aria-hidden="true" /> Trasladar y archivar</button>
          </div>
        </div>
      )}

      {paso === 'confirmar-borrar' && (
        <Confirmar titulo={`¿Eliminar "${espacio.nombre}"?`} mensaje="Está vacío y no tiene movimientos. Esto no se puede deshacer."
          textoSi="Eliminar" peligro onSi={() => onEliminar(espacio.id)} onNo={() => setPaso(null)} />
      )}
      {paso === 'confirmar-archivar' && (
        <Confirmar titulo={`¿Archivar "${espacio.nombre}"?`} mensaje="Tiene movimientos, así que se archiva en vez de borrarse: deja de aparecer en el inicio pero su historial se conserva. Puedes reactivarlo en Ajustes."
          textoSi="Archivar" peligro onSi={() => onArchivar(espacio, 0, null)} onNo={() => setPaso(null)} />
      )}
    </Hoja>
  );
}
