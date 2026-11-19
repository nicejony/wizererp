"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProductoVariante, TipoPrecio, FORMAS_PAGO } from "@/lib/types";
import DocumentoAcciones from "@/components/DocumentoAcciones";
import InputPrecio from "@/components/InputPrecio";
import { formatearMoneda } from "@/lib/format";
import { precioEnPesos } from "@/lib/precios";
import { construirPDFDocumento, guardarOCompartirPDF } from "@/lib/pdfDocumentos";

interface ItemRow {
  id?: string;
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  descuento_porcentaje: number;
  subtotal: number;
  nombre: string;
  codigo: string;
  color: string | null;
  tipoPrecio: TipoPrecio;
  sinPrecioUsd?: boolean;
  varianteInfo: any;
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

export default function DocumentoDetalle({ documento, itemsIniciales }: { documento: any; itemsIniciales: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  const puedeEditar = documento.tipo === "presupuesto" && documento.estado === "confirmado";
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formaPago, setFormaPago] = useState(documento.forma_pago ?? "");
  const [observaciones, setObservaciones] = useState(documento.observaciones ?? "");

  // Moneda con la que se creó este documento. La cotización guardada es solo interna (equivalente en pesos) y no se muestra.
  const monedaDoc: "ARS" | "USD" = documento.moneda === "USD" ? "USD" : "ARS";
  const tipoCambioDoc: number = Number(documento.tipo_cambio_aplicado) || 1;
  const simboloMoneda = monedaDoc === "USD" ? "U$D" : "$";

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
      codigo: i.producto_variantes?.productos?.codigo ?? "—",
      color: i.producto_variantes?.color ?? null,
      tipoPrecio: "manual" as TipoPrecio,
      varianteInfo: {
        id: i.variante_id,
        color: i.producto_variantes?.color ?? null,
        producto: i.producto_variantes?.productos ?? null,
      },
    }))
  );

  const [productoQuery, setProductoQuery] = useState("");
  const [productoResultados, setProductoResultados] = useState<ProductoVariante[]>([]);
  const [tipoCambioActual, setTipoCambioActual] = useState(tipoCambioDoc);

  useEffect(() => {
    supabase
      .from("tipo_cambio")
      .select("valor")
      .limit(1)
      .single()
      .then(({ data }) => setTipoCambioActual(Number(data?.valor) || 1));
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

  function aMonedaDoc(montoArs: number): number {
    return monedaDoc === "USD" ? montoArs / tipoCambioDoc : montoArs;
  }
  function aArs(montoEnMonedaDoc: number): number {
    return monedaDoc === "USD" ? montoEnMonedaDoc * tipoCambioDoc : montoEnMonedaDoc;
  }

  function recalc(item: ItemRow): ItemRow {
    const bruto = item.cantidad * item.precio_unitario;
    return { ...item, subtotal: bruto - (bruto * item.descuento_porcentaje) / 100 };
  }

  // Pone en un renglón el precio de la lista elegida. En dólares usa el precio en U$D del producto;
  // si no lo tiene cargado, queda en blanco para completarlo a mano.
  function aplicarLista(item: ItemRow, tipo: TipoPrecio): ItemRow {
    const producto = item.varianteInfo?.producto;
    if (!producto || tipo === "manual") return { ...item, tipoPrecio: tipo, sinPrecioUsd: false };
    const precio = precioEnPesos(producto, tipo, tipoCambioDoc, monedaDoc === "USD");
    if (precio === null) return recalc({ ...item, tipoPrecio: tipo, precio_unitario: 0, sinPrecioUsd: true });
    return recalc({ ...item, tipoPrecio: tipo, precio_unitario: precio, sinPrecioUsd: false });
  }

  function precioEnLista(v: any): number | null {
    return v.producto ? precioEnPesos(v.producto, "mayorista", tipoCambioDoc, monedaDoc === "USD") : null;
  }

  function actualizarItem(idx: number, campo: "cantidad" | "descuento_porcentaje", valor: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? recalc({ ...it, [campo]: valor }) : it)));
  }

  function actualizarPrecioManual(idx: number, valorEnMonedaDoc: number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? recalc({ ...it, precio_unitario: aArs(valorEnMonedaDoc) }) : it)));
  }

  function cambiarTipoPrecio(idx: number, tipo: TipoPrecio) {
    setItems((prev) => prev.map((item, i) => (i === idx ? aplicarLista(item, tipo) : item)));
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function agregarVariante(v: ProductoVariante) {
    const costoBase = v.producto?.costo ?? 0;
    const costoEnPesos = v.producto?.moneda_costo === "USD" ? costoBase * tipoCambioActual : costoBase;
    const nuevo: ItemRow = {
      variante_id: v.id,
      cantidad: 1,
      precio_unitario: 0,
      costo_unitario: costoEnPesos,
      descuento_porcentaje: 0,
      subtotal: 0,
      nombre: v.producto?.nombre ?? "—",
      codigo: v.producto?.codigo ?? "—",
      color: v.color,
      tipoPrecio: "mayorista",
      varianteInfo: v,
    };
    setItems((prev) => [...prev, aplicarLista(nuevo, "mayorista")]);
    setProductoQuery("");
    setProductoResultados([]);
  }

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  async function guardarCambios() {
    if (items.some((i) => i.precio_unitario === 0) && !confirm("Hay productos con precio 0. ¿Guardar igual?")) return;
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

  // Genera el documento en PDF y abre el menú de compartir (imprimir, WhatsApp, guardar...)
  async function compartirPDF() {
    const sim = monedaDoc === "USD" ? "U$D " : "$";
    const doc = construirPDFDocumento({
      titulo: `${ETIQUETAS[documento.tipo]} N° ${documento.numero}`,
      fecha: documento.fecha,
      cliente: documento.clientes?.nombre ?? "—",
      empresa: documento.clientes?.empresa ?? null,
      telefono: documento.clientes?.whatsapp ?? null,
      formaPago: documento.forma_pago ?? null,
      items: items.map((i) => ({
        codigo: i.codigo,
        nombre: i.nombre + (i.color ? ` — ${i.color}` : ""),
        cantidad: i.cantidad,
        precio: `${sim}${formatearMoneda(aMonedaDoc(i.precio_unitario))}`,
        descuento: i.descuento_porcentaje,
        subtotal: `${sim}${formatearMoneda(aMonedaDoc(i.subtotal))}`,
      })),
      total: `${sim}${formatearMoneda(aMonedaDoc(total))}`,
      observaciones: observaciones || null,
    });
    await guardarOCompartirPDF(doc, `${documento.tipo}-${documento.numero}.pdf`, `${ETIQUETAS[documento.tipo]} ${documento.numero}`);
  }

  return (
    <div className="max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <Link href={RUTA_LISTADO[documento.tipo]} className="text-xs text-neutral-400 hover:underline">
            ← Volver
          </Link>

          <h1 className="text-2xl font-semibold">
            {ETIQUETAS[documento.tipo]} #{documento.numero}
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
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
          <button onClick={compartirPDF} className="btn-secondary">
            📄 PDF
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
            🖨️ Imprimir
          </button>
          <DocumentoAcciones documentoId={documento.id} tipo={documento.tipo} estado={documento.estado} clienteId={documento.cliente_id} />
        </div>
      </div>

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
                {productoResultados.map((v) => {
                  const precioLista = precioEnLista(v);
                  return (
                    <button
                      key={v.id}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      onClick={() => agregarVariante(v)}
                    >
                      <span>
                        {v.producto?.nombre} {v.color && <span className="text-neutral-500">— {v.color}</span>}{" "}
                        <span className="text-neutral-400">({v.producto?.codigo})</span>
                      </span>
                      {precioLista === null ? (
                        <span className="text-xs text-amber-600">sin precio en U$D</span>
                      ) : (
                        <span className="font-medium">
                          {simboloMoneda}
                          {formatearMoneda(aMonedaDoc(precioLista))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="mb-4 w-full min-w-[600px] text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="py-2">Código</th>
                <th className="py-2">Producto</th>
                <th className="w-20 py-2">Cant.</th>
                {editando && <th className="no-print w-36 py-2">Lista de precio</th>}
                <th className="w-28 py-2">Precio ({simboloMoneda})</th>
                <th className="w-20 py-2">Desc. %</th>
                <th className="w-28 py-2 text-right">Subtotal</th>
                {editando && <th className="no-print w-8 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id ?? `nuevo-${idx}`} className="border-b border-neutral-50">
                  <td className="py-2 font-mono text-xs text-neutral-500">{item.codigo}</td>
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
                  {editando && (
                    <td className="no-print py-2">
                      <select
                        className="input py-1"
                        value={item.tipoPrecio}
                        onChange={(e) => cambiarTipoPrecio(idx, e.target.value as TipoPrecio)}
                        disabled={!item.varianteInfo?.producto}
                      >
                        <option value="mayorista">Mayorista</option>
                        <option value="minorista">Minorista</option>
                        <option value="promocion">Promoción</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                  )}
                  <td className="py-2">
                    {editando ? (
                      <>
                        <InputPrecio
                          valor={aMonedaDoc(item.precio_unitario)}
                          onCambio={(v) => actualizarPrecioManual(idx, v)}
                          deshabilitado={item.tipoPrecio !== "manual" && !item.sinPrecioUsd}
                          resaltar={!!item.sinPrecioUsd && item.precio_unitario === 0}
                        />
                        {item.sinPrecioUsd && item.precio_unitario === 0 && (
                          <p className="mt-1 text-[11px] text-amber-600">Sin precio en U$D: cargalo acá</p>
                        )}
                      </>
                    ) : (
                      `${simboloMoneda}${formatearMoneda(aMonedaDoc(item.precio_unitario))}`
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
                  <td className="py-2 text-right font-medium">
                    {simboloMoneda}
                    {formatearMoneda(aMonedaDoc(item.subtotal))}
                  </td>
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
        </div>

        <div className="mb-4 flex justify-end border-t border-neutral-100 pt-4">
          <div className="text-right">
            <p className="text-sm text-neutral-500">Total</p>
            <p className="text-2xl font-semibold text-violet-700">
              {simboloMoneda}
              {formatearMoneda(aMonedaDoc(total))}
            </p>
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
