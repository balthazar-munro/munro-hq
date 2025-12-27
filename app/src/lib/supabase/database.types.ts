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
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
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
          file_type: 'image' | 'video'
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
          file_type: 'image' | 'video'
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
          file_type?: 'image' | 'video'
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

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
