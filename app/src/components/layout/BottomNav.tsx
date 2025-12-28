'use client'

import Link from 'next/link'
import { MessageSquare, Image as ImageIcon, Settings } from 'lucide-react'
import styles from './BottomNav.module.css'

interface BottomNavProps {
  activeTab: 'chat' | 'photos' | 'settings'
}

export default function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      <Link 
        href="/chat" 
        className={`${styles.navItem} ${activeTab === 'chat' ? styles.active : ''}`}
      >
        <MessageSquare size={24} />
        <span>Chat</span>
      </Link>
      <Link 
        href="/photos" 
        className={`${styles.navItem} ${activeTab === 'photos' ? styles.active : ''}`}
      >
        <ImageIcon size={24} />
        <span>Photos</span>
      </Link>
      <Link 
        href="/settings" 
        className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`}
      >
        <Settings size={24} />
        <span>Settings</span>
      </Link>
    </nav>
  )
}

