// DatabaseDefinitions.ts
// Typed Supabase schema for the "public" schema.
// - Preserves your existing field shapes (including the updated_at string fixes).
// - Adds safe, ergonomic helper generics (Tables, TablesInsert, TablesUpdate, Enums).
// - Pure types only: no runtime imports or side effects.

/** JSON type compatible with Supabase column types */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Root Database interface: extend if you add more schemas later */
export interface Database {
  public: {
    Tables: {
      /** Contact us submissions (marketing) */
      contact_requests: {
        Row: {
          company_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          message_body: string | null
          phone: string | null
          updated_at: string // FIX: Changed from Date | null
        }
        Insert: {
          company_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message_body?: string | null
          phone?: string | null
          updated_at?: string // FIX: Changed from Date | null and optional
        }
        Update: {
          company_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message_body?: string | null
          phone?: string | null
          updated_at?: string // FIX: Changed from Date | null and optional
        }
        Relationships: []
      }

      /** Public profile surface area for app users */
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string // FIX: Changed from string | null
          company_name: string | null
          website: string | null
          unsubscribed: boolean
          is_beta_tester: boolean
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string // FIX: Changed from Date | null
          company_name?: string | null
          website?: string | null
          unsubscribed?: boolean // FIX: Made optional
          is_beta_tester: boolean
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          company_name?: string | null
          website?: string | null
          unsubscribed?: boolean // FIX: Made optional
          is_beta_tester: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      /** Stripe customer mapping for a given auth user */
      stripe_customers: {
        Row: {
          stripe_customer_id: string
          updated_at: string // FIX: Changed from Date | null
          user_id: string
        }
        Insert: {
          stripe_customer_id: string
          updated_at?: string // FIX: Changed from Date | null
          user_id: string
        }
        Update: {
          stripe_customer_id?: string
          updated_at?: string // FIX: Changed from Date | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

/* -----------------------------------------------------------------------------
 * Helper Types (ergonomic, zero-runtime)
 * -------------------------------------------------------------------------- */

/** Narrow to the public schema */
export type PublicSchema = Database["public"]

/** All public table names (derived) */
export type PublicTableName = keyof PublicSchema["Tables"]

/** Row type for a table: Tables<"profiles"> -> profiles.Row */
export type Tables<TName extends PublicTableName> =
  PublicSchema["Tables"][TName]["Row"]

/** Insert payload type for a table: TablesInsert<"profiles"> */
export type TablesInsert<TName extends PublicTableName> =
  PublicSchema["Tables"][TName]["Insert"]

/** Update payload type for a table: TablesUpdate<"profiles"> */
export type TablesUpdate<TName extends PublicTableName> =
  PublicSchema["Tables"][TName]["Update"]

/** Enum type by name: Enums<"some_enum"> (none defined yet, kept for parity) */
export type Enums<TName extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][TName]
