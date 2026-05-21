"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, KeyRound, UserPlus } from "lucide-react";
import { crearUsuario, actualizarUsuario, eliminarUsuario } from "./actions";
import type { Rol, UserProfile } from "@/lib/supabase/types";

const ROL_LABEL: Record<Rol, string> = {
  admin: "Admin",
  cocina: "Cocina",
  repartidor: "Repartidor",
};

const ROL_VARIANT: Record<Rol, "default" | "secondary" | "warning"> = {
  admin: "default",
  cocina: "warning",
  repartidor: "secondary",
};

export function UsuariosClient({
  usuarios,
  emails,
  currentUserId,
}: {
  usuarios: UserProfile[];
  emails: Record<string, string>;
  currentUserId: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete(u: UserProfile) {
    if (u.user_id === currentUserId) {
      toast.error("No puedes eliminar tu propia cuenta");
      return;
    }
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción es permanente.`)) return;
    startTransition(async () => {
      try {
        await eliminarUsuario(u.user_id);
        toast.success("Usuario eliminado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function onToggleActivo(u: UserProfile) {
    startTransition(async () => {
      try {
        await actualizarUsuario({ user_id: u.user_id, activo: !u.activo });
        toast.success(u.activo ? "Usuario desactivado" : "Usuario activado");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Crea admin, cocina o repartidor con email + password.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--color-muted-foreground)]">
                    Sin usuarios.
                  </TableCell>
                </TableRow>
              )}
              {usuarios.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">
                    {u.nombre}
                    {u.user_id === currentUserId && (
                      <Badge variant="outline" className="ml-2">tú</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[var(--color-muted-foreground)]">
                    {emails[u.user_id] ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROL_VARIANT[u.rol as Rol]}>{ROL_LABEL[u.rol as Rol]}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.activo ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleActivo(u)}
                      disabled={pending || u.user_id === currentUserId}
                      title={u.activo ? "Desactivar" : "Activar"}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditing(u); setEditOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(u)}
                      disabled={pending || u.user_id === currentUserId}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CrearDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && (
        <EditarDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          usuario={editing}
          email={emails[editing.user_id] ?? "—"}
          esMismo={editing.user_id === currentUserId}
        />
      )}
    </div>
  );
}

function CrearDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    const password = fd.get("password") as string;
    if (password.length < 8) {
      toast.error("Password mínimo 8 caracteres");
      return;
    }
    startTransition(async () => {
      try {
        await crearUsuario({
          email,
          password,
          nombre: fd.get("nombre") as string,
          rol: fd.get("rol") as Rol,
        });
        toast.success("Usuario creado");
        setCreatedInfo({ email, password });
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  function handleClose() {
    setCreatedInfo(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setCreatedInfo(null); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{createdInfo ? "Usuario creado" : "Crear usuario"}</DialogTitle>
        </DialogHeader>
        {createdInfo ? (
          <div className="space-y-3">
            <p className="text-sm">Comparte estas credenciales con el usuario:</p>
            <div className="space-y-2 rounded-md border bg-[var(--color-muted)]/30 p-3 font-mono text-sm">
              <div><span className="text-[var(--color-muted-foreground)]">Email:</span> {createdInfo.email}</div>
              <div><span className="text-[var(--color-muted-foreground)]">Password:</span> {createdInfo.password}</div>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              ⚠️ Esta es la única vez que verás la contraseña. Cópiala ahora.
            </p>
            <DialogFooter>
              <Button onClick={handleClose}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="usuario@correo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (mín. 8 caracteres)</Label>
              <Input id="password" name="password" type="text" required minLength={8} />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Tip: usa algo memorable, el usuario podrá cambiarla luego.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select name="rol" defaultValue="repartidor">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (acceso total)</SelectItem>
                  <SelectItem value="cocina">Cocina (solo pantalla de producción)</SelectItem>
                  <SelectItem value="repartidor">Repartidor (solo pedidos asignados)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditarDialog({
  open,
  onOpenChange,
  usuario,
  email,
  esMismo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usuario: UserProfile;
  email: string;
  esMismo: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const new_password = fd.get("new_password") as string;
    startTransition(async () => {
      try {
        await actualizarUsuario({
          user_id: usuario.user_id,
          nombre: fd.get("nombre") as string,
          rol: esMismo ? undefined : (fd.get("rol") as Rol),
          new_password: new_password ? new_password : undefined,
        });
        toast.success("Usuario actualizado");
        onOpenChange(false);
      } catch (err) {
        toast.error((err as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {usuario.nombre}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email (no editable)</Label>
            <Input value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" defaultValue={usuario.nombre} required />
          </div>
          {!esMismo && (
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select name="rol" defaultValue={usuario.rol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="cocina">Cocina</SelectItem>
                  <SelectItem value="repartidor">Repartidor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new_password">Nueva contraseña (opcional)</Label>
            <Input id="new_password" name="new_password" type="text" placeholder="Dejar vacío para no cambiar" />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Mín. 8 caracteres. Cambia la contraseña del usuario.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
