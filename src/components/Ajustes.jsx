// Pantalla 8: ajustes.
import {
  CircleCheck, Download, ExternalLink, FileSpreadsheet, FileText, LayoutGrid, LogOut,
  Monitor, Moon, Pencil, RefreshCw, Smartphone, Smile, Sun,
} from 'lucide-react';
import { fechaCorta, pesos } from '../lib/formato';
import { Avatar } from '../constants/avatares';
import { CampoMoneda } from './SelectorMoneda';

const TEMAS = [
  { id: 'claro', texto: 'Claro', Icono: Sun },
  { id: 'oscuro', texto: 'Oscuro', Icono: Moon },
  { id: 'sistema', texto: 'Automático', Icono: Monitor },
];

export default function Ajustes({
  apodo, avatar, onCambiarAvatar, moneda, onCambiarMoneda, tema, onTema, onEditarApodo, onGestionarEspacios, totalEspacios, totalArchivados,
  onExportar, idHoja, pendientes, ultimaSync, sincronizando, onSincronizar, instalar, onSalir,
}) {
  return (
    <div className="ajustes">
      <h1 className="titulo-pantalla">Ajustes</h1>
      <div className="ajustes__rejilla">

      <section className="bloque">
        <h2>Perfil</h2>
        <div className="perfil">
          <button type="button" className="perfil__avatar" onClick={onCambiarAvatar} aria-label="Cambiar avatar">
            <Avatar clave={avatar} apodo={apodo} tam={64} />
          </button>
          <div className="perfil__datos">
            <p className="perfil__nombre">{apodo}</p>
            <div className="perfil__botones">
              <button className="boton boton--suave boton--chico" onClick={onEditarApodo}><Pencil aria-hidden="true" /> Cambiar nombre</button>
              <button className="boton boton--suave boton--chico" onClick={onCambiarAvatar}><Smile aria-hidden="true" /> Cambiar avatar</button>
            </div>
          </div>
        </div>
      </section>

      <section className="bloque">
        <h2>Moneda</h2>
        <CampoMoneda codigo={moneda} onAbrir={onCambiarMoneda} />
        <p className="ayuda ajustes__ejemplo">Así se muestran tus montos: {pesos(1234.5)}</p>
      </section>

      <section className="bloque">
        <h2 id="titulo-tema">Apariencia</h2>
        <div className="segmentos" role="radiogroup" aria-labelledby="titulo-tema">
          {TEMAS.map(({ id, texto, Icono }) => (
            <button key={id} role="radio" aria-checked={tema === id} onClick={() => onTema(id)}>
              <Icono aria-hidden="true" /> {texto}
            </button>
          ))}
        </div>
      </section>

      <section className="bloque">
        <h2>Espacios</h2>
        <button className="boton boton--suave boton--ancho boton--izq" onClick={onGestionarEspacios}>
          <LayoutGrid aria-hidden="true" />
          <span>Gestionar espacios <small>({totalEspacios} activos{totalArchivados ? `, ${totalArchivados} archivados` : ''})</small></span>
        </button>
      </section>

      <section className="bloque">
        <h2>Tus datos</h2>
        <div className="pila">
          <button className="boton boton--suave boton--ancho boton--izq" onClick={() => onExportar('xlsx')}><FileSpreadsheet aria-hidden="true" /> Exportar todo a Excel</button>
          <button className="boton boton--suave boton--ancho boton--izq" onClick={() => onExportar('csv')}><FileText aria-hidden="true" /> Exportar todo a CSV</button>
          <a className="boton boton--suave boton--ancho boton--izq" href={`https://docs.google.com/spreadsheets/d/${idHoja}`} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" /> Abrir mi hoja en Google Sheets
          </a>
        </div>
        <div className="fila-ajuste fila-ajuste--sync">
          <div>
            <small>Sincronización</small>
            <p className="sync-estado">
              {pendientes ? `${pendientes} ${pendientes === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : <><CircleCheck aria-hidden="true" /> Todo guardado en Google</>}
            </p>
            {ultimaSync && <small>Última vez: {fechaCorta(ultimaSync)}</small>}
          </div>
          <button className="boton boton--suave" onClick={onSincronizar} disabled={sincronizando} aria-label="Sincronizar ahora">
            <RefreshCw className={sincronizando ? 'girar' : ''} aria-hidden="true" />
          </button>
        </div>
      </section>

      {instalar.visible && (
        <section className="bloque">
          <h2>Instalar la app</h2>
          {instalar.puedeBoton ? (
            <button className="boton boton--principal boton--ancho" onClick={instalar.onInstalar}>
              <Download aria-hidden="true" /> Instalar en este dispositivo
            </button>
          ) : (
            <p className="ayuda"><Smartphone aria-hidden="true" className="icono-linea" /> En iPhone: abre esta página en Safari, toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.</p>
          )}
        </section>
      )}

      </div>

      <button className="boton boton--peligro boton--ancho ajustes__salir" onClick={onSalir}><LogOut aria-hidden="true" /> Cerrar sesión</button>
    </div>
  );
}
