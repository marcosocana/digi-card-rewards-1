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
      automation_jobs: {
        Row: {
          attempts: number
          automation_id: string
          completed_at: string | null
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          last_error: string | null
          membership_id: string
          organization_id: string
          payload: Json
          scheduled_for: string
          status: string
        }
        Insert: {
          attempts?: number
          automation_id: string
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          membership_id: string
          organization_id: string
          payload?: Json
          scheduled_for?: string
          status?: string
        }
        Update: {
          attempts?: number
          automation_id?: string
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          membership_id?: string
          organization_id?: string
          payload?: Json
          scheduled_for?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_jobs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "notification_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_locations: {
        Row: {
          campaign_id: string
          created_at: string
          location_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          location_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_locations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          archived_at: string | null
          audience: Json
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          internal_name: string
          is_primary: boolean
          mechanic_type: string
          organization_id: string
          program_id: string | null
          public_name: string
          reward_id: string | null
          rules: Json
          starts_at: string
          status: string
          terms: string | null
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          archived_at?: string | null
          audience?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          internal_name: string
          is_primary?: boolean
          mechanic_type?: string
          organization_id: string
          program_id?: string | null
          public_name: string
          reward_id?: string | null
          rules?: Json
          starts_at?: string
          status?: string
          terms?: string | null
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          archived_at?: string | null
          audience?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          internal_name?: string
          is_primary?: boolean
          mechanic_type?: string
          organization_id?: string
          program_id?: string | null
          public_name?: string
          reward_id?: string | null
          rules?: Json
          starts_at?: string
          status?: string
          terms?: string | null
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          archived_at: string | null
          campaign_id: string | null
          code: string
          converts_to_membership: boolean
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          maximum_uses: number | null
          organization_id: string
          single_use_per_customer: boolean
          starts_at: string
          status: string
          title: string
          updated_at: string
          used_count: number
        }
        Insert: {
          archived_at?: string | null
          campaign_id?: string | null
          code: string
          converts_to_membership?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          maximum_uses?: number | null
          organization_id: string
          single_use_per_customer?: boolean
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          archived_at?: string | null
          campaign_id?: string | null
          code?: string
          converts_to_membership?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          maximum_uses?: number | null
          organization_id?: string
          single_use_per_customer?: boolean
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_organization_id_fkey"
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
          revoked_at: string | null
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
          revoked_at?: string | null
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
          revoked_at?: string | null
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
      customer_coupons: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          membership_id: string
          organization_id: string
          redeemed_at: string | null
          redeemed_by: string | null
          status: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          membership_id: string
          organization_id: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          membership_id?: string
          organization_id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_coupons_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_coupons_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_coupons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_rewards: {
        Row: {
          awarded_at: string
          campaign_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          membership_id: string
          organization_id: string
          redeemed_at: string | null
          redemption_id: string | null
          reward_id: string
          source_transaction_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          campaign_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id: string
          organization_id: string
          redeemed_at?: string | null
          redemption_id?: string | null
          reward_id: string
          source_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          campaign_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          membership_id?: string
          organization_id?: string
          redeemed_at?: string | null
          redemption_id?: string | null
          reward_id?: string
          source_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_rewards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rewards_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rewards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rewards_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_rewards_source_transaction_id_fkey"
            columns: ["source_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          definition: Json
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string
          gender: string | null
          id: string
          internal_notes: string | null
          last_activity_at: string | null
          last_name: string | null
          normalized_email: string
          normalized_phone: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          gender?: string | null
          id?: string
          internal_notes?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          normalized_email: string
          normalized_phone?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          internal_notes?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          normalized_email?: string
          normalized_phone?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_operations: {
        Row: {
          connection_id: string | null
          created_at: string
          error: string | null
          external_id: string
          id: string
          operation_type: string
          organization_id: string
          payload: Json
          processed_at: string | null
          result: Json | null
          status: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          error?: string | null
          external_id: string
          id?: string
          operation_type: string
          organization_id: string
          payload: Json
          processed_at?: string | null
          result?: Json | null
          status?: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          error?: string | null
          external_id?: string
          id?: string
          operation_type?: string
          organization_id?: string
          payload?: Json
          processed_at?: string | null
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_operations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_operations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_transactions: {
        Row: {
          amount_delta_cents: number
          created_at: string
          gift_card_id: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          note: string | null
          organization_id: string
          performed_by_user_id: string | null
          previous_balance_cents: number
          resulting_balance_cents: number
          type: string
        }
        Insert: {
          amount_delta_cents: number
          created_at?: string
          gift_card_id: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          note?: string | null
          organization_id: string
          performed_by_user_id?: string | null
          previous_balance_cents: number
          resulting_balance_cents: number
          type: string
        }
        Update: {
          amount_delta_cents?: number
          created_at?: string
          gift_card_id?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          note?: string | null
          organization_id?: string
          performed_by_user_id?: string | null
          previous_balance_cents?: number
          resulting_balance_cents?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          archived_at: string | null
          code_hash: string
          code_hint: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          initial_balance_cents: number
          message: string | null
          organization_id: string
          public_id: string
          purchaser_email: string | null
          purchaser_name: string | null
          recipient_email: string | null
          recipient_name: string | null
          remaining_balance_cents: number
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          code_hash: string
          code_hint: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          initial_balance_cents: number
          message?: string | null
          organization_id: string
          public_id?: string
          purchaser_email?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          remaining_balance_cents: number
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          code_hash?: string
          code_hint?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          initial_balance_cents?: number
          message?: string | null
          organization_id?: string
          public_id?: string
          purchaser_email?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          remaining_balance_cents?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_api_keys: {
        Row: {
          connection_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          revoked_at: string | null
          scopes: string[]
          status: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          revoked_at?: string | null
          scopes?: string[]
          status?: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          revoked_at?: string | null
          scopes?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_api_keys_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      loyalty_account_transactions: {
        Row: {
          account_id: string
          amount_cents: number | null
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          metadata: Json
          organization_id: string
          performed_by_user_id: string | null
          related_point_transaction_id: string | null
          type: string
          value_after: number
          value_before: number
          value_delta: number
        }
        Insert: {
          account_id: string
          amount_cents?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          metadata?: Json
          organization_id: string
          performed_by_user_id?: string | null
          related_point_transaction_id?: string | null
          type: string
          value_after: number
          value_before: number
          value_delta: number
        }
        Update: {
          account_id?: string
          amount_cents?: number | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          metadata?: Json
          organization_id?: string
          performed_by_user_id?: string | null
          related_point_transaction_id?: string | null
          type?: string
          value_after?: number
          value_before?: number
          value_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_account_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_account_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_account_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_account_transactions_related_point_transaction_id_fkey"
            columns: ["related_point_transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          cashback_balance_cents: number
          created_at: string
          id: string
          lifetime_progress: number
          lifetime_spend_cents: number
          mechanic_type: string
          membership_ends_at: string | null
          membership_id: string
          membership_started_at: string | null
          organization_id: string
          program_id: string
          progress_balance: number
          stamp_balance: number
          status: string
          tier_id: string | null
          updated_at: string
          visit_count: number
        }
        Insert: {
          cashback_balance_cents?: number
          created_at?: string
          id?: string
          lifetime_progress?: number
          lifetime_spend_cents?: number
          mechanic_type?: string
          membership_ends_at?: string | null
          membership_id: string
          membership_started_at?: string | null
          organization_id: string
          program_id: string
          progress_balance?: number
          stamp_balance?: number
          status?: string
          tier_id?: string | null
          updated_at?: string
          visit_count?: number
        }
        Update: {
          cashback_balance_cents?: number
          created_at?: string
          id?: string
          lifetime_progress?: number
          lifetime_spend_cents?: number
          mechanic_type?: string
          membership_ends_at?: string | null
          membership_id?: string
          membership_started_at?: string | null
          organization_id?: string
          program_id?: string
          progress_balance?: number
          stamp_balance?: number
          status?: string
          tier_id?: string | null
          updated_at?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
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
          maximum_progress_per_purchase: number | null
          mechanic_config: Json
          mechanic_type: string
          minimum_purchase_cents: number
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
          maximum_progress_per_purchase?: number | null
          mechanic_config?: Json
          mechanic_type?: string
          minimum_purchase_cents?: number
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
          maximum_progress_per_purchase?: number | null
          mechanic_config?: Json
          mechanic_type?: string
          minimum_purchase_cents?: number
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
      membership_tiers: {
        Row: {
          benefits: Json
          created_at: string
          id: string
          minimum_progress: number
          name: string
          organization_id: string
          program_id: string
          rank: number
          status: string
          updated_at: string
        }
        Insert: {
          benefits?: Json
          created_at?: string
          id?: string
          minimum_progress?: number
          name: string
          organization_id: string
          program_id: string
          rank?: number
          status?: string
          updated_at?: string
        }
        Update: {
          benefits?: Json
          created_at?: string
          id?: string
          minimum_progress?: number
          name?: string
          organization_id?: string
          program_id?: string
          rank?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
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
          revoked_at: string | null
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
          revoked_at?: string | null
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
          revoked_at?: string | null
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
      notification_automations: {
        Row: {
          conditions: Json
          created_at: string
          created_by: string | null
          delay_minutes: number
          destination_url: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          message: string
          name: string
          next_run_at: string | null
          organization_id: string
          segment_id: string | null
          title: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          destination_url?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          message: string
          name: string
          next_run_at?: string | null
          organization_id: string
          segment_id?: string | null
          title: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          delay_minutes?: number
          destination_url?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          message?: string
          name?: string
          next_run_at?: string | null
          organization_id?: string
          segment_id?: string | null
          title?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_automations_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempted_at: string | null
          created_at: string
          delivered_at: string | null
          failure_reason: string | null
          id: string
          membership_id: string
          notification_id: string
          organization_id: string
          provider: Database["public"]["Enums"]["wallet_provider"] | null
          provider_message_id: string | null
          status: string
          wallet_pass_id: string | null
        }
        Insert: {
          attempted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          membership_id: string
          notification_id: string
          organization_id: string
          provider?: Database["public"]["Enums"]["wallet_provider"] | null
          provider_message_id?: string | null
          status?: string
          wallet_pass_id?: string | null
        }
        Update: {
          attempted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          failure_reason?: string | null
          id?: string
          membership_id?: string
          notification_id?: string
          organization_id?: string
          provider?: Database["public"]["Enums"]["wallet_provider"] | null
          provider_message_id?: string | null
          status?: string
          wallet_pass_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_wallet_pass_id_fkey"
            columns: ["wallet_pass_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_count: number
          destination_url: string | null
          failed_count: number
          id: string
          idempotency_key: string | null
          image_url: string | null
          kind: string
          message: string
          organization_id: string
          recipient_count: number
          scheduled_for: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          destination_url?: string | null
          failed_count?: number
          id?: string
          idempotency_key?: string | null
          image_url?: string | null
          kind?: string
          message: string
          organization_id: string
          recipient_count?: number
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          destination_url?: string | null
          failed_count?: number
          id?: string
          idempotency_key?: string | null
          image_url?: string | null
          kind?: string
          message?: string
          organization_id?: string
          recipient_count?: number
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
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
          legal_notice: string | null
          organization_id: string
          primary_color: string
          privacy_policy: string | null
          program_description: string | null
          secondary_color: string
          cookie_policy: string | null
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
          legal_notice?: string | null
          organization_id: string
          primary_color?: string
          privacy_policy?: string | null
          program_description?: string | null
          secondary_color?: string
          cookie_policy?: string | null
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
          legal_notice?: string | null
          organization_id?: string
          primary_color?: string
          privacy_policy?: string | null
          program_description?: string | null
          secondary_color?: string
          cookie_policy?: string | null
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
          address_line: string | null
          archived_at: string | null
          category: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string
          created_at: string
          display_name: string
          id: string
          instagram: string | null
          latitude: number | null
          legal_name: string | null
          tax_id: string | null
          registry_details: string | null
          longitude: number | null
          menu_url: string | null
          notification_daily_limit: number
          onboarding_completed_at: string | null
          onboarding_step: number
          plan_code: string
          postal_code: string | null
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line?: string | null
          archived_at?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          display_name: string
          id?: string
          instagram?: string | null
          latitude?: number | null
          legal_name?: string | null
          tax_id?: string | null
          registry_details?: string | null
          longitude?: number | null
          menu_url?: string | null
          notification_daily_limit?: number
          onboarding_completed_at?: string | null
          onboarding_step?: number
          plan_code?: string
          postal_code?: string | null
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line?: string | null
          archived_at?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string
          display_name?: string
          id?: string
          instagram?: string | null
          latitude?: number | null
          legal_name?: string | null
          tax_id?: string | null
          registry_details?: string | null
          longitude?: number | null
          menu_url?: string | null
          notification_daily_limit?: number
          onboarding_completed_at?: string | null
          onboarding_step?: number
          plan_code?: string
          postal_code?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
          website?: string | null
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
          customer_reward_id: string | null
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
          customer_reward_id?: string | null
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
          customer_reward_id?: string | null
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
            foreignKeyName: "redemptions_customer_reward_id_fkey"
            columns: ["customer_reward_id"]
            isOneToOne: false
            referencedRelation: "customer_rewards"
            referencedColumns: ["id"]
          },
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
      wallet_integration_settings: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          last_verified_at: string | null
          mode: string
          organization_id: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          public_configuration: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          mode?: string
          organization_id: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          public_configuration?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_verified_at?: string | null
          mode?: string
          organization_id?: string
          provider?: Database["public"]["Enums"]["wallet_provider"]
          public_configuration?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_integration_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      anonymize_customer: {
        Args: { _membership_id: string; _reason: string }
        Returns: undefined
      }
      can_access_location: {
        Args: { _loc: string; _uid?: string }
        Returns: boolean
      }
      can_view_org_user: {
        Args: { _organization_user_id: string; _uid?: string }
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
      consume_cashback: {
        Args: {
          _amount_cents: number
          _idempotency_key: string
          _location_id: string
          _membership_id: string
        }
        Returns: Json
      }
      consume_gift_card: {
        Args: {
          _amount_cents: number
          _code: string
          _idempotency_key: string
          _location_id: string
          _note?: string
        }
        Returns: Json
      }
      enqueue_scheduled_automations: {
        Args: { _organization_id: string }
        Returns: number
      }
      export_customer_data: { Args: { _membership_id: string }; Returns: Json }
      get_membership_portal: { Args: { _public_id: string }; Returns: Json }
      get_wallet_install_state: {
        Args: {
          _membership_public_id: string
          _provider: Database["public"]["Enums"]["wallet_provider"]
        }
        Returns: Json
      }
      hash_token: { Args: { _t: string }; Returns: string }
      ingest_pos_operation: {
        Args: {
          _api_key: string
          _external_id: string
          _operation_type: string
          _payload: Json
        }
        Returns: Json
      }
      is_org_admin: { Args: { _org: string; _uid?: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _uid?: string }; Returns: boolean }
      is_superadmin: { Args: { _uid?: string }; Returns: boolean }
      issue_gift_card: {
        Args: {
          _expires_at?: string
          _initial_balance_cents: number
          _message?: string
          _organization_id: string
          _recipient_email?: string
          _recipient_name?: string
        }
        Returns: Json
      }
      issue_integration_api_key: {
        Args: {
          _connection_id?: string
          _expires_at?: string
          _name: string
          _organization_id: string
        }
        Returns: Json
      }
      membership_service_payload: {
        Args: { _location_id: string; _membership_id: string }
        Returns: Json
      }
      my_org_ids: { Args: { _uid?: string }; Returns: string[] }
      org_role_of: {
        Args: { _org: string; _uid?: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      preview_segment_count: { Args: { _segment_id: string }; Returns: number }
      process_automation_jobs: {
        Args: { _limit?: number; _organization_id: string }
        Returns: Json
      }
      queue_manual_notification: {
        Args: {
          _destination_url?: string
          _idempotency_key?: string
          _message: string
          _organization_id: string
          _scheduled_for?: string
          _segment_id: string
          _title: string
        }
        Returns: Json
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
      redeem_coupon: {
        Args: {
          _coupon_code: string
          _idempotency_key: string
          _location_id: string
          _membership_id: string
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
      register_customer_and_membership:
        | {
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
        | {
            Args: {
              _birth_date?: string
              _email: string
              _first_name: string
              _last_name?: string
              _location_id?: string
              _marketing?: boolean
              _phone?: string
              _program_id: string
              _source_id?: string
              _terms_accepted?: boolean
            }
            Returns: Json
          }
      register_verified_customer_and_membership: {
        Args: {
          _address_line?: string
          _birth_date?: string
          _city?: string
          _country?: string
          _email: string
          _first_name: string
          _gender?: string
          _last_name?: string
          _location_id?: string
          _marketing?: boolean
          _phone?: string
          _postal_code?: string
          _program_id: string
          _source_id?: string
          _terms_accepted?: boolean
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
      revoke_integration_api_key: {
        Args: { _key_id: string }
        Returns: undefined
      }
      search_memberships: {
        Args: { _location_id: string; _query: string }
        Returns: Json
      }
      segment_matches: {
        Args: { _definition: Json; _membership_id: string }
        Returns: boolean
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
