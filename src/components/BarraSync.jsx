// Aviso del estado de sincronización (sin internet, sesión vencida, error).
import { CloudOff, KeyRound, Loader2, TriangleAlert } from 'lucide-react';

export default function BarraSync({ sync, pendientes, onConectar, onReintentar, listoGoogle }) {
  const plural = pendientes === 1 ? '1 cambio pendiente' : `${pendientes} cambios pendientes`;

  if (sync.estado === 'sincronizando' && pendientes > 0) {
    return <p className="barra-sync barra-sync--suave" role="status"><Loader2 className="girar" aria-hidden="true" /> Guardando en Google…</p>;
  }
  if (sync.estado === 'sin-conexion') {
    return (
      <p className="barra-sync" role="status">
        <CloudOff aria-hidden="true" />
        <span>Sin conexión. Puedes seguir registrando{pendientes ? ` (${plural}: se suben solos cuando vuelva internet)` : ''}.</span>
      </p>
    );
  }
  if (sync.estado === 'sin-sesion') {
    return (
      <div className="barra-sync" role="status">
        <KeyRound aria-hidden="true" />
        <span>{pendientes ? `Tienes ${plural}. ` : ''}Conéctate con Google para sincronizar.</span>
        <button className="boton boton--principal boton--chico" onClick={onConectar} disabled={!listoGoogle}>Conectar</button>
      </div>
    );
  }
  if (sync.estado === 'error') {
    return (
      <div className="barra-sync barra-sync--error" role="alert">
        <TriangleAlert aria-hidden="true" />
        <span>{sync.error}{pendientes ? ` (${plural})` : ''}</span>
        <button className="boton boton--suave boton--chico" onClick={onReintentar}>Reintentar</button>
      </div>
    );
  }
  return null;
}
