// Componente principal: sesión, navegación y ventanas. Los datos y la sincronización viven en useFinanzas.
import { useEffect, useState } from 'react';
import Bienvenida from './components/Bienvenida';
import VentanaApodo from './components/VentanaApodo';
import Inicio from './components/Inicio';
import Movimientos from './components/Movimientos';
import Ajustes from './components/Ajustes';
import Navegacion from './components/Navegacion';
import BarraSync from './components/BarraSync';
import FormMovimiento from './components/FormMovimiento';
import FormEspacio from './components/FormEspacio';
import GestionEspacios from './components/GestionEspacios';
import Confirmar from './components/Confirmar';
import SelectorAvatar from './components/SelectorAvatar';
import SelectorMoneda from './components/SelectorMoneda';
import Deudas from './components/Deudas';
import FormDeuda from './components/FormDeuda';
import FormAbono from './components/FormAbono';
import { resumenDeuda } from './lib/deudas';
import { validarCambio } from './lib/movimientos';
import { pesos } from './lib/formato';
import { usarMoneda } from './lib/moneda';
import { useFinanzas } from './hooks/useFinanzas';
import { prepararCliente, iniciarSesion, obtenerToken } from './lib/googleAuth';
import { fechaAhora } from './lib/formato';
import { exportarCSV, exportarExcel } from './lib/exportar';
import { aplicarTema, leerTema } from './lib/tema';

