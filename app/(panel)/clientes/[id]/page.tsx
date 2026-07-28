import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClienteEditor from "@/components/ClienteEditor";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", params.id).single();
  if (!cliente) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Editar cliente</h1>
      <ClienteEditor cliente={cliente} />
    </div>
  );
}
