"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { construirPDFOrdenCompra } from "@/lib/pdfOrdenCompra";
import { guardarOCompartirPDF } from "@/lib/pdfDocumentos";

interface ItemOrden {
  variante_id: string;
  codigo: string;
  nombre: string;
  color: string | null;
  cantidad: number;
}

export default function OrdenCompraEditor({ orden, itemsIniciales }: { orden?: any; itemsIniciales?: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);
  const [proveedorId, setProveedorId] = useState<string>(orden?.proveedor_id ?? "");
  const [observaciones, setObservaciones] = useState<string>(orden?.observaciones ?? "");
  const [guardando, setGuardando] = useState(false);

  const [items, setItems] = useState<ItemOrden[]>(
    (itemsIniciales ?? []).map((i) => ({
      variante_id: i.variante_id,
      codigo: i.producto_variantes?.productos?.codigo ?? "—",
      nombre: i.producto_variantes?.productos?.nombre ?? "—",
      color: i.producto_variantes?.color ?? null,
      cantidad: Number(i.cantidad),
    }))
  );

  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("proveedores")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setProveedores(data ?? []));
  }, []);

  useEffect(() => {
    if (productoQuery.length < 2) return setProductoResultados([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("producto_variantes")
        .select("*, producto:productos!inner(*)")
        .or(`nombre.ilike.%${productoQuery}%,codigo.ilike.%${productoQuery}%`, { foreignTable: "producto" })
        .eq("activo", true)
        .limit(8);
      setProductoResultados((data as any) ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [productoQuery]);

  // Solo se pueden agregar productos que ya están cargados en el sistema
  function agregarVariante(v: any) {
    setItems((prev) => {
      if (prev.some((i) => i.variante_id === v.id)) {
        return prev.map((i) => (i.variante_id === v.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          variante_id: v.id,
          codigo: v.producto?.codigo ?? "—",
          nombre: v.producto?.nombre ?? "—",
          color: v.color ?? null,
          cantidad: 1,
        },
      ];
    });
    setProductoQuery("");
    setProductoResultados([]);
  }

  function actualizarCantidad(idx: number, valor: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, cantidad: valor } : it)));
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalUnidades = items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0);

  async function guardar() {
    if (!proveedorId || items.length === 0) return;
    setGuardando(true);

    let ordenId: string | undefined = orden?.id;

    if (ordenId) {
      const { error } = await supabase
        .from("ordenes_compra")
        .update({ proveedor_id: proveedorId, observaciones: observaciones || null })
        .eq("id", ordenId);
      if (error) {
        setGuardando(false);
        alert("Error al guardar: " + error.message);
        return;
      }
      await supabase.from("ordenes_compra_items").delete().eq("orden_id", ordenId);
    } else {
      const { data, error } = await supabase
        .from("ordenes_compra")
        .insert({ proveedor_id: proveedorId, observaciones: observaciones || null })
        .select()
        .single();
      if (error || !data) {
        setGuardando(false);
        alert("Error al crear la orden: " + error?.message);
        return;
      }
      ordenId = data.id;
    }

    const { error: errorItems } = await supabase
      .from("ordenes_compra_items")
      .insert(items.map((i) => ({ orden_id: ordenId, variante_id: i.variante_id, cantidad: i.cantidad })));

    setGuardando(false);
    if (errorItems) {
      alert("Error al guardar los artículos: " + errorItems.message);
      return;
    }
    router.push("/ordenes-compra");
    router.refresh();
  }

  async function cambiarEstado(nuevo: "pendiente" | "pedida") {
    if (!orden?.id) return;
    const { error } = await supabase.from("ordenes_compra").update({ estado: nuevo }).eq("id", orden.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    router.refresh();
  }

  async function eliminar() {
    if (!orden?.id) return;
    if (!confirm("¿Eliminar esta orden de compra? No se puede deshacer.")) return;
    const { error } = await supabase.from("ordenes_compra").delete().eq("id", orden.id);
    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }
    router.push("/ordenes-compra");
    router.refresh();
  }

  // Genera la lista en PDF con lo que está en pantalla (incluye cambios sin guardar) y abre el menú de compartir
  async function compartirPDF() {
    const proveedor = proveedores.find((p) => p.id === proveedorId)?.nombre ?? "—";
    const doc = construirPDFOrdenCompra({
      numero: orden?.numero ?? null,
      fecha: orden?.fecha ?? new Date().toLocaleDateString("es-AR"),
      proveedor,
      items: items.map((i) => ({
        codigo: i.codigo,
        nombre: i.nombre + (i.color ? ` — ${i.color}` : ""),
        cantidad: i.cantidad,
      })),
      observaciones: observaciones || null,
    });
    await guardarOCompartirPDF(doc, `orden-compra-${orden?.numero ?? "nueva"}.pdf`, "Orden de compra");
  }

  const estado: string = orden?.estado ?? "pendiente";

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/ordenes-compra" className="text-xs text-neutral-400 hover:underline">
            ← Volver a Órdenes de compra
          </Link>
          <h1 className="text-2xl font-semibold">{orden ? `Orden de compra #${orden.numero}` : "Nueva orden de compra"}</h1>
          {orden && (
            <span
              className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                estado === "pedida" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {estado === "pedida" ? "Pedida" : "Pendiente"}
            </span>
          )}
        </div>
        <button onClick={compartirPDF} disabled={items.length === 0} className="btn-secondary">
          📄 PDF
        </button>
      </div>

      <div className="card mb-4 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Proveedor *</span>
          <select className="input" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="relative">
          <span className="mb-1 block text-sm font-medium">Agregar producto</span>
          <input
            className="input"
            placeholder="Buscar por nombre o código..."
            value={productoQuery}
            onChange={(e) => setProductoQuery(e.target.value)}
          />
          {productoResultados.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-100 bg-white shadow-lg">
              {productoResultados.map((v) => (
                <button
                  key={v.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  onClick={() => agregarVariante(v)}
                >
                  <span>
                    {v.producto?.nombre} {v.color && <span className="text-neutral-500">— {v.color}</span>}
                  </span>
                  <span className="font-mono text-xs text-neutral-400">{v.producto?.codigo}</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-neutral-400">Solo se pueden agregar productos que ya están cargados en el sistema.</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card mb-4">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="py-2">Código</th>
                <th className="py-2">Producto</th>
                <th className="w-24 py-2">Cant.</th>
                <th className="w-8 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.variante_id} className="border-b border-neutral-50">
                  <td className="py-2 font-mono text-xs text-neutral-500">{item.codigo}</td>
                  <td className="py-2 font-medium">
                    {item.nombre} {item.color && <span className="text-neutral-500">— {item.color}</span>}
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={1}
                      className="input no-spinner py-1"
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(idx, Number(e.target.value))}
                    />
                  </td>
                  <td className="py-2 text-center">
                    <button onClick={() => quitarItem(idx)} className="text-neutral-400 hover:text-red-600">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-right text-sm text-neutral-500">
            {items.length} artículo(s) — <span className="font-medium text-neutral-700">{totalUnidades} unidades</span>
          </p>
        </div>
      )}

      <div className="card space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Observaciones</span>
          <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={guardar} disabled={!proveedorId || items.length === 0 || guardando} className="btn-primary">
            {guardando ? "Guardando..." : orden ? "Guardar cambios" : "Guardar orden"}
          </button>
          {orden && estado === "pendiente" && (
            <button onClick={() => cambiarEstado("pedida")} className="btn-secondary">
              ✓ Marcar como pedida
            </button>
          )}
          {orden && estado === "pedida" && (
            <button onClick={() => cambiarEstado("pendiente")} className="btn-secondary">
              Volver a pendiente
            </button>
          )}
          {orden && (
            <button onClick={eliminar} className="ml-auto text-sm text-red-500 hover:underline">
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
