"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Cliente, DocumentoItem, ProductoVariante, TipoPrecio, FORMAS_PAGO } from "@/lib/types";
import { formatearMoneda } from "@/lib/format";

function precioSegunTipo(v: ProductoVariante, tipo: TipoPrecio): number {
  const p = v.producto!;
  if (tipo === "mayorista") return p.precio_mayorista;
  if (tipo === "promocion") return p.precio_promocion ?? p.precio_minorista;
  return p.precio_minorista; // minorista o manual (arranca desde minorista)
}

export default function NuevoPresupuestoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResultados, setClienteResultados] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<ProductoVariante[]>([]);
  const [items, setItems] = useState<(DocumentoItem & { tipoPrecio: TipoPrecio })[]>([]);

  const [observaciones, setObservaciones] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (clienteQuery.length < 2) return setClienteResultados([]);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("clientes").select("*").ilike("nombre", `%${clienteQuery}%`).limit(5);
      setClienteResultados(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [clienteQuery]);

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
    setItems((prev) => {
      const existente = prev.find((i) => i.variante_id === v.id);
      if (existente) {
        return prev.map((i) =>
          i.variante_id === v.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        );
      }
      const precio = precioSegunTipo(v, "minorista");
      return [
        ...prev,
        {
          variante_id: v.id,
          variante: v,
          cantidad: 1,
          precio_unitario: precio,
          costo_unitario: v.producto?.costo ?? 0,
          descuento_porcentaje: 0,
          subtotal: precio,
          tipoPrecio: "minorista",
        },
      ];
    });
    setProductoQuery("");
    setProductoResultados([]);
  }

  function recalcularSubtotal(item: typeof items[number]): typeof items[number] {
    const bruto = item.cantidad * item.precio_unitario;
    return { ...item, subtotal: bruto - (bruto * item.descuento_porcentaje) / 100 };
  }

  function actualizarItem(idx: number, campo: "cantidad" | "precio_unitario" | "descuento_porcentaje", valor: number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? recalcularSubtotal({ ...item, [campo]: valor }) : item)));
  }

  function cambiarTipoPrecio(idx: number, tipo: TipoPrecio) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx || !item.variante) return item;
        const nuevoPrecio = tipo === "manual" ? item.precio_unitario : precioSegunTipo(item.variante, tipo);
        return recalcularSubtotal({ ...item, tipoPrecio: tipo, precio_unitario: nuevoPrecio });
      })
    );
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = useMemo(() => items.reduce((s, i) => s + i.subtotal, 0), [items]);

  async function guardarPresupuesto() {
    if (!cliente || items.length === 0) return;
    setGuardando(true);

    const { data: documento, error } = await supabase
      .from("documentos")
      .insert({
        tipo: "presupuesto",
        cliente_id: cliente.id,
        forma_pago: formaPago || null,
        observaciones: observaciones || null,
        subtotal: total,
        total,
        estado: "confirmado",
      })
      .select()
      .single();

    if (error || !documento) {
      setGuardando(false);
      alert("Error al guardar: " + error?.message);
      return;
    }

    const itemsPayload = items.map((i) => ({
      documento_id: documento.id,
      variante_id: i.variante_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      costo_unitario: i.costo_unitario,
      descuento_porcentaje: i.descuento_porcentaje,
      subtotal: i.subtotal,
    }));

    await supabase.from("documento_items").insert(itemsPayload);

    setGuardando(false);
    router.push("/presupuestos");
  }

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">Nuevo presupuesto</h1>

      {/* Cliente */}
      <div className="card mb-4">
        <span className="mb-2 block text-sm font-medium">Cliente</span>
        {cliente ? (
          <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
            <span className="font-medium text-violet-700">{cliente.nombre}</span>
            <button className="text-xs text-violet-600 underline" onClick={() => setCliente(null)}>
              cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              autoFocus
              className="input"
              placeholder="Buscar cliente por nombre..."
              value={clienteQuery}
              onChange={(e) => setClienteQuery(e.target.value)}
            />
            {clienteResultados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-100 bg-white shadow-lg">
                {clienteResultados.map((c) => (
                  <button
                    key={c.id}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setCliente(c);
                      setClienteQuery("");
                      setClienteResultados([]);
                    }}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buscador de productos (por variante/color) */}
      <div className="card mb-4">
        <span className="mb-2 block text-sm font-medium">Agregar productos</span>
        <div className="relative">
          <input
            className="input"
            placeholder="Buscar por nombre o código... (F3)"
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
                    {v.producto?.nombre} {v.color && <span className="text-neutral-500">— {v.color}</span>}{" "}
                    <span className="text-neutral-400">({v.producto?.codigo})</span>
                  </span>
                                    <span className="font-medium">${formatearMoneda(v.producto?.precio_minorista ?? 0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
            <div className="card mb-4 overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="w-24 px-3 py-2">Cant.</th>
              <th className="w-40 px-3 py-2">Lista de precio</th>
              <th className="w-28 px-3 py-2">Precio</th>
              <th className="w-20 px-3 py-2">Desc. %</th>
              <th className="w-28 px-3 py-2 text-right">Subtotal</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-neutral-50">
                <td className="px-3 py-2 font-medium">
                  {item.variante?.producto?.nombre}
                  {item.variante?.color && <span className="text-neutral-500"> — {item.variante.color}</span>}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    className="input no-spinner py-1"
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="input py-1"
                    value={item.tipoPrecio}
                    onChange={(e) => cambiarTipoPrecio(idx, e.target.value as TipoPrecio)}
                  >
                    <option value="mayorista">Mayorista</option>
                    <option value="minorista">Minorista</option>
                    <option value="promocion">Promoción</option>
                    <option value="manual">Manual</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    disabled={item.tipoPrecio !== "manual"}
                    className="input no-spinner py-1 disabled:bg-neutral-50 disabled:text-neutral-500"
                    value={item.precio_unitario}
                    onChange={(e) => actualizarItem(idx, "precio_unitario", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="input no-spinner py-1"
                    value={item.descuento_porcentaje}
                    onChange={(e) => actualizarItem(idx, "descuento_porcentaje", Number(e.target.value))}
                  />
                </td>
                                <td className="px-3 py-2 text-right font-medium">${formatearMoneda(item.subtotal)}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => quitarItem(idx)} className="text-neutral-400 hover:text-red-600">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                  Buscá y agregá productos arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totales y observaciones */}
      <div className="card mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium">Forma de pago</span>
            <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
              <option value="">Seleccionar...</option>
              {FORMAS_PAGO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Observaciones</span>
            <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-col items-start justify-end sm:items-end">
          <span className="text-sm text-neutral-500">Total</span>
                    <span className="text-3xl font-semibold text-violet-700">${formatearMoneda(total)}</span>
        </div>
      </div>

      <button
        onClick={guardarPresupuesto}
        disabled={!cliente || items.length === 0 || guardando}
        className="btn-primary"
      >
        {guardando ? "Guardando..." : "Guardar presupuesto"}
      </button>
    </div>
  );
}
