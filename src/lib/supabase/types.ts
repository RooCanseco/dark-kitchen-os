export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      clientes: {
        Row: {
          acepta_menu_diario: boolean | null;
          created_at: string | null;
          id: string;
          nombre: string;
          sucursal_id: string | null;
          telefono: string;
        };
        Insert: {
          acepta_menu_diario?: boolean | null;
          created_at?: string | null;
          id?: string;
          nombre: string;
          sucursal_id?: string | null;
          telefono: string;
        };
        Update: {
          acepta_menu_diario?: boolean | null;
          created_at?: string | null;
          id?: string;
          nombre?: string;
          sucursal_id?: string | null;
          telefono?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clientes_sucursal_id_fkey";
            columns: ["sucursal_id"];
            isOneToOne: false;
            referencedRelation: "sucursales";
            referencedColumns: ["id"];
          },
        ];
      };
      direcciones: {
        Row: {
          alias: string;
          calle_y_numero: string;
          cliente_id: string | null;
          costo_envio_calculado: number;
          created_at: string | null;
          distancia_km: number | null;
          duracion_min: number | null;
          id: string;
          lat: number | null;
          lng: number | null;
          referencias: string | null;
          url_ubicacion: string | null;
        };
        Insert: {
          alias: string;
          calle_y_numero: string;
          cliente_id?: string | null;
          costo_envio_calculado?: number;
          created_at?: string | null;
          distancia_km?: number | null;
          duracion_min?: number | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          referencias?: string | null;
          url_ubicacion?: string | null;
        };
        Update: {
          alias?: string;
          calle_y_numero?: string;
          cliente_id?: string | null;
          costo_envio_calculado?: number;
          created_at?: string | null;
          distancia_km?: number | null;
          duracion_min?: number | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          referencias?: string | null;
          url_ubicacion?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_complementos: {
        Row: {
          id: string;
          menu_id: string | null;
          nombre: string;
          unidad: string | null;
          cantidad_individual: number;
          cantidad_doble: number;
          cantidad_familiar: number;
          orden: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          menu_id?: string | null;
          nombre: string;
          unidad?: string | null;
          cantidad_individual?: number;
          cantidad_doble?: number;
          cantidad_familiar?: number;
          orden?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          menu_id?: string | null;
          nombre?: string;
          unidad?: string | null;
          cantidad_individual?: number;
          cantidad_doble?: number;
          cantidad_familiar?: number;
          orden?: number;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "menu_complementos_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_tags_excepcion: {
        Row: {
          activo: boolean | null;
          created_at: string | null;
          etiqueta: string;
          id: string;
          sucursal_id: string | null;
        };
        Insert: {
          activo?: boolean | null;
          created_at?: string | null;
          etiqueta: string;
          id?: string;
          sucursal_id?: string | null;
        };
        Update: {
          activo?: boolean | null;
          created_at?: string | null;
          etiqueta?: string;
          id?: string;
          sucursal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "menu_tags_excepcion_sucursal_id_fkey";
            columns: ["sucursal_id"];
            isOneToOne: false;
            referencedRelation: "sucursales";
            referencedColumns: ["id"];
          },
        ];
      };
      menus: {
        Row: {
          activo: boolean | null;
          created_at: string | null;
          descripcion: string | null;
          fecha: string;
          id: string;
          imagen_url: string | null;
          nombre: string;
          precio_doble: number;
          precio_familiar: number;
          precio_individual: number;
          piezas_individual: number;
          piezas_doble: number;
          piezas_familiar: number;
          sucursal_id: string | null;
        };
        Insert: {
          activo?: boolean | null;
          created_at?: string | null;
          descripcion?: string | null;
          fecha: string;
          id?: string;
          imagen_url?: string | null;
          nombre: string;
          precio_doble?: number;
          precio_familiar?: number;
          precio_individual?: number;
          piezas_individual?: number;
          piezas_doble?: number;
          piezas_familiar?: number;
          sucursal_id?: string | null;
        };
        Update: {
          activo?: boolean | null;
          created_at?: string | null;
          descripcion?: string | null;
          fecha?: string;
          id?: string;
          imagen_url?: string | null;
          nombre?: string;
          precio_doble?: number;
          precio_familiar?: number;
          precio_individual?: number;
          piezas_individual?: number;
          piezas_doble?: number;
          piezas_familiar?: number;
          sucursal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "menus_sucursal_id_fkey";
            columns: ["sucursal_id"];
            isOneToOne: false;
            referencedRelation: "sucursales";
            referencedColumns: ["id"];
          },
        ];
      };
      pedido_item_modificadores: {
        Row: {
          cantidad: number;
          id: string;
          pedido_item_id: string | null;
          tag_excepcion_id: string | null;
        };
        Insert: {
          cantidad: number;
          id?: string;
          pedido_item_id?: string | null;
          tag_excepcion_id?: string | null;
        };
        Update: {
          cantidad?: number;
          id?: string;
          pedido_item_id?: string | null;
          tag_excepcion_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pedido_item_modificadores_pedido_item_id_fkey";
            columns: ["pedido_item_id"];
            isOneToOne: false;
            referencedRelation: "pedido_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedido_item_modificadores_tag_excepcion_id_fkey";
            columns: ["tag_excepcion_id"];
            isOneToOne: false;
            referencedRelation: "menu_tags_excepcion";
            referencedColumns: ["id"];
          },
        ];
      };
      pedido_items: {
        Row: {
          cantidad: number;
          id: string;
          paquete_tipo: string;
          pedido_id: string | null;
          piezas_por_paquete: number;
          precio_unitario: number;
        };
        Insert: {
          cantidad: number;
          id?: string;
          paquete_tipo: string;
          pedido_id?: string | null;
          piezas_por_paquete: number;
          precio_unitario: number;
        };
        Update: {
          cantidad?: number;
          id?: string;
          paquete_tipo?: string;
          pedido_id?: string | null;
          piezas_por_paquete?: number;
          precio_unitario?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          },
        ];
      };
      pedidos: {
        Row: {
          cliente_id: string | null;
          created_at: string | null;
          direccion_id: string | null;
          entregado_at: string | null;
          estado_operativo: string;
          estado_pago: string;
          id: string;
          menu_id: string | null;
          metodo_pago: string | null;
          observaciones_texto: string | null;
          orden_ruta: number | null;
          repartidor_id: string | null;
          sucursal_id: string | null;
          tipo_entrega: string;
          total_envio: number;
          total_gran_total: number;
          total_platillos: number;
        };
        Insert: {
          cliente_id?: string | null;
          created_at?: string | null;
          direccion_id?: string | null;
          entregado_at?: string | null;
          estado_operativo?: string;
          estado_pago?: string;
          id?: string;
          menu_id?: string | null;
          metodo_pago?: string | null;
          observaciones_texto?: string | null;
          orden_ruta?: number | null;
          repartidor_id?: string | null;
          sucursal_id?: string | null;
          tipo_entrega?: string;
          total_envio?: number;
          total_gran_total?: number;
          total_platillos?: number;
        };
        Update: {
          cliente_id?: string | null;
          created_at?: string | null;
          direccion_id?: string | null;
          entregado_at?: string | null;
          estado_operativo?: string;
          estado_pago?: string;
          id?: string;
          menu_id?: string | null;
          metodo_pago?: string | null;
          observaciones_texto?: string | null;
          orden_ruta?: number | null;
          repartidor_id?: string | null;
          sucursal_id?: string | null;
          tipo_entrega?: string;
          total_envio?: number;
          total_gran_total?: number;
          total_platillos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_direccion_id_fkey";
            columns: ["direccion_id"];
            isOneToOne: false;
            referencedRelation: "direcciones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_menu_id_fkey";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "menus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedidos_sucursal_id_fkey";
            columns: ["sucursal_id"];
            isOneToOne: false;
            referencedRelation: "sucursales";
            referencedColumns: ["id"];
          },
        ];
      };
      sucursales: {
        Row: {
          activo: boolean | null;
          ciudad: string | null;
          created_at: string | null;
          direccion: string | null;
          id: string;
          lat: number | null;
          lng: number | null;
          nombre: string;
        };
        Insert: {
          activo?: boolean | null;
          ciudad?: string | null;
          created_at?: string | null;
          direccion?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          nombre: string;
        };
        Update: {
          activo?: boolean | null;
          ciudad?: string | null;
          created_at?: string | null;
          direccion?: string | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          nombre?: string;
        };
        Relationships: [];
      };
      tarifas_envio: {
        Row: {
          costo: number;
          created_at: string | null;
          es_cotizacion: boolean | null;
          id: string;
          km_max: number | null;
          km_min: number;
          nombre: string | null;
          sucursal_id: string | null;
        };
        Insert: {
          costo: number;
          created_at?: string | null;
          es_cotizacion?: boolean | null;
          id?: string;
          km_max?: number | null;
          km_min: number;
          nombre?: string | null;
          sucursal_id?: string | null;
        };
        Update: {
          costo?: number;
          created_at?: string | null;
          es_cotizacion?: boolean | null;
          id?: string;
          km_max?: number | null;
          km_min?: number;
          nombre?: string | null;
          sucursal_id?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          activo: boolean | null;
          created_at: string | null;
          nombre: string;
          rol: string;
          sucursal_id: string | null;
          user_id: string;
        };
        Insert: {
          activo?: boolean | null;
          created_at?: string | null;
          nombre: string;
          rol: string;
          sucursal_id?: string | null;
          user_id: string;
        };
        Update: {
          activo?: boolean | null;
          created_at?: string | null;
          nombre?: string;
          rol?: string;
          sucursal_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      vista_cocina_produccion: {
        Row: {
          excepcion: string | null;
          fecha: string | null;
          menu_id: string | null;
          menu_nombre: string | null;
          sucursal_id: string | null;
          tag_excepcion_id: string | null;
          total_con_excepcion: number | null;
          total_piezas: number | null;
        };
        Relationships: [];
      };
      vista_cocina_complementos: {
        Row: {
          menu_id: string | null;
          sucursal_id: string | null;
          fecha: string | null;
          complemento_id: string | null;
          complemento: string | null;
          unidad: string | null;
          orden: number | null;
          total_cantidad: number | null;
          total_paquetes: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_rol: { Args: Record<string, never>; Returns: string };
      current_user_sucursal: { Args: Record<string, never>; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// === Tipos de dominio (manuales, para narrar mejor en la UI) ===

export type Rol = "admin" | "cocina" | "repartidor";
export type EstadoOperativo =
  | "nuevo"
  | "preparando"
  | "listo"
  | "en_ruta"
  | "entregado"
  | "cancelado";
export type EstadoPago = "pendiente" | "pagado";
export type MetodoPago = "efectivo" | "transferencia";
export type PaqueteTipo = "individual" | "doble" | "familiar";
export type TipoEntrega = "entrega" | "pickup";

export type Sucursal = Database["public"]["Tables"]["sucursales"]["Row"];
export type TarifaEnvio = Database["public"]["Tables"]["tarifas_envio"]["Row"];
export type TagExcepcion = Database["public"]["Tables"]["menu_tags_excepcion"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Direccion = Database["public"]["Tables"]["direcciones"]["Row"];
export type Menu = Database["public"]["Tables"]["menus"]["Row"];
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];
export type PedidoItem = Database["public"]["Tables"]["pedido_items"]["Row"];
export type PedidoItemModificador = Database["public"]["Tables"]["pedido_item_modificadores"]["Row"];
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type VistaCocinaProduccion = Database["public"]["Views"]["vista_cocina_produccion"]["Row"];
export type VistaCocinaComplementos = Database["public"]["Views"]["vista_cocina_complementos"]["Row"];
export type MenuComplemento = Database["public"]["Tables"]["menu_complementos"]["Row"];
