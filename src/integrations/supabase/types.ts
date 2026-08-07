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
      bookings: {
        Row: {
          address: string | null
          category: string | null
          client_id: string
          coupon_code: string | null
          created_at: string
          description: string | null
          discount_kz: number
          duration_min: number | null
          id: string
          notes: string | null
          price_kz: number
          provider_id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          client_id: string
          coupon_code?: string | null
          created_at?: string
          description?: string | null
          discount_kz?: number
          duration_min?: number | null
          id?: string
          notes?: string | null
          price_kz?: number
          provider_id: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          client_id?: string
          coupon_code?: string | null
          created_at?: string
          description?: string | null
          discount_kz?: number
          duration_min?: number | null
          id?: string
          notes?: string | null
          price_kz?: number
          provider_id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          booking_id: string | null
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          type: Database["public"]["Enums"]["coupon_type"]
          uses_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          type?: Database["public"]["Enums"]["coupon_type"]
          uses_count?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          type?: Database["public"]["Enums"]["coupon_type"]
          uses_count?: number
          value?: number
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          accepted_by: string | null
          category: string
          city: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["emergency_status"]
        }
        Insert: {
          accepted_by?: string | null
          category: string
          city?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["emergency_status"]
        }
        Update: {
          accepted_by?: string | null
          category?: string
          city?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["emergency_status"]
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_kz: number
          booking_id: string
          client_id: string
          created_at: string
          discount_kz: number
          id: string
          issued_at: string
          number: string
          provider_id: string
          service_name: string
          total_kz: number
        }
        Insert: {
          amount_kz: number
          booking_id: string
          client_id: string
          created_at?: string
          discount_kz?: number
          id?: string
          issued_at?: string
          number?: string
          provider_id: string
          service_name: string
          total_kz: number
        }
        Update: {
          amount_kz?: number
          booking_id?: string
          client_id?: string
          created_at?: string
          discount_kz?: number
          id?: string
          issued_at?: string
          number?: string
          provider_id?: string
          service_name?: string
          total_kz?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available: boolean | null
          avatar_url: string | null
          bio: string | null
          category: string | null
          city: string | null
          cover_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          jobs_done: number | null
          mode: Database["public"]["Enums"]["user_mode"]
          phone: string | null
          price_from_kz: number | null
          rating: number | null
          updated_at: string | null
          username: string | null
          verified: boolean | null
        }
        Insert: {
          available?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          jobs_done?: number | null
          mode?: Database["public"]["Enums"]["user_mode"]
          phone?: string | null
          price_from_kz?: number | null
          rating?: number | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          available?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          jobs_done?: number | null
          mode?: Database["public"]["Enums"]["user_mode"]
          phone?: string | null
          price_from_kz?: number | null
          rating?: number | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          label: string
          position: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          label: string
          position?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          label?: string
          position?: number | null
          user_id?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          category: string | null
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          price_kz: number | null
          provider_id: string
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          price_kz?: number | null
          provider_id: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          price_kz?: number | null
          provider_id?: string
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: []
      }
      smart_post_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          post_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          post_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          post_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_post_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "smart_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_posts: {
        Row: {
          audience: string | null
          caption_long: string | null
          caption_medium: string | null
          caption_short: string | null
          clicks_count: number
          conversions_count: number
          copy_direct: string | null
          copy_emotional: string | null
          created_at: string
          cta: string | null
          emotion: string | null
          format: string
          generated_image_url: string | null
          hashtags: string[] | null
          id: string
          is_premium: boolean
          mode: string
          score: number
          service_type: string | null
          source_image_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          audience?: string | null
          caption_long?: string | null
          caption_medium?: string | null
          caption_short?: string | null
          clicks_count?: number
          conversions_count?: number
          copy_direct?: string | null
          copy_emotional?: string | null
          created_at?: string
          cta?: string | null
          emotion?: string | null
          format?: string
          generated_image_url?: string | null
          hashtags?: string[] | null
          id?: string
          is_premium?: boolean
          mode?: string
          score?: number
          service_type?: string | null
          source_image_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          audience?: string | null
          caption_long?: string | null
          caption_medium?: string | null
          caption_short?: string | null
          clicks_count?: number
          conversions_count?: number
          copy_direct?: string | null
          copy_emotional?: string | null
          created_at?: string
          cta?: string | null
          emotion?: string | null
          format?: string
          generated_image_url?: string | null
          hashtags?: string[] | null
          id?: string
          is_premium?: boolean
          mode?: string
          score?: number
          service_type?: string | null
          source_image_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: []
      }
      statuses: {
        Row: {
          caption: string | null
          created_at: string | null
          expires_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon: {
        Args: { _amount: number; _code: string }
        Returns: {
          coupon_id: string
          discount_kz: number
          message: string
          total_kz: number
        }[]
      }
      conclude_booking: { Args: { _booking_id: string }; Returns: string }
      get_or_create_conversation: { Args: { _other: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status:
        | "pendente"
        | "confirmado"
        | "em_curso"
        | "concluido"
        | "cancelado"
        | "recusado"
      coupon_type: "percentual" | "fixo"
      emergency_status: "aberto" | "aceite" | "fechado" | "cancelado"
      request_status:
        | "pendente"
        | "aceite"
        | "recusado"
        | "concluido"
        | "cancelado"
      user_mode: "cliente" | "prestador"
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
      app_role: ["admin", "moderator", "user"],
      booking_status: [
        "pendente",
        "confirmado",
        "em_curso",
        "concluido",
        "cancelado",
        "recusado",
      ],
      coupon_type: ["percentual", "fixo"],
      emergency_status: ["aberto", "aceite", "fechado", "cancelado"],
      request_status: [
        "pendente",
        "aceite",
        "recusado",
        "concluido",
        "cancelado",
      ],
      user_mode: ["cliente", "prestador"],
    },
  },
} as const
