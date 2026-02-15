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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_role?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          created_at: string
          id: string
          month: number
          total_budget: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          total_budget?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          total_budget?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          budget_amount: number
          category_id: string
          created_at: string
          id: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          budget_amount?: number
          category_id: string
          created_at?: string
          id?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          budget_amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          note: string | null
          person_name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          note?: string | null
          person_name: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          note?: string | null
          person_name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          assistant_summary: string | null
          created_at: string
          estimated_savings: number | null
          id: string
          month: number
          total_income: number | null
          total_spent: number | null
          user_id: string
          year: number
        }
        Insert: {
          assistant_summary?: string | null
          created_at?: string
          estimated_savings?: number | null
          id?: string
          month: number
          total_income?: number | null
          total_spent?: number | null
          user_id: string
          year: number
        }
        Update: {
          assistant_summary?: string | null
          created_at?: string
          estimated_savings?: number | null
          id?: string
          month?: number
          total_income?: number | null
          total_spent?: number | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_scans: {
        Row: {
          created_at: string
          extracted_text: string | null
          id: string
          image_url: string | null
          parsed_amount: number | null
          parsed_category: string | null
          parsed_converted_amount_xof: number | null
          parsed_currency: string | null
          parsed_date: string | null
          parsed_exchange_rate_source: string | null
          parsed_exchange_rate_used: number | null
          parsed_merchant: string | null
          parsed_original_amount: number | null
          parsed_type: string | null
          parsed_wallet: string | null
          scan_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          image_url?: string | null
          parsed_amount?: number | null
          parsed_category?: string | null
          parsed_converted_amount_xof?: number | null
          parsed_currency?: string | null
          parsed_date?: string | null
          parsed_exchange_rate_source?: string | null
          parsed_exchange_rate_used?: number | null
          parsed_merchant?: string | null
          parsed_original_amount?: number | null
          parsed_type?: string | null
          parsed_wallet?: string | null
          scan_type?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          image_url?: string | null
          parsed_amount?: number | null
          parsed_category?: string | null
          parsed_converted_amount_xof?: number | null
          parsed_currency?: string | null
          parsed_date?: string | null
          parsed_exchange_rate_source?: string | null
          parsed_exchange_rate_used?: number | null
          parsed_merchant?: string | null
          parsed_original_amount?: number | null
          parsed_type?: string | null
          parsed_wallet?: string | null
          scan_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          name: string
          target_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name: string
          target_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          name?: string
          target_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan_name: string | null
          price_xof: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_name?: string | null
          price_xof?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_name?: string | null
          price_xof?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tontine_members: {
        Row: {
          created_at: string
          id: string
          member_name: string
          member_phone: string | null
          tontine_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_name: string
          member_phone?: string | null
          tontine_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_name?: string
          member_phone?: string | null
          tontine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_members_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontine_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          member_name: string
          status: string
          tontine_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          member_name: string
          status?: string
          tontine_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          member_name?: string
          status?: string
          tontine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tontine_payments_tontine_id_fkey"
            columns: ["tontine_id"]
            isOneToOne: false
            referencedRelation: "tontines"
            referencedColumns: ["id"]
          },
        ]
      }
      tontines: {
        Row: {
          contribution_amount: number
          created_at: string
          frequency: string
          id: string
          members_count: number
          name: string
          start_date: string
          user_id: string
        }
        Insert: {
          contribution_amount?: number
          created_at?: string
          frequency?: string
          id?: string
          members_count?: number
          name: string
          start_date?: string
          user_id: string
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          frequency?: string
          id?: string
          members_count?: number
          name?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          conversion_date: string | null
          converted_amount_xof: number | null
          created_at: string
          date: string
          exchange_rate_source: string | null
          exchange_rate_used: number | null
          id: string
          note: string | null
          original_amount: number | null
          original_currency: string | null
          type: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          conversion_date?: string | null
          converted_amount_xof?: number | null
          created_at?: string
          date?: string
          exchange_rate_source?: string | null
          exchange_rate_used?: number | null
          id?: string
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          type: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          conversion_date?: string | null
          converted_amount_xof?: number | null
          created_at?: string
          date?: string
          exchange_rate_source?: string | null
          exchange_rate_used?: number | null
          id?: string
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          type?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          currency: string
          id: string
          initial_balance: number
          user_id: string
          wallet_name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          user_id: string
          wallet_name: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          user_id?: string
          wallet_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
