"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConvertirCompraUsd({ compraId, total }: { compraId: string; total: number }) {
  const router = useRouter();
  const supabase = createClient();
  const [cargando, setCargando] = useState(false);

  async function convertir() {
    const { data: tc } = await supabase.from("tipo_cambio").select("valor").limit(1).single();
    const sugerida = Number(tc?.valor) || 1;

    const respuesta = window.prompt("¿A qué cotización pasás esta compra a dólares? (pesos por cada dólar)", String(sugerida));
    if (!respuesta) return;
    const cotizacion = Number(respuesta.replace(",", "."));
    if (!cotizacion || cotizacion <= 0) {
      alert("La cotización no es válida.");
      return;
    }

    const usd = Math.round((total / cotizacion) * 100) / 100;
    if (!confirm(`Esta compra pasa a U$D ${usd.toLocaleString("es-AR", { minimumFractionDigits: 2 })} y la deuda con el proveedor también queda en dólares. ¿Confirmás?`)) return;

    setCargando(true);

    // Primero el cargo en la cuenta del proveedor; si no se encuentra, no se cambia nada
    const { data: movs, error: errorMov } = await supabase
      .from("movimientos_cuenta")
      .update({ moneda: "USD", monto: usd })
      .eq("referencia_id", compraId)
      .eq("entidad_tipo", "proveedor")
      .eq("tipo", "cargo")
      .select("id");

    if (errorMov || !movs || movs.length === 0) {
      setCargando(false);
      alert("No encontré el cargo de esta compra en la cuenta del proveedor, así que no se cambió nada.");
      return;
    }

    const { error } = await supabase.from("compras").update({ moneda: "USD", tipo_cambio_aplicado: cotizacion }).eq("id", compraId);
    setCargando(false);
    if (error) {
      alert("El cargo pasó a dólares pero falló al actualizar la compra: " + error.message);
      return;
    }
    router.refresh();
  }

  return (
    <button onClick={convertir} disabled={cargando} className="text-xs text-neutral-400 hover:text-violet-600 hover:underline no-print">
      {cargando ? "..." : "pasar a USD"}
    </button>
  );
}
