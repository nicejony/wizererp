"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { convertirDocumento } from "@/lib/convertirDocumento";
import { DocumentoTipo } from "@/lib/types";

export default function DocumentoAcciones({
  documentoId,
  tipo,
  estado,
}: {
  documentoId: string;
  tipo: DocumentoTipo;
  estado: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const siguienteTipo: DocumentoTipo | null =
    tipo === "presupuesto" ? "remito" : tipo === "remito" ? "venta" : null;

  if (estado === "convertido" || estado === "anulado" || !siguienteTipo) {
    return <span className="text-xs text-neutral-400">—</span>;
  }

  async function convertir() {
    setLoading(true);
    try {
      await convertirDocumento(documentoId, siguienteTipo!);
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
