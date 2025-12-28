'use client'

import { useMemo, useState } from 'react'
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns'
import { Tables } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/client'
import MediaViewer from './MediaViewer'
import styles from './PhotosTimeline.module.css'

interface MediaWithMeta extends Tables<'media'> {
  uploader?: { display_name: string } | null
}

interface PhotosTimelineProps {
  initialMedia: MediaWithMeta[]
  profiles: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>[]
}

interface GroupedMedia {
  date: string
  label: string
  items: MediaWithMeta[]
}

export default function PhotosTimeline({ initialMedia, profiles }: PhotosTimelineProps) {
  const [allMedia, setAllMedia] = useState<MediaWithMeta[]>(initialMedia)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMedia.length >= 20)
  
  const [selectedMedia, setSelectedMedia] = useState<MediaWithMeta | null>(null)
  const [viewerIndex, setViewerIndex] = useState(0)
  const supabase = createClient()

  const getMediaUrl = (path: string) => {
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return data.publicUrl
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    const currentCount = allMedia.length
    
    try {
      const { data: newMedia, error } = await supabase
        .from('media')
        .select(`
          *,
          uploader:profiles!media_uploader_id_fkey(display_name)
        `)
        .order('created_at', { ascending: false })
        .range(currentCount, currentCount + 19) // Fetch next 20

      if (error) throw error

      if (newMedia && newMedia.length > 0) {
        setAllMedia(prev => [...prev, ...newMedia])
        if (newMedia.length < 20) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error loading more photos:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const groupedMedia = useMemo(() => {
    const groups: GroupedMedia[] = []
    let currentGroup: GroupedMedia | null = null

    allMedia.forEach((item) => {
      const date = parseISO(item.created_at)
      const dateStr = format(date, 'yyyy-MM-dd')

      if (!currentGroup || currentGroup.date !== dateStr) {
        // Check if this is today, this week, or needs month/year label
        const now = new Date()
        let label: string

        if (isSameDay(date, now)) {
          label = 'Today'
        } else if (isSameMonth(date, now)) {
          label = format(date, 'EEEE, MMMM d')
        } else {
          label = format(date, 'MMMM d, yyyy')
        }

        currentGroup = {
          date: dateStr,
          label,
          items: [],
        }
        groups.push(currentGroup)
      }

      currentGroup.items.push(item)
    })

    return groups
  }, [allMedia])

  const handleMediaClick = (item: MediaWithMeta, index: number) => {
    setSelectedMedia(item)
    setViewerIndex(index)
  }

  const getProfile = (userId: string | null) => {
    return profiles.find((p) => p.id === userId)
  }

  if (allMedia.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📷</div>
        <h2>No photos yet</h2>
        <p>Photos and videos shared in chats will appear here</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {groupedMedia.map((group) => (
        <section key={group.date} className={styles.section}>
          <h2 className={styles.dateLabel}>{group.label}</h2>
          <div className={styles.grid}>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={styles.gridItem}
                onClick={() => handleMediaClick(item, allMedia.indexOf(item))}
              >
                {item.file_type === 'video' ? (
                  <div className={styles.videoThumb}>
                    <video
                      src={getMediaUrl(item.storage_path)}
                      className={styles.media}
                    />
                    <div className={styles.playIcon}>▶</div>
                  </div>
                ) : (
                  <img
                    src={getMediaUrl(item.storage_path)}
                    alt="Shared photo"
                    className={styles.media}
                    loading="lazy"
                  />
                )}
              </button>
            ))}
          </div>
        </section>
      ))}

      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button 
            onClick={loadMore} 
            disabled={loadingMore}
            className={styles.loadMoreBtn}
          >
            {loadingMore ? 'Loading...' : 'Load More Photos'}
          </button>
        </div>
      )}

      {selectedMedia && (
        <MediaViewer
          media={allMedia}
          currentIndex={viewerIndex}
          onClose={() => setSelectedMedia(null)}
          onNavigate={setViewerIndex}
          getMediaUrl={getMediaUrl}
          getProfile={getProfile}
        />
      )}
    </div>
  )
}
