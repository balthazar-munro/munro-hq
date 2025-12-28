'use client'

import { Tables } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { getUserColor } from '@/lib/constants/colors'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  message: Tables<'messages'>
  isOwn: boolean
  senderName: string
  senderIdentity?: string | null
  showAvatar: boolean
  media?: Tables<'media'>[]
}

export default function MessageBubble({
  message,
  isOwn,
  senderName,
  senderIdentity,
  showAvatar,
  media,
}: MessageBubbleProps) {
  const supabase = createClient()
  const userColor = getUserColor(senderIdentity || senderName)

  const getMediaUrl = (path: string) => {
    if (path.startsWith('blob:')) return path
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className={`${styles.container} ${isOwn ? styles.own : ''}`}>
      {showAvatar && !isOwn && (
        <div 
          className={styles.avatar}
          style={{ backgroundColor: userColor }}
        >
          {senderName.charAt(0).toUpperCase()}
        </div>
      )}
      {!showAvatar && !isOwn && <div className={styles.avatarSpacer} />}

      <div 
        className={styles.bubble}
        style={{ 
          '--sender-color': userColor,
          borderLeftColor: !isOwn ? userColor : undefined,
        } as React.CSSProperties}
      >
        {showAvatar && !isOwn && (
          <span 
            className={styles.senderName}
            style={{ color: userColor }}
          >
            {senderName}
          </span>
        )}

        {media && media.length > 0 && (
          <div className={styles.mediaGrid}>
            {media.map((item) => (
              <div key={item.id} className={styles.mediaItem}>
                {item.file_type === 'audio' ? (
                  <audio
                    src={getMediaUrl(item.storage_path)}
                    controls
                    className={styles.audio}
                  />
                ) : item.file_type === 'video' ? (
                  <video
                    src={getMediaUrl(item.storage_path)}
                    controls
                    className={styles.media}
                  />
                ) : (
                  <img
                    src={getMediaUrl(item.storage_path)}
                    alt="Shared media"
                    className={styles.media}
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {message.content && (
          <p className={styles.content}>{message.content}</p>
        )}

        <span className={styles.time}>
          {format(new Date(message.created_at), 'HH:mm')}
        </span>
      </div>
    </div>
  )
}
