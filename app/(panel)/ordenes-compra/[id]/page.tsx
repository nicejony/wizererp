import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import OrdenCompraEditor from "@/components/OrdenCompraEditor";

export default async function OrdenCompraPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: orden } = await supabase.from("ordenes_compra").select("*").eq("id", params.id).single();
  if (!orden) notFound();

  const { data: items } = await supabase
    .from("ordenes_compra_items")
    .select("id, variante_id, cantidad, producto_variantes(color, productos(nombre, codigo))")
    .eq("orden_id", params.id)
    .order("posicion");

  return <OrdenCompraEditor orden={orden} itemsIniciales={items ?? []} />;
}
