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
  precio_promocion: number | null;
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
  lista_precio_id: string | null;
  saldo: number;
  activo: boolean;
}

export type DocumentoTipo = "presupuesto" | "remito" | "venta";
export type DocumentoEstado = "borrador" | "confirmado" | "convertido" | "anulado";

export interface DocumentoItem {
  id?: string;
  producto_id: string;
  producto?: Producto;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  descuento_porcentaje: number;
  subtotal: number;
}

export interface Documento {
  id: string;
  numero: number;
  tipo: DocumentoTipo;
  estado: DocumentoEstado;
  cliente_id: string;
  cliente?: Cliente;
  documento_origen_id: string | null;
  fecha: string;
  forma_pago: string | null;
  observaciones: string | null;
  subtotal: number;
  total: number;
  costo_total: number;
}

// Precio elegido para un ítem: mayorista, minorista, promo o manual
export type TipoPrecio = "mayorista" | "minorista" | "promocion" | "manual";
