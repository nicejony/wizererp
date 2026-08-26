import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DepositosManager from "@/components/DepositosManager";
import BotonImprimir from "@/components/BotonImprimir";
import StockContador from "@/components/StockContador";
import { Boxes } from "lucide-react";

export default async function StockPage() {
  const supabase = createClient();

  const { data: depositos } = await supabase.from("depositos").select("*").eq("activo", true).order("tipo");

  const { data: variantes } = await supabase
    .from("producto_variantes")
    .select("*, productos(codigo, nombre)")
    .eq("activo", true)
    .order("producto_id");

  const varianteIds = (variantes ?? []).map((v) => v.id);
  const { data: stockRows } =
    varianteIds.length > 0
      ? await supabase.from("variante_stock").select("*").in("variante_id", varianteIds)
      : { data: [] };

  const mapa: Record<string, Record<string, number>> = {};
  for (const row of stockRows ?? []) {
    if (!mapa[row.variante_id]) mapa[row.variante_id] = {};
    mapa[row.variante_id][row.deposito_id] = row.stock;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Boxes className="text-violet-600" size={22} /> Stock
        </h1>
        <div className="flex gap-2">
          <BotonImprimir />
          <Link href="/stock/inventario" className="btn-secondary no-print">
            📋 Inventario
          </Link>
          <Link href="/stock/transferencia" className="btn-primary no-print">
            ⇄ Transferencia entre depósitos
          </Link>
        </div>
      </div>

      <div className="no-print">
        <DepositosManager depositos={depositos ?? []} />
      </div>

      <div className="no-print mb-6">
        <StockContador />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Color</th>
              {depositos?.map((d) => (
                <th key={d.id} className="px-4 py-3 text-right">
                  {d.nombre}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {variantes?.map((v: any) => {
              const stockPorDeposito = mapa[v.id] ?? {};
              const total = Object.values(stockPorDeposito).reduce((s: number, n: any) => s + Number(n), 0);
              return (
                <tr key={v.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                  <td className="px-4 py-3 font-mono text-xs">{v.productos?.codigo}</td>
                  <td className="px-4 py-3 font-medium">{v.productos?.nombre}</td>
                  <td className="px-4 py-3">{v.color ?? "—"}</td>
                  {depositos?.map((d) => (
                    <td key={d.id} className="px-4 py-3 text-right">
                      {stockPorDeposito[d.id] ?? 0}
                    </td>
                  ))}
                  <td className={`px-4 py-3 text-right font-semibold ${total <= v.stock_minimo ? "text-red-600" : ""}`}>
                    {total}
                  </td>
                </tr>
              );
            })}
            {(!variantes || variantes.length === 0) && (
              <tr>
                <td colSpan={4 + (depositos?.length ?? 0)} className="px-4 py-8 text-center text-neutral-400">
                  No hay productos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



