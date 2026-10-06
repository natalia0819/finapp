// Pantalla 2: ventana emergente del apodo. Se usa la primera vez y también desde Ajustes.
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function VentanaApodo({ apodoInicial = '', primeraVez, onGuardar, onCerrar, onOtraCuenta }) {
  const [apodo, setApodo] = useState(apodoInicial);
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
      await onGuardar(limpio);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <div className="velo">
      <form className="ventana" role="dialog" aria-modal="true" aria-labelledby="titulo-apodo" onSubmit={enviar} noValidate>
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
    </div>
  );
}
