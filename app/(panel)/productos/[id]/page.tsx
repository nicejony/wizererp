import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProductoEditor from "@/components/ProductoEditor";

export default async function EditarProductoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: producto }, { data: variantes }, { data: depositos }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", params.id).single(),
    supabase.from("producto_variantes").select("*").eq("producto_id", params.id).order("created_at"),
    supabase.from("depositos").select("*").eq("activo", true).order("tipo"),
  ]);

  if (!producto) notFound();

  const varianteIds = (variantes ?? []).map((v) => v.id);
  const { data: stockPorDeposito } =
    varianteIds.length > 0
      ? await supabase.from("variante_stock").select("*").in("variante_id", varianteIds)
      : { data: [] };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Editar producto</h1>
      <ProductoEditor
        producto={producto}
        variantesIniciales={variantes ?? []}
        depositos={depositos ?? []}
        stockPorDepositoInicial={stockPorDeposito ?? []}
      />
    </div>
  );
}
