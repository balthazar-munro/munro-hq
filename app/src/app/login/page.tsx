'use client'

import { Suspense } from 'react'
import LoginForm from './LoginForm'
import styles from './page.module.css'
import { Loader2 } from 'lucide-react'

function LoadingFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Loader2 size={32} className={styles.spinner} />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  )
}
