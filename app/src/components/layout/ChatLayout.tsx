'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Tables } from '@/lib/supabase/database.types'
import ChatList from '@/components/chat/ChatList'
import ChatRoom from '@/components/chat/ChatRoom'
import BottomNav from '@/components/layout/BottomNav'
import Header from '@/components/layout/Header'
import styles from './ChatLayout.module.css'

interface ChatLayoutProps {
  user: User
  profile: Tables<'profiles'> | null
  profiles: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>[]
  chats: Pick<Tables<'chats'>, 'id' | 'name' | 'is_group' | 'created_at'>[]
}

export default function ChatLayout({ user, profile, profiles, chats }: ChatLayoutProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const selectedChat = chats.find(c => c.id === selectedChatId)

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId)
    setMobileShowChat(true)
  }

  const handleBack = () => {
    setMobileShowChat(false)
  }

  return (
    <div className={styles.container}>
      <Header 
        profile={profile} 
        showBackButton={mobileShowChat}
        onBack={handleBack}
        chatName={selectedChat?.name || undefined}
      />

      <div className={styles.main}>
        {/* Chat List - hidden on mobile when viewing a chat */}
        <aside className={`${styles.sidebar} ${mobileShowChat ? styles.hiddenMobile : ''}`}>
          <ChatList
            chats={chats}
            profiles={profiles}
            currentUserId={user.id}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
          />
        </aside>

        {/* Chat Room - visible on mobile only when selected */}
        <main className={`${styles.content} ${!mobileShowChat ? styles.hiddenMobile : ''}`}>
          {selectedChatId ? (
            <ChatRoom
              key={selectedChatId}
              chatId={selectedChatId}
              currentUserId={user.id}
              profiles={profiles}
            />
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <h2>Welcome to Munro HQ</h2>
              <p>Select a chat to start messaging</p>
            </div>
          )}
        </main>
      </div>

      <BottomNav activeTab="chat" />
    </div>
  )
}
