import React, { CSSProperties, ReactNode, HTMLAttributes } from 'react';

interface BorderRotateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children: ReactNode;
  className?: string;
  animationSpeed?: number;
  style?: CSSProperties;
}

const BorderRotate: React.FC<BorderRotateProps> = ({
  children,
  className = '',
  animationSpeed = 12,
  style = {},
  ...props
}) => {
  const combinedStyle: CSSProperties = {
    border: '1px solid transparent',
    borderRadius: '16px',
    backgroundImage: `
      linear-gradient(hsl(150, 12%, 10%), hsl(150, 12%, 10%)),
      conic-gradient(
        from var(--gradient-angle, 0deg),
        hsl(150, 12%, 12%) 0%,
        hsl(84, 81%, 35%) 25%,
        hsl(84, 81%, 44%) 30%,
        hsl(84, 81%, 35%) 35%,
        hsl(150, 12%, 12%) 50%,
        hsl(270, 70%, 45%) 75%,
        hsl(270, 70%, 55%) 80%,
        hsl(270, 70%, 45%) 85%,
        hsl(150, 12%, 12%) 100%
      )
    `,
    backgroundClip: 'padding-box, border-box',
    backgroundOrigin: 'padding-box, border-box',
    animation: `gradient-rotate ${animationSpeed}s linear infinite`,
    ...style,
  } as CSSProperties;

  return (
    <div className={className} style={combinedStyle} {...props}>
      {children}
    </div>
  );
};

export { BorderRotate };
