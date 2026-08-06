"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatearMoneda } from "@/lib/format";
import ReportesCharts from "@/components/ReportesCharts";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function hace6MesesISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function ReportesPanel() {
  const supabase = createClient();

  const [desde, setDesde] = useState(hace6MesesISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [cargando, setCargando] = useState(true);

  const [ventasTotal, setVentasTotal] = useState(0);
  const [margenTotal, setMargenTotal] = useState(0);
  const [unidadesVendidas, setUnidadesVendidas] = useState(0);
  const [valorStock, setValorStock] = useState(0);
  const [ventasPorMes, setVentasPorMes] = useState<{ mes: string; ventas: number; margen: number }[]>([]);
  const [topProductos, setTopProductos] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [stockPorArticulo, setStockPorArticulo] = useState<
    { nombre: string; color: string | null; stock: number; costoUnitarioArs: number; valorTotal: number }[]
  >([]);
  const [sinVentas, setSinVentas] = useState<string[]>([]);

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    const { data: itemsVenta } = await supabase
      .from("documento_items")
      .select(
        "cantidad, subtotal, costo_unitario, documentos!inner(tipo, fecha), producto_variantes(color, productos(nombre))"
      )
      .eq("documentos.tipo", "venta")
      .gte("documentos.fecha", desde)
      .lte("documentos.fecha", hasta);

    const { data: tipoCambioData } = await supabase.from("tipo_cambio").select("valor").limit(1).single();
    const tipoCambio = Number(tipoCambioData?.valor) || 1;

    const { data: stockResumen } = await supabase
      .from("variante_resumen")
      .select("producto_id, color, stock_total")
      .eq("activo", true)
      .gt("stock_total", 0);

    const idsProductos = [...new Set((stockResumen ?? []).map((v: any) => v.producto_id))];
    const { data: productosData } =
      idsProductos.length > 0
        ? await supabase.from("productos").select("id, nombre, costo, moneda_costo").in("id", idsProductos)
        : { data: [] };
    const productoPorId: Record<string, any> = {};
    for (const p of productosData ?? []) productoPorId[p.id] = p;

    const mesesMap: Record<string, { ventas: number; margen: number; orden: string }> = {};
    const productoTotales: Record<string, number> = {};
    const productosVendidosSet = new Set<string>();

    let vTotal = 0;
    let mTotal = 0;
    let unidades = 0;

    for (const item of (itemsVenta ?? []) as any[]) {
      const fecha = new Date(item.documentos.fecha);
      const orden = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      const key = fecha.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
      const subtotal = Number(item.subtotal);
      const margen = subtotal - Number(item.cantidad) * Number(item.costo_unitario);

      if (!mesesMap[key]) mesesMap[key] = { ventas: 0, margen: 0, orden };
      mesesMap[key].ventas += subtotal;
      mesesMap[key].margen += margen;

      vTotal += subtotal;
      mTotal += margen;
      unidades += Number(item.cantidad);

      const nombre = item.producto_variantes?.productos?.nombre ?? "—";
      productoTotales[nombre] = (productoTotales[nombre] ?? 0) + Number(item.cantidad);
      productosVendidosSet.add(nombre);
    }

    const ventasPorMesArr = Object.entries(mesesMap)
      .sort((a, b) => a[1].orden.localeCompare(b[1].orden))
      .map(([mes, v]) => ({ mes, ventas: v.ventas, margen: v.margen }));

    const topArr = Object.entries(productoTotales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    let valorTotalStock = 0;
    const filasStock = (stockResumen ?? [])
      .map((v: any) => {
        const p = productoPorId[v.producto_id];
        if (!p) return null;
        const costoArs = p.moneda_costo === "USD" ? Number(p.costo) * tipoCambio : Number(p.costo);
        const valorTotal = Number(v.stock_total) * costoArs;
        valorTotalStock += valorTotal;
        return { nombre: p.nombre, color: v.color, stock: Number(v.stock_total), costoUnitarioArs: costoArs, valorTotal };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.valorTotal - a.valorTotal) as any[];

    const nombresConStock = new Set((productosData ?? []).map((p) => p.nombre));
    const sinVentasArr = [...nombresConStock].filter((n) => !productosVendidosSet.has(n)).slice(0, 10);

    setVentasTotal(vTotal);
    setMargenTotal(mTotal);
    setUnidadesVendidas(unidades);
    setValorStock(valorTotalStock);
    setVentasPorMes(ventasPorMesArr);
    setTopProductos(topArr);
    setStockPorArticulo(filasStock);
    setSinVentas(sinVentasArr);
    setCargando(false);
  }, [desde, hasta]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="mb-3 text-sm font-medium text-neutral-500">Período</p>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="mb-1 block text-xs text-neutral-500">Desde</span>
            <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs text-neutral-500">Hasta</span>
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const h = hoyISO();
                setDesde(h);
                setHasta(h);
              }}
              className="btn-secondary"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(1);
                setDesde(d.toISOString().slice(0, 10));
                setHasta(hoyISO());
              }}
              className="btn-secondary"
            >
              Este mes
            </button>
            <button
              onClick={() => {
                setDesde(hace6MesesISO());
                setHasta(hoyISO());
              }}
              className="btn-secondary"
            >
              Últimos 6 meses
            </button>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-neutral-400">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card">
              <p className="text-sm text-neutral-500">Ventas</p>
              <p className="text-xl font-semibold text-violet-700">${formatearMoneda(ventasTotal)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-neutral-500">Margen</p>
              <p className="text-xl font-semibold text-green-600">${formatearMoneda(margenTotal)}</p>
            </div>
            <div className="card">
              <p className="text-sm text-neutral-500">Unidades vendidas</p>
              <p className="text-xl font-semibold text-neutral-700">{unidadesVendidas}</p>
            </div>
            <div className="card">
              <p className="text-sm text-neutral-500">Valor de stock (a costo)</p>
              <p className="text-xl font-semibold text-neutral-700">${formatearMoneda(valorStock)}</p>
            </div>
          </div>

          <ReportesCharts
            ventasPorMes={ventasPorMes}
            topProductos={topProductos}
            ventasTotal={ventasTotal}
            margenTotal={margenTotal}
            valorStock={valorStock}
          />

          <div className="card">
            <p className="mb-4 text-sm font-medium text-neutral-500">Stock valorizado por artículo</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b border-neutral-100 text-left text-neutral-500">
                  <tr>
                    <th className="py-2">Producto</th>
                    <th className="py-2 text-right">Stock</th>
                    <th className="py-2 text-right">Costo unit.</th>
                    <th className="py-2 text-right">Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {stockPorArticulo.slice(0, 20).map((f, i) => (
                    <tr key={i} className="border-b border-neutral-50">
                      <td className="py-2 font-medium">
                        {f.nombre} {f.color && <span className="text-neutral-500">— {f.color}</span>}
                      </td>
                      <td className="py-2 text-right">{f.stock}</td>
                      <td className="py-2 text-right">${formatearMoneda(f.costoUnitarioArs)}</td>
                      <td className="py-2 text-right font-medium">${formatearMoneda(f.valorTotal)}</td>
                    </tr>
                  ))}
                  {stockPorArticulo.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-400">
                        No hay stock cargado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {stockPorArticulo.length > 20 && (
              <p className="mt-2 text-xs text-neutral-400">Mostrando los 20 de mayor valor, de {stockPorArticulo.length} en total.</p>
            )}
          </div>

          {sinVentas.length > 0 && (
            <div className="card">
              <p className="mb-2 text-sm font-medium text-neutral-500">Con stock pero sin ventas en este período</p>
              <p className="mb-3 text-xs text-neutral-400">
                Candidatos a revisar: bajar precio, promocionar, o dejar de reponer.
              </p>
              <div className="flex flex-wrap gap-2">
                {sinVentas.map((n) => (
                  <span key={n} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
