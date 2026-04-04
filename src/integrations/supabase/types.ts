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
      brvm_cache: {
        Row: {
          data: Json
          fetched_at: string
          id: number
        }
        Insert: {
          data: Json
          fetched_at?: string
          id?: never
        }
        Update: {
          data?: Json
          fetched_at?: string
          id?: never
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
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      daily_reminders: {
        Row: {
          date: string
          id: string
          reminded_at: string
          transactions_count: number
          user_id: string
          user_responded: boolean
        }
        Insert: {
          date?: string
          id?: string
          reminded_at?: string
          transactions_count?: number
          user_id: string
          user_responded?: boolean
        }
        Update: {
          date?: string
          id?: string
          reminded_at?: string
          transactions_count?: number
          user_id?: string
          user_responded?: boolean
        }
        Relationships: []
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
      financial_scores: {
        Row: {
          created_at: string
          id: string
          insights: Json
          score: number
          tip_of_week: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: Json
          score?: number
          tip_of_week?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insights?: Json
          score?: number
          tip_of_week?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_badges: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          month?: number
          user_id?: string
          year?: number
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
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          beauty_budget_range: string | null
          country: string | null
          created_at: string
          dependents_count: number | null
          email: string | null
          financial_goal: string | null
          full_name: string | null
          gender: string | null
          has_employees: boolean | null
          id: string
          income_range: string | null
          living_situation: string | null
          main_expense: string | null
          onboarding_completed: boolean
          phone: string | null
          profile_type: string | null
          subscriptions: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beauty_budget_range?: string | null
          country?: string | null
          created_at?: string
          dependents_count?: number | null
          email?: string | null
          financial_goal?: string | null
          full_name?: string | null
          gender?: string | null
          has_employees?: boolean | null
          id?: string
          income_range?: string | null
          living_situation?: string | null
          main_expense?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          profile_type?: string | null
          subscriptions?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beauty_budget_range?: string | null
          country?: string | null
          created_at?: string
          dependents_count?: number | null
          email?: string | null
          financial_goal?: string | null
          full_name?: string | null
          gender?: string | null
          has_employees?: boolean | null
          id?: string
          income_range?: string | null
          living_situation?: string | null
          main_expense?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          profile_type?: string | null
          subscriptions?: string[] | null
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
      receipts: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          currency: string | null
          date: string | null
          id: string
          image_base64: string | null
          merchant: string | null
          note: string | null
          raw_data: Json | null
          transaction_id: string | null
          type: string | null
          user_id: string
          wallet: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          date?: string | null
          id?: string
          image_base64?: string | null
          merchant?: string | null
          note?: string | null
          raw_data?: Json | null
          transaction_id?: string | null
          type?: string | null
          user_id: string
          wallet?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          currency?: string | null
          date?: string | null
          id?: string
          image_base64?: string | null
          merchant?: string | null
          note?: string | null
          raw_data?: Json | null
          transaction_id?: string | null
          type?: string | null
          user_id?: string
          wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
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
      transaction_attachments: {
        Row: {
          created_at: string
          created_by: string
          file_type: string
          file_url: string
          id: string
          transaction_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          file_type?: string
          file_url: string
          id?: string
          transaction_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          file_type?: string
          file_url?: string
          id?: string
          transaction_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_attachments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          conversion_date: string | null
          converted_amount_xof: number | null
          created_at: string
          created_by: string | null
          date: string
          exchange_rate_source: string | null
          exchange_rate_used: number | null
          id: string
          merchant_name: string | null
          note: string | null
          original_amount: number | null
          original_currency: string | null
          status: string
          type: string
          user_id: string
          wallet_id: string | null
          workspace_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          conversion_date?: string | null
          converted_amount_xof?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          exchange_rate_source?: string | null
          exchange_rate_used?: number | null
          id?: string
          merchant_name?: string | null
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          status?: string
          type: string
          user_id: string
          wallet_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          conversion_date?: string | null
          converted_amount_xof?: number | null
          created_at?: string
          created_by?: string | null
          date?: string
          exchange_rate_source?: string | null
          exchange_rate_used?: number | null
          id?: string
          merchant_name?: string | null
          note?: string | null
          original_amount?: number | null
          original_currency?: string | null
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string | null
          workspace_id?: string | null
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
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          user_id: string
          wallet_name: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          user_id?: string
          wallet_name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_chat_messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          message_type: string
          room_id: string
          sender_display_name: string
          sender_id: string
          sender_role: string
          workspace_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          room_id: string
          sender_display_name: string
          sender_id: string
          sender_role?: string
          workspace_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          message_type?: string
          room_id?: string
          sender_display_name?: string
          sender_id?: string
          sender_role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "workspace_chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_chat_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_chat_rooms: {
        Row: {
          created_at: string
          id: string
          transaction_id: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          transaction_id?: string | null
          type?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          transaction_id?: string | null
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_chat_rooms_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_chat_rooms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          invite_code: string
          invite_link_token: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_code?: string
          invite_link_token?: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_code?: string
          invite_link_token?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          avatar_url: string | null
          display_name: string
          id: string
          joined_at: string
          member_color: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name: string
          id?: string
          joined_at?: string
          member_color?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string
          id?: string
          joined_at?: string
          member_color?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          default_currency: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_currency?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_currency?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          invite_code: string
          invite_link_token: string
          status: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workspace_invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["workspace_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      workspace_role: "owner" | "admin" | "accountant" | "member" | "viewer"
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
      workspace_role: ["owner", "admin", "accountant", "member", "viewer"],
    },
  },
} as const
