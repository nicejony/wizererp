"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProductoVariante, TipoPrecio, FORMAS_PAGO } from "@/lib/types";
import DocumentoAcciones from "@/components/DocumentoAcciones";
import { formatearMoneda } from "@/lib/format";


interface ItemRow {
  id?: string;
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  descuento_porcentaje: number;
  subtotal: number;
  nombre: string;
  color: string | null;
}

const ETIQUETAS: Record<string, string> = {
  presupuesto: "Presupuesto",
  remito: "Remito",
  venta: "Venta",
  nota_credito: "Nota de Crédito",
};

const RUTA_LISTADO: Record<string, string> = {
  presupuesto: "/presupuestos",
  remito: "/remitos",
  venta: "/ventas",
  nota_credito: "/devoluciones",
};

function precioSegunTipo(v: ProductoVariante, tipo: TipoPrecio, tipoCambio: number): number {
  const p = v.producto!;
  let precio: number;
  if (tipo === "mayorista") precio = p.precio_mayorista;
  else if (tipo === "promocion") precio = p.precio_promocion ?? p.precio_minorista;
  else precio = p.precio_minorista;
  return p.moneda_venta === "USD" ? precio * tipoCambio : precio;
}

export default function DocumentoDetalle({ documento, itemsIniciales }: { documento: any; itemsIniciales: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  const puedeEditar = documento.tipo === "presupuesto" && documento.estado === "confirmado";
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formaPago, setFormaPago] = useState(documento.forma_pago ?? "");
  const [observaciones, setObservaciones] = useState(documento.observaciones ?? "");

  const [items, setItems] = useState<ItemRow[]>(
    itemsIniciales.map((i) => ({
      id: i.id,
      variante_id: i.variante_id,
      cantidad: Number(i.cantidad),
      precio_unitario: Number(i.precio_unitario),
      costo_unitario: Number(i.costo_unitario),
      descuento_porcentaje: Number(i.descuento_porcentaje),
      subtotal: Number(i.subtotal),
      nombre: i.producto_variantes?.productos?.nombre ?? "—",
      color: i.producto_variantes?.color ?? null,
    }))
  );

    const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<ProductoVariante[]>([]);
  const [tipoCambio, setTipoCambio] = useState(1);

  useEffect(() => {
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

  function recalc(item: ItemRow): ItemRow {
    const bruto = item.cantidad * item.precio_unitario;
    return { ...item, subtotal: bruto - (bruto * item.descuento_porcentaje) / 100 };
  }

  function actualizarItem(idx: number, campo: "cantidad" | "precio_unitario" | "descuento_porcentaje", valor: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? recalc({ ...it, [campo]: valor }) : it)));
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function agregarVariante(v: ProductoVariante) {
    const precio = precioSegunTipo(v, "minorista");
    setItems((prev) => [
      ...prev,
      {
        variante_id: v.id,
        cantidad: 1,
        precio_unitario: precio,
        costo_unitario: v.producto?.costo ?? 0,
        descuento_porcentaje: 0,
        subtotal: precio,
        nombre: v.producto?.nombre ?? "—",
        color: v.color,
      },
    ]);
    setProductoQuery("");
    setProductoResultados([]);
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  async function guardarCambios() {
    setGuardando(true);

    await supabase.from("documento_items").delete().eq("documento_id", documento.id);

    const payload = items.map((i) => ({
      documento_id: documento.id,
      variante_id: i.variante_id,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      costo_unitario: i.costo_unitario,
      descuento_porcentaje: i.descuento_porcentaje,
      subtotal: i.subtotal,
    }));
    await supabase.from("documento_items").insert(payload);

    await supabase
      .from("documentos")
      .update({ subtotal: total, total, forma_pago: formaPago || null, observaciones: observaciones || null })
      .eq("id", documento.id);

    setGuardando(false);
    setEditando(false);
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      {/* Encabezado con acciones (no se imprime) */}
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <Link href={RUTA_LISTADO[documento.tipo]} className="text-xs text-neutral-400 hover:underline">
            ← Volver
          </Link>

          <h1 className="text-2xl font-semibold">
            {ETIQUETAS[documento.tipo]} #{documento.numero}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {puedeEditar && !editando && (
            <button onClick={() => setEditando(true)} className="btn-secondary">
              Editar
            </button>
          )}
          {editando && (
            <button onClick={guardarCambios} disabled={guardando} className="btn-primary">
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          )}
          <button onClick={() => window.print()} className="btn-secondary">
            🖨️ Imprimir
          </button>
                    <DocumentoAcciones documentoId={documento.id} tipo={documento.tipo} estado={documento.estado} clienteId={documento.cliente_id} />
        </div>
      </div>

      {/* ---------- Documento (se ve en pantalla Y se imprime) ---------- */}
      <div className="card">
        <div className="mb-6 flex items-start justify-between border-b border-neutral-100 pb-4">
          <div>
            <p className="text-xl font-bold text-violet-700">WIZER BIKES</p>
            <p className="text-sm text-neutral-500">
              {ETIQUETAS[documento.tipo]} N° {documento.numero}
            </p>
          </div>
          <div className="text-right text-sm text-neutral-500">
            <p>{documento.fecha}</p>
            <p className="font-medium text-neutral-700">{documento.estado}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-400">Cliente</p>
            <p className="font-medium">{documento.clientes?.nombre ?? "—"}</p>
            {documento.clientes?.whatsapp && <p className="text-neutral-500">{documento.clientes.whatsapp}</p>}
          </div>
          <div className="text-right">
            <p className="text-neutral-400">Forma de pago</p>
            {editando ? (
              <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                <option value="">Seleccionar...</option>
                {FORMAS_PAGO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-medium">{documento.forma_pago ?? "—"}</p>
            )}
          </div>
        </div>

        {/* Buscador de productos, solo en modo edición */}
        {editando && (
          <div className="no-print relative mb-4">
            <input
              className="input"
              placeholder="Agregar producto..."
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
                                        <span className="font-medium">${formatearMoneda(v.producto?.precio_minorista ?? 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <table className="mb-4 w-full text-sm">
          <thead className="border-b border-neutral-100 text-left text-neutral-500">
            <tr>
              <th className="py-2">Producto</th>
              <th className="w-20 py-2">Cant.</th>
              <th className="w-28 py-2">Precio</th>
              <th className="w-20 py-2">Desc. %</th>
              <th className="w-28 py-2 text-right">Subtotal</th>
              {editando && <th className="no-print w-8 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id ?? `nuevo-${idx}`} className="border-b border-neutral-50">
                <td className="py-2 font-medium">
                  {item.nombre} {item.color && <span className="text-neutral-500">— {item.color}</span>}
                </td>
                <td className="py-2">
                  {editando ? (
                    <input
                      type="number"
                      className="input no-spinner py-1"
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(idx, "cantidad", Number(e.target.value))}
                    />
                  ) : (
                    item.cantidad
                  )}
                </td>
                <td className="py-2">
                  {editando ? (
                    <input
                      type="number"
                      step="0.01"
                      className="input no-spinner py-1"
                      value={item.precio_unitario}
                      onChange={(e) => actualizarItem(idx, "precio_unitario", Number(e.target.value))}
                    />
                  ) : (
                                        `$${formatearMoneda(item.precio_unitario)}`
                  )}
                </td>
                <td className="py-2">
                  {editando ? (
                    <input
                      type="number"
                      className="input no-spinner py-1"
                      value={item.descuento_porcentaje}
                      onChange={(e) => actualizarItem(idx, "descuento_porcentaje", Number(e.target.value))}
                    />
                  ) : (
                    `${item.descuento_porcentaje}%`
                  )}
                </td>
                                <td className="py-2 text-right font-medium">${formatearMoneda(item.subtotal)}</td>
                {editando && (
                  <td className="no-print py-2 text-center">
                    <button onClick={() => quitarItem(idx)} className="text-neutral-400 hover:text-red-600">
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-4 flex justify-end border-t border-neutral-100 pt-4">
          <div className="text-right">
            <p className="text-sm text-neutral-500">Total</p>
                        <p className="text-2xl font-semibold text-violet-700">${formatearMoneda(total)}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-neutral-400">Observaciones</p>
          {editando ? (
            <textarea
              className="input"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          ) : (
            <p className="text-sm">{documento.observaciones || "—"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
