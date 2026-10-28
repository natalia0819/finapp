// Facturas en pantalla: el campo para adjuntar (en los formularios) y el enlace para verla.
import { useEffect, useRef, useState } from 'react';
import { Clock, ExternalLink, FileText, Loader2, Paperclip, X } from 'lucide-react';
import { esPendiente, leerArchivo, prepararArchivo } from '../lib/facturas';

const tamano = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/**
 * Lo que se sabe de una factura guardada (ref = enlace de Drive o "pendiente:...").
 * - url: para abrirla (Drive, o la copia del dispositivo si aún no se sube)
 * - miniatura: imagen para mostrar, si hay copia en el dispositivo
 * - pendiente: todavía no está en Drive
 */
export function useFactura(ref) {
  const [info, setInfo] = useState({ url: '', miniatura: '', nombre: '', tipo: '' });
  useEffect(() => {
    let vivo = true;
    let objeto = '';
    if (!ref) { setInfo({ url: '', miniatura: '', nombre: '', tipo: '' }); return undefined; }
    leerArchivo(ref).then((archivo) => {
      if (!vivo) return;
      if (archivo?.blob) objeto = URL.createObjectURL(archivo.blob);
      setInfo({
        url: esPendiente(ref) ? objeto : ref,
        miniatura: archivo?.tipo?.startsWith('image/') ? objeto : '',
        nombre: archivo?.nombre ?? '',
        tipo: archivo?.tipo ?? '',
      });
    });
    return () => { vivo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [ref]);
  return { ...info, pendiente: esPendiente(ref) };
}

/** Enlace "Ver factura". Si se adjuntó en otro dispositivo y aún no se sube, dice "Pendiente de subir". */
export function EnlaceFactura({ referencia, className = '' }) {
  const { url, pendiente } = useFactura(referencia);
  if (!referencia) return null;
  if (!url) {
    return <span className={`enlace-factura enlace-factura--espera ${className}`}><Clock aria-hidden="true" /> Pendiente de subir</span>;
  }
  return (
    <a className={`enlace-factura ${className}`} href={url} target="_blank" rel="noreferrer">
      <Paperclip aria-hidden="true" /> Ver factura{pendiente && <small> · sin subir</small>}
    </a>
  );
}

/**
 * Campo para adjuntar una factura en un formulario.
 * valor: null (sin factura) · { ref } (la que ya tenía) · { nuevo: { blob, tipo, nombre } } (recién elegida)
 */
export default function CampoFactura({ valor, onCambio }) {
  const entrada = useRef(null);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState('');
  const guardada = useFactura(valor?.ref);
  const [local, setLocal] = useState('');

  // Vista previa de la recién elegida.
  useEffect(() => {
    if (!valor?.nuevo) { setLocal(''); return undefined; }
    const url = URL.createObjectURL(valor.nuevo.blob);
    setLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [valor?.nuevo]);

  async function elegir(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');
    setPreparando(true);
    try {
      onCambio({ nuevo: await prepararArchivo(archivo) });
    } catch (err) {
      setError(err.message || 'No se pudo leer el archivo.');
    } finally {
      setPreparando(false);
    }
  }

  const nuevo = valor?.nuevo;
  const esImagen = nuevo ? nuevo.tipo.startsWith('image/') : Boolean(guardada.miniatura);
  const miniatura = nuevo ? local : guardada.miniatura;
  const abrir = nuevo ? local : guardada.url;
  const nombre = nuevo ? nuevo.nombre : guardada.nombre || 'Factura';
  const detalle = nuevo ? tamano(nuevo.blob.size) : guardada.pendiente ? 'Pendiente de subir' : 'En tu Drive';

  return (
    <div className="campo">
      <span className="campo__etiqueta">Factura (opcional)</span>
      <input ref={entrada} type="file" accept="image/*,application/pdf" hidden onChange={elegir} data-factura />
      {valor ? (
        <div className="adjunto">
          {abrir ? (
            <a className="adjunto__mini" href={abrir} target="_blank" rel="noreferrer" aria-label="Ver factura">
              {esImagen && miniatura ? <img src={miniatura} alt="" /> : <FileText aria-hidden="true" />}
            </a>
          ) : (
            <span className="adjunto__mini"><FileText aria-hidden="true" /></span>
          )}
          <span className="adjunto__txt">
            <b>{nombre}</b>
            <small>{detalle}</small>
          </span>
          {abrir && <a className="adjunto__ver" href={abrir} target="_blank" rel="noreferrer" aria-label="Abrir factura"><ExternalLink aria-hidden="true" /></a>}
          <button type="button" className="adjunto__quitar" onClick={() => onCambio(null)} aria-label="Quitar factura"><X aria-hidden="true" /></button>
        </div>
      ) : (
        <button type="button" className="adjunto-btn" onClick={() => entrada.current?.click()} disabled={preparando}>
          {preparando ? <Loader2 className="girar" aria-hidden="true" /> : <Paperclip aria-hidden="true" />}
          <b>{preparando ? 'Preparando…' : 'Adjuntar factura'}</b>
        </button>
      )}
      {error && <small className="error">{error}</small>}
    </div>
  );
}
