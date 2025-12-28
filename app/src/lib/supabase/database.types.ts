export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          status_emoji: string | null
          status_text: string | null
          status_updated_at: string | null
          family_identity: string | null
          accent_color: string | null
          pin_hash: string | null
          pin_set_at: string | null
          pin_failed_attempts: number
          pin_lockout_until: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          status_emoji?: string | null
          status_text?: string | null
          status_updated_at?: string | null
          family_identity?: string | null
          accent_color?: string | null
          pin_hash?: string | null
          pin_set_at?: string | null
          pin_failed_attempts?: number
          pin_lockout_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          status_emoji?: string | null
          status_text?: string | null
          status_updated_at?: string | null
          family_identity?: string | null
          accent_color?: string | null
          pin_hash?: string | null
          pin_set_at?: string | null
          pin_failed_attempts?: number
          pin_lockout_until?: string | null
          created_at?: string
        }
        Relationships: []
      }
      /* ... other tables ... */
      invites: {
        Row: {
          id: string
          code: string
          created_by: string | null
          email: string | null
          expires_at: string
          used_at: string | null
          used_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code?: string
          created_by?: string | null
          email?: string | null
          expires_at: string
          used_at?: string | null
          used_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invites_used_by_fkey'
            columns: ['used_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      chats: {
        Row: {
          id: string
          name: string | null
          is_group: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          is_group?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          is_group?: boolean
          created_at?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          chat_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          chat_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          chat_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_members_chat_id_fkey'
            columns: ['chat_id']
            isOneToOne: false
            referencedRelation: 'chats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string | null
          content: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id?: string | null
          content?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string | null
          content?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_chat_id_fkey'
            columns: ['chat_id']
            isOneToOne: false
            referencedRelation: 'chats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      media: {
        Row: {
          id: string
          message_id: string
          uploader_id: string | null
          storage_path: string
          file_type: 'image' | 'video' | 'audio'
          file_size: number | null
          width: number | null
          height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          uploader_id?: string | null
          storage_path: string
          file_type: 'image' | 'video' | 'audio'
          file_size?: number | null
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          uploader_id?: string | null
          storage_path?: string
          file_type?: 'image' | 'video' | 'audio'
          file_size?: number | null
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'media_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'media_uploader_id_fkey'
            columns: ['uploader_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      message_reads: {
        Row: {
          chat_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          chat_id: string
          user_id: string
          last_read_at?: string
        }
        Update: {
          chat_id?: string
          user_id?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_reads_chat_id_fkey'
            columns: ['chat_id']
            isOneToOne: false
            referencedRelation: 'chats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'message_reads_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_pin: {
        Args: {
          user_uuid: string
          pin_input: string
        }
        Returns: boolean
      }
      set_pin: {
        Args: {
          user_uuid: string
          new_pin: string
        }
        Returns: boolean
      }
      claim_identity: {
        Args: {
          user_uuid: string
          identity: string
        }
        Returns: boolean
      }
      get_available_identities: {
        Args: Record<PropertyKey, never>
        Returns: {
          identity: string
          is_claimed: boolean
          color: string
        }[]
      }
      get_user_color: {
        Args: {
          identity: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
