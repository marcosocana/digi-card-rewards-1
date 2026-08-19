export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      locations: {
        Row: {
          address_line: string | null
          archived_at: string | null
          branding_override: Json
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          opening_hours: string | null
          organization_id: string
          postal_code: string | null
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          archived_at?: string | null
          branding_override?: Json
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          opening_hours?: string | null
          organization_id: string
          postal_code?: string | null
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          archived_at?: string | null
          branding_override?: Json
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          opening_hours?: string | null
          organization_id?: string
          postal_code?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          background_color: string
          border_style: string
          compact_logo_url: string | null
          cover_url: string | null
          created_at: string
          font_family: string
          instagram: string | null
          logo_url: string | null
          organization_id: string
          primary_color: string
          program_description: string | null
          secondary_color: string
          text_color: string
          updated_at: string
          website: string | null
          welcome_message: string | null
        }
        Insert: {
          background_color?: string
          border_style?: string
          compact_logo_url?: string | null
          cover_url?: string | null
          created_at?: string
          font_family?: string
          instagram?: string | null
          logo_url?: string | null
          organization_id: string
          primary_color?: string
          program_description?: string | null
          secondary_color?: string
          text_color?: string
          updated_at?: string
          website?: string | null
          welcome_message?: string | null
        }
        Update: {
          background_color?: string
          border_style?: string
          compact_logo_url?: string | null
          cover_url?: string | null
          created_at?: string
          font_family?: string
          instagram?: string | null
          logo_url?: string | null
          organization_id?: string
          primary_color?: string
          program_description?: string | null
          secondary_color?: string
          text_color?: string
          updated_at?: string
          website?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          can_adjust_points: boolean
          created_at: string
          full_name: string | null
          id: string
          invited_email: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          can_adjust_points?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          invited_email?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          can_adjust_points?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          invited_email?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          display_name: string
          id: string
          legal_name: string | null
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name: string
          id?: string
          legal_name?: string | null
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          display_name?: string
          id?: string
          legal_name?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          platform_role: Database["public"]["Enums"]["platform_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_location_assignments: {
        Row: {
          created_at: string
          id: string
          location_id: string
          organization_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          organization_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          organization_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_assignments_organization_user_id_fkey"
            columns: ["organization_user_id"]
            isOneToOne: false
            referencedRelation: "organization_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_location: {
        Args: { _loc: string; _uid?: string }
        Returns: boolean
      }
      is_org_admin: { Args: { _org: string; _uid?: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _uid?: string }; Returns: boolean }
      is_superadmin: { Args: { _uid?: string }; Returns: boolean }
      my_org_ids: { Args: { _uid?: string }; Returns: string[] }
      org_role_of: {
        Args: { _org: string; _uid?: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
    }
    Enums: {
      earning_mode: "points_per_currency_unit" | "currency_units_per_point"
      entity_status:
        | "draft"
        | "configuration_pending"
        | "ready"
        | "active"
        | "paused"
        | "suspended"
        | "archived"
      membership_status: "active" | "suspended" | "archived"
      org_role: "admin" | "manager" | "staff"
      pass_status:
        | "pending_generation"
        | "active"
        | "update_pending"
        | "error"
        | "revoked"
      platform_role: "superadmin" | "user"
      program_status: "draft" | "active" | "paused" | "archived"
      rounding_mode: "floor" | "nearest" | "decimal"
      txn_type:
        | "purchase"
        | "redemption"
        | "manual_adjustment"
        | "reversal"
        | "initial_bonus"
        | "expiry"
      wallet_provider: "apple" | "google"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      earning_mode: ["points_per_currency_unit", "currency_units_per_point"],
      entity_status: [
        "draft",
        "configuration_pending",
        "ready",
        "active",
        "paused",
        "suspended",
        "archived",
      ],
      membership_status: ["active", "suspended", "archived"],
      org_role: ["admin", "manager", "staff"],
      pass_status: [
        "pending_generation",
        "active",
        "update_pending",
        "error",
        "revoked",
      ],
      platform_role: ["superadmin", "user"],
      program_status: ["draft", "active", "paused", "archived"],
      rounding_mode: ["floor", "nearest", "decimal"],
      txn_type: [
        "purchase",
        "redemption",
        "manual_adjustment",
        "reversal",
        "initial_bonus",
        "expiry",
      ],
      wallet_provider: ["apple", "google"],
    },
  },
} as const
