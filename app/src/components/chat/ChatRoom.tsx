'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/database.types'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import styles from './ChatRoom.module.css'

import MessageReceipts from './MessageReceipts'

// ... existing imports

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
  const [reads, setReads] = useState<{user_id: string, last_read_at: string}[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Update read receipt
  const markAsRead = useCallback(async () => {
    await supabase
      .from('message_reads')
      .upsert({
        chat_id: chatId,
        user_id: currentUserId,
        last_read_at: new Date().toISOString()
      })
  }, [chatId, currentUserId, supabase])

  // Initial Fetch & Subscription setup
  useEffect(() => {
    async function init() {
      setLoading(true)

      // 1. Messages
      const { data: msgs } = await supabase
        .from('messages')
        .select(`*, media(*)`)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (msgs) setMessages(msgs)

      // 2. Read Receipts
      const { data: readData } = await supabase
        .from('message_reads')
        .select('user_id, last_read_at')
        .eq('chat_id', chatId)
      
      if (readData) setReads(readData)

      setLoading(false)
      markAsRead()
    }

    init()

    // 3. Realtime Subscriptions
    const channel = supabase
      .channel(`chat-room-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev
            // Mark as read when receiving new message while in chat
            markAsRead()
            return [...prev, newMessage]
          })
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'message_reads', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          // Refresh reads state
          const newRead = payload.new as {user_id: string, last_read_at: string}
          if (newRead) {
            setReads(prev => {
              const others = prev.filter(r => r.user_id !== newRead.user_id)
              return [...others, newRead]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatId, supabase, markAsRead])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  const handleSendMessage = async (content: string, mediaFiles?: File[]) => {
    // Optimistically add message
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUserId,
      content: content || null,
      created_at: new Date().toISOString(),
    }
    
    setMessages((prev) => [...prev, optimisticMessage])
    
    const { data: message, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: currentUserId, content: content || null })
      .select()
      .single()

    if (error || !message) {
      console.error('Send error:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      return
    }

    // Replace optimistic
    setMessages(prev => prev.map(m => m.id === tempId ? { ...message, media: [] } : m))
    markAsRead()

    // Handle Media
    if (mediaFiles?.length) {
      for (const file of mediaFiles) {
        const fileExt = file.name.split('.').pop() || 'bin'
        const fileName = `${currentUserId}/${message.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file)

        if (!uploadError) {
          let fileType: 'image' | 'video' | 'audio' = 'image'
          if (file.type.startsWith('video/')) fileType = 'video'
          else if (file.type.startsWith('audio/')) fileType = 'audio'

          await supabase.from('media').insert({
            message_id: message.id,
            uploader_id: currentUserId,
            storage_path: fileName,
            file_type: fileType,
            file_size: file.size,
          })
        }
      }
    }
  }

  const getProfile = (userId: string | null) => profiles.find((p) => p.id === userId)

  // Logic to find who has read up to this message
  // A user has read a message if their last_read_at >= message.created_at
  // AND they haven't read a newer message (we render their face at the *latest* read message)
  const getReadersForMessage = (msg: Message, nextMsg: Message | undefined) => {
    return reads.filter(r => {
      if (r.user_id === currentUserId) return false // Don't show own face
      
      const readAt = new Date(r.last_read_at).getTime()
      const msgTime = new Date(msg.created_at).getTime()
      const nextMsgTime = nextMsg ? new Date(nextMsg.created_at).getTime() : Infinity

      // They read this message
      // AND (there is no next message OR they haven't read the next message yet)
      return readAt >= msgTime && readAt < nextMsgTime
    }).map(r => {
      const p = getProfile(r.user_id)
      return {
        user_id: r.user_id,
        name: p?.display_name || 'Unknown',
        avatar_url: p?.avatar_url || null
      }
    })
  }

  if (loading) return <div className={styles.loading}><div className="spinner" /><p>Loading...</p></div>

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
            const nextMessage = messages[index + 1]
            const prevMessage = messages[index - 1]
            const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id
            const profile = getProfile(message.sender_id)
            const readers = getReadersForMessage(message, nextMessage)

            return (
              <div key={message.id}>
                <MessageBubble
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                  senderName={profile?.display_name || 'Unknown'}
                  senderIdentity={profile?.display_name}
                  showAvatar={showAvatar}
                  media={message.media}
                />
                <MessageReceipts readers={readers} />
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer onSend={handleSendMessage} />
    </div>
  )
}
