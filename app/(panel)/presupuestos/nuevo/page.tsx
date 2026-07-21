"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Producto, Cliente, PresupuestoItem } from "@/lib/types";

export default function NuevoPresupuestoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResultados, setClienteResultados] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);

  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<Producto[]>([]);
  const [items, setItems] = useState<PresupuestoItem[]>([]);

  const [observaciones, setObservaciones] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Buscar clientes
  useEffect(() => {
    if (clienteQuery.length < 2) return setClienteResultados([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .ilike("nombre", `%${clienteQuery}%`)
        .limit(5);
      setClienteResultados(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [clienteQuery]);

  // Buscar productos
  useEffect(() => {
    if (productoQuery.length < 2) return setProductoResultados([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("productos")
        .select("*")
        .or(`nombre.ilike.%${productoQuery}%,codigo.ilike.%${productoQuery}%`)
        .eq("activo", true)
        .limit(6);
      setProductoResultados(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [productoQuery]);

  function agregarProducto(p: Producto) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === p.id);
      if (existente) {
        return prev.map((i) =>
          i.producto_id === p.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        );
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          producto: p,
          cantidad: 1,
          precio_unitario: p.precio_minorista,
          descuento_porcentaje: 0,
          subtotal: p.precio_minorista,
        },
      ];
    });
    setProductoQuery("");
    setProductoResultados([]);
  }

  function actualizarItem(idx: number, campo: "cantidad" | "precio_unitario" | "descuento_porcentaje", valor: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const actualizado = { ...item, [campo]: valor };
        const bruto = actualizado.cantidad * actualizado.precio_unitario;
        actualizado.subtotal = bruto - (bruto * actualizado.descuento_porcentaje) / 100;
        return actualizado;
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

    const { data: presupuesto, error } = await supabase
      .from("presupuestos")
      .insert({
        cliente_id: cliente.id,
        forma_pago: formaPago || null,
        observaciones: observaciones || null,
        subtotal: total,
        total,
        estado: "confirmado",
      })
      .select()
      .single();

    if (error || !presupuesto) {
      setGuardando(false);
      return;
    }

    const itemsPayload = items.map((i) => ({
      presupuesto_id: presupuesto.id,
      producto_id: i.producto_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      descuento_porcentaje: i.descuento_porcentaje,
      subtotal: i.subtotal,
    }));

    await supabase.from("presupuesto_items").insert(itemsPayload);

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

      {/* Buscador de productos */}
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
              {productoResultados.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  onClick={() => agregarProducto(p)}
                >
                  <span>{p.nombre} <span className="text-neutral-400">({p.codigo})</span></span>
                  <span className="font-medium">${p.precio_minorista}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-4 p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="w-20 px-3 py-2">Cant.</th>
              <th className="w-28 px-3 py-2">Precio</th>
              <th className="w-20 px-3 py-2">Desc. %</th>
              <th className="w-28 px-3 py-2 text-right">Subtotal</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-neutral-50">
                <td className="px-3 py-2 font-medium">{item.producto?.nombre}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    className="input py-1"
                    value={item.cantidad}
                    onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    className="input py-1"
                    value={item.precio_unitario}
                    onChange={(e) => actualizarItem(idx, "precio_unitario", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="input py-1"
                    value={item.descuento_porcentaje}
                    onChange={(e) => actualizarItem(idx, "descuento_porcentaje", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium">${item.subtotal.toFixed(2)}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => quitarItem(idx)} className="text-neutral-400 hover:text-red-600">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-neutral-400">
                  Buscá y agregá productos arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totales y observaciones */}
      <div className="card mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium">Forma de pago</span>
            <input className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Observaciones</span>
            <textarea className="input" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-col items-end justify-end">
          <span className="text-sm text-neutral-500">Total</span>
          <span className="text-3xl font-semibold text-violet-700">${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={guardarPresupuesto}
        disabled={!cliente || items.length === 0 || guardando}
        className="btn-primary"
      >
        {guardando ? "Guardando..." : "Guardar y generar PDF"}
      </button>
    </div>
  );
}
