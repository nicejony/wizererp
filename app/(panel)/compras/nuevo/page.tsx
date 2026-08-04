"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProductoVariante, Deposito } from "@/lib/types";
import { formatearMoneda } from "@/lib/format";

interface ItemCompra {
  variante_id: string;
  nombre: string;
  color: string | null;
  cantidad: number;
  costo_unitario: number;
}

export default function NuevaCompraPage() {
  const router = useRouter();
  const supabase = createClient();

  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [items, setItems] = useState<ItemCompra[]>([]);
  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<ProductoVariante[]>([]);
  const [tipoCambio, setTipoCambio] = useState(1);

  useEffect(() => {
    supabase
      .from("proveedores")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setProveedores(data ?? []));
    supabase
      .from("depositos")
      .select("*")
      .eq("activo", true)
      .order("tipo")
      .then(({ data }) => {
        setDepositos(data ?? []);
        const principal = (data ?? []).find((d) => d.tipo === "principal");
        if (principal) setDepositoId(principal.id);
      });
    supabase
      .from("tipo_cambio")
      .select("valor")
      .limit(1)
      .single()
      .then(({ data }) => setTipoCambio(Number(data?.valor) || 1));
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

  function agregarVariante(v: ProductoVariante) {
    const costoBase = v.producto?.costo ?? 0;
    const costoEnPesos = v.producto?.moneda_costo === "USD" ? costoBase * tipoCambio : costoBase;
    setItems((prev) => [
      ...prev,
      {
        variante_id: v.id,
        nombre: v.producto?.nombre ?? "—",
        color: v.color,
        cantidad: 1,
        costo_unitario: costoEnPesos,
      },
    ]);
    setProductoQuery("");
    setProductoResultados([]);
  }

  function actualizarItem(idx: number, campo: "cantidad" | "costo_unitario", valor: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce((s, i) => s + i.cantidad * i.costo_unitario, 0);

  async function guardarCompra() {
    if (!proveedorId || !depositoId || items.length === 0) return;
    setGuardando(true);

    const { data: compra, error } = await supabase
      .from("compras")
      .insert({ proveedor_id: proveedorId, total, observaciones: observaciones || null })
      .select()
      .single();

    if (error || !compra) {
      setGuardando(false);
      alert("Error al crear la compra: " + error?.message);
      return;
    }

    const itemsPayload = items.map((i) => ({
      compra_id: compra.id,
      variante_id: i.variante_id,
      cantidad: i.cantidad,
      costo_unitario: i.costo_unitario,
      subtotal: i.cantidad * i.costo_unitario,
    }));
    await supabase.from("compra_items").insert(itemsPayload);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const movimientosPayload = items.map((i) => ({
      variante_id: i.variante_id,
      deposito_id: depositoId,
      tipo: "entrada",
      cantidad: i.cantidad,
      referencia_tipo: "compra",
      referencia_id: compra.id,
      usuario_id: user?.id ?? null,
      observaciones: `Ingreso por compra #${compra.numero}`,
    }));
    await supabase.from("stock_movimientos").insert(movimientosPayload);

    setGuardando(false);
    router.push("/compras");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nueva compra</h1>

      <div className="card mb-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label>
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
          <label>
            <span className="mb-1 block text-sm font-medium">Depósito de ingreso *</span>
            <select className="input" value={depositoId} onChange={(e) => setDepositoId(e.target.value)}>
              <option value="">Seleccionar...</option>
              {depositos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

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
                  <span className="text-neutral-400">costo: ${formatearMoneda(v.producto?.costo ?? 0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="card mb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-neutral-100 text-left text-neutral-500">
                <tr>
                  <th className="py-2">Producto</th>
                  <th className="w-24 py-2">Cant.</th>
                  <th className="w-28 py-2">Costo unit.</th>
                  <th className="w-24 py-2 text-right">Subtotal</th>
                  <th className="w-8 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-neutral-50">
                    <td className="py-2 font-medium">
                      {item.nombre} {item.color && <span className="text-neutral-500">— {item.color}</span>}
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        className="input no-spinner py-1"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        step="0.01"
                        className="input no-spinner py-1"
                        value={item.costo_unitario}
                        onChange={(e) => actualizarItem(idx, "costo_unitario", Number(e.target.value))}
                      />
                    </td>
                    <td className="py-2 text-right font-medium">${formatearMoneda(item.cantidad * item.costo_unitario)}</td>
                    <td className="py-2 text-center">
                      <button onClick={() => quitarItem(idx)} className="text-neutral-400 hover:text-red-600">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end border-t border-neutral-100 pt-4">
            <div className="text-right">
              <p className="text-sm text-neutral-500">Total</p>
              <p className="text-2xl font-semibold text-violet-700">${formatearMoneda(total)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Observaciones</span>
          <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </label>
        <button
          onClick={guardarCompra}
          disabled={!proveedorId || !depositoId || items.length === 0 || guardando}
          className="btn-primary"
        >
          {guardando ? "Guardando..." : "Confirmar compra"}
        </button>
      </div>
    </div>
  );
}
