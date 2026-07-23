import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import DocumentoDetalle from "@/components/DocumentoDetalle";

export default async function DocumentoDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: documento }, { data: items }] = await Promise.all([
    supabase.from("documentos").select("*, clientes(*)").eq("id", params.id).single(),
    supabase
      .from("documento_items")
      .select("*, producto_variantes(*, productos(*))")
      .eq("documento_id", params.id),
  ]);

  if (!documento) notFound();

  return <DocumentoDetalle documento={documento} itemsIniciales={items ?? []} />;
}
