import Image from 'next/image'
import Link from 'next/link'

export function BrandLogo({
  href = '/',
  size = 'md',
  light = false,
}: {
  href?: string | null
  size?: 'sm' | 'md' | 'lg'
  light?: boolean
}) {
  const heights = { sm: 36, md: 48, lg: 72 }
  const h = heights[size]
  const img = (
    <Image
      src="/logo.png"
      alt="Vivi Clean house"
      width={Math.round(h * 3.2)}
      height={h}
      className="h-auto w-auto object-contain"
      style={{ height: h, width: 'auto' }}
      priority
    />
  )

  if (!href) {
    return (
      <div className={light ? 'brightness-0 invert' : undefined}>{img}</div>
    )
  }

  return (
    <Link href={href} className={`inline-flex items-center ${light ? 'brightness-0 invert' : ''}`}>
      {img}
    </Link>
  )
}
