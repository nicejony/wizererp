import { createClient } from "@/lib/supabase/server";
import ConfiguracionPanel from "@/components/ConfiguracionPanel";
import BackupManager from "@/components/BackupManager";
import TipoCambioManager from "@/components/TipoCambioManager";
import ManualPDF from "@/components/ManualPDF";
import { Settings } from "lucide-react";

export default async function ConfiguracionPage() {
  const supabase = createClient();

  const [{ data: usuarios }, { data: categorias }, { data: marcas }, { data: tipoCambio }] = await Promise.all([
    supabase.from("perfiles").select("*").order("created_at"),
    supabase.from("categorias").select("*").order("nombre"),
    supabase.from("marcas").select("*").order("nombre"),
    supabase.from("tipo_cambio").select("*").limit(1).single(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <TipoCambioManager tipoCambio={tipoCambio} />
      <ConfiguracionPanel
        usuariosIniciales={usuarios ?? []}
        categoriasIniciales={categorias ?? []}
        marcasIniciales={marcas ?? []}
      />
      <BackupManager />
      <ManualPDF />
    </div>
  );
}

