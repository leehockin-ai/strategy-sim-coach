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
      activity_artifact_history: {
        Row: {
          actor_id: string | null
          actor_type: string
          confidence: string | null
          contribution: Json
          created_at: string
          event_id: string
          id: string
          revision: number
          run_id: string
          state: Json
          unresolved_ambiguity: boolean
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          confidence?: string | null
          contribution?: Json
          created_at?: string
          event_id: string
          id?: string
          revision: number
          run_id: string
          state: Json
          unresolved_ambiguity?: boolean
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          confidence?: string | null
          contribution?: Json
          created_at?: string
          event_id?: string
          id?: string
          revision?: number
          run_id?: string
          state?: Json
          unresolved_ambiguity?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "activity_artifact_history_event_id_run_id_fkey"
            columns: ["event_id", "run_id"]
            isOneToOne: false
            referencedRelation: "activity_events"
            referencedColumns: ["id", "run_id"]
          },
          {
            foreignKeyName: "activity_artifact_history_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "activity_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_definitions: {
        Row: {
          activity_key: string
          created_at: string
          expected_inputs: Json
          id: string
          instructions: string
          intended_output: string
          intervention_id: string
          methodology_approved: boolean
          methodology_reference: Json
          objective: string
          prerequisites: Json
          sort_order: number
          status: string
          stop_conditions: Json
          suggested_duration_minutes: number | null
          test_only: boolean
          title: string
          version: number
          workspace_config: Json
          workspace_type: string
        }
        Insert: {
          activity_key: string
          created_at?: string
          expected_inputs?: Json
          id?: string
          instructions: string
          intended_output: string
          intervention_id: string
          methodology_approved?: boolean
          methodology_reference?: Json
          objective: string
          prerequisites?: Json
          sort_order?: number
          status?: string
          stop_conditions?: Json
          suggested_duration_minutes?: number | null
          test_only?: boolean
          title: string
          version: number
          workspace_config?: Json
          workspace_type: string
        }
        Update: {
          activity_key?: string
          created_at?: string
          expected_inputs?: Json
          id?: string
          instructions?: string
          intended_output?: string
          intervention_id?: string
          methodology_approved?: boolean
          methodology_reference?: Json
          objective?: string
          prerequisites?: Json
          sort_order?: number
          status?: string
          stop_conditions?: Json
          suggested_duration_minutes?: number | null
          test_only?: boolean
          title?: string
          version?: number
          workspace_config?: Json
          workspace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_definitions_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_event_private: {
        Row: {
          evaluator_metadata: Json
          event_id: string
          participant_state: Json
          reviewer_metadata: Json
        }
        Insert: {
          evaluator_metadata?: Json
          event_id: string
          participant_state?: Json
          reviewer_metadata?: Json
        }
        Update: {
          evaluator_metadata?: Json
          event_id?: string
          participant_state?: Json
          reviewer_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_event_private_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "activity_events"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          content: string
          event_type: string
          evidence_reference: string
          id: string
          message_id: string | null
          metadata: Json
          occurred_at: string
          request_key: string
          request_payload: Json
          run_id: string
          sequence: number
          simulated_time_seconds: number | null
          time_category: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          content?: string
          event_type: string
          evidence_reference: string
          id?: string
          message_id?: string | null
          metadata?: Json
          occurred_at?: string
          request_key: string
          request_payload: Json
          run_id: string
          sequence: number
          simulated_time_seconds?: number | null
          time_category?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          content?: string
          event_type?: string
          evidence_reference?: string
          id?: string
          message_id?: string | null
          metadata?: Json
          occurred_at?: string
          request_key?: string
          request_payload?: Json
          run_id?: string
          sequence?: number
          simulated_time_seconds?: number | null
          time_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "activity_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_external_connections: {
        Row: {
          candidate_confirmed_name: boolean
          candidate_confirmed_playbook: boolean
          candidate_confirmed_project: boolean
          confirmed_playbook_title: string | null
          confirmed_project_name: string | null
          connected_at: string
          event_id: string
          host: string
          id: string
          launch_url: string
          request_key: string
          run_id: string
          status: string
          superseded_at: string | null
          supplied_url: string
          verification_status: string
          version: number
        }
        Insert: {
          candidate_confirmed_name: boolean
          candidate_confirmed_playbook: boolean
          candidate_confirmed_project: boolean
          confirmed_playbook_title?: string | null
          confirmed_project_name?: string | null
          connected_at?: string
          event_id: string
          host: string
          id?: string
          launch_url: string
          request_key: string
          run_id: string
          status?: string
          superseded_at?: string | null
          supplied_url: string
          verification_status?: string
          version: number
        }
        Update: {
          candidate_confirmed_name?: boolean
          candidate_confirmed_playbook?: boolean
          candidate_confirmed_project?: boolean
          confirmed_playbook_title?: string | null
          confirmed_project_name?: string | null
          connected_at?: string
          event_id?: string
          host?: string
          id?: string
          launch_url?: string
          request_key?: string
          run_id?: string
          status?: string
          superseded_at?: string | null
          supplied_url?: string
          verification_status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_external_connections_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "activity_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_run_private: {
        Row: {
          internal_configuration: Json
          participant_state: Json
          run_id: string
          simulation_truth_id: string | null
        }
        Insert: {
          internal_configuration?: Json
          participant_state?: Json
          run_id: string
          simulation_truth_id?: string | null
        }
        Update: {
          internal_configuration?: Json
          participant_state?: Json
          run_id?: string
          simulation_truth_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_run_private_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "activity_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_run_private_simulation_truth_id_fkey"
            columns: ["simulation_truth_id"]
            isOneToOne: false
            referencedRelation: "activity_simulation_truth"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_runs: {
        Row: {
          activity_definition_id: string | null
          activity_version: number | null
          artifact_revision: number
          artifact_state: Json
          assessment_reference: string | null
          candidate_id: string
          candidate_stop_rationale: string | null
          definition_snapshot: Json
          elapsed_simulated_seconds: number | null
          ended_at: string | null
          external_platform: string | null
          id: string
          integration_capability_level: number | null
          intervention_id: string
          intervention_slug: string
          last_sequence: number
          required_project_name: string | null
          runtime_type: string
          scenario_id: string
          scope_context: Json
          scope_revision_id: string | null
          session_id: string
          simulation_config: Json
          simulation_version: number
          start_request_key: string
          started_at: string
          status: string
          stop_state: Json
          time_budget_seconds: number | null
        }
        Insert: {
          activity_definition_id?: string | null
          activity_version?: number | null
          artifact_revision?: number
          artifact_state?: Json
          assessment_reference?: string | null
          candidate_id: string
          candidate_stop_rationale?: string | null
          definition_snapshot: Json
          elapsed_simulated_seconds?: number | null
          ended_at?: string | null
          external_platform?: string | null
          id?: string
          integration_capability_level?: number | null
          intervention_id: string
          intervention_slug: string
          last_sequence?: number
          required_project_name?: string | null
          runtime_type?: string
          scenario_id: string
          scope_context?: Json
          scope_revision_id?: string | null
          session_id: string
          simulation_config?: Json
          simulation_version?: number
          start_request_key: string
          started_at?: string
          status?: string
          stop_state?: Json
          time_budget_seconds?: number | null
        }
        Update: {
          activity_definition_id?: string | null
          activity_version?: number | null
          artifact_revision?: number
          artifact_state?: Json
          assessment_reference?: string | null
          candidate_id?: string
          candidate_stop_rationale?: string | null
          definition_snapshot?: Json
          elapsed_simulated_seconds?: number | null
          ended_at?: string | null
          external_platform?: string | null
          id?: string
          integration_capability_level?: number | null
          intervention_id?: string
          intervention_slug?: string
          last_sequence?: number
          required_project_name?: string | null
          runtime_type?: string
          scenario_id?: string
          scope_context?: Json
          scope_revision_id?: string | null
          session_id?: string
          simulation_config?: Json
          simulation_version?: number
          start_request_key?: string
          started_at?: string
          status?: string
          stop_state?: Json
          time_budget_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_runs_activity_definition_id_fkey"
            columns: ["activity_definition_id"]
            isOneToOne: false
            referencedRelation: "activity_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_runs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_runs_scope_revision_id_fkey"
            columns: ["scope_revision_id"]
            isOneToOne: false
            referencedRelation: "scope_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_runtime_test_access: {
        Row: {
          candidate_id: string
          created_at: string
          session_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          session_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_runtime_test_access_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_simulation_truth: {
        Row: {
          activity_definition_id: string
          challenge_moments: Json
          created_at: string
          id: string
          participant_knowledge: Json
          participant_motivations: Json
          reveal_conditions: Json
          scenario_id: string
          truth: Json
          version: number
        }
        Insert: {
          activity_definition_id: string
          challenge_moments?: Json
          created_at?: string
          id?: string
          participant_knowledge?: Json
          participant_motivations?: Json
          reveal_conditions?: Json
          scenario_id: string
          truth?: Json
          version: number
        }
        Update: {
          activity_definition_id?: string
          challenge_moments?: Json
          created_at?: string
          id?: string
          participant_knowledge?: Json
          participant_motivations?: Json
          reveal_conditions?: Json
          scenario_id?: string
          truth?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_simulation_truth_activity_definition_id_fkey"
            columns: ["activity_definition_id"]
            isOneToOne: false
            referencedRelation: "activity_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_simulation_truth_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
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
      external_runtime_allowed_hosts: {
        Row: {
          created_at: string
          enabled: boolean
          host_suffix: string
          note: string | null
          platform: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          host_suffix: string
          note?: string | null
          platform?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          host_suffix?: string
          note?: string | null
          platform?: string
        }
        Relationships: []
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
      scope_revisions: {
        Row: {
          created_at: string
          evidence_message_ids: string[]
          id: string
          revision: number
          session_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          evidence_message_ids?: string[]
          id?: string
          revision: number
          session_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          evidence_message_ids?: string[]
          id?: string
          revision?: number
          session_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "scope_revisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_submissions: {
        Row: {
          assessment: Json | null
          feedback: Json | null
          id: string
          locked_at: string | null
          revision: number
          session_id: string
          submitted_at: string
        }
        Insert: {
          assessment?: Json | null
          feedback?: Json | null
          id?: string
          locked_at?: string | null
          revision: number
          session_id: string
          submitted_at?: string
        }
        Update: {
          assessment?: Json | null
          feedback?: Json | null
          id?: string
          locked_at?: string | null
          revision?: number
          session_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_submissions_session_id_revision_fkey"
            columns: ["session_id", "revision"]
            isOneToOne: false
            referencedRelation: "scope_revisions"
            referencedColumns: ["session_id", "revision"]
          },
        ]
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
          engagement_brief: Json
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
          scope_revision: number
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
          engagement_brief?: Json
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
          scope_revision?: number
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
          engagement_brief?: Json
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
          scope_revision?: number
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
      stakeholder_states: {
        Row: {
          created_at: string
          engagement: Database["public"]["Enums"]["stakeholder_engagement"]
          guardedness: Database["public"]["Enums"]["stakeholder_guardedness"]
          id: string
          reasoning: string
          session_id: string
          stakeholder_id: string
          trust: Database["public"]["Enums"]["stakeholder_trust"]
          turn_index: number
        }
        Insert: {
          created_at?: string
          engagement: Database["public"]["Enums"]["stakeholder_engagement"]
          guardedness: Database["public"]["Enums"]["stakeholder_guardedness"]
          id?: string
          reasoning?: string
          session_id: string
          stakeholder_id: string
          trust: Database["public"]["Enums"]["stakeholder_trust"]
          turn_index: number
        }
        Update: {
          created_at?: string
          engagement?: Database["public"]["Enums"]["stakeholder_engagement"]
          guardedness?: Database["public"]["Enums"]["stakeholder_guardedness"]
          id?: string
          reasoning?: string
          session_id?: string
          stakeholder_id?: string
          trust?: Database["public"]["Enums"]["stakeholder_trust"]
          turn_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_states_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_activity_configs: {
        Row: {
          activity_key: string
          activity_steps: Json
          created_at: string
          exercise_label: string
          expected_duration_minutes: number
          id: string
          instructions: string
          intervention_slug: string
          methodology_approved: boolean
          participants: Json
          poc: boolean
          scenario_id: string
          status: string
          title: string
          truth: Json
          version: number
        }
        Insert: {
          activity_key: string
          activity_steps?: Json
          created_at?: string
          exercise_label: string
          expected_duration_minutes: number
          id?: string
          instructions: string
          intervention_slug: string
          methodology_approved?: boolean
          participants?: Json
          poc?: boolean
          scenario_id: string
          status?: string
          title: string
          truth?: Json
          version: number
        }
        Update: {
          activity_key?: string
          activity_steps?: Json
          created_at?: string
          exercise_label?: string
          expected_duration_minutes?: number
          id?: string
          instructions?: string
          intervention_slug?: string
          methodology_approved?: boolean
          participants?: Json
          poc?: boolean
          scenario_id?: string
          status?: string
          title?: string
          truth?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_configs_scenario_id_fkey"
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
      activity_runtime_test_allowed: {
        Args: { _candidate: string; _session: string }
        Returns: boolean
      }
      append_activity_event: {
        Args: {
          _ambiguity?: boolean
          _artifact?: Json
          _confidence?: string
          _content: string
          _expected_revision?: number
          _request: string
          _run: string
          _type: string
        }
        Returns: string
      }
      append_team_events: {
        Args: {
          _events: Json
          _internal?: Json
          _participant_state?: Json
          _request: string
          _run: string
        }
        Returns: Json
      }
      connect_strategyzer_playbook: {
        Args: {
          _confirm_name: boolean
          _confirm_playbook: boolean
          _confirm_project: boolean
          _host: string
          _launch_url: string
          _playbook_title?: string
          _project_name?: string
          _request: string
          _run: string
          _supplied_url: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_activity_run_event: {
        Args: {
          _actor: string
          _content: string
          _metadata: Json
          _payload: Json
          _request: string
          _run: string
        }
        Returns: string
      }
      is_program_admin: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      is_program_member: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      record_strategyzer_launch: {
        Args: { _request: string; _run: string }
        Returns: string
      }
      refresh_assignment_status: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      session_progress_rank: { Args: { _status: string }; Returns: number }
      start_activity_run: {
        Args: { _definition: string; _request: string; _session: string }
        Returns: string
      }
      start_strategyzer_run: {
        Args: { _request: string; _session: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "reviewer" | "user"
      stakeholder_engagement: "low" | "medium" | "high"
      stakeholder_guardedness: "open" | "measured" | "guarded"
      stakeholder_trust: "low" | "medium" | "high"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      stakeholder_engagement: ["low", "medium", "high"],
      stakeholder_guardedness: ["open", "measured", "guarded"],
      stakeholder_trust: ["low", "medium", "high"],
    },
  },
} as const
