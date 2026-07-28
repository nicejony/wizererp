"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { convertirDocumento } from "@/lib/convertirDocumento";
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

  if (tipo === "venta" && estado === "confirmado") {
    return (
      <Link href={`/documentos/${documentoId}/devolucion`} className="text-xs font-medium text-violet-600 hover:underline">
        Generar devolución
      </Link>
    );
  }

  const siguienteTipo: DocumentoTipo | null =
    tipo === "presupuesto" ? "remito" : tipo === "remito" ? "venta" : null;

  if (estado === "convertido" || estado === "anulado" || !siguienteTipo) {
    return <span className="text-xs text-neutral-400">—</span>;
  }

  async function convertir() {
    setLoading(true);
    try {
      await convertirDocumento(documentoId, siguienteTipo!);

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

  const label = siguienteTipo === "remito" ? "Convertir a Remito" : "Convertir a Venta";

  return (
    <button onClick={convertir} disabled={loading} className="text-xs font-medium text-violet-600 hover:underline">
      {loading ? "..." : label}
    </button>
  );
}
