import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EtiquetaExpreso from "@/components/EtiquetaExpreso";

export default async function EtiquetaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", params.id).single();
  if (!cliente) notFound();

  return <EtiquetaExpreso cliente={cliente} />;
}
