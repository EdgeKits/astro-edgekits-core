interface IconProps {
  src: string | { src: string }
  alt?: string
  className?: string
  size?: number
}

export const SvgIcon: React.FC<IconProps> = ({
  src,
  alt = '',
  className = '',
  size = 24,
}) => {
  const imgSrc = typeof src === 'string' ? src : src.src

  // You can use SVGR instead of this but for monochrome strokes it's ok (and no third-party libs).
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        maskImage: `url(${imgSrc})`,
        WebkitMaskImage: `url(${imgSrc})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: 'currentColor',
      }}
      role="img"
      aria-label={alt}
    />
  )
}
