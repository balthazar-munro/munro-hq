'use client'

import { Tables } from '@/lib/supabase/database.types'
import { ArrowLeft, Settings, UserPlus } from 'lucide-react'
import Link from 'next/link'
import styles from './Header.module.css'

interface HeaderProps {
  profile: Tables<'profiles'> | null
  showBackButton?: boolean
  onBack?: () => void
  chatName?: string
}

export default function Header({ profile, showBackButton, onBack, chatName }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBackButton ? (
          <button onClick={onBack} className={styles.backButton}>
            <ArrowLeft size={20} />
          </button>
        ) : (
          <h1 className={styles.logo}>Munro HQ</h1>
        )}
        {chatName && <span className={styles.chatName}>{chatName}</span>}
      </div>

      <div className={styles.right}>
        <Link href="/invite/create" className={styles.iconButton} title="Invite family member">
          <UserPlus size={20} />
        </Link>
        <Link href="/settings" className={styles.iconButton} title="Settings">
          <Settings size={20} />
        </Link>
        <div className={styles.avatar}>
          {profile?.display_name?.charAt(0).toUpperCase() || '?'}
        </div>
      </div>
    </header>
  )
}
