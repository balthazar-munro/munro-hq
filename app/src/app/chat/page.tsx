import { createClient } from '@/lib/supabase/server'
import ChatLayout from '@/components/layout/ChatLayout'
import ChatClientWrapper from './ChatClientWrapper'
import LocalChatView from './LocalChatView'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If we have a Supabase authenticated user, show full chat with their data
  if (user) {
    // Fetch user's chats with members
    const { data: chatMemberships } = await supabase
      .from('chat_members')
      .select(`
        chat:chats(
          id,
          name,
          is_group,
          created_at
        )
      `)
      .eq('user_id', user.id)

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch all profiles for chat member display
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')

    const chats = chatMemberships
      ?.map(m => m.chat)
      .filter((chat): chat is NonNullable<typeof chat> => chat !== null)
      .sort((a, b) => {
        // Put group chats first
        if (a.is_group && !b.is_group) return -1
        if (!a.is_group && b.is_group) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }) || []

    return (
      <ChatLayout
        user={user}
        profile={profile}
        profiles={profiles || []}
        chats={chats}
      />
    )
  }

  // No Supabase user - check for local PIN session (client-side)
  return (
    <ChatClientWrapper>
      <LocalChatView />
    </ChatClientWrapper>
  )
}
