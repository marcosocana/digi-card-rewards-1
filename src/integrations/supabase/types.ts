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
      acquisition_events: {
        Row: {
          anonymous_session_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          location_id: string | null
          organization_id: string
          source_id: string | null
        }
        Insert: {
          anonymous_session_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          location_id?: string | null
          organization_id: string
          source_id?: string | null
        }
        Update: {
          anonymous_session_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "acquisition_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      acquisition_sources: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          name: string
          organization_id: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          organization_id: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_sources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_label: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_consents: {
        Row: {
          captured_at: string
          consent_type: string
          customer_id: string
          granted: boolean
          id: string
          organization_id: string
          policy_version: string
          source: string | null
        }
        Insert: {
          captured_at?: string
          consent_type: string
          customer_id: string
          granted?: boolean
          id?: string
          organization_id: string
          policy_version?: string
          source?: string | null
        }
        Update: {
          captured_at?: string
          consent_type?: string
          customer_id?: string
          granted?: boolean
          id?: string
          organization_id?: string
          policy_version?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string | null
          normalized_email: string
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name?: string | null
          normalized_email: string
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string | null
          normalized_email?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      loyalty_programs: {
        Row: {
          allow_earning: boolean
          allow_redeeming: boolean
          archived_at: string | null
          created_at: string
          currency: string
          description: string | null
          earning_mode: Database["public"]["Enums"]["earning_mode"]
          earning_value: number
          ends_at: string | null
          id: string
          initial_points: number
          internal_name: string
          organization_id: string
          points_expiry_months: number | null
          public_name: string
          rounding_mode: Database["public"]["Enums"]["rounding_mode"]
          starts_at: string
          status: Database["public"]["Enums"]["program_status"]
          terms: string | null
          updated_at: string
        }
        Insert: {
          allow_earning?: boolean
          allow_redeeming?: boolean
          archived_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          earning_mode?: Database["public"]["Enums"]["earning_mode"]
          earning_value?: number
          ends_at?: string | null
          id?: string
          initial_points?: number
          internal_name: string
          organization_id: string
          points_expiry_months?: number | null
          public_name: string
          rounding_mode?: Database["public"]["Enums"]["rounding_mode"]
          starts_at?: string
          status?: Database["public"]["Enums"]["program_status"]
          terms?: string | null
          updated_at?: string
        }
        Update: {
          allow_earning?: boolean
          allow_redeeming?: boolean
          archived_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          earning_mode?: Database["public"]["Enums"]["earning_mode"]
          earning_value?: number
          ends_at?: string | null
          id?: string
          initial_points?: number
          internal_name?: string
          organization_id?: string
          points_expiry_months?: number | null
          public_name?: string
          rounding_mode?: Database["public"]["Enums"]["rounding_mode"]
          starts_at?: string
          status?: Database["public"]["Enums"]["program_status"]
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          membership_id: string
          rotated_at: string | null
          short_code: string
          status: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id: string
          rotated_at?: string | null
          short_code: string
          status?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id?: string
          rotated_at?: string | null
          short_code?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tokens_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          acquisition_location_id: string | null
          acquisition_source_id: string | null
          cached_points_balance: number
          created_at: string
          customer_id: string
          id: string
          joined_at: string
          organization_id: string
          program_id: string
          public_id: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          acquisition_location_id?: string | null
          acquisition_source_id?: string | null
          cached_points_balance?: number
          created_at?: string
          customer_id: string
          id?: string
          joined_at?: string
          organization_id: string
          program_id: string
          public_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          acquisition_location_id?: string | null
          acquisition_source_id?: string | null
          cached_points_balance?: number
          created_at?: string
          customer_id?: string
          id?: string
          joined_at?: string
          organization_id?: string
          program_id?: string
          public_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_acquisition_location_id_fkey"
            columns: ["acquisition_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
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
      point_transactions: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string
          earning_rule_snapshot: Json | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          membership_id: string
          note: string | null
          organization_id: string
          performed_by_user_id: string | null
          points_delta: number
          previous_balance: number
          reason: string | null
          resulting_balance: number
          reversal_of_transaction_id: string | null
          reversed_at: string | null
          ticket_reference: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          earning_rule_snapshot?: Json | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          membership_id: string
          note?: string | null
          organization_id: string
          performed_by_user_id?: string | null
          points_delta: number
          previous_balance: number
          reason?: string | null
          resulting_balance: number
          reversal_of_transaction_id?: string | null
          reversed_at?: string | null
          ticket_reference?: string | null
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          earning_rule_snapshot?: Json | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          membership_id?: string
          note?: string | null
          organization_id?: string
          performed_by_user_id?: string | null
          points_delta?: number
          previous_balance?: number
          reason?: string | null
          resulting_balance?: number
          reversal_of_transaction_id?: string | null
          reversed_at?: string | null
          ticket_reference?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_reversal_of_transaction_id_fkey"
            columns: ["reversal_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
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
      program_locations: {
        Row: {
          can_earn: boolean
          can_redeem: boolean
          id: string
          location_id: string
          program_id: string
        }
        Insert: {
          can_earn?: boolean
          can_redeem?: boolean
          id?: string
          location_id: string
          program_id: string
        }
        Update: {
          can_earn?: boolean
          can_redeem?: boolean
          id?: string
          location_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_locations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          membership_id: string
          organization_id: string
          performed_by_user_id: string | null
          points_spent: number
          reward_id: string
          status: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          membership_id: string
          organization_id: string
          performed_by_user_id?: string | null
          points_spent: number
          reward_id: string
          status?: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          membership_id?: string
          organization_id?: string
          performed_by_user_id?: string | null
          points_spent?: number
          reward_id?: string
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_locations: {
        Row: {
          id: string
          location_id: string
          reward_id: string
        }
        Insert: {
          id?: string
          location_id: string
          reward_id: string
        }
        Update: {
          id?: string
          location_id?: string
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_locations_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          display_order: number
          ends_at: string | null
          id: string
          image_url: string | null
          name: string
          points_cost: number
          program_id: string
          starts_at: string
          status: Database["public"]["Enums"]["program_status"]
          terms: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          points_cost: number
          program_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["program_status"]
          terms?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          points_cost?: number
          program_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["program_status"]
          terms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
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
      wallet_devices: {
        Row: {
          created_at: string
          device_identifier: string
          id: string
          push_token: string | null
          status: string
          wallet_pass_id: string
        }
        Insert: {
          created_at?: string
          device_identifier: string
          id?: string
          push_token?: string | null
          status?: string
          wallet_pass_id: string
        }
        Update: {
          created_at?: string
          device_identifier?: string
          id?: string
          push_token?: string | null
          status?: string
          wallet_pass_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_devices_wallet_pass_id_fkey"
            columns: ["wallet_pass_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          job_type: string
          scheduled_at: string
          status: string
          wallet_pass_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_type: string
          scheduled_at?: string
          status?: string
          wallet_pass_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_type?: string
          scheduled_at?: string
          status?: string
          wallet_pass_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_jobs_wallet_pass_id_fkey"
            columns: ["wallet_pass_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_passes: {
        Row: {
          created_at: string
          id: string
          installed_at: string | null
          is_sandbox: boolean
          last_error_code: string | null
          last_error_message: string | null
          last_generated_at: string | null
          last_update_requested_at: string | null
          last_updated_at: string | null
          membership_id: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          provider_object_id: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["pass_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          installed_at?: string | null
          is_sandbox?: boolean
          last_error_code?: string | null
          last_error_message?: string | null
          last_generated_at?: string | null
          last_update_requested_at?: string | null
          last_updated_at?: string | null
          membership_id: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          provider_object_id?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["pass_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          installed_at?: string | null
          is_sandbox?: boolean
          last_error_code?: string | null
          last_error_message?: string | null
          last_generated_at?: string | null
          last_update_requested_at?: string | null
          last_updated_at?: string | null
          membership_id?: string
          provider?: Database["public"]["Enums"]["wallet_provider"]
          provider_object_id?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["pass_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_points: {
        Args: {
          _delta: number
          _membership_id: string
          _note?: string
          _reason: string
        }
        Returns: Json
      }
      can_access_location: {
        Args: { _loc: string; _uid?: string }
        Returns: boolean
      }
      compute_points: {
        Args: {
          _amount_cents: number
          _mode: Database["public"]["Enums"]["earning_mode"]
          _rounding: Database["public"]["Enums"]["rounding_mode"]
          _value: number
        }
        Returns: number
      }
      get_membership_portal: { Args: { _public_id: string }; Returns: Json }
      hash_token: { Args: { _t: string }; Returns: string }
      is_org_admin: { Args: { _org: string; _uid?: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _uid?: string }; Returns: boolean }
      is_superadmin: { Args: { _uid?: string }; Returns: boolean }
      my_org_ids: { Args: { _uid?: string }; Returns: string[] }
      org_role_of: {
        Args: { _org: string; _uid?: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      queue_wallet_update: {
        Args: { _membership: string; _reason: string }
        Returns: undefined
      }
      record_purchase: {
        Args: {
          _amount_cents: number
          _idempotency_key?: string
          _location_id: string
          _membership_id: string
          _note?: string
          _ticket_reference?: string
        }
        Returns: Json
      }
      redeem_reward: {
        Args: {
          _idempotency_key?: string
          _location_id: string
          _membership_id: string
          _reward_id: string
        }
        Returns: Json
      }
      register_customer_and_membership: {
        Args: {
          _birth_date?: string
          _email: string
          _first_name: string
          _last_name?: string
          _location_id?: string
          _marketing?: boolean
          _program_id: string
          _source_id?: string
        }
        Returns: Json
      }
      request_wallet_update: { Args: { _membership_id: string }; Returns: Json }
      resolve_membership_qr: {
        Args: { _location_id: string; _token: string }
        Returns: Json
      }
      reverse_transaction: {
        Args: { _reason: string; _transaction_id: string }
        Returns: Json
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
