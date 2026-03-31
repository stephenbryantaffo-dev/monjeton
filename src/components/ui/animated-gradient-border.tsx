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
  animationSpeed = 4,
  style = {},
  ...props
}) => {
  const combinedStyle: CSSProperties = {
    border: '1.5px solid transparent',
    borderRadius: '16px',
    backgroundImage: `
      linear-gradient(hsl(150, 12%, 10%), hsl(150, 12%, 10%)),
      conic-gradient(
        from var(--gradient-angle, 0deg),
        hsl(150, 12%, 15%) 0%,
        hsl(84, 81%, 44%) 20%,
        hsl(84, 81%, 65%) 30%,
        hsl(84, 81%, 44%) 40%,
        hsl(150, 12%, 15%) 50%,
        hsl(270, 70%, 60%) 70%,
        hsl(270, 70%, 75%) 80%,
        hsl(270, 70%, 60%) 90%,
        hsl(150, 12%, 15%) 100%
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
