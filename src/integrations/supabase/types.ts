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
      assignments: {
        Row: {
          admin_note: string | null
          assigned_by_user_id: string
          assigned_to_user_id: string
          cancelled_at: string | null
          created_at: string
          due_at: string | null
          id: string
          program_id: string
          scenario_id: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          assigned_by_user_id: string
          assigned_to_user_id: string
          cancelled_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          program_id: string
          scenario_id: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          assigned_by_user_id?: string
          assigned_to_user_id?: string
          cancelled_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          program_id?: string
          scenario_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          ai_detection: Json | null
          ai_section_verdicts: Json
          coach_feedback: string | null
          created_at: string
          evaluation_architecture: string | null
          gaps: string[]
          id: string
          input_quality_signals: Json
          internal_notes: string | null
          methodology_skills: Json | null
          overall_summary: string | null
          per_section_overrides: Json
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
          ai_section_verdicts?: Json
          coach_feedback?: string | null
          created_at?: string
          evaluation_architecture?: string | null
          gaps?: string[]
          id?: string
          input_quality_signals?: Json
          internal_notes?: string | null
          methodology_skills?: Json | null
          overall_summary?: string | null
          per_section_overrides?: Json
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
          ai_section_verdicts?: Json
          coach_feedback?: string | null
          created_at?: string
          evaluation_architecture?: string | null
          gaps?: string[]
          id?: string
          input_quality_signals?: Json
          internal_notes?: string | null
          methodology_skills?: Json | null
          overall_summary?: string | null
          per_section_overrides?: Json
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
      interventions: {
        Row: {
          created_at: string
          default_activity_list: Json | null
          id: string
          is_deep_vertical: boolean
          label: string
          long_description: string
          pathway_type: string
          phase: string | null
          short_description: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_activity_list?: Json | null
          id?: string
          is_deep_vertical?: boolean
          label: string
          long_description?: string
          pathway_type: string
          phase?: string | null
          short_description?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_activity_list?: Json | null
          id?: string
          is_deep_vertical?: boolean
          label?: string
          long_description?: string
          pathway_type?: string
          phase?: string | null
          short_description?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      program_admins: {
        Row: {
          added_at: string
          added_by: string | null
          program_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          program_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_admins_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_members: {
        Row: {
          cohort_label: string | null
          display_name: string | null
          invited_by: string | null
          joined_at: string
          program_id: string
          user_id: string
        }
        Insert: {
          cohort_label?: string | null
          display_name?: string | null
          invited_by?: string | null
          joined_at?: string
          program_id: string
          user_id: string
        }
        Update: {
          cohort_label?: string | null
          display_name?: string | null
          invited_by?: string | null
          joined_at?: string
          program_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_members_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          name: string
          slug: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          name: string
          slug: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
          alignment_workspace: Json | null
          application_canvas: Json | null
          assignment_id: string | null
          candidate_email: string
          candidate_name: string
          chosen_intervention_slug: string | null
          completed_at: string | null
          created_at: string
          decision: string | null
          dialogue_commitments: string | null
          evidence_gathering_plan: Json | null
          framing_notes: string | null
          id: string
          intervention_committed_at: string | null
          intervention_rationale: string | null
          intervention_recommendation: string | null
          methodology_choice: string | null
          methodology_rationale: string | null
          owner_id: string | null
          pause_justification: Json | null
          playbook_activity_run: Json | null
          playbook_application: Json | null
          playbook_extracted: Json | null
          playbook_facilitation_plan: Json | null
          playbook_interpretation: Json | null
          playbook_pdf_path: string | null
          playbook_suggestions: Json
          scenario_id: string
          status: string
          submission_requested_at: string | null
        }
        Insert: {
          alignment_workspace?: Json | null
          application_canvas?: Json | null
          assignment_id?: string | null
          candidate_email: string
          candidate_name: string
          chosen_intervention_slug?: string | null
          completed_at?: string | null
          created_at?: string
          decision?: string | null
          dialogue_commitments?: string | null
          evidence_gathering_plan?: Json | null
          framing_notes?: string | null
          id?: string
          intervention_committed_at?: string | null
          intervention_rationale?: string | null
          intervention_recommendation?: string | null
          methodology_choice?: string | null
          methodology_rationale?: string | null
          owner_id?: string | null
          pause_justification?: Json | null
          playbook_activity_run?: Json | null
          playbook_application?: Json | null
          playbook_extracted?: Json | null
          playbook_facilitation_plan?: Json | null
          playbook_interpretation?: Json | null
          playbook_pdf_path?: string | null
          playbook_suggestions?: Json
          scenario_id: string
          status?: string
          submission_requested_at?: string | null
        }
        Update: {
          alignment_workspace?: Json | null
          application_canvas?: Json | null
          assignment_id?: string | null
          candidate_email?: string
          candidate_name?: string
          chosen_intervention_slug?: string | null
          completed_at?: string | null
          created_at?: string
          decision?: string | null
          dialogue_commitments?: string | null
          evidence_gathering_plan?: Json | null
          framing_notes?: string | null
          id?: string
          intervention_committed_at?: string | null
          intervention_rationale?: string | null
          intervention_recommendation?: string | null
          methodology_choice?: string | null
          methodology_rationale?: string | null
          owner_id?: string | null
          pause_justification?: Json | null
          playbook_activity_run?: Json | null
          playbook_application?: Json | null
          playbook_extracted?: Json | null
          playbook_facilitation_plan?: Json | null
          playbook_interpretation?: Json | null
          playbook_pdf_path?: string | null
          playbook_suggestions?: Json
          scenario_id?: string
          status?: string
          submission_requested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
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
      is_program_admin: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      is_program_member: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      refresh_assignment_status: {
        Args: { _assignment_id: string }
        Returns: undefined
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
