"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DocumentoAcciones from "@/components/DocumentoAcciones";
import BotonImprimir from "@/components/BotonImprimir";

interface ItemRemito {
  id: string;
  cantidad: number;
  cantidad_editada: number | null;
  descripcion_editada: string | null;
  nombreBase: string;
}

export default function RemitoDetalle({ documento, itemsIniciales }: { documento: any; itemsIniciales: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const cliente = documento.clientes;

  const [guardando, setGuardando] = useState(false);
  const [bultos, setBultos] = useState(documento.bultos ?? "");
  const [transportista, setTransportista] = useState(documento.transportista ?? cliente?.nombre_expreso ?? "");

  const [items, setItems] = useState<ItemRemito[]>(
    itemsIniciales.map((i) => {
      const nombre = i.producto_variantes?.productos?.nombre ?? "—";
      const color = i.producto_variantes?.color;
      return {
        id: i.id,
        cantidad: Number(i.cantidad),
        cantidad_editada: i.cantidad_editada,
        descripcion_editada: i.descripcion_editada,
        nombreBase: `${nombre}${color ? " — " + color : ""}`,
      };
    })
  );

  function actualizarCantidad(idx: number, valor: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, cantidad_editada: valor } : it)));
  }

  function actualizarDescripcion(idx: number, valor: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, descripcion_editada: valor } : it)));
  }

  async function guardarCambios() {
    setGuardando(true);

    for (const item of items) {
      await supabase
        .from("documento_items")
        .update({
          cantidad_editada: item.cantidad_editada,
          descripcion_editada: item.descripcion_editada,
        })
        .eq("id", item.id);
    }

    await supabase
      .from("documentos")
      .update({ bultos: bultos === "" ? null : Number(bultos), transportista: transportista || null })
      .eq("id", documento.id);

    setGuardando(false);
    router.refresh();
  }

  const condicionVenta = documento.forma_pago === "Cuenta Corriente" ? "Cta. Cte." : "Contado";

  return (
    <div className="max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <Link href="/remitos" className="text-xs text-neutral-400 hover:underline">
            ← Volver a Remitos
          </Link>
          <h1 className="text-2xl font-semibold">Remito #{documento.numero}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={guardarCambios} disabled={guardando} className="btn-secondary">
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          <BotonImprimir />
          <DocumentoAcciones documentoId={documento.id} tipo={documento.tipo} estado={documento.estado} clienteId={documento.cliente_id} />
        </div>
      </div>

      <div className="card">
        <div className="mb-6 flex items-start justify-between border-b border-neutral-100 pb-4">
          <div>
            <p className="text-xl font-bold text-violet-700">WIZER BIKES</p>
            <p className="text-sm text-neutral-500">REMITO N° {documento.numero}</p>
            <p className="text-xs text-neutral-400">Documento no válido como factura</p>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>{documento.fecha}</p>
          </div>
        </div>

        <div className="mb-6 space-y-1 text-sm">
          <p>
            <span className="text-neutral-400">Señor/es: </span>
            <span className="font-medium">{cliente?.nombre ?? "—"}</span>
          </p>
          <p>
            <span className="text-neutral-400">Dirección: </span>
            {cliente?.direccion ?? "—"}
            <span className="text-neutral-400"> — Localidad: </span>
            {cliente?.localidad ?? "—"}
          </p>
          <p>
            <span className="text-neutral-400">CUIT: </span>
            {cliente?.cuit ?? "—"}
            <span className="text-neutral-400"> — IVA: </span>
            {cliente?.condicion_iva ?? "Consumidor Final"}
            <span className="text-neutral-400"> — Condición de venta: </span>
            {condicionVenta}
          </p>
        </div>

        <table className="mb-4 w-full text-sm">
          <thead className="border-b border-neutral-100 text-left text-neutral-500">
            <tr>
              <th className="w-20 py-2">Cant.</th>
              <th className="py-2">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b border-neutral-50">
                <td className="py-2">
                  <input
                    type="number"
                    className="input no-spinner py-1"
                    value={item.cantidad_editada ?? item.cantidad}
                    onChange={(e) => actualizarCantidad(idx, Number(e.target.value))}
                  />
                </td>
                <td className="py-2">
                  <input
                    className="input py-1"
                    value={item.descripcion_editada ?? item.nombreBase}
                    onChange={(e) => actualizarDescripcion(idx, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
          <label>
            <span className="mb-1 block text-xs text-neutral-500">Cantidad de bultos</span>
            <input type="number" className="input no-spinner" value={bultos} onChange={(e) => setBultos(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs text-neutral-500">Transportista</span>
            <input className="input" value={transportista} onChange={(e) => setTransportista(e.target.value)} />
          </label>
        </div>
      </div>
    </div>
  );
}
