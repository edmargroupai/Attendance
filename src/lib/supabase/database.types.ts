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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          label: string
          owner_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          label: string
          owner_id?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          owner_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          calendar_session_id: string
          created_at: string
          enrolment_id: string
          id: string
          owner_id: string
          revision: number
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calendar_session_id: string
          created_at?: string
          enrolment_id: string
          id?: string
          owner_id?: string
          revision?: number
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calendar_session_id?: string
          created_at?: string
          enrolment_id?: string
          id?: string
          owner_id?: string
          revision?: number
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_calendar_session_fkey"
            columns: ["owner_id", "calendar_session_id"]
            isOneToOne: false
            referencedRelation: "calendar_sessions"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "attendance_records_enrolment_fkey"
            columns: ["owner_id", "enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          entity_id: string
          entity_type: string
          event_time: string
          id: string
          new_data: Json | null
          old_data: Json | null
          owner_id: string
          request_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          entity_id: string
          entity_type: string
          event_time?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          owner_id: string
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          entity_id?: string
          entity_type?: string
          event_time?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          owner_id?: string
          request_id?: string | null
        }
        Relationships: []
      }
      calendar_sessions: {
        Row: {
          class_id: string
          closure_reason: string | null
          created_at: string
          date: string
          id: string
          is_open: boolean
          owner_id: string
          revision: number
          session: number
          updated_at: string
        }
        Insert: {
          class_id: string
          closure_reason?: string | null
          created_at?: string
          date: string
          id?: string
          is_open?: boolean
          owner_id?: string
          revision?: number
          session: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          closure_reason?: string | null
          created_at?: string
          date?: string
          id?: string
          is_open?: boolean
          owner_id?: string
          revision?: number
          session?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sessions_class_fkey"
            columns: ["owner_id", "class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string
          archived_at: string | null
          created_at: string
          friday: boolean
          id: string
          monday: boolean
          name: string
          owner_id: string
          saturday: boolean
          thursday: boolean
          tuesday: boolean
          updated_at: string
          wednesday: boolean
        }
        Insert: {
          academic_year_id: string
          archived_at?: string | null
          created_at?: string
          friday?: boolean
          id?: string
          monday?: boolean
          name: string
          owner_id?: string
          saturday?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          wednesday?: boolean
        }
        Update: {
          academic_year_id?: string
          archived_at?: string | null
          created_at?: string
          friday?: boolean
          id?: string
          monday?: boolean
          name?: string
          owner_id?: string
          saturday?: boolean
          thursday?: boolean
          tuesday?: boolean
          updated_at?: string
          wednesday?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_fkey"
            columns: ["owner_id", "academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      command_receipts: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          payload_hash: string
          request_id: string
          result: Json
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          payload_hash: string
          request_id: string
          result: Json
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          payload_hash?: string
          request_id?: string
          result?: Json
        }
        Relationships: []
      }
      enrolments: {
        Row: {
          class_id: string
          created_at: string
          end_date: string | null
          id: string
          owner_id: string
          register_group: Database["public"]["Enums"]["register_group"]
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          owner_id?: string
          register_group: Database["public"]["Enums"]["register_group"]
          start_date: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          owner_id?: string
          register_group?: Database["public"]["Enums"]["register_group"]
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolments_class_fkey"
            columns: ["owner_id", "class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "enrolments_student_fkey"
            columns: ["owner_id", "student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      students: {
        Row: {
          admission_number: string | null
          archived_at: string | null
          created_at: string
          given_names: string
          id: string
          owner_id: string
          surname: string
          updated_at: string
        }
        Insert: {
          admission_number?: string | null
          archived_at?: string | null
          created_at?: string
          given_names: string
          id?: string
          owner_id?: string
          surname: string
          updated_at?: string
        }
        Update: {
          admission_number?: string | null
          archived_at?: string | null
          created_at?: string
          given_names?: string
          id?: string
          owner_id?: string
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_settings: {
        Row: {
          created_at: string
          owner_id: string
          school_name: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          owner_id?: string
          school_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          school_name?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      terms: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          label: string
          owner_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          label: string
          owner_id?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          owner_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_academic_year_fkey"
            columns: ["owner_id", "academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["owner_id", "id"]
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
      attendance_status: "P" | "A" | "L" | "Ex"
      register_group: "Boy" | "Girl"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ["P", "A", "L", "Ex"],
      register_group: ["Boy", "Girl"],
    },
  },
} as const
