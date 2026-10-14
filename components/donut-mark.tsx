import Image from 'next/image'

export function DonutMark({
  className = '',
  width = 38,
  height = 21,
}: {
  size?: number
  className?: string
  width?: number
  height?: number
}) {
  return (
    <Image
      src="/rukyr-hand.png"
      alt="Rukyr Hand Icon"
      width={width}
      height={height}
      className={`inline-block select-none object-contain align-middle ${className}`}
      priority
    />
  )
}
