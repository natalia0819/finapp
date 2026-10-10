// Pantalla 4: historial con filtros, resumen del periodo y exportación.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import FilaMovimiento from './FilaMovimiento';
import { agruparPorDia, filtrar, mesesDisponibles, resumen } from '../lib/movimientos';
import { etiquetaDia, fechaAhora, nombreMes, pesos } from '../lib/formato';
import { iconoDe } from '../constants/espacios';
import { exportarCSV, exportarExcel } from '../lib/exportar';

// Cuántos movimientos se muestran de entrada y cuántos más con cada "Ver más".
const CUANTOS = 10;

export default function Movimientos({ espacios, movimientos, deudas = [], abonos = [], onAbrir, onAviso }) {
  const mesActual = fechaAhora().slice(0, 7);
  const [mes, setMes] = useState(mesActual);
  const [espacio, setEspacio] = useState('');
  const [tipo, setTipo] = useState('');
  const [exportando, setExportando] = useState(false);
  const [menuExportar, setMenuExportar] = useState(false);

  const meses = useMemo(() => mesesDisponibles(movimientos, mesActual), [movimientos, mesActual]);
  const filtrados = useMemo(() => filtrar(movimientos, { mes, espacio, tipo }), [movimientos, mes, espacio, tipo]);
  const [visibles, setVisibles] = useState(CUANTOS);
  const inicioLista = useRef(null);
  useEffect(() => { setVisibles(CUANTOS); }, [mes, espacio, tipo]); // al cambiar filtros, vuelve a lo corto

  // Se agrupa por día solo lo que está visible.
  const grupos = useMemo(() => agruparPorDia(filtrados).reduce((acc, g) => {
    const usados = acc.reduce((s, x) => s + x.movs.length, 0);
    const caben = visibles - usados;
    if (caben > 0) acc.push({ ...g, movs: g.movs.slice(0, caben) });
    return acc;
  }, []), [filtrados, visibles]);
  const restantes = filtrados.length - Math.min(visibles, filtrados.length);

  function verMenos() {
    setVisibles(CUANTOS);
    inicioLista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const { entro, salio } = resumen(filtrados, espacio);

  // Gastos agrupados por espacio, de mayor a menor (panel lateral en PC).
  const porEspacio = useMemo(() => {
    const suma = {};
    for (const m of filtrados) if (m.tipo === 'gasto') suma[m.espacio_id] = (suma[m.espacio_id] ?? 0) + m.monto;
    return Object.entries(suma)
      .map(([id, valor]) => ({ espacio: espacios.find((e) => e.id === id), valor }))
      .filter((x) => x.espacio)
      .sort((a, b) => b.valor - a.valor);
  }, [filtrados, espacios]);
  const mayor = porEspacio[0]?.valor ?? 0;
  const totalGastos = porEspacio.reduce((s, x) => s + x.valor, 0);

  async function exportar(formato) {
    setMenuExportar(false);
    if (!filtrados.length) { onAviso('No hay movimientos para exportar con estos filtros.'); return; }
    setExportando(true);
    try {
      if (formato === 'xlsx') await exportarExcel(filtrados, espacios, movimientos, deudas, abonos);
      else exportarCSV(filtrados, espacios);
    } catch (e) {
      console.error(e);
      onAviso('No se pudo generar el archivo. Intenta con CSV.');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="historial">
      <div className="historial__cabecera">
        <h1 className="titulo-pantalla">Movimientos</h1>
        <div className="exportar">
          <button className="boton boton--suave" onClick={() => setMenuExportar((v) => !v)} aria-expanded={menuExportar} disabled={exportando}>
            {exportando ? <Loader2 className="girar" aria-hidden="true" /> : <Download aria-hidden="true" />} Exportar a registro
          </button>
          {menuExportar && (
            <div className="exportar__menu">
              <button onClick={() => exportar('xlsx')}><FileSpreadsheet aria-hidden="true" /> Excel (.xlsx)</button>
              <button onClick={() => exportar('csv')}><FileText aria-hidden="true" /> CSV</button>
            </div>
          )}
        </div>
      </div>

      <div className="filtros">
        <label className="campo campo--compacto">
          <span>Mes</span>
          <select className="entrada" value={mes} onChange={(e) => setMes(e.target.value)}>
            <option value="">Todos</option>
            {meses.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}
          </select>
        </label>
        <label className="campo campo--compacto">
          <span>Espacio</span>
          <select className="entrada" value={espacio} onChange={(e) => setEspacio(e.target.value)}>
            <option value="">Todos</option>
            {espacios.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.activo ? '' : ' (archivado)'}</option>)}
          </select>
        </label>
        <label className="campo campo--compacto">
          <span>Tipo</span>
          <select className="entrada" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
            <option value="traslado">Traslados</option>
          </select>
        </label>
      </div>

      <div className="historial__cuerpo">
        <aside className="historial__panel" aria-label="Resumen del periodo">
          <div className="resumen-periodo">
            <div><small>Entró</small><strong className="positivo">+{pesos(entro)}</strong></div>
            <div><small>Salió</small><strong className="negativo">−{pesos(salio)}</strong></div>
            <div><small>Balance</small><strong>{pesos(entro - salio)}</strong></div>
          </div>

          <section className="gastos-espacio solo-pc" aria-labelledby="titulo-gastos-espacio">
            <h2 id="titulo-gastos-espacio">Gastos por espacio</h2>
            {porEspacio.length === 0 ? (
              <p className="vacio">No hay gastos en este periodo.</p>
            ) : (
              <ul>
                {porEspacio.map(({ espacio: e, valor }) => {
                  const Icono = iconoDe(e.icono);
                  return (
                    <li key={e.id} style={{ '--c': e.color }}>
                      <div className="gastos-espacio__fila">
                        <span className="mov__icono"><Icono aria-hidden="true" /></span>
                        <span className="gastos-espacio__nombre">{e.nombre}</span>
                        <strong>{pesos(valor)}</strong>
                      </div>
                      <div className="gastos-espacio__barra" aria-hidden="true"><span style={{ width: `${(valor / mayor) * 100}%` }} /></div>
                      <small>{Math.round((valor / totalGastos) * 100)}{'\u00A0'}% de lo gastado</small>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>

        <div className="historial__lista" ref={inicioLista}>
          {grupos.length === 0 ? (
            <p className="vacio vacio--centro">No hay movimientos con estos filtros.</p>
          ) : (
            grupos.map((g) => (
              <section key={g.dia} className="dia" aria-label={etiquetaDia(g.dia)}>
                <h2 className="dia__titulo">{etiquetaDia(g.dia)}</h2>
                <ul className="lista">
                  {g.movs.map((m) => (
                    <FilaMovimiento key={m.id} mov={m} espacios={espacios} onAbrir={onAbrir} soloHora relativoA={espacio || undefined} />
                  ))}
                </ul>
              </section>
            ))
          )}
          {(restantes > 0 || visibles > CUANTOS) && (
            <div className="ver-mas">
              {restantes > 0 && (
                <button className="boton boton--suave" onClick={() => setVisibles((v) => v + CUANTOS)}>
                  <ChevronDown aria-hidden="true" /> Ver más <small>({restantes} {restantes === 1 ? 'restante' : 'restantes'})</small>
                </button>
              )}
              {visibles > CUANTOS && (
                <button className="boton boton--texto" onClick={verMenos}>
                  <ChevronUp aria-hidden="true" /> Ver menos
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
