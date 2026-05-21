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
          coach_feedback: string | null
          created_at: string
          gaps: string[]
          id: string
          internal_notes: string | null
          methodology_skills: Json | null
          overall_summary: string | null
          raw_response: Json | null
          recommendation: string
          reviewed_at: string | null
          reviewer_decision: string | null
          reviewer_name: string | null
          reviewer_notes: string | null
          scores: Json
          session_id: string
          soft_skills: Json | null
          strengths: string[]
        }
        Insert: {
          ai_detection?: Json | null
          coach_feedback?: string | null
          created_at?: string
          gaps?: string[]
          id?: string
          internal_notes?: string | null
          methodology_skills?: Json | null
          overall_summary?: string | null
          raw_response?: Json | null
          recommendation?: string
          reviewed_at?: string | null
          reviewer_decision?: string | null
          reviewer_name?: string | null
          reviewer_notes?: string | null
          scores?: Json
          session_id: string
          soft_skills?: Json | null
          strengths?: string[]
        }
        Update: {
          ai_detection?: Json | null
          coach_feedback?: string | null
          created_at?: string
          gaps?: string[]
          id?: string
          internal_notes?: string | null
          methodology_skills?: Json | null
          overall_summary?: string | null
          raw_response?: Json | null
          recommendation?: string
          reviewed_at?: string | null
          reviewer_decision?: string | null
          reviewer_name?: string | null
          reviewer_notes?: string | null
          scores?: Json
          session_id?: string
          soft_skills?: Json | null
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
          success_definition: string
          success_pressure: string
          summary: string
          system_prompt: string
          title: string
          unrealistic_aspects: string[]
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
          success_definition?: string
          success_pressure?: string
          summary: string
          system_prompt: string
          title: string
          unrealistic_aspects?: string[]
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
          success_definition?: string
          success_pressure?: string
          summary?: string
          system_prompt?: string
          title?: string
          unrealistic_aspects?: string[]
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
          dialogue_commitments: string | null
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
          dialogue_commitments?: string | null
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
          dialogue_commitments?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "user"
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
      app_role: ["admin", "reviewer", "user"],
    },
  },
} as const