const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export default function App() {
  const f = useFinanzas();
  const [listoGoogle, setListoGoogle] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [pestana, setPestana] = useState('inicio');
  const [deudaSel, setDeudaSel] = useState(null); // deuda abierta en la pantalla Deudas
  const [modal, setModal] = useState(null);
  const [tema, setTema] = useState(leerTema());
  const [eventoInstalar, setEventoInstalar] = useState(null);
  const [yaInstalada, setYaInstalada] = useState(instalada());

  // Al abrir la app.
  useEffect(() => {
    if (f.idHoja) f.sincronizar(); // con copia local: se abre de una, incluso sin internet
    prepararCliente()
      .then(() => {
        setListoGoogle(true);
        if (!f.idHoja && obtenerToken()) entrar(); // recargó a mitad del primer ingreso
      })
      .catch((e) => { if (!f.idHoja) setError(e.message); });

    const antesDeInstalar = (e) => { e.preventDefault(); setEventoInstalar(e); };
    const alInstalar = () => { setYaInstalada(true); setEventoInstalar(null); };
    window.addEventListener('beforeinstallprompt', antesDeInstalar);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', antesDeInstalar);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  // Si la app estuvo en segundo plano más de un minuto, al volver se abre en Inicio.
  useEffect(() => {
    let ocultaDesde = 0;
    const alCambiar = () => {
      if (document.visibilityState === 'hidden') ocultaDesde = Date.now();
      else if (ocultaDesde && Date.now() - ocultaDesde > 60 * 1000) setPestana('inicio');
    };
    document.addEventListener('visibilitychange', alCambiar);
    return () => document.removeEventListener('visibilitychange', alCambiar);
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  async function entrar() {
    setEntrando(true);
    setError('');
    try {
      await f.conectar();
    } catch (e) {
      setError(e.message);
    } finally {
      setEntrando(false);
    }
  }

  /** Botón "Continuar con Google" / "Conectar". La ventana de Google se abre directo en el clic. */
  async function clicGoogle(elegirCuenta = false) {
    setError('');
    try {
      await iniciarSesion({ elegirCuenta });
    } catch (e) {
      if (f.idHoja) setAviso(e.message); else setError(e.message);
      return;
    }
    await entrar();
  }

  function cambiarTema(t) { aplicarTema(t); setTema(t); }

  async function exportarTodo(formato) {
    if (!f.datos.movimientos.length && !(formato === 'xlsx' && f.datos.deudas.length)) { setAviso('Todavía no hay movimientos para exportar.'); return; }
    try {
      if (formato === 'xlsx') await exportarExcel(f.datos.movimientos, f.datos.espacios, f.datos.movimientos, f.datos.deudas, f.datos.abonos);
      else exportarCSV(f.datos.movimientos, f.datos.espacios);
    } catch (e) {
      console.error(e);
      setAviso('No se pudo generar el archivo. Intenta con CSV.');
    }
  }

  async function instalarApp() {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice;
    setEventoInstalar(null);
  }

  // ---------------- Sin sesión: bienvenida ----------------
  const { datos, saldos } = f;
  usarMoneda(datos.perfil.moneda); // todos los montos de la app se muestran en la moneda de la persona
  if (!f.idHoja) {
    return <Bienvenida onEntrar={() => clicGoogle(true)} cargando={entrando} listoGoogle={listoGoogle} error={error} />;
  }

  // ---------------- App ----------------
  const cerrar = () => setModal(null);
  const volver = () => setModal(modal?.desde === 'gestion' ? { tipo: 'gestion' } : null);

  /** Si un movimiento nació de una deuda (un abono o el préstamo inicial), devuelve el nombre de esa deuda. */
  function deudaDeMovimiento(mov) {
    if (!mov) return '';
    const abono = datos.abonos.find((a) => a.movimiento_id === mov.id);
    const deuda = datos.deudas.find((d) => d.id === abono?.deuda_id || d.movimiento_id === mov.id);
    return deuda?.nombre ?? abono?.deuda ?? '';
  }

  /** Antes de borrar un abono: revisa que el espacio no quede en negativo y explica qué se borra. */
  function pedirBorrarRegistro(registro) {
    const mov = datos.movimientos.find((m) => m.id === registro.movimiento_id);
    if (mov) {
      const problemas = validarCambio(datos.espacios, datos.movimientos, [mov.id], []);
      if (problemas.length) {
        const p = problemas[0];
        setAviso(`No se puede: ${p.espacio?.nombre ?? 'un espacio'} quedaría en ${pesos(p.saldo)}. Primero ajusta los gastos que usan esa plata.`);
        return;
      }
    }
    const espacio = mov && datos.espacios.find((e) => e.id === mov.espacio_id);
    const detalle = mov
      ? `También se borra el ${mov.tipo === 'gasto' ? 'gasto' : 'ingreso'} de ${pesos(mov.monto)} en ${espacio?.nombre ?? 'tu espacio'}.`
      : 'Se quita del historial de la deuda.';
    setModal({ tipo: 'borrarRegistro', registro, detalle });
  }

  const TEXTO_GUARDADO = { ingreso: 'Ingreso guardado.', gasto: 'Gasto guardado.', traslado: 'Traslado guardado.' };

  return (
    <div className="app">
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <Navegacion actual={pestana} onCambiar={setPestana} apodo={datos.perfil.apodo} avatar={datos.perfil.avatar} pendientes={f.pendientes} />

      <main className="contenido" id="contenido">
        <BarraSync sync={f.sync} pendientes={f.pendientes} listoGoogle={listoGoogle} onConectar={() => clicGoogle()} onReintentar={() => f.sincronizar()} />

        {pestana === 'inicio' && (
          <Inicio
            apodo={datos.perfil.apodo}
            avatar={datos.perfil.avatar}
            onCambiarAvatar={() => setModal({ tipo: 'avatar' })}
            espacios={datos.espacios}
            movimientos={datos.movimientos}
            saldos={saldos}
            saldosMedio={f.saldosMedio}
            onRegistrar={(tipo) => setModal({ tipo: 'movimiento', tipoInicial: tipo })}
            onAbrirEspacio={(espacio) => setModal({ tipo: 'espacio', espacio })}
            onNuevoEspacio={() => setModal({ tipo: 'espacio', espacio: null })}
            onAbrirMovimiento={(mov) => setModal({ tipo: 'movimiento', movimiento: mov })}
            onVerTodos={() => setPestana('movimientos')}
          />
        )}
        {pestana === 'movimientos' && (
          <Movimientos
            espacios={datos.espacios}
            movimientos={datos.movimientos}
            deudas={datos.deudas}
            abonos={datos.abonos}
            onAbrir={(mov) => setModal({ tipo: 'movimiento', movimiento: mov })}
            onAviso={setAviso}
          />
        )}
        {pestana === 'deudas' && (
          <Deudas
            deudas={datos.deudas}
            abonos={datos.abonos}
            espacios={datos.espacios}
            movimientos={datos.movimientos}
            seleccion={deudaSel}
            onSeleccionar={setDeudaSel}
            onNueva={() => setModal({ tipo: 'deuda', deuda: null })}
            onEditar={(deuda) => setModal({ tipo: 'deuda', deuda })}
            onAbonar={(deuda) => setModal({ tipo: 'abono', deuda, modo: 'abono' })}
            onSumar={(deuda) => setModal({ tipo: 'abono', deuda, modo: 'aumento' })}
            onBorrarRegistro={pedirBorrarRegistro}
          />
        )}
        {pestana === 'ajustes' && (
          <Ajustes
            apodo={datos.perfil.apodo}
            avatar={datos.perfil.avatar}
            onCambiarAvatar={() => setModal({ tipo: 'avatar' })}
            moneda={datos.perfil.moneda || 'COP'}
            onCambiarMoneda={() => setModal({ tipo: 'moneda' })}
            tema={tema}
            onTema={cambiarTema}
            onEditarApodo={() => setModal({ tipo: 'apodo' })}
            onGestionarEspacios={() => setModal({ tipo: 'gestion' })}
            totalEspacios={datos.espacios.filter((e) => e.activo).length}
            totalArchivados={datos.espacios.filter((e) => !e.activo).length}
            onExportar={exportarTodo}
            idHoja={f.idHoja}
            pendientes={f.pendientes}
            ultimaSync={f.ultimaSync}
            sincronizando={f.sync.estado === 'sincronizando'}
            onSincronizar={() => (obtenerToken() ? f.sincronizar() : clicGoogle())}
            instalar={{
              visible: !yaInstalada && (Boolean(eventoInstalar) || esIOS),
              puedeBoton: Boolean(eventoInstalar),
              onInstalar: instalarApp,
            }}
            onSalir={() => (f.pendientes ? setModal({ tipo: 'salir' }) : f.salir())}
          />
        )}
      </main>

      {/* ---------------- Ventanas ---------------- */}
      {modal?.tipo === 'movimiento' && (
        <FormMovimiento
          key={modal.movimiento?.id ?? modal.tipoInicial}
          tipoInicial={modal.tipoInicial}
          movimiento={modal.movimiento}
          espacios={datos.espacios}
          saldos={saldos}
          saldosMedio={f.saldosMedio}
          movimientos={datos.movimientos}
          deDeuda={deudaDeMovimiento(modal.movimiento)}
          onCerrar={cerrar}
          onGuardar={(movs) => {
            f.guardarMovimientos(movs);
            setAviso(movs.length > 1 ? `Ingreso repartido en ${movs.length} espacios.` : modal.movimiento ? 'Cambios guardados.' : TEXTO_GUARDADO[movs[0].tipo]);
            cerrar();
          }}
          onEliminar={(id) => { f.eliminarMovimiento(id); setAviso('Movimiento eliminado.'); cerrar(); }}
        />
      )}

      {modal?.tipo === 'espacio' && (
        <FormEspacio
          espacio={modal.espacio}
          espacios={datos.espacios}
          saldos={saldos}
          movimientos={datos.movimientos}
          onCerrar={volver}
          onGuardar={(e) => { f.guardarEspacio(e); setAviso(modal.espacio ? 'Espacio actualizado.' : 'Espacio creado.'); volver(); }}
          onEliminar={(id) => { f.eliminarEspacio(id); setAviso('Espacio eliminado.'); volver(); }}
          onArchivar={(e, saldo, destino) => { f.archivarEspacio(e, saldo, destino); setAviso(`"${e.nombre}" quedó archivado.`); volver(); }}
        />
      )}

      {modal?.tipo === 'deuda' && (
        <FormDeuda
          deuda={modal.deuda}
          espacios={datos.espacios}
          saldosMedio={f.saldosMedio}
          movimientos={datos.movimientos}
          abonos={datos.abonos}
          onCerrar={cerrar}
          onGuardar={(deuda, mov) => {
            f.guardarDeuda(deuda, mov);
            setAviso(modal.deuda ? 'Cambios guardados.' : 'Deuda creada.');
            if (!modal.deuda) setDeudaSel(deuda.id);
            cerrar();
          }}
          onEliminar={(id) => { f.eliminarDeuda(id); setDeudaSel(null); setAviso('Deuda eliminada.'); cerrar(); }}
        />
      )}

      {modal?.tipo === 'abono' && (
        <FormAbono
          deuda={modal.deuda}
          modo={modal.modo}
          abonos={datos.abonos}
          espacios={datos.espacios}
          saldosMedio={f.saldosMedio}
          movimientos={datos.movimientos}
          onCerrar={cerrar}
          onGuardar={(registro, mov) => {
            f.guardarRegistroDeuda(registro, mov);
            const antes = resumenDeuda(modal.deuda, datos.abonos);
            const saldada = registro.tipo === 'abono' && registro.monto >= antes.pendiente;
            setAviso(saldada ? '¡Deuda saldada! 🎉' : registro.tipo === 'abono' ? 'Abono guardado.' : 'Se sumó a la deuda.');
            cerrar();
          }}
        />
      )}

      {modal?.tipo === 'borrarRegistro' && (
        <Confirmar
          titulo={modal.registro.tipo === 'abono' ? `¿Borrar este abono de ${pesos(modal.registro.monto)}?` : `¿Quitar ${pesos(modal.registro.monto)} de la deuda?`}
          mensaje={modal.detalle}
          textoSi="Borrar" peligro
          onNo={cerrar}
          onSi={() => { f.eliminarRegistroDeuda(modal.registro); setAviso('Listo, se borró.'); cerrar(); }}
        />
      )}

      {modal?.tipo === 'gestion' && (
        <GestionEspacios
          espacios={datos.espacios}
          saldos={saldos}
          onCerrar={cerrar}
          onNuevo={() => setModal({ tipo: 'espacio', espacio: null, desde: 'gestion' })}
          onAbrir={(e) => setModal({ tipo: 'espacio', espacio: e, desde: 'gestion' })}
          onReactivar={(e) => { f.guardarEspacio({ ...e, activo: true }); setAviso(`"${e.nombre}" está activo otra vez.`); }}
        />
      )}

      {(!datos.perfil.apodo || modal?.tipo === 'apodo') && (
        <VentanaApodo
          primeraVez={!datos.perfil.apodo}
          apodoInicial={datos.perfil.apodo}
          monedaInicial={datos.perfil.moneda}
          avatarInicial={datos.perfil.avatar}
          onCerrar={cerrar}
          onOtraCuenta={() => { cerrar(); f.salir(); }}
          onGuardar={(apodo, moneda, avatar) => {
            f.guardarPerfil({
              ...datos.perfil, apodo,
              moneda: moneda || datos.perfil.moneda || 'COP',
              avatar: avatar ?? datos.perfil.avatar ?? '',
              fecha_registro: datos.perfil.fecha_registro || fechaAhora(),
            });
            if (datos.perfil.apodo) setAviso('Apodo actualizado.');
            cerrar();
          }}
        />
      )}

      {modal?.tipo === 'avatar' && (
        <SelectorAvatar
          actual={datos.perfil.avatar}
          apodo={datos.perfil.apodo}
          onCerrar={cerrar}
          onGuardar={(avatar) => {
            f.guardarPerfil({ ...datos.perfil, avatar, fecha_registro: datos.perfil.fecha_registro || fechaAhora() });
            setAviso('Avatar actualizado.');
            cerrar();
          }}
        />
      )}

      {modal?.tipo === 'moneda' && (
        <SelectorMoneda
          actual={datos.perfil.moneda || 'COP'}
          onCerrar={cerrar}
          onElegir={(moneda) => {
            if (moneda !== (datos.perfil.moneda || 'COP')) {
              f.guardarPerfil({ ...datos.perfil, moneda, fecha_registro: datos.perfil.fecha_registro || fechaAhora() });
              setAviso('Moneda actualizada.');
            }
            cerrar();
          }}
        />
      )}

      {modal?.tipo === 'salir' && (
        <Confirmar
          titulo="¿Cerrar sesión?"
          mensaje={`Tienes ${f.pendientes} ${f.pendientes === 1 ? 'cambio que no se ha' : 'cambios que no se han'} subido a Google. Si cierras sesión ahora, se perderán.`}
          textoSi="Cerrar igual" peligro
          onNo={cerrar}
          onSi={() => { cerrar(); f.salir(); }}
        />
      )}

      <div className="aviso" role="status" aria-live="polite">{aviso && <p>{aviso}</p>}</div>
    </div>
  );
}