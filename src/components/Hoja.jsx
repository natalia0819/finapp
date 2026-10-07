// Ventana para formularios: hoja que sube desde abajo en el celular y ventana centrada en PC.
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Hoja({ titulo, onCerrar, onSubmit, pie, children, ancha = false }) {
  const idTitulo = useId();
  const caja = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    const alPresionar = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alPresionar);
    document.body.style.overflow = 'hidden';
    // En PC (mouse y teclado) se enfoca el primer campo para escribir de una.
    // En celular no: enfocar un campo abre el teclado y tapa el formulario;
    // ahí se enfoca solo la ventana, y el teclado sale cuando la persona toca un campo.
    const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const primero = conMouse
      ? caja.current?.querySelector('[data-autofocus], input:not([type="radio"]), select, textarea')
      : null;
    (primero ?? caja.current)?.focus();
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = '';
      anterior?.focus?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const Contenedor = onSubmit ? 'form' : 'section';
  return (
    <div className="velo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <Contenedor
        ref={caja}
        className={`hoja ${ancha ? 'hoja--ancha' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit(); } : undefined}
        noValidate
      >
        <header className="hoja__cabecera">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="icono-boton" onClick={onCerrar} aria-label="Cerrar">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="hoja__cuerpo">{children}</div>
        {pie && <footer className="hoja__pie">{pie}</footer>}
      </Contenedor>
    </div>
  );
}