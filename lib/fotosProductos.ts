import { createClient } from "@/lib/supabase/client";

export async function subirFotoProducto(productoId: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${productoId}/foto.${ext}`;

  const { error } = await supabase.storage.from("productos").upload(path, file, { upsert: true });
  if (error) {
    alert("Error al subir la foto: " + error.message);
    return null;
  }

  const { data } = supabase.storage.from("productos").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function borrarFotoProducto(fotoUrl: string) {
  const supabase = createClient();
  const partes = fotoUrl.split("/public/productos/");
  if (partes.length < 2) return;
  const path = partes[1].split("?")[0];
  await supabase.storage.from("productos").remove([path]);
}
