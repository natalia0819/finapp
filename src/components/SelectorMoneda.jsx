// Moneda: el campo que muestra la moneda elegida y la ventana con la lista para cambiarla.
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import Hoja from './Hoja';
import { MONEDAS } from '../lib/moneda';

/** Ejemplo de cómo se ve un monto en esa moneda: "$ 20.000", "20,50 €" */
function ejemplo(codigo) {
  const m = MONEDAS[codigo];
  const n = new Intl.NumberFormat(m.locale, {
    minimumFractionDigits: m.decimales, maximumFractionDigits: m.decimales, useGrouping: 'always',
  }).format(m.decimales ? 20.5 : 20000);
  return m.simboloDespues ? `${n} ${m.simbolo}` : `${m.simbolo} ${n}`;
}

/** Botón que muestra la moneda elegida; al tocarlo abre la lista. */
export function CampoMoneda({ codigo, onAbrir, etiqueta }) {
  const m = MONEDAS[codigo] ?? MONEDAS.COP;
  return (
    <div className="campo">
      {etiqueta && <span className="campo__etiqueta" id="etiqueta-moneda">{etiqueta}</span>}
      <button type="button" className="entrada moneda-campo" onClick={onAbrir}
        aria-labelledby={etiqueta ? 'etiqueta-moneda' : undefined} aria-label={etiqueta ? undefined : `Moneda: ${m.nombre}. Cambiar`}>
        <span className="moneda-sim">{m.simbolo}</span>
        <span className="moneda-nom">{m.nombre} <small>{codigo}</small></span>
        <ChevronDown className="moneda-flecha" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Ventana con la lista de monedas. Al tocar una, se elige y se cierra. */
export default function SelectorMoneda({ actual, onElegir, onCerrar }) {
  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLowerCase();
  const lista = Object.entries(MONEDAS).filter(([codigo, m]) =>
    !q || codigo.toLowerCase().includes(q) || m.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .includes(q.normalize('NFD').replace(/[̀-ͯ]/g, '')));

  return (
    <Hoja titulo="Elige tu moneda" onCerrar={onCerrar}>
      <input className="entrada" placeholder="Buscar moneda o país" value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar moneda" />
      <div className="moneda-lista" role="listbox" aria-label="Monedas">
        {lista.map(([codigo, m]) => (
          <button key={codigo} type="button" role="option" aria-selected={codigo === actual}
            className={`moneda-op ${codigo === actual ? 'sel' : ''}`} onClick={() => onElegir(codigo)}>
            <span className="moneda-sim">{m.simbolo}</span>
            <span className="moneda-nom">{m.nombre}<small>{codigo} · {ejemplo(codigo)}</small></span>
            {codigo === actual && <span className="moneda-ok" aria-hidden="true"><Check /></span>}
          </button>
        ))}
        {lista.length === 0 && <p className="vacio" style={{ padding: '1rem' }}>No encontramos esa moneda.</p>}
      </div>
      <p className="ayuda">Cambiar la moneda no convierte tus montos: solo cambia cómo se muestran.</p>
    </Hoja>
  );
}
