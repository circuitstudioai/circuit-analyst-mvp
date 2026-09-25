import type { FormEvent, ReactNode } from 'react'
import styles from './page.module.css'

export function BetaDialog({
  eyebrow,
  title,
  titleId,
  onSubmit,
  onDismiss,
  children,
}: {
  eyebrow: string
  title: string
  titleId: string
  onSubmit: (event: FormEvent) => void
  onDismiss: () => void
  children: ReactNode
}) {
  return (
    <div className={styles.onboardingBackdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <form className={styles.onboardingCard} onSubmit={onSubmit}>
        <div className={styles.betaDialogHeader}>
          <span className={styles.betaEyebrow}>{eyebrow}</span>
          <button type="button" className={styles.betaDialogDismiss} onClick={onDismiss}>Not now</button>
        </div>
        <h2 id={titleId}>{title}</h2>
        {children}
      </form>
    </div>
  )
}
