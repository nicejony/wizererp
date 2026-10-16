import { createClient } from "@/lib/supabase/client";

async function depositoPrincipalId(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.from("depositos").select("id").eq("tipo", "principal").limit(1).single();
  return data?.id as string | undefined;
}

/** Elimina un presupuesto directamente. Solo si todavía no fue convertido a Remito. */
export async function eliminarPresupuesto(documentoId: string) {
  const supabase = createClient();
  const { data: doc, error: errorDoc } = await supabase.from("documentos").select("estado").eq("id", documentoId).single();
  if (errorDoc || !doc) throw errorDoc ?? new Error("Documento no encontrado");
  if (doc.estado === "convertido") {
    throw new Error(
      "Este presupuesto ya fue convertido a Remito. Primero tenés que revertir la cadena (Venta → Remito) antes de poder borrarlo."
    );
  }

  await supabase.from("documento_items").delete().eq("documento_id", documentoId);
  const { error } = await supabase.from("documentos").delete().eq("id", documentoId);
  if (error) throw error;
}

/** Elimina una devolución (nota de crédito), revirtiendo el stock que había repuesto y el crédito en cuenta corriente. */
export async function eliminarDevolucion(documentoId: string) {
  const supabase = createClient();

  const { data: nota, error: errorNota } = await supabase
    .from("documentos")
    .select("*, documento_items(*)")
    .eq("id", documentoId)
    .single();
  if (errorNota || !nota) throw errorNota ?? new Error("Devolución no encontrada");

  const depositoId = await depositoPrincipalId(supabase);

  for (const item of (nota.documento_items as any[]) ?? []) {
    await supabase.from("stock_movimientos").insert({
      variante_id: item.variante_id,
      deposito_id: depositoId,
      tipo: "salida",
      cantidad: -item.cantidad,
      referencia_tipo: "nota_credito",
      referencia_id: nota.id,
      observaciones: `Anulación de devolución #${nota.numero}`,
    });
  }

  await supabase.from("movimientos_cuenta").delete().eq("referencia_tipo", "nota_credito").eq("referencia_id", nota.id);

  await supabase.from("documento_items").delete().eq("documento_id", documentoId);
  const { error } = await supabase.from("documentos").delete().eq("id", documentoId);
  if (error) throw error;
}

/** Revierte una Venta: la borra y deshace el cargo en cta. cte. o el ingreso en caja, dejando el Remito de origen como "confirmado" otra vez. */
export async function revertirVenta(ventaId: string) {
  const supabase = createClient();

  const { data: venta, error: errorVenta } = await supabase.from("documentos").select("*").eq("id", ventaId).single();
  if (errorVenta || !venta) throw errorVenta ?? new Error("Venta no encontrada");

  const { data: devoluciones } = await supabase
    .from("documentos")
    .select("id")
    .eq("tipo", "nota_credito")
    .eq("documento_origen_id", ventaId);
  if (devoluciones && devoluciones.length > 0) {
    throw new Error("Esta venta tiene devoluciones generadas. Borrá primero esas devoluciones antes de revertir la venta.");
  }

  await supabase.from("movimientos_cuenta").delete().eq("referencia_tipo", "venta").eq("referencia_id", ventaId);
  await supabase.from("movimientos_caja").delete().eq("referencia_tipo", "venta").eq("referencia_id", ventaId);

  await supabase.from("documento_items").delete().eq("documento_id", ventaId);
  const { error } = await supabase.from("documentos").delete().eq("id", ventaId);
  if (error) throw error;

  if (venta.documento_origen_id) {
    await supabase.from("documentos").update({ estado: "confirmado" }).eq("id", venta.documento_origen_id);
  }
}

/** Revierte un Remito: lo borra y deshace el descuento de stock, dejando el Presupuesto de origen como "confirmado" otra vez. */
export async function revertirRemito(remitoId: string) {
  const supabase = createClient();

  const { data: remito, error: errorRemito } = await supabase
    .from("documentos")
    .select("*, documento_items(*)")
    .eq("id", remitoId)
    .single();
  if (errorRemito || !remito) throw errorRemito ?? new Error("Remito no encontrado");

  const { data: ventaHija } = await supabase
    .from("documentos")
    .select("id")
    .eq("tipo", "venta")
    .eq("documento_origen_id", remitoId)
    .limit(1)
    .maybeSingle();
  if (ventaHija) {
    throw new Error("Este remito ya se convirtió en una Venta. Primero tenés que revertir la Venta antes de revertir el Remito.");
  }

  const depositoId = await depositoPrincipalId(supabase);

  for (const item of (remito.documento_items as any[]) ?? []) {
    await supabase.from("stock_movimientos").insert({
      variante_id: item.variante_id,
      deposito_id: depositoId,
      tipo: "entrada",
      cantidad: item.cantidad,
      referencia_tipo: "remito",
      referencia_id: remito.id,
      observaciones: `Anulación de remito #${remito.numero}`,
    });
  }

  await supabase.from("documento_items").delete().eq("documento_id", remitoId);
  const { error } = await supabase.from("documentos").delete().eq("id", remitoId);
  if (error) throw error;

  if (remito.documento_origen_id) {
    await supabase.from("documentos").update({ estado: "confirmado" }).eq("id", remito.documento_origen_id);
  }
}
