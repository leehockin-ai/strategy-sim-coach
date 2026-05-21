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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      evaluations: {
        Row: {
          ai_detection: Json | null
          created_at: string
          gaps: string[]
          id: string
          overall_summary: string | null
          raw_response: Json | null
          recommendation: string
          reviewer_decision: string | null
          reviewer_notes: string | null
          scores: Json
          session_id: string
          strengths: string[]
        }
        Insert: {
          ai_detection?: Json | null
          created_at?: string
          gaps?: string[]
          id?: string
          overall_summary?: string | null
          raw_response?: Json | null
          recommendation?: string
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          scores?: Json
          session_id: string
          strengths?: string[]
        }
        Update: {
          ai_detection?: Json | null
          created_at?: string
          gaps?: string[]
          id?: string
          overall_summary?: string | null
          raw_response?: Json | null
          recommendation?: string
          reviewer_decision?: string | null
          reviewer_notes?: string | null
          scores?: Json
          session_id?: string
          strengths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          phase: string
          role: string
          session_id: string
          stakeholder_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          phase?: string
          role: string
          session_id: string
          stakeholder_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          phase?: string
          role?: string
          session_id?: string
          stakeholder_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          ambiguity_factors: string[]
          context: string
          created_at: string
          difficulty: string
          id: string
          industry: string
          slug: string
          stakeholders: Json
          summary: string
          system_prompt: string
          title: string
        }
        Insert: {
          ambiguity_factors?: string[]
          context: string
          created_at?: string
          difficulty?: string
          id?: string
          industry: string
          slug: string
          stakeholders?: Json
          summary: string
          system_prompt: string
          title: string
        }
        Update: {
          ambiguity_factors?: string[]
          context?: string
          created_at?: string
          difficulty?: string
          id?: string
          industry?: string
          slug?: string
          stakeholders?: Json
          summary?: string
          system_prompt?: string
          title?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          application_canvas: Json | null
          candidate_email: string
          candidate_name: string
          completed_at: string | null
          created_at: string
          decision: string | null
          framing_notes: string | null
          id: string
          intervention_recommendation: string | null
          methodology_choice: string | null
          methodology_rationale: string | null
          owner_id: string | null
          playbook_application: Json | null
          playbook_extracted: Json | null
          playbook_pdf_path: string | null
          scenario_id: string
          status: string
        }
        Insert: {
          application_canvas?: Json | null
          candidate_email: string
          candidate_name: string
          completed_at?: string | null
          created_at?: string
          decision?: string | null
          framing_notes?: string | null
          id?: string
          intervention_recommendation?: string | null
          methodology_choice?: string | null
          methodology_rationale?: string | null
          owner_id?: string | null
          playbook_application?: Json | null
          playbook_extracted?: Json | null
          playbook_pdf_path?: string | null
          scenario_id: string
          status?: string
        }
        Update: {
          application_canvas?: Json | null
          candidate_email?: string
          candidate_name?: string
          completed_at?: string | null
          created_at?: string
          decision?: string | null
          framing_notes?: string | null
          id?: string
          intervention_recommendation?: string | null
          methodology_choice?: string | null
          methodology_rationale?: string | null
          owner_id?: string | null
          playbook_application?: Json | null
          playbook_extracted?: Json | null
          playbook_pdf_path?: string | null
          scenario_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
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
    Enums: {},
  },
} as const
