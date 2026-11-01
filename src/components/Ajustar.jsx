// Texto que se achica solo para caber en su caja (montos muy grandes, como millones de dólares).
// Primero se muestra al tamaño normal; si no cabe, la letra se reduce lo necesario (hasta "min" de su tamaño).
import { useLayoutEffect, useRef } from 'react';

export default function Ajustar({ children, className = '', min = 0.55, ...resto }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let cuadro = 0;
    const medir = () => {
      el.style.fontSize = '';
      const disponible = el.clientWidth;
      const necesario = el.scrollWidth;
      if (disponible > 0 && necesario > disponible + 1) {
        const tam = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${tam * Math.max(min, (disponible / necesario) * 0.98)}px`;
      }
    };
    medir();
    const observador = new ResizeObserver(() => { cancelAnimationFrame(cuadro); cuadro = requestAnimationFrame(medir); });
    if (el.parentElement) observador.observe(el.parentElement);
    return () => { observador.disconnect(); cancelAnimationFrame(cuadro); };
  }, [children, min]);

  return <span ref={ref} className={`ajusta ${className}`} {...resto}>{children}</span>;
}
