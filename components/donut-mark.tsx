export function DonutMark({ size = 42 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="21" fill="#F4A261" />
      <circle cx="24" cy="24" r="11" fill="#111111" />
      <path d="M10 14.5C13.8 9.4 18.7 7 24.5 7c6.8 0 11.6 3.3 14.3 7.4" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
      <circle cx="15" cy="25" r="2" fill="#FFF1D6" />
      <circle cx="33" cy="17" r="1.7" fill="#FFF1D6" />
      <circle cx="30" cy="34" r="1.8" fill="#FFF1D6" />
    </svg>
  )
}
