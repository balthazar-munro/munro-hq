'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/database.types'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import styles from './ChatRoom.module.css'

interface Message extends Tables<'messages'> {
  media?: Tables<'media'>[]
}

interface ChatRoomProps {
  chatId: string
  currentUserId: string
  profiles: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>[]
}

export default function ChatRoom({ chatId, currentUserId, profiles }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      setLoading(true)
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          media(*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (data) {
        setMessages(data)
      }
      setLoading(false)
    }

    fetchMessages()
  }, [chatId, supabase])

  // Subscribe to new messages via Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          console.log('🔔 Realtime message received:', payload)
          
          // Check if we already have this message (e.g., from optimistic update)
          const messageId = payload.new.id as string
          setMessages((prev) => {
            if (prev.some(m => m.id === messageId)) {
              return prev // Already have it
            }
            // Add the new message
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status)
      })

    return () => {
      console.log('🔔 Unsubscribing from realtime')
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async (content: string, mediaFiles?: File[]) => {
    // Optimistically add message to UI immediately
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUserId,
      content: content || null,
      created_at: new Date().toISOString(),
    }
    
    setMessages((prev) => [...prev, optimisticMessage])
    
    // Create message in database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: content || null,
      })
      .select()
      .single()

    if (messageError || !message) {
      console.error('Failed to send message:', messageError)
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter(m => m.id !== tempId))
      alert('Failed to send message: ' + (messageError?.message || 'Unknown error'))
      return
    }

    // Replace optimistic message with real one
    setMessages((prev) => prev.map(m => m.id === tempId ? { ...message, media: [] } : m))

    // Upload media if present
    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${currentUserId}/${message.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Failed to upload media:', uploadError)
          continue
        }

        // Create media record
        const isVideo = file.type.startsWith('video/')
        await supabase.from('media').insert({
          message_id: message.id,
          uploader_id: currentUserId,
          storage_path: fileName,
          file_type: isVideo ? 'video' : 'image',
          file_size: file.size,
        })
      }
    }
  }

  const getProfile = (userId: string | null) => {
    return profiles.find((p) => p.id === userId)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner" />
        <p>Loading messages...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <p>No messages yet</p>
            <p className={styles.hint}>Send the first message!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const prevMessage = messages[index - 1]
            const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id
            const profile = getProfile(message.sender_id)

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_id === currentUserId}
                senderName={profile?.display_name || 'Unknown'}
                senderIdentity={profile?.display_name}
                showAvatar={showAvatar}
                media={message.media}
              />
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer onSend={handleSendMessage} />
    </div>
  )
}
