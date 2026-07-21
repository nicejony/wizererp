export interface Producto {
  id: string;
  codigo: string;
  codigo_barras: string | null;
  nombre: string;
  color: string | null;
  talle: string | null;
  rodado: string | null;
  modelo: string | null;
  costo: number;
  precio_mayorista: number;
  precio_minorista: number;
  stock: number;
  stock_minimo: number;
  stock_ideal: number;
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  empresa: string | null;
  cuit: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  provincia: string | null;
  localidad: string | null;
  saldo: number;
  activo: boolean;
}

export interface PresupuestoItem {
  id?: string;
  producto_id: string;
  producto?: Producto;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  subtotal: number;
}

export interface Presupuesto {
  id: string;
  numero: number;
  cliente_id: string;
  cliente?: Cliente;
  fecha: string;
  forma_pago: string | null;
  observaciones: string | null;
  subtotal: number;
  total: number;
  estado: "borrador" | "confirmado" | "convertido" | "anulado";
}
