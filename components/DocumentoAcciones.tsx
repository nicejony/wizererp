"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { convertirDocumento } from "@/lib/convertirDocumento";
import { eliminarPresupuesto, eliminarDevolucion, revertirVenta, revertirRemito } from "@/lib/gestionDocumentos";
import { DocumentoTipo } from "@/lib/types";

export default function DocumentoAcciones({
  documentoId,
  tipo,
  estado,
  clienteId,
}: {
  documentoId: string;
  tipo: DocumentoTipo;
  estado: string;
  clienteId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function convertir(siguienteTipo: DocumentoTipo) {
    setLoading(true);
    try {
      await convertirDocumento(documentoId, siguienteTipo);

      if (siguienteTipo === "remito" && clienteId) {
        const imprimir = confirm("Pedido convertido a Remito. ¿Querés imprimir el cartel de expreso para este envío?");
        if (imprimir) {
          router.push(`/etiqueta/${clienteId}`);
          return;
        }
      }

      router.refresh();
    } catch (e) {
      alert("No se pudo convertir: " + (e as Error).message);
    }
    setLoading(false);
  }

  async function manejarEliminarPresupuesto() {
    if (!confirm("¿Eliminar este presupuesto? No se puede deshacer.")) return;
    setLoading(true);
    try {
      await eliminarPresupuesto(documentoId);
      router.push("/presupuestos");
    } catch (e) {
      alert((e as Error).message);
      setLoading(false);
    }
  }

  async function manejarEliminarDevolucion() {
    if (!confirm("¿Eliminar esta devolución? Se va a deshacer el stock repuesto y el crédito en cuenta corriente. No se puede deshacer.")) return;
    setLoading(true);
    try {
      await eliminarDevolucion(documentoId);
      router.push("/devoluciones");
    } catch (e) {
      alert((e as Error).message);
      setLoading(false);
    }
  }

  async function manejarRevertirVenta() {
    if (!confirm("¿Revertir esta Venta a Remito? Se va a deshacer el cargo en cuenta corriente o el ingreso en caja (según cómo se cobró). El stock no se toca.")) return;
    setLoading(true);
    try {
      await revertirVenta(documentoId);
      router.push("/remitos");
    } catch (e) {
      alert((e as Error).message);
      setLoading(false);
    }
  }

  async function manejarRevertirRemito() {
    if (!confirm("¿Revertir este Remito a Presupuesto? Se va a reponer el stock que había descontado.")) return;
    setLoading(true);
    try {
      await revertirRemito(documentoId);
      router.push("/presupuestos");
    } catch (e) {
      alert((e as Error).message);
      setLoading(false);
    }
  }

  if (tipo === "nota_credito") {
    return (
      <button onClick={manejarEliminarDevolucion} disabled={loading} className="text-xs font-medium text-red-600 hover:underline">
        {loading ? "..." : "Eliminar"}
      </button>
    );
  }

  if (tipo === "venta") {
    if (estado !== "confirmado") return <span className="text-xs text-neutral-400">—</span>;
    return (
      <div className="flex flex-col items-end gap-1">
        <Link href={`/documentos/${documentoId}/devolucion`} className="text-xs font-medium text-violet-600 hover:underline">
          Generar devolución
        </Link>
        <button onClick={manejarRevertirVenta} disabled={loading} className="text-xs font-medium text-red-600 hover:underline">
          {loading ? "..." : "Revertir a Remito"}
        </button>
      </div>
    );
  }

  if (tipo === "remito") {
    if (estado !== "confirmado") return <span className="text-xs text-neutral-400">—</span>;
    return (
      <div className="flex flex-col items-end gap-1">
        <button onClick={() => convertir("venta")} disabled={loading} className="text-xs font-medium text-violet-600 hover:underline">
          {loading ? "..." : "Convertir a Venta"}
        </button>
        <button onClick={manejarRevertirRemito} disabled={loading} className="text-xs font-medium text-red-600 hover:underline">
          {loading ? "..." : "Revertir a Presupuesto"}
        </button>
      </div>
    );
  }

  if (tipo === "presupuesto") {
    if (estado !== "confirmado") return <span className="text-xs text-neutral-400">—</span>;
    return (
      <div className="flex flex-col items-end gap-1">
        <button onClick={() => convertir("remito")} disabled={loading} className="text-xs font-medium text-violet-600 hover:underline">
          {loading ? "..." : "Convertir a Remito"}
        </button>
        <button onClick={manejarEliminarPresupuesto} disabled={loading} className="text-xs font-medium text-red-600 hover:underline">
          {loading ? "..." : "Eliminar"}
        </button>
      </div>
    );
  }

  return <span className="text-xs text-neutral-400">—</span>;
}
