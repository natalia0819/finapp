// Paleta, galería de íconos y espacios con los que nace cada cuenta.
import {
  PiggyBank, Smile, Wallet, House, Car, Utensils,
  Plane, Gift, Heart, GraduationCap, ShoppingCart, Sparkles,
} from 'lucide-react';

export const PALETA = [
  { hex: '#7C3AED', nombre: 'Violeta' },
  { hex: '#C026D3', nombre: 'Fucsia' },
  { hex: '#DB2777', nombre: 'Rosa' },
  { hex: '#EA580C', nombre: 'Naranja' },
  { hex: '#CA8A04', nombre: 'Mostaza' },
  { hex: '#16A34A', nombre: 'Verde' },
  { hex: '#0891B2', nombre: 'Turquesa' },
  { hex: '#2563EB', nombre: 'Azul' },
];

// La clave (texto) es lo que se guarda en la hoja; el componente es lo que se dibuja.
export const ICONOS = {
  'piggy-bank': { componente: PiggyBank, nombre: 'Alcancía' },
  smile: { componente: Smile, nombre: 'Carita feliz' },
  wallet: { componente: Wallet, nombre: 'Billetera' },
  house: { componente: House, nombre: 'Casa' },
  car: { componente: Car, nombre: 'Carro' },
  utensils: { componente: Utensils, nombre: 'Comida' },
  plane: { componente: Plane, nombre: 'Viajes' },
  gift: { componente: Gift, nombre: 'Regalos' },
  heart: { componente: Heart, nombre: 'Corazón' },
  'graduation-cap': { componente: GraduationCap, nombre: 'Estudio' },
  'shopping-cart': { componente: ShoppingCart, nombre: 'Mercado' },
  sparkles: { componente: Sparkles, nombre: 'Gustos' },
};

export function iconoDe(clave) {
  return ICONOS[clave]?.componente ?? Wallet;
}

// Ids fijos para los predeterminados: así, aunque el usuario los renombre,
// la app sigue sabiendo cuál es el ahorro (para la confirmación al gastar, Fase 3).
export const ID_AHORRO = 'ahorro';

export function espaciosPredeterminados(fecha) {
  return [
    {
      id: ID_AHORRO, nombre: 'Ahorro', color: '#7C3AED', icono: 'piggy-bank',
      meta: '', activo: true, es_predeterminado: true, fecha_creacion: fecha,
    },
    {
      id: 'felicidad', nombre: 'Inversión a la felicidad', color: '#DB2777', icono: 'smile',
      meta: '', activo: true, es_predeterminado: true, fecha_creacion: fecha,
    },
  ];
}
