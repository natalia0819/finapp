// Facturas en pantalla: el campo para adjuntar (en los formularios) y el enlace para verla.
import { useEffect, useRef, useState } from 'react';
import { Camera, Clock, ExternalLink, FileText, Image, Loader2, Paperclip, X } from 'lucide-react';
import { esPendiente, leerArchivo, prepararArchivo } from '../lib/facturas';

// En el celular, al tocar "Adjuntar factura" se abre un menú con galería, cámara y archivos.
// Cada opción tiene su propio campo porque Android muestra la galería solo cuando se piden únicamente imágenes.
// En PC se abre directo el selector de archivos (imagen o PDF).
const esCelular = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;
const OPCIONES = [
  { id: 'galeria', texto: 'Galería', Icono: Image, accept: 'image/*' },
  { id: 'camara', texto: 'Cámara', Icono: Camera, accept: 'image/*', capture: 'environment' },
  { id: 'archivos', texto: 'Archivos', Icono: FileText, accept: 'application/pdf' },
];
const TODO = 'image/*,application/pdf';

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
  const entradas = useRef({});
  const caja = useRef(null);
  const [menu, setMenu] = useState(false);
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

  useEffect(() => {
    if (!menu) return undefined;
    const afuera = (e) => { if (!caja.current?.contains(e.target)) setMenu(false); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(false); } };
    document.addEventListener('pointerdown', afuera);
    document.addEventListener('keydown', tecla, true);
    return () => { document.removeEventListener('pointerdown', afuera); document.removeEventListener('keydown', tecla, true); };
  }, [menu]);

  function elegirOpcion(id) {
    setMenu(false);
    entradas.current[id]?.click();
  }

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
      {OPCIONES.map((o) => (
        <input key={o.id} ref={(el) => { entradas.current[o.id] = el; }} type="file" accept={o.accept}
          capture={o.capture} hidden onChange={elegir} data-factura={o.id} />
      ))}
      <input ref={(el) => { entradas.current.todo = el; }} type="file" accept={TODO} hidden onChange={elegir} data-factura="todo" />
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
        <div className="adjunto-menu" ref={caja}>
          <button type="button" className="adjunto-btn" disabled={preparando} aria-expanded={menu}
            onClick={() => (esCelular() ? setMenu((v) => !v) : elegirOpcion('todo'))}>
            {preparando ? <Loader2 className="girar" aria-hidden="true" /> : <Paperclip aria-hidden="true" />}
            <b>{preparando ? 'Preparando…' : 'Adjuntar factura'}</b>
          </button>
          {menu && (
            <div className="adjunto-menu__lista" role="menu">
              {OPCIONES.map(({ id, texto, Icono }) => (
                <button key={id} type="button" role="menuitem" onClick={() => elegirOpcion(id)}>
                  <Icono aria-hidden="true" /> {texto}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <small className="error">{error}</small>}
    </div>
  );
}
