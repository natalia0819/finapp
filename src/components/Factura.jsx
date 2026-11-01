// Facturas en pantalla: el campo para adjuntar (en los formularios), el enlace "Ver factura"
// y el visor, que muestra la factura dentro de la app y se cierra con la X.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Clock, FileText, Image, Loader2, Paperclip, X } from 'lucide-react';
import { esPendiente, guardarArchivo, idDrive, leerArchivo, prepararArchivo } from '../lib/facturas';
import { descargarFactura } from '../lib/sheetsApi';

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
 * - hayCopia: está guardada en este dispositivo
 * - miniatura: imagen para mostrar, si hay copia en el dispositivo
 * - pendiente: todavía no está en Drive
 */
export function useFactura(ref) {
  const [info, setInfo] = useState({ hayCopia: false, miniatura: '', nombre: '', tipo: '' });
  useEffect(() => {
    let vivo = true;
    let objeto = '';
    if (!ref) { setInfo({ hayCopia: false, miniatura: '', nombre: '', tipo: '' }); return undefined; }
    leerArchivo(ref).then((archivo) => {
      if (!vivo) return;
      if (archivo?.blob && archivo.tipo?.startsWith('image/')) objeto = URL.createObjectURL(archivo.blob);
      setInfo({ hayCopia: Boolean(archivo?.blob), miniatura: objeto, nombre: archivo?.nombre ?? '', tipo: archivo?.tipo ?? '' });
    });
    return () => { vivo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [ref]);
  return { ...info, pendiente: esPendiente(ref) };
}

/**
 * Visor a pantalla completa: muestra la factura ahí mismo y se cierra con la X (o con Esc).
 * fuente: { ref } (guardada) o { blob, tipo } (recién elegida).
 * Si la factura está en Drive y no hay copia en el dispositivo, se descarga y queda guardada.
 */
export function VisorFactura({ fuente, onCerrar }) {
  const [estado, setEstado] = useState({ cargando: true, url: '', tipo: '', error: '' });
  const cerrar = useRef(null);

  useEffect(() => {
    let vivo = true;
    let url = '';
    (async () => {
      try {
        let archivo = fuente.blob ? fuente : await leerArchivo(fuente.ref);
        if (!archivo?.blob) {
          const id = idDrive(fuente.ref);
          if (!id) throw new Error('Esta factura se adjuntó en otro dispositivo y todavía no se ha subido.');
          if (!navigator.onLine) throw new Error('Conéctate a internet para ver esta factura.');
          archivo = await descargarFactura(id);
          guardarArchivo(fuente.ref, { ...archivo, nombre: '', creado: Date.now() }).catch(() => {});
        }
        if (!vivo) return;
        url = URL.createObjectURL(archivo.blob);
        setEstado({ cargando: false, url, tipo: archivo.tipo, error: '' });
      } catch (e) {
        if (vivo) setEstado({ cargando: false, url: '', tipo: '', error: e.message || 'No se pudo abrir la factura.' });
      }
    })();
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [fuente.ref, fuente.blob]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc cierra solo el visor (no el formulario de atrás).
  useEffect(() => {
    cerrar.current?.focus();
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); } };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const esPdf = estado.tipo === 'application/pdf';
  // Los clics dentro del visor no deben llegar a la fila que lo abrió (React los pasa a través del portal).
  return createPortal(
    <div className="visor" role="dialog" aria-modal="true" aria-label="Factura"
      onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button type="button" className="visor__cerrar" onClick={onCerrar} ref={cerrar} aria-label="Cerrar factura"><X aria-hidden="true" /></button>
      {estado.cargando && <Loader2 className="girar visor__cargando" aria-label="Cargando factura" />}
      {estado.error && <p className="visor__error">{estado.error}</p>}
      {estado.url && !esPdf && <img className="visor__imagen" src={estado.url} alt="Factura" />}
      {estado.url && esPdf && <iframe className="visor__pdf" src={estado.url} title="Factura en PDF" />}
    </div>,
    document.body,
  );
}

/**
 * Clip 📎 para poner dentro de una fila (que ya es un botón): al tocarlo se abre la factura,
 * sin abrir la fila. Por eso es un span con rol de botón y no un botón dentro de otro.
 */
export function ClipFactura({ referencia }) {
  const [ver, setVer] = useState(false);
  if (!referencia) return null;
  const abrir = (e) => { e.stopPropagation(); e.preventDefault(); setVer(true); };
  return (
    <>
      <span role="button" tabIndex={0} className="clip-factura" aria-label="Ver factura" title="Ver factura"
        onClick={abrir} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') abrir(e); }}>
        <Paperclip aria-hidden="true" />
      </span>
      {ver && <VisorFactura fuente={{ ref: referencia }} onCerrar={() => setVer(false)} />}
    </>
  );
}

/** "Ver factura": abre el visor. Si se adjuntó en otro dispositivo y aún no se sube, dice "Pendiente de subir". */
export function EnlaceFactura({ referencia, className = '' }) {
  const { hayCopia, pendiente } = useFactura(referencia);
  const [ver, setVer] = useState(false);
  if (!referencia) return null;
  if (pendiente && !hayCopia) {
    return <span className={`enlace-factura enlace-factura--espera ${className}`}><Clock aria-hidden="true" /> Pendiente de subir</span>;
  }
  return (
    <>
      <button type="button" className={`enlace-factura ${className}`} onClick={() => setVer(true)}>
        <Paperclip aria-hidden="true" /> Ver factura{pendiente && <small> · sin subir</small>}
      </button>
      {ver && <VisorFactura fuente={{ ref: referencia }} onCerrar={() => setVer(false)} />}
    </>
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
  const [ver, setVer] = useState(false);
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
  const miniatura = nuevo ? (nuevo.tipo.startsWith('image/') ? local : '') : guardada.miniatura;
  const nombre = nuevo ? nuevo.nombre : guardada.nombre || 'Factura';
  const detalle = nuevo ? tamano(nuevo.blob.size) : guardada.pendiente ? 'Pendiente de subir' : 'En tu Drive';
  const sePuedeVer = Boolean(nuevo) || !guardada.pendiente || guardada.hayCopia;

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
          <button type="button" className="adjunto__mini" onClick={() => setVer(true)} disabled={!sePuedeVer} aria-label="Ver factura">
            {miniatura ? <img src={miniatura} alt="" /> : <FileText aria-hidden="true" />}
          </button>
          <span className="adjunto__txt">
            <b>{nombre}</b>
            <small>{detalle}</small>
          </span>
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
      {ver && valor && <VisorFactura fuente={nuevo ? { blob: nuevo.blob, tipo: nuevo.tipo } : { ref: valor.ref }} onCerrar={() => setVer(false)} />}
    </div>
  );
}
