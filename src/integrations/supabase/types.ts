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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          action: string
          created_at: string
          file_id: string
          id: string
          model_version: string | null
          reason: string | null
          target_file_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          file_id: string
          id?: string
          model_version?: string | null
          reason?: string | null
          target_file_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          file_id?: string
          id?: string
          model_version?: string | null
          reason?: string | null
          target_file_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_target_file_id_fkey"
            columns: ["target_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      anomaly_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: []
      }
      file_predictions: {
        Row: {
          confidence: number
          created_at: string
          expires_at: string
          file_id: string
          id: string
          interacted_at: string | null
          prediction_type: string
          reason: string | null
          shown_at: string | null
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          confidence: number
          created_at?: string
          expires_at: string
          file_id: string
          id?: string
          interacted_at?: string | null
          prediction_type: string
          reason?: string | null
          shown_at?: string | null
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          confidence?: number
          created_at?: string
          expires_at?: string
          file_id?: string
          id?: string
          interacted_at?: string | null
          prediction_type?: string
          reason?: string | null
          shown_at?: string | null
          user_id?: string
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "file_predictions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          checksum: string | null
          file_id: string
          file_size: number
          id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          checksum?: string | null
          file_id: string
          file_size: number
          id?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
          version: number
        }
        Update: {
          checksum?: string | null
          file_id?: string
          file_size?: number
          id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          ai_confidence: number | null
          ai_last_scanned_at: string | null
          ai_suggested_tags: string[] | null
          archived_at: string | null
          checksum: string | null
          content_hash: string | null
          created_at: string
          deleted_at: string | null
          duplicate_of: string[] | null
          duplicate_status:
            | Database["public"]["Enums"]["duplicate_status"]
            | null
          embedding: string | null
          embedding_id: string | null
          file_size: number
          filename: string
          folders: string[] | null
          id: string
          is_archived: boolean
          is_deleted: boolean
          language: string | null
          mime_type: string
          ocr_status: Database["public"]["Enums"]["ocr_status"] | null
          ocr_text: string | null
          original_name: string
          parent_file_id: string | null
          similarity_score: number | null
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          ai_confidence?: number | null
          ai_last_scanned_at?: string | null
          ai_suggested_tags?: string[] | null
          archived_at?: string | null
          checksum?: string | null
          content_hash?: string | null
          created_at?: string
          deleted_at?: string | null
          duplicate_of?: string[] | null
          duplicate_status?:
            | Database["public"]["Enums"]["duplicate_status"]
            | null
          embedding?: string | null
          embedding_id?: string | null
          file_size: number
          filename: string
          folders?: string[] | null
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          language?: string | null
          mime_type: string
          ocr_status?: Database["public"]["Enums"]["ocr_status"] | null
          ocr_text?: string | null
          original_name: string
          parent_file_id?: string | null
          similarity_score?: number | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          ai_confidence?: number | null
          ai_last_scanned_at?: string | null
          ai_suggested_tags?: string[] | null
          archived_at?: string | null
          checksum?: string | null
          content_hash?: string | null
          created_at?: string
          deleted_at?: string | null
          duplicate_of?: string[] | null
          duplicate_status?:
            | Database["public"]["Enums"]["duplicate_status"]
            | null
          embedding?: string | null
          embedding_id?: string | null
          file_size?: number
          filename?: string
          folders?: string[] | null
          id?: string
          is_archived?: boolean
          is_deleted?: boolean
          language?: string | null
          mime_type?: string
          ocr_status?: Database["public"]["Enums"]["ocr_status"] | null
          ocr_text?: string | null
          original_name?: string
          parent_file_id?: string | null
          similarity_score?: number | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "files_parent_file_id_fkey"
            columns: ["parent_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      match_files: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          id: string
          original_name: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "secretary" | "viewer"
      duplicate_status: "suggested" | "confirmed" | "rejected"
      ocr_status: "pending" | "processing" | "done" | "failed"
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
      app_role: ["admin", "secretary", "viewer"],
      duplicate_status: ["suggested", "confirmed", "rejected"],
      ocr_status: ["pending", "processing", "done", "failed"],
    },
  },
} as const
