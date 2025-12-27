'use client'

import { Tables } from '@/lib/supabase/database.types'
import styles from './ChatList.module.css'

interface ChatListProps {
  chats: Pick<Tables<'chats'>, 'id' | 'name' | 'is_group' | 'created_at'>[]
  profiles: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>[]
  currentUserId: string
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
}

export default function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
}: ChatListProps) {
  if (chats.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No chats yet</p>
        <p className={styles.hint}>Invite family members to get started</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h2>Chats</h2>
      </div>
      {chats.map((chat) => (
        <button
          key={chat.id}
          className={`${styles.chatItem} ${selectedChatId === chat.id ? styles.active : ''}`}
          onClick={() => onSelectChat(chat.id)}
        >
          <div className={styles.avatar}>
            {chat.is_group ? '👪' : '💬'}
          </div>
          <div className={styles.info}>
            <span className={styles.name}>
              {chat.name || 'Private Chat'}
            </span>
            <span className={styles.preview}>
              {chat.is_group ? 'Family group' : 'Direct message'}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}
