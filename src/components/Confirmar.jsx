// Pregunta de confirmación (eliminar, gastar del ahorro, cerrar sesión con pendientes...).
import { useEffect, useId, useRef } from 'react';

export default function Confirmar({ titulo, mensaje, textoSi = 'Sí', textoNo = 'Cancelar', peligro, onSi, onNo }) {
  const idTitulo = useId();
  const boton = useRef(null);

  useEffect(() => {
    boton.current?.focus();
    const alPresionar = (e) => { if (e.key === 'Escape') onNo(); };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="velo velo--alto">
      <div className="confirmar" role="alertdialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>{titulo}</h2>
        {mensaje && <p>{mensaje}</p>}
        <div className="ventana__acciones">
          <button type="button" className="boton boton--suave" onClick={onNo} ref={boton}>{textoNo}</button>
          <button type="button" className={`boton ${peligro ? 'boton--rojo' : 'boton--principal'}`} onClick={onSi}>{textoSi}</button>
        </div>
      </div>
    </div>
  );
}
