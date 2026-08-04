import { createClient } from "@/lib/supabase/server";
import ReportesCharts from "@/components/ReportesCharts";

export default async function ReportesPage() {
  const supabase = createClient();

  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

  const [{ data: itemsVenta }, { data: stockResumen }] = await Promise.all([
    supabase
      .from("documento_items")
      .select("cantidad, subtotal, costo_unitario, documentos!inner(tipo, fecha), producto_variantes(color, productos(nombre))")
      .eq("documentos.tipo", "venta")
      .gte("documentos.fecha", desde.toISOString().slice(0, 10)),
    supabase.from("variante_resumen").select("producto_id, stock_total").eq("activo", true),
  ]);

  // Ventas y margen por mes (últimos 6 meses)
  const mesesMap: Record<string, { ventas: number; margen: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    mesesMap[key] = { ventas: 0, margen: 0 };
  }

  // Top productos vendidos (por cantidad)
  const productoTotales: Record<string, number> = {};

  let margenTotal = 0;
  let ventasTotal = 0;

  for (const item of (itemsVenta ?? []) as any[]) {
    const fecha = new Date(item.documentos.fecha);
    const key = fecha.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
    const subtotal = Number(item.subtotal);
    const margen = subtotal - Number(item.cantidad) * Number(item.costo_unitario);

    if (mesesMap[key]) {
      mesesMap[key].ventas += subtotal;
      mesesMap[key].margen += margen;
    }
    ventasTotal += subtotal;
    margenTotal += margen;

    const nombre = item.producto_variantes?.productos?.nombre ?? "—";
    productoTotales[nombre] = (productoTotales[nombre] ?? 0) + Number(item.cantidad);
  }

  const ventasPorMes = Object.entries(mesesMap).map(([mes, v]) => ({ mes, ...v }));

  const topProductos = Object.entries(productoTotales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    // Valor de stock total (a costo, convirtiendo a pesos lo que está en USD)
  const { data: tipoCambioData } = await supabase.from("tipo_cambio").select("valor").limit(1).single();
  const tipoCambio = Number(tipoCambioData?.valor) || 1;

  const idsProductos = [...new Set((stockResumen ?? []).map((v: any) => v.producto_id))];
  const { data: productosCosto } =
    idsProductos.length > 0
      ? await supabase.from("productos").select("id, costo, moneda_costo").in("id", idsProductos)
      : { data: [] };
  const costoPorProducto: Record<string, number> = {};
  for (const p of productosCosto ?? []) {
    costoPorProducto[p.id] = p.moneda_costo === "USD" ? Number(p.costo) * tipoCambio : Number(p.costo);
  }

  const valorStock = (stockResumen ?? []).reduce(
    (s: number, v: any) => s + Number(v.stock_total) * (costoPorProducto[v.producto_id] ?? 0),
    0
  );
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Reportes</h1>
      <ReportesCharts
        ventasPorMes={ventasPorMes}
        topProductos={topProductos}
        ventasTotal={ventasTotal}
        margenTotal={margenTotal}
        valorStock={valorStock}
      />
    </div>
  );
}
