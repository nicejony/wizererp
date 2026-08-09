import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatearMoneda } from "@/lib/format";
import EmbarquesWidget from "@/components/EmbarquesWidget";
import TopVendidosWidget from "@/components/TopVendidosWidget";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const hace90Dias = new Date();
  hace90Dias.setDate(hace90Dias.getDate() - 90);

  const [
    { data: ventasHoy },
    { data: ventasMes },
    { data: stockResumen },
    { data: pendientes },
    { data: embarques },
    { data: itemsVenta },
    { data: movimientosCuenta },
    { data: clientes },
  ] = await Promise.all([
    supabase.from("documentos").select("total").eq("tipo", "venta").eq("fecha", hoy),
    supabase.from("documentos").select("total").eq("tipo", "venta").gte("fecha", inicioMes.toISOString().slice(0, 10)),
    supabase.from("variante_resumen").select("*").eq("activo", true),
    supabase.from("documentos").select("id").eq("tipo", "presupuesto").eq("estado", "confirmado"),
    supabase.from("embarques").select("*").eq("activo", true).order("fecha"),
    supabase
      .from("documento_items")
      .select("cantidad, subtotal, documentos!inner(tipo, fecha), producto_variantes(productos(nombre))")
      .eq("documentos.tipo", "venta")
      .gte("documentos.fecha", hace90Dias.toISOString().slice(0, 10)),
    supabase.from("movimientos_cuenta").select("*").eq("entidad_tipo", "cliente"),
    supabase.from("clientes").select("id"),
  ]);

  const totalHoy = (ventasHoy ?? []).reduce((s, d) => s + Number(d.total), 0);
  const totalMes = (ventasMes ?? []).reduce((s, d) => s + Number(d.total), 0);

  const sinStock = (stockResumen ?? []).filter((v: any) => Number(v.stock_total) === 0);
  const bajoMinimo = (stockResumen ?? []).filter((v: any) => Number(v.stock_total) > 0 && Number(v.stock_total) <= Number(v.stock_minimo));

  const saldos: Record<string, number> = {};
  const cargoMasViejo: Record<string, string> = {};
  for (const m of movimientosCuenta ?? []) {
    const signo = m.tipo === "cargo" ? 1 : -1;
    saldos[m.entidad_id] = (saldos[m.entidad_id] ?? 0) + signo * Number(m.monto);
    if (m.tipo === "cargo" && (!cargoMasViejo[m.entidad_id] || m.fecha < cargoMasViejo[m.entidad_id])) {
      cargoMasViejo[m.entidad_id] = m.fecha;
    }
  }
  const hoyDate = new Date();
  const clientesDeudaVencida = (clientes ?? []).filter((c) => {
    const saldo = saldos[c.id] ?? 0;
    const fechaCargo = cargoMasViejo[c.id];
    const dias = fechaCargo ? Math.floor((hoyDate.getTime() - new Date(fechaCargo).getTime()) / 86400000) : 0;
    return saldo > 0 && dias > 30;
  });

  const idsConStock = [...new Set((stockResumen ?? []).filter((v: any) => Number(v.stock_total) > 0).map((v: any) => v.producto_id))];
  const ultimaVentaGlobal: Record<string, string> = {};
  const { data: itemsVentaTodos } = idsConStock.length
    ? await supabase
        .from("documento_items")
        .select("documentos!inner(tipo, fecha), producto_variantes(producto_id)")
        .eq("documentos.tipo", "venta")
    : { data: [] };
  for (const item of (itemsVentaTodos ?? []) as any[]) {
    const pid = item.producto_variantes?.producto_id;
    const fecha = item.documentos?.fecha;
    if (!pid || !fecha) continue;
    if (!ultimaVentaGlobal[pid] || fecha > ultimaVentaGlobal[pid]) ultimaVentaGlobal[pid] = fecha;
  }
  const productosSinRotacion = idsConStock.filter((pid) => {
    const ultima = ultimaVentaGlobal[pid];
    if (!ultima) return true;
    const dias = Math.floor((hoyDate.getTime() - new Date(ultima).getTime()) / 86400000);
    return dias > 30;
  });

  const topMap: Record<string, { cantidad: number; monto: number }> = {};
  for (const item of (itemsVenta ?? []) as any[]) {
    const nombre = item.producto_variantes?.productos?.nombre ?? "—";
    if (!topMap[nombre]) topMap[nombre] = { cantidad: 0, monto: 0 };
    topMap[nombre].cantidad += Number(item.cantidad);
    topMap[nombre].monto += Number(item.subtotal);
  }
  const topVendidosData = Object.entries(topMap).map(([nombre, v]) => ({ nombre, ...v }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:w-80">
        <div className="card py-3">
          <p className="text-xs text-neutral-500">Ventas hoy</p>
          <p className="mt-1 text-lg font-semibold">${formatearMoneda(totalHoy)}</p>
        </div>
        <div className="card py-3">
          <p className="text-xs text-neutral-500">Ventas del mes</p>
          <p className="mt-1 text-lg font-semibold">${formatearMoneda(totalMes)}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-neutral-500">Prioridades</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Link href="/presupuestos" className="card block hover:bg-neutral-50">
            <p className="text-xs text-neutral-500">Presupuestos pendientes</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-700">{pendientes?.length ?? 0}</p>
          </Link>
          <Link href="/stock" className="card block hover:bg-neutral-50">
            <p className="text-xs text-neutral-500">Sin stock</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{sinStock.length}</p>
          </Link>
          <Link href="/stock" className="card block hover:bg-neutral-50">
            <p className="text-xs text-neutral-500">Stock bajo mínimo</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{bajoMinimo.length}</p>
          </Link>
          <Link href="/clientes/deuda-vencida" className="card block hover:bg-neutral-50">
            <p className="text-xs text-neutral-500">Clientes deuda vencida</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{clientesDeudaVencida.length}</p>
          </Link>
          <Link href="/productos/sin-rotacion" className="card block hover:bg-neutral-50">
            <p className="text-xs text-neutral-500">Productos sin rotación</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">{productosSinRotacion.length}</p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EmbarquesWidget embarquesIniciales={embarques ?? []} />
        <TopVendidosWidget datos={topVendidosData} />
      </div>
    </div>
  );
}
