import { createClient } from "@/lib/supabase/server";
import ConfiguracionPanel from "@/components/ConfiguracionPanel";
import BackupManager from "@/components/BackupManager";

export default async function ConfiguracionPage() {
  const supabase = createClient();

  const [{ data: usuarios }, { data: categorias }, { data: marcas }] = await Promise.all([
    supabase.from("perfiles").select("*").order("created_at"),
    supabase.from("categorias").select("*").order("nombre"),
    supabase.from("marcas").select("*").order("nombre"),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <ConfiguracionPanel
        usuariosIniciales={usuarios ?? []}
        categoriasIniciales={categorias ?? []}
        marcasIniciales={marcas ?? []}
      />
      <BackupManager />
    </div>
  );
}
