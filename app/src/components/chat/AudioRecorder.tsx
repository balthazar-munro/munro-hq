'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2, Send } from 'lucide-react'
import styles from './AudioRecorder.module.css'

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  onCancel: () => void
}

export default function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    startRecording()
    return () => stopRecording(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // stream.getTracks().forEach(track => track.stop())
        // tracks stopped in stopRecording to ensure clean cleanup
      }

      mediaRecorder.start()
      isRecordingRef.current = true

      // Start timer
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)

    } catch (err) {
      console.error('Error starting recording:', err)
      onCancel()
    }
  }

  const stopRecording = (shouldSave: boolean) => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const stream = mediaRecorderRef.current?.stream
        stream?.getTracks().forEach(track => track.stop())
        
        if (shouldSave) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          onRecordingComplete(blob)
        }
      }
      mediaRecorderRef.current.stop()
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    isRecordingRef.current = false
  }

  const handleStopAndSend = () => {
    stopRecording(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={styles.recorder}>
      <div className={styles.status}>
        <div className={styles.pulse} />
        <span className={styles.timer}>{formatTime(duration)}</span>
      </div>
      
      <div className={styles.controls}>
        <button 
          onClick={() => { stopRecording(false); onCancel(); }}
          className={styles.cancelBtn}
        >
          <Trash2 size={20} />
          Cancel
        </button>
        <button 
          onClick={handleStopAndSend}
          className={styles.sendBtn}
        >
          <Send size={20} />
          Send Voice
        </button>
      </div>
    </div>
  )
}
