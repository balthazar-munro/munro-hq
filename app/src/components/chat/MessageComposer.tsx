'use client'

import { useState, useRef } from 'react'
import { Send, ImagePlus, X, Loader2, Mic } from 'lucide-react'
import AudioRecorder from './AudioRecorder'
import styles from './MessageComposer.module.css'

interface MessageComposerProps {
  onSend: (content: string, media?: File[]) => Promise<void>
}

export default function MessageComposer({ onSend }: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    )

    if (validFiles.length > 0) {
      setMediaFiles((prev) => [...prev, ...validFiles])
      
      // Generate previews
      validFiles.forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviews((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && mediaFiles.length === 0) return

    setSending(true)
    try {
      await onSend(content.trim(), mediaFiles.length > 0 ? mediaFiles : undefined)
      setContent('')
      setMediaFiles([])
      setPreviews([])
    } finally {
      setSending(false)
    }
  }

  const handleVoiceComplete = async (blob: Blob) => {
    setIsRecording(false)
    setSending(true)
    try {
      const file = new File([blob], 'voice-note.webm', { type: 'audio/webm' })
      await onSend('', [file])
    } catch (err) {
      console.error('Failed to send voice note:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  if (isRecording) {
    return (
      <div className={styles.composer}>
        <AudioRecorder 
          onRecordingComplete={handleVoiceComplete}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.composer}>
      {previews.length > 0 && (
        <div className={styles.previews}>
          {previews.map((preview, index) => (
            <div key={index} className={styles.previewItem}>
              {mediaFiles[index]?.type.startsWith('video/') ? (
                <video src={preview} className={styles.previewMedia} />
              ) : (
                <img src={preview} alt="Preview" className={styles.previewMedia} />
              )}
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeMedia(index)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.inputRow}>
        <button
          type="button"
          className={styles.mediaButton}
          onClick={() => setIsRecording(true)}
          disabled={sending || content.length > 0 || mediaFiles.length > 0}
          title="Record Voice Note"
        >
          <Mic size={22} />
        </button>

        <button
          type="button"
          className={styles.mediaButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <ImagePlus size={22} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className={styles.fileInput}
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            adjustTextareaHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={styles.input}
          rows={1}
          disabled={sending}
        />

        <button
          type="submit"
          className={styles.sendButton}
          disabled={sending || (!content.trim() && mediaFiles.length === 0)}
        >
          {sending ? <Loader2 size={20} className={styles.spinner} /> : <Send size={20} />}
        </button>
      </div>
    </form>
  )
}
