'use client'

import { useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Tables } from '@/lib/supabase/database.types'
import styles from './MediaViewer.module.css'

interface MediaWithMeta extends Tables<'media'> {
  uploader?: { display_name: string } | null
}

interface MediaViewerProps {
  media: MediaWithMeta[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
  getMediaUrl: (path: string) => string
  getProfile: (userId: string | null) => Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'> | undefined
}

export default function MediaViewer({
  media,
  currentIndex,
  onClose,
  onNavigate,
  getMediaUrl,
  getProfile,
}: MediaViewerProps) {
  const currentMedia = media[currentIndex]
  const profile = getProfile(currentMedia?.uploader_id || null)

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1)
    }
  }, [currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      onNavigate(currentIndex + 1)
    }
  }, [currentIndex, media.length, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrev, handleNext])

  // Prevent body scroll when viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!currentMedia) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={24} />
        </button>

        {currentIndex > 0 && (
          <button className={`${styles.navButton} ${styles.prevButton}`} onClick={handlePrev}>
            <ChevronLeft size={32} />
          </button>
        )}

        {currentIndex < media.length - 1 && (
          <button className={`${styles.navButton} ${styles.nextButton}`} onClick={handleNext}>
            <ChevronRight size={32} />
          </button>
        )}

        <div className={styles.mediaContainer}>
          {currentMedia.file_type === 'video' ? (
            <video
              key={currentMedia.id}
              src={getMediaUrl(currentMedia.storage_path)}
              controls
              autoPlay
              className={styles.media}
            />
          ) : (
            <img
              key={currentMedia.id}
              src={getMediaUrl(currentMedia.storage_path)}
              alt="Full size"
              className={styles.media}
            />
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.avatar}>
            {profile?.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className={styles.meta}>
            <span className={styles.sender}>
              {profile?.display_name || currentMedia.uploader?.display_name || 'Unknown'}
            </span>
            <span className={styles.date}>
              {format(new Date(currentMedia.created_at), 'MMMM d, yyyy · h:mm a')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
