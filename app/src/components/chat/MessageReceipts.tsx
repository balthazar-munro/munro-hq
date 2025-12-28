'use client'

import { getUserColor } from '@/lib/constants/colors'
import styles from './MessageReceipts.module.css'

interface MessageReceiptsProps {
  readers: {
    user_id: string
    name: string
    avatar_url: string | null
  }[]
}

export default function MessageReceipts({ readers }: MessageReceiptsProps) {
  if (!readers || readers.length === 0) return null

  return (
    <div className={styles.container}>
      {readers.map((reader) => (
        <div 
          key={reader.user_id} 
          className={styles.avatar}
          title={`Seen by ${reader.name}`}
          style={{ backgroundColor: getUserColor(reader.user_id) }}
        >
          {reader.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  )
}
