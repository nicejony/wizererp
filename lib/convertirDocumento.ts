import { createClient } from "@/lib/supabase/client";
import { DocumentoTipo } from "@/lib/types";

/**
 * Convierte un documento existente (presupuesto o remito) en el siguiente
 * tipo del flujo, copiando sus items. El documento original queda marcado
 * como 'convertido' automáticamente por el trigger de la base de datos.
 */
export async function convertirDocumento(documentoOrigenId: string, nuevoTipo: DocumentoTipo) {
  const supabase = createClient();

  const { data: origen, error: errorOrigen } = await supabase
    .from("documentos")
    .select("*, documento_items(*)")
    .eq("id", documentoOrigenId)
    .single();

  if (errorOrigen || !origen) throw errorOrigen ?? new Error("Documento no encontrado");
  if (origen.estado === "convertido") throw new Error("Este documento ya fue convertido.");

  const costoTotal = (origen.documento_items as any[]).reduce(
    (s, i) => s + i.costo_unitario * i.cantidad,
    0
  );

  const { data: nuevo, error: errorNuevo } = await supabase
    .from("documentos")
    .insert({
      tipo: nuevoTipo,
      estado: "confirmado",
      cliente_id: origen.cliente_id,
      vendedor_id: origen.vendedor_id,
      documento_origen_id: origen.id,
      forma_pago: origen.forma_pago,
      observaciones: origen.observaciones,
      subtotal: origen.subtotal,
      total: origen.total,
      costo_total: costoTotal,
    })
    .select()
    .single();

  if (errorNuevo || !nuevo) throw errorNuevo ?? new Error("No se pudo crear el documento");

  const itemsPayload = (origen.documento_items as any[]).map((i) => ({
    documento_id: nuevo.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    costo_unitario: i.costo_unitario,
    descuento_porcentaje: i.descuento_porcentaje,
    subtotal: i.subtotal,
  }));

  const { error: errorItems } = await supabase.from("documento_items").insert(itemsPayload);
  if (errorItems) throw errorItems;

  return nuevo;
}
