import { TipoPrecio } from "@/lib/types";

function positivo(n: any): number | null {
  const v = Number(n);
  return v > 0 ? v : null;
}

// Precio de venta en DÓLARES de un producto para una lista de precios.
// null = el producto no tiene precio en U$D cargado (en ese caso el presupuesto lo deja en blanco para completarlo a mano).
export function precioUsdProducto(p: any, tipo: TipoPrecio): number | null {
  const ventaEnUsd = p.moneda_venta === "USD";
  if (tipo === "mayorista") return positivo(p.precio_mayorista_usd) ?? (ventaEnUsd ? positivo(p.precio_mayorista) : null);
  if (tipo === "promocion") return ventaEnUsd ? positivo(p.precio_promocion) : null;
  return positivo(p.precio_minorista_usd) ?? (ventaEnUsd ? positivo(p.precio_minorista) : null);
}

// Precio en PESOS, que es el valor con el que el sistema guarda todo por dentro.
// En un documento en dólares parte del precio en U$D del producto (sin dividir nada); la cotización solo sirve para guardar el equivalente en pesos.
export function precioEnPesos(p: any, tipo: TipoPrecio, tipoCambio: number, enDolares: boolean): number | null {
  if (enDolares) {
    const usd = precioUsdProducto(p, tipo);
    return usd === null ? null : usd * tipoCambio;
  }
  let precio: number;
  if (tipo === "mayorista") precio = p.precio_mayorista;
  else if (tipo === "promocion") precio = p.precio_promocion ?? p.precio_minorista;
  else precio = p.precio_minorista;
  return p.moneda_venta === "USD" ? precio * tipoCambio : precio;
}
