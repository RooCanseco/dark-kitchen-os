"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { Rol } from "@/lib/supabase/types";

export async function crearUsuario(input: {
  email: string;
  password: string;
  nombre: string;
  rol: Rol;
}) {
  const { profile } = await requireRole("admin");
  const admin = createAdminClient();

  // 1. Crear auth user con email confirmado
  const { data: created, error: e1 } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
  });
  if (e1) throw new Error(e1.message);
  if (!created.user) throw new Error("No se pudo crear usuario");

  // 2. Insertar perfil
  const supabase = await createClient();
  const { error: e2 } = await supabase.from("user_profiles").insert({
    user_id: created.user.id,
    sucursal_id: profile.sucursal_id,
    nombre: input.nombre,
    rol: input.rol,
    activo: true,
  });
  if (e2) {
    // Rollback: eliminar el auth user si no se pudo crear el perfil
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(`Error creando perfil: ${e2.message}`);
  }

  revalidatePath("/configuracion/usuarios");
  return { user_id: created.user.id };
}

export async function actualizarUsuario(input: {
  user_id: string;
  nombre?: string;
  rol?: Rol;
  activo?: boolean;
  new_password?: string;
}) {
  const { userId } = await requireRole("admin");
  const supabase = await createClient();

  // No permitir que el admin se desactive a sí mismo o cambie su propio rol
  if (input.user_id === userId && (input.activo === false || (input.rol && input.rol !== "admin"))) {
    throw new Error("No puedes desactivar tu propia cuenta ni cambiar tu rol");
  }

  // Actualizar perfil
  const updates: { nombre?: string; rol?: string; activo?: boolean } = {};
  if (input.nombre !== undefined) updates.nombre = input.nombre;
  if (input.rol !== undefined) updates.rol = input.rol;
  if (input.activo !== undefined) updates.activo = input.activo;
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", input.user_id);
    if (error) throw new Error(error.message);
  }

  // Cambiar password si se solicitó
  if (input.new_password) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(input.user_id, {
      password: input.new_password,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/configuracion/usuarios");
}

export async function eliminarUsuario(user_id: string) {
  const { userId } = await requireRole("admin");
  if (user_id === userId) throw new Error("No puedes eliminar tu propia cuenta");
  const admin = createAdminClient();
  // Cascade: al eliminar de auth.users se elimina user_profiles (FK ON DELETE CASCADE)
  const { error } = await admin.auth.admin.deleteUser(user_id);
  if (error) throw new Error(error.message);
  revalidatePath("/configuracion/usuarios");
}
