import type { HTMLAttributes, ReactNode } from 'react';

export interface SurfaceCardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  elevation?: 'flat' | 'raised';
}

/**
 * 通用浮面外壳。阴影、描边与圆角只由 token 驱动，消费方不声明视觉数值。
 */
export function SurfaceCard({
  children,
  className = '',
  elevation = 'raised',
  ...props
}: SurfaceCardProps) {
  return (
    <section className={`surface-card surface-card-${elevation} ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}
