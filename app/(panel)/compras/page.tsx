import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatearMoneda } from "@/lib/format";
import { ShoppingBag } from "lucide-react";

export default async function ComprasPage() {
  const supabase = createClient();
  const { data: compras } = await supabase
    .from("compras")
    .select("*, proveedores(nombre)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShoppingBag className="text-violet-600" size={22} /> Compras
        </h1>
        <Link href="/compras/nuevo" className="btn-primary">
          + Nueva compra
        </Link>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {compras?.map((c: any) => (
              <tr key={c.id} className="border-b border-neutral-50 hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-mono text-xs">#{c.numero}</td>
                <td className="px-4 py-3">{c.fecha}</td>
                <td className="px-4 py-3 font-medium">{c.proveedores?.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-right">${formatearMoneda(c.total)}</td>
              </tr>
            ))}
            {(!compras || compras.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No hay compras cargadas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

