"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ItemVenta {
  id: string;
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  descuento_porcentaje: number;
  nombre: string;
  color: string | null;
}

export default function DevolucionForm({ venta, items }: { venta: any; items: ItemVenta[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [guardando, setGuardando] = useState(false);

  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, 0]))
  );

  function actualizar(itemId: string, valor: number, max: number) {
    const clamped = Math.max(0, Math.min(valor, max));
    setCantidades((prev) => ({ ...prev, [itemId]: clamped }));
  }

  const itemsADevolver = items.filter((i) => cantidades[i.id] > 0);
  const totalDevolucion = itemsADevolver.reduce((s, i) => {
    const bruto = cantidades[i.id] * i.precio_unitario;
    return s + (bruto - (bruto * i.descuento_porcentaje) / 100);
  }, 0);

  async function confirmarDevolucion() {
    if (itemsADevolver.length === 0) return;
    setGuardando(true);

    const { data: nota, error } = await supabase
      .from("documentos")
      .insert({
        tipo: "nota_credito",
        estado: "confirmado",
        cliente_id: venta.cliente_id,
        documento_origen_id: venta.id,
        subtotal: totalDevolucion,
        total: totalDevolucion,
        observaciones: `Devolución de Venta #${venta.numero}`,
      })
      .select()
      .single();

    if (error || !nota) {
      setGuardando(false);
      alert("Error al generar la devolución: " + error?.message);
      return;
    }

    const itemsPayload = itemsADevolver.map((i) => {
      const cant = cantidades[i.id];
      const bruto = cant * i.precio_unitario;
      const subtotal = bruto - (bruto * i.descuento_porcentaje) / 100;
      return {
        documento_id: nota.id,
        variante_id: i.variante_id,
        cantidad: cant,
        precio_unitario: i.precio_unitario,
        costo_unitario: i.costo_unitario,
        descuento_porcentaje: i.descuento_porcentaje,
        subtotal,
      };
    });

    await supabase.from("documento_items").insert(itemsPayload);

    setGuardando(false);
    router.push(`/documentos/${nota.id}`);
  }

  return (
    <div className="card">
      <p className="mb-4 text-sm text-neutral-500">
        Indicá cuántas unidades de cada producto se devuelven. Dejá en 0 los que no corresponden. El stock se
        repone automáticamente al confirmar.
      </p>

      <table className="mb-4 w-full text-sm">
        <thead className="border-b border-neutral-100 text-left text-neutral-500">
          <tr>
            <th className="py-2">Producto</th>
            <th className="py-2">Vendido</th>
            <th className="w-28 py-2">A devolver</th>
            <th className="py-2 text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-neutral-50">
              <td className="py-2 font-medium">
                {i.nombre} {i.color && <span className="text-neutral-500">— {i.color}</span>}
              </td>
              <td className="py-2">{i.cantidad}</td>
              <td className="py-2">
                <input
                  type="number"
                  min={0}
                  max={i.cantidad}
                  className="input no-spinner py-1"
                  value={cantidades[i.id]}
                  onChange={(e) => actualizar(i.id, Number(e.target.value), i.cantidad)}
                />
              </td>
              <td className="py-2 text-right">${i.precio_unitario}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-4 flex justify-end">
        <div className="text-right">
          <p className="text-sm text-neutral-500">Total a devolver</p>
          <p className="text-2xl font-semibold text-violet-700">${totalDevolucion.toFixed(2)}</p>
        </div>
      </div>

      <button onClick={confirmarDevolucion} disabled={itemsADevolver.length === 0 || guardando} className="btn-primary">
        {guardando ? "Generando..." : "Confirmar devolución"}
      </button>
    </div>
  );
}