// Pantalla 2: ventana emergente del apodo. Se usa la primera vez y también desde Ajustes.
import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import SelectorMoneda, { CampoMoneda } from './SelectorMoneda';
import { MONEDA_POR_DEFECTO } from '../lib/moneda';
import SelectorAvatar from './SelectorAvatar';
import { Avatar } from '../constants/avatares';

export default function VentanaApodo({ apodoInicial = '', monedaInicial = '', avatarInicial = '', primeraVez, onGuardar, onCerrar, onOtraCuenta }) {
  const [apodo, setApodo] = useState(apodoInicial);
  const [moneda, setMoneda] = useState(monedaInicial || MONEDA_POR_DEFECTO);
  const [eligiendoMoneda, setEligiendoMoneda] = useState(false);
  const [avatar, setAvatar] = useState(avatarInicial);
  const [eligiendoAvatar, setEligiendoAvatar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const campo = useRef(null);

  useEffect(() => { campo.current?.focus(); }, []);

  async function enviar(e) {
    e.preventDefault();
    const limpio = apodo.trim();
    if (!limpio) { setError('Escribe un nombre o apodo.'); return; }
    setGuardando(true);
    setError('');
    try {
      await onGuardar(limpio, moneda, avatar);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="velo">
      <form className="ventana" role="dialog" aria-modal="true" aria-labelledby="titulo-apodo" onSubmit={enviar} noValidate>
        {primeraVez && (
          <div className="ventana__avatar">
            <button type="button" className="ventana__avatar-boton" onClick={() => setEligiendoAvatar(true)} aria-label="Elegir tu avatar">
              <Avatar clave={avatar} apodo={apodo} tam={96} />
              <span className="ventana__avatar-lapiz" aria-hidden="true"><Pencil /></span>
            </button>
            <small>Toca para elegir tu avatar</small>
          </div>
        )}
        <h2 id="titulo-apodo">{primeraVez ? '¡Bienvenido! ¿Cómo quieres que te llamemos?' : 'Cambiar apodo'}</h2>
        <label className="campo">          
          <input
            className="entrada"
            ref={campo}
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            maxLength={30}
            aria-label="Nombre o apodo"
            autoComplete="nickname"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'error-apodo' : undefined}
            required
          />
        </label>
        {primeraVez && (
          <div className="ventana__moneda">
            <CampoMoneda codigo={moneda} etiqueta="Tu moneda" onAbrir={() => setEligiendoMoneda(true)} />
          </div>
        )}
        {error && <p id="error-apodo" className="alerta" role="alert">{error}</p>}
        <div className="ventana__acciones">
          {!primeraVez && (
            <button type="button" className="boton boton--suave" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          )}
          <button type="submit" className="boton boton--principal" disabled={guardando}>
            {guardando && <Loader2 className="girar" aria-hidden="true" />}
            Listo
          </button>
        </div>
                {primeraVez && onOtraCuenta && (
          <button type="button" className="boton boton--texto ventana__otra-cuenta" onClick={onOtraCuenta} disabled={guardando}>
            ¿No es tu cuenta? Usar otra cuenta
          </button>
        )}
      </form>
      {eligiendoAvatar && (
        <SelectorAvatar
          actual={avatar}
          apodo={apodo.trim() || '?'}
          onGuardar={(clave) => { setAvatar(clave); setEligiendoAvatar(false); }}
          onCerrar={() => setEligiendoAvatar(false)}
        />
      )}
      {eligiendoMoneda && (
        <SelectorMoneda
          actual={moneda}
          onElegir={(codigo) => { setMoneda(codigo); setEligiendoMoneda(false); }}
          onCerrar={() => setEligiendoMoneda(false)}
        />
      )}
    </div>
  );
}
