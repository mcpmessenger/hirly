export function DonutMark({ className = '' }: { size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-block select-none leading-none ${className}`}>
      🫴
    </span>
  )
}

