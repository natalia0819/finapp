// Estado central de la app: datos, cola de cambios pendientes y sincronización con Google.
//
// Funciona "primero local": cada cambio se aplica al instante en pantalla y en la
// copia del dispositivo, y se anota en una cola. La cola se sube a Google Sheets
// cuando hay internet y sesión. Así se puede registrar sin conexión.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { borrarLocal, cargarLocal, guardarLocal } from '../lib/almacenLocal';
import { buscarHoja, calcularSaldos, crearHoja, darFormatoHoja, leerDatos, sincronizarCola } from '../lib/sheetsApi';
import { cerrarSesion, obtenerToken, olvidarCuenta } from '../lib/googleAuth';
import { fechaAhora, generarId } from '../lib/formato';

const VACIO = { perfil: { apodo: '', fecha_registro: '' }, espacios: [], movimientos: [] };

/** Reemplaza por id o agrega al final. */
function fusionar(lista, objetos) {
  const copia = [...lista];
  for (const obj of objetos) {
    const i = copia.findIndex((x) => x.id === obj.id);
    if (i >= 0) copia[i] = obj; else copia.push(obj);
  }
  return copia;
}

export function useFinanzas() {
  const [inicial] = useState(cargarLocal);
  const [idHoja, setIdHoja] = useState(inicial?.idHoja ?? null);
  const [datos, setDatos] = useState(inicial?.datos ?? VACIO);
  const [cola, setColaEstado] = useState(inicial?.cola ?? []);
  const [ultimaSync, setUltimaSync] = useState(inicial?.ultimaSync ?? null);
  // estado: 'inactivo' | 'sincronizando' | 'al-dia' | 'sin-conexion' | 'sin-sesion' | 'error'
  const [sync, setSync] = useState({ estado: 'inactivo', error: '' });

  // Refs: la sincronización es asíncrona y necesita leer siempre el valor más reciente.
  const colaRef = useRef(cola);
  const idRef = useRef(idHoja);
  const corriendo = useRef(false);
  const repetir = useRef(false);
  const temporizador = useRef(null);

  const setCola = (nueva) => { colaRef.current = nueva; setColaEstado(nueva); };
  idRef.current = idHoja;

  // Guardar la copia local cada vez que algo cambia.
  useEffect(() => {
    if (idHoja) guardarLocal({ idHoja, datos, cola, ultimaSync });
  }, [idHoja, datos, cola, ultimaSync]);

  const sincronizar = useCallback(async ({ traerCambios = true } = {}) => {
    const id = idRef.current;
    if (!id) return;
    if (corriendo.current) { repetir.current = true; return; }
    if (!navigator.onLine) { setSync({ estado: 'sin-conexion', error: '' }); return; }
    if (!obtenerToken()) { setSync({ estado: 'sin-sesion', error: '' }); return; }

    corriendo.current = true;
    setSync({ estado: 'sincronizando', error: '' });
    try {
      await sincronizarCola(id, colaRef.current, (opId) => {
        setCola(colaRef.current.filter((o) => o.id !== opId));
      });
      if (traerCambios) {
        // Trae lo que se haya registrado desde otro dispositivo.
        const nuevos = await leerDatos(id);
        if (colaRef.current.length === 0) setDatos(nuevos); // no pisar cambios hechos mientras tanto
      }
            // Hojas creadas antes de que existiera el estilo: se les aplica una vez por dispositivo.
      const marca = `fe_formato_v1_${id}`;
      if (!localStorage.getItem(marca)) {
        try {
          await darFormatoHoja(id);
          localStorage.setItem(marca, '1');
        } catch (e) {
          console.warn('No se pudo dar formato a la hoja (se intentará de nuevo luego)', e);
        }
      }
      setUltimaSync(fechaAhora());
      setSync({ estado: 'al-dia', error: '' });
    } catch (e) {
      if (e.estado === 401) { cerrarSesion(); setSync({ estado: 'sin-sesion', error: '' }); }
      else if (e.estado === 0) setSync({ estado: 'sin-conexion', error: '' });
      else setSync({ estado: 'error', error: e.message });
    } finally {
      corriendo.current = false;
      if (repetir.current) { repetir.current = false; sincronizar({ traerCambios: false }); }
    }
  }, []);

  // Sincronizar al volver internet y al volver a la app (por si hubo cambios desde otro dispositivo).
  useEffect(() => {
    const alVolverInternet = () => sincronizar();
    const alVolverVisible = () => { if (document.visibilityState === 'visible') sincronizar(); };
    const alPerderInternet = () => setSync({ estado: 'sin-conexion', error: '' });
    window.addEventListener('online', alVolverInternet);
    window.addEventListener('offline', alPerderInternet);
    document.addEventListener('visibilitychange', alVolverVisible);
    return () => {
      window.removeEventListener('online', alVolverInternet);
      window.removeEventListener('offline', alPerderInternet);
      document.removeEventListener('visibilitychange', alVolverVisible);
    };
  }, [sincronizar]);

  /** Aplica un cambio en pantalla y lo deja en cola para subirlo. */
  function encolar(operaciones, cambio) {
    setDatos(cambio);
    setCola([...colaRef.current, ...operaciones.map((op) => ({ ...op, id: generarId() }))]);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => sincronizar({ traerCambios: false }), 400);
  }

  /** Después de iniciar sesión con Google: encuentra o crea la hoja y la sincroniza. */
  async function conectar() {
    if (idRef.current) { await sincronizar(); return; }
    const id = (await buscarHoja()) ?? (await crearHoja());
    const leidos = await leerDatos(id);
    idRef.current = id;
    setIdHoja(id);
    setDatos(leidos);
    setCola([]);
    setUltimaSync(fechaAhora());
    setSync({ estado: 'al-dia', error: '' });
  }

  function salir() {
    olvidarCuenta();
    borrarLocal();
    idRef.current = null;
    setIdHoja(null);
    setDatos(VACIO);
    setCola([]);
    setUltimaSync(null);
    setSync({ estado: 'inactivo', error: '' });
  }

  // ---------------- Acciones ----------------

  function guardarPerfil(perfil) {
    const cambioMoneda = (perfil.moneda || '') !== (datos.perfil.moneda || '');
    encolar([{ op: 'perfil', perfil, cambioMoneda }], (d) => ({ ...d, perfil }));
  }

  function guardarEspacio(espacio) {
    encolar([{ op: 'guardar', hoja: 'Espacios', objetos: [espacio] }],
      (d) => ({ ...d, espacios: fusionar(d.espacios, [espacio]) }));
  }

  /** Solo para espacios vacíos y sin movimientos. */
  function eliminarEspacio(id) {
    encolar([{ op: 'eliminar', hoja: 'Espacios', ids: [id] }],
      (d) => ({ ...d, espacios: d.espacios.filter((e) => e.id !== id) }));
  }

  /** Archiva un espacio; si tiene saldo, primero lo traslada al destino elegido. */
  function archivarEspacio(espacio, saldo, destinoId) {
    const archivado = { ...espacio, activo: false };
    const ops = [];
    const movs = [];
    if (saldo > 0 && destinoId) {
      movs.push({
        id: generarId(), fecha: fechaAhora(), tipo: 'traslado', monto: saldo,
        espacio_id: espacio.id, espacio_destino_id: destinoId,
        descripcion: `Saldo de ${espacio.nombre} al archivarlo`, grupo_id: '',
      });
      ops.push({ op: 'guardar', hoja: 'Movimientos', objetos: movs });
    }
    ops.push({ op: 'guardar', hoja: 'Espacios', objetos: [archivado] });
    encolar(ops, (d) => ({
      ...d,
      espacios: fusionar(d.espacios, [archivado]),
      movimientos: [...d.movimientos, ...movs],
    }));
  }

  function guardarMovimientos(movs) {
    encolar([{ op: 'guardar', hoja: 'Movimientos', objetos: movs }],
      (d) => ({ ...d, movimientos: fusionar(d.movimientos, movs) }));
  }

  function eliminarMovimiento(id) {
    encolar([{ op: 'eliminar', hoja: 'Movimientos', ids: [id] }],
      (d) => ({ ...d, movimientos: d.movimientos.filter((m) => m.id !== id) }));
  }

  const saldos = useMemo(() => calcularSaldos(datos.espacios, datos.movimientos), [datos]);

  return {
    idHoja, datos, saldos, pendientes: cola.length, ultimaSync, sync,
    conectar, sincronizar, salir,
    guardarPerfil, guardarEspacio, eliminarEspacio, archivarEspacio,
    guardarMovimientos, eliminarMovimiento,
  };
}
