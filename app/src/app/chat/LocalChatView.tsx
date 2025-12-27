'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FAMILY_IDENTITIES, USER_COLORS, USER_COLORS_LIGHT, getInitials } from '@/lib/constants/colors'
import { LogOut, MessageSquare, Users, Send, ImagePlus, X } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import styles from './LocalChatView.module.css'

// Parents list
const PARENTS = ['Peter', 'Delphine'] as const

// Group chats for the family
const FAMILY_CHATS = [
  { id: 'family', name: 'Family Chat', icon: '🏠', members: [...FAMILY_IDENTITIES], isGroup: true },
  { id: 'parents', name: 'Parents', icon: '👫', members: [...PARENTS], isGroup: true },
  // Parent pair + each child
  { id: 'parents-balthazar', name: 'Parents & Balthazar', icon: '👨‍👩‍👦', members: [...PARENTS, 'Balthazar'], isGroup: true },
  { id: 'parents-olympia', name: 'Parents & Olympia', icon: '👨‍👩‍👧', members: [...PARENTS, 'Olympia'], isGroup: true },
  { id: 'parents-casi', name: 'Parents & Casi', icon: '👨‍👩‍👧', members: [...PARENTS, 'Casi'], isGroup: true },
]

// Generate 1-on-1 chats with other family members
const generate1on1Chats = (currentUser: string | null) => {
  if (!currentUser) return []
  return FAMILY_IDENTITIES
    .filter(name => name !== currentUser)
    .map(name => ({
      id: `dm-${name.toLowerCase()}`,
      name,
      icon: null,
      members: [currentUser, name],
      isGroup: false,
    }))
}

// Message type
interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
  media?: { url: string; type: 'image' | 'video' }[]
}

