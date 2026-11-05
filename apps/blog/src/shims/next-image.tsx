// next/image 대체: 원본 img(이미지 변환 없음, design.md D4)
import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; unoptimized?: boolean };

export default function Image({ fill, priority, unoptimized: _u, style, ...rest }: Props) {
  const fillStyle = fill ? { position: 'absolute' as const, height: '100%', width: '100%', inset: 0, ...style } : style;
  return <img {...rest} style={fillStyle} loading={priority ? undefined : (rest.loading ?? 'lazy')} fetchPriority={priority ? 'high' : undefined} />;
}
