export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  talle: string | null;
  rodado: string | null;
  modelo: string | null;
    costo: number;
  moneda_costo: "ARS" | "USD";
  precio_mayorista: number;
  precio_minorista: number;
  precio_promocion: number | null;
  moneda_venta: "ARS" | "USD";
  activo: boolean;
}
}

export interface Deposito {
  id: string;
  nombre: string;
  tipo: "principal" | "secundario";
  direccion: string | null;
  activo: boolean;
}

export interface VarianteStock {
  id: string;
  variante_id: string;
  deposito_id: string;
  deposito?: Deposito;
  stock: number;
}

export interface ProductoVariante {
  id: string;
  producto_id: string;
  producto?: Producto;
  color: string | null;
  codigo_variante: string | null;
  codigo_barras: string | null;
  foto_url: string | null;
  stock_minimo: number;
  stock_ideal: number;
  activo: boolean;
  stock_total?: number; // viene de la vista variante_resumen (suma de todos los depósitos)
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

export type DocumentoTipo = "presupuesto" | "remito" | "venta" | "nota_credito";
export type DocumentoEstado = "borrador" | "confirmado" | "convertido" | "anulado";

export interface DocumentoItem {
  id?: string;
  variante_id: string;
  variante?: ProductoVariante;
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

export type TipoPrecio = "mayorista" | "minorista" | "promocion" | "manual";

export const FORMAS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Cuenta Corriente"] as const;
