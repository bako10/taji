export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          at: string
          detail: Json | null
          entity: string
          entity_id: string | null
          id: number
          station_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          at?: string
          detail?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
          station_id?: string | null
          user_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
        Relationships: []
      }
      cash_entries: {
        Row: {
          amount_fcfa: number
          created_at: string
          credit_client_id: string | null
          day: string
          entered_by: string | null
          id: string
          method: string
          note: string
          station_id: string
        }
        Insert: {
          amount_fcfa: number
          created_at?: string
          credit_client_id?: string | null
          day: string
          entered_by?: string | null
          id?: string
          method: string
          note?: string
          station_id: string
        }
        Update: Partial<Database['public']['Tables']['cash_entries']['Insert']>
        Relationships: []
      }
      credit_clients: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          org_id: string
          phone: string | null
          plafond_fcfa: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          org_id: string
          phone?: string | null
          plafond_fcfa?: number
        }
        Update: Partial<Database['public']['Tables']['credit_clients']['Insert']>
        Relationships: []
      }
      credit_payments: {
        Row: {
          amount_fcfa: number
          created_at: string
          credit_client_id: string
          day: string
          entered_by: string | null
          id: string
          method: string
          station_id: string | null
        }
        Insert: {
          amount_fcfa: number
          created_at?: string
          credit_client_id: string
          day?: string
          entered_by?: string | null
          id?: string
          method?: string
          station_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['credit_payments']['Insert']>
        Relationships: []
      }
      day_closures: {
        Row: {
          closed_at: string
          closed_by: string | null
          day: string
          id: string
          station_id: string
          status: string
          summary: Json
        }
        Insert: {
          closed_at?: string
          closed_by?: string | null
          day: string
          id?: string
          station_id: string
          status?: string
          summary?: Json
        }
        Update: Partial<Database['public']['Tables']['day_closures']['Insert']>
        Relationships: []
      }
      deliveries: {
        Row: {
          created_at: string
          day: string
          entered_by: string | null
          id: string
          photo_path: string | null
          station_id: string
          supplier: string
          tank_id: string
          volume_invoiced_l: number
          volume_received_l: number | null
        }
        Insert: {
          created_at?: string
          day: string
          entered_by?: string | null
          id?: string
          photo_path?: string | null
          station_id: string
          supplier?: string
          tank_id: string
          volume_invoiced_l: number
          volume_received_l?: number | null
        }
        Update: Partial<Database['public']['Tables']['deliveries']['Insert']>
        Relationships: []
      }
      expenses: {
        Row: {
          amount_fcfa: number
          category: string
          created_at: string
          day: string
          entered_by: string | null
          id: string
          label: string
          station_id: string
        }
        Insert: {
          amount_fcfa: number
          category?: string
          created_at?: string
          day: string
          entered_by?: string | null
          id?: string
          label?: string
          station_id: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_at: string
          org_id: string
          role: string
          station_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          org_id: string
          role?: string
          station_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['invites']['Insert']>
        Relationships: []
      }
      nozzle_readings: {
        Row: {
          closing_index: number | null
          created_at: string
          day: string
          entered_by: string | null
          id: string
          nozzle_id: string
          opening_index: number
          photo_path: string | null
          shift_label: string
          staff_id: string | null
          station_id: string
          updated_at: string
        }
        Insert: {
          closing_index?: number | null
          created_at?: string
          day: string
          entered_by?: string | null
          id?: string
          nozzle_id: string
          opening_index: number
          photo_path?: string | null
          shift_label?: string
          staff_id?: string | null
          station_id: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['nozzle_readings']['Insert']>
        Relationships: []
      }
      nozzles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          initial_index: number
          name: string
          station_id: string
          tank_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          initial_index?: number
          name: string
          station_id: string
          tank_id: string
        }
        Update: Partial<Database['public']['Tables']['nozzles']['Insert']>
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
        Relationships: []
      }
      prices: {
        Row: {
          buy_price_fcfa: number | null
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          org_id: string
          price_fcfa: number
          product: string
        }
        Insert: {
          buy_price_fcfa?: number | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          org_id: string
          price_fcfa: number
          product: string
        }
        Update: Partial<Database['public']['Tables']['prices']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
          station_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          station_id: string
        }
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
        Relationships: []
      }
      station_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          role: string
          station_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          role?: string
          station_id: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['station_members']['Insert']>
        Relationships: []
      }
      stations: {
        Row: {
          active: boolean
          city: string
          created_at: string
          id: string
          name: string
          org_id: string
          require_photo: boolean
        }
        Insert: {
          active?: boolean
          city?: string
          created_at?: string
          id?: string
          name: string
          org_id: string
          require_photo?: boolean
        }
        Update: Partial<Database['public']['Tables']['stations']['Insert']>
        Relationships: []
      }
      tank_dips: {
        Row: {
          created_at: string
          day: string
          dip_l: number
          entered_by: string | null
          id: string
          photo_path: string | null
          station_id: string
          tank_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day: string
          dip_l: number
          entered_by?: string | null
          id?: string
          photo_path?: string | null
          station_id: string
          tank_id: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tank_dips']['Insert']>
        Relationships: []
      }
      tanks: {
        Row: {
          active: boolean
          capacity_l: number
          created_at: string
          id: string
          initial_stock_l: number
          name: string
          product: string
          station_id: string
        }
        Insert: {
          active?: boolean
          capacity_l: number
          created_at?: string
          id?: string
          initial_stock_l?: number
          name: string
          product: string
          station_id: string
        }
        Update: Partial<Database['public']['Tables']['tanks']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      join_with_invite: { Args: { p_code: string }; Returns: Json }
      my_member_org_ids: { Args: never; Returns: string[] }
      my_org_ids: { Args: never; Returns: string[] }
      my_station_ids: { Args: never; Returns: string[] }
      station_is_closed: { Args: { d: string; sid: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
