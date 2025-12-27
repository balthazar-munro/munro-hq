import Link from 'next/link'
import styles from './page.module.css'

export default function OfflinePage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>📡</div>
        <h1 className={styles.title}>You&apos;re Offline</h1>
        <p className={styles.message}>
          It looks like you&apos;ve lost your internet connection. 
          Try reconnecting to get back to Munro HQ.
        </p>
        <Link href="/" className="btn btn-primary">
          Try Again
        </Link>
      </div>
    </div>
  )
}