export default function LocalChatView() {
  const router = useRouter()
  const [currentIdentity] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('current_identity')
    }
    return null
  })
  const [selectedChat, setSelectedChat] = useState<string>('family')
  const [message, setMessage] = useState('')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  // Store messages per chat
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({})
  // Media upload state
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSwitchIdentity = () => {
    sessionStorage.removeItem('pin_unlocked')
    sessionStorage.removeItem('pin_unlocked_at')
    sessionStorage.removeItem('current_identity')
    router.push('/login')
  }

  const color = currentIdentity 
    ? USER_COLORS[currentIdentity as keyof typeof USER_COLORS] || '#5c4033'
    : '#5c4033'

  const allChats = [...FAMILY_CHATS, ...generate1on1Chats(currentIdentity)]
  const currentChat = allChats.find(c => c.id === selectedChat)
  const messages = chatMessages[selectedChat] || []

  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId)
    setMobileShowChat(true)
  }

  const handleBack = () => {
    setMobileShowChat(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    )

    if (validFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...validFiles])
      
      // Generate previews
      validFiles.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setMediaPreviews(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = () => {
    if ((!message.trim() && mediaFiles.length === 0) || !currentIdentity) return

    const mediaPreviews_copy = mediaPreviews.map((preview, i) => ({
      url: preview,
      type: (mediaFiles[i]?.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video'
    }))

    const newMessage: Message = {
      id: `${Date.now()}`,
      sender: currentIdentity,
      content: message.trim(),
      timestamp: new Date(),
      media: mediaPreviews_copy.length > 0 ? mediaPreviews_copy : undefined,
    }

    setChatMessages(prev => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), newMessage],
    }))
    setMessage('')
    setMediaFiles([])
    setMediaPreviews([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Filter chats to only show ones the user is a member of
  const visibleGroupChats = FAMILY_CHATS.filter(chat => 
    chat.members.includes(currentIdentity || '')
  )

  // Get light color variant for backgrounds
  const colorLight = currentIdentity 
    ? USER_COLORS_LIGHT[currentIdentity as keyof typeof USER_COLORS_LIGHT] || '#faf8f5'
    : '#faf8f5'

  return (
    <div 
      className={styles.container}
      style={{
        '--user-accent': color,
        '--user-accent-light': colorLight,
      } as React.CSSProperties}
    >
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {mobileShowChat ? (
            <>
              <button onClick={handleBack} className={styles.backButton}>
                ← Back
              </button>
              <span className={styles.chatTitle}>{currentChat?.icon} {currentChat?.name}</span>
            </>
          ) : (
            <h1 className={styles.logo}>Munro HQ</h1>
          )}
          <div className={styles.headerRight}>
            <button 
              onClick={handleSwitchIdentity}
              className={styles.switchButton}
              title="Switch Identity"
            >
              <LogOut size={18} />
            </button>
            {currentIdentity && (
              <div 
                className={styles.avatar}
                style={{ backgroundColor: color }}
              >
                {getInitials(currentIdentity)}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* Chat List Sidebar */}
        <aside className={`${styles.sidebar} ${mobileShowChat ? styles.hiddenMobile : ''}`}>
          <div className={styles.chatList}>
            <div className={styles.chatSection}>
              <h3 className={styles.sectionTitle}>
                <Users size={16} />
                Group Chats
              </h3>
              {visibleGroupChats.map(chat => (
                <button
                  key={chat.id}
                  className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <span className={styles.chatIcon}>{chat.icon}</span>
                  <span className={styles.chatName}>{chat.name}</span>
                </button>
              ))}
            </div>
            
            <div className={styles.chatSection}>
              <h3 className={styles.sectionTitle}>
                <MessageSquare size={16} />
                Direct Messages
              </h3>
              {generate1on1Chats(currentIdentity).map(chat => {
                const memberColor = USER_COLORS[chat.name as keyof typeof USER_COLORS]
                return (
                  <button
                    key={chat.id}
                    className={`${styles.chatItem} ${selectedChat === chat.id ? styles.selected : ''}`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <div 
                      className={styles.chatAvatar}
                      style={{ backgroundColor: memberColor }}
                    >
                      {getInitials(chat.name)}
                    </div>
                    <span className={styles.chatName}>{chat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Chat Room */}
        <main className={`${styles.chatRoom} ${!mobileShowChat ? styles.hiddenMobile : ''}`}>
          <div className={styles.messagesArea}>
            {messages.length === 0 ? (
              <div className={styles.welcomeMessage}>
                <div className={styles.welcomeIcon}>
                  {currentChat?.icon || '💬'}
                </div>
                <h2>Welcome to {currentChat?.name}</h2>
                <p>This is the beginning of your conversation.</p>
                <p className={styles.welcomeHint}>
                  Messages you send here will be shared with{' '}
                  {currentChat?.isGroup 
                    ? 'all members in this group'
                    : currentChat?.name
                  }
                </p>
              </div>
            ) : (
              <div className={styles.messagesList}>
                {messages.map((msg) => {
                  const isOwn = msg.sender === currentIdentity
                  const senderColor = USER_COLORS[msg.sender as keyof typeof USER_COLORS] || '#5c4033'
                  return (
                    <div 
                      key={msg.id} 
                      className={`${styles.messageBubble} ${isOwn ? styles.ownMessage : ''}`}
                    >
                      {!isOwn && (
                        <div 
                          className={styles.messageAvatar}
                          style={{ backgroundColor: senderColor }}
                        >
                          {getInitials(msg.sender)}
                        </div>
                      )}
                      <div className={styles.messageContent}>
                        {!isOwn && (
                          <span className={styles.messageSender} style={{ color: senderColor }}>
                            {msg.sender}
                          </span>
                        )}
                        {msg.media && msg.media.length > 0 && (
                          <div className={styles.messageMedia}>
                            {msg.media.map((m, idx) => (
                              m.type === 'video' ? (
                                <video key={idx} src={m.url} className={styles.mediaThumb} controls />
                              ) : (
                                <img key={idx} src={m.url} alt="Shared media" className={styles.mediaThumb} />
                              )
                            ))}
                          </div>
                        )}
                        {msg.content && <p className={styles.messageText}>{msg.content}</p>}
                        <span className={styles.messageTime}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Media Previews */}
          {mediaPreviews.length > 0 && (
            <div className={styles.previews}>
              {mediaPreviews.map((preview, index) => (
                <div key={index} className={styles.previewItem}>
                  {mediaFiles[index]?.type.startsWith('video/') ? (
                    <video src={preview} className={styles.previewMedia} />
                  ) : (
                    <img src={preview} alt="Preview" className={styles.previewMedia} />
                  )}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeMedia(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.composer}>
            <button
              type="button"
              className={styles.mediaButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={22} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className={styles.fileInput}
            />

            <input
              type="text"
              placeholder={`Message ${currentChat?.name}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.input}
            />
            <button 
              className={styles.sendButton} 
              disabled={!message.trim() && mediaFiles.length === 0}
              onClick={handleSendMessage}
            >
              <Send size={20} />
            </button>
          </div>
        </main>
      </div>

      <BottomNav activeTab="chat" />
    </div>
  )
}
