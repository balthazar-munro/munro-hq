import { createClient } from '@/lib/supabase/server'
import PhotosTimeline from '@/components/media/PhotosTimeline'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import LocalPhotosView from './LocalPhotosView'
import styles from './page.module.css'

export default async function PhotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If Supabase authenticated, show full photos experience
  if (user) {
    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch latest media - Limit to 20 for initial load
    // Client component will handle "Load More"
    const { data: initialMedia } = await supabase
      .from('media')
      .select(`
        *,
        uploader:profiles!media_uploader_id_fkey(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch all profiles for display
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')

    return (
      <div className={styles.container}>
        <Header profile={profile} />
        <main className={styles.main}>
          <PhotosTimeline 
            initialMedia={initialMedia || []} 
            profiles={profiles || []}
          />
        </main>
        <BottomNav activeTab="photos" />
      </div>
    )
  }

  // For PIN-authenticated users, show local photos view
  return <LocalPhotosView />
}
