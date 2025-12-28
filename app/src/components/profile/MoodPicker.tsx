'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/lib/supabase/database.types'
import { Smile, X } from 'lucide-react'
import styles from './MoodPicker.module.css'

const MOOD_PRESETS = [
  { emoji: '👋', text: 'Available' },
  { emoji: '☕', text: 'Coffee break' },
  { emoji: '💻', text: 'Working' },
  { emoji: '🏠', text: 'At home' },
  { emoji: '🚗', text: 'Driving' },
  { emoji: '😴', text: 'Sleeping' },
  { emoji: '🔋', text: 'Recharging' },
  { emoji: '🎉', text: 'Celebrating' },
]

interface MoodPickerProps {
  profile: Tables<'profiles'>
}

export default function MoodPicker({ profile }: MoodPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [statusText, setStatusText] = useState(profile.status_text || '')
  const [selectedEmoji, setSelectedEmoji] = useState(profile.status_emoji || '👋')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleUpdate = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          status_emoji: selectedEmoji,
          status_text: statusText,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (!error) {
        setIsOpen(false)
        // Optimistically update provided profile object if needed, 
        // but parent should ideally swr/revalidate
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className={styles.trigger}
        title="Set Status"
      >
        <span className={styles.emoji}>{profile.status_emoji || '👋'}</span>
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <h3>Set Status</h3>
              <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.preview}>
                <span className={styles.previewEmoji}>{selectedEmoji}</span>
                <input
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's happening?"
                  className={styles.input}
                />
              </div>

              <div className={styles.presets}>
                {MOOD_PRESETS.map((preset) => (
                  <button
                    key={preset.text}
                    className={`${styles.presetBtn} ${selectedEmoji === preset.emoji ? styles.active : ''}`}
                    onClick={() => {
                      setSelectedEmoji(preset.emoji)
                      setStatusText(preset.text)
                    }}
                  >
                    <span className={styles.presetEmoji}>{preset.emoji}</span>
                    <span className={styles.presetText}>{preset.text}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleUpdate} 
                className={styles.saveBtn}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Set Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
