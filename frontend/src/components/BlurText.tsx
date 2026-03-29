import React, { useEffect, useRef, useState } from 'react';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'characters';
  direction?: 'top' | 'bottom';
  onAnimationComplete?: () => void;
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 150,
  className = '',
  animateBy = 'words',
  direction = 'top',
  onAnimationComplete,
}) => {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
          if (onAnimationComplete) {
            setTimeout(onAnimationComplete, elements.length * 80 + delay);
          }
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-flex', flexWrap: 'wrap', gap: animateBy === 'words' ? '0.3em' : '0' }}
    >
      {elements.map((el, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            filter: inView ? 'blur(0px)' : 'blur(12px)',
            opacity: inView ? 1 : 0,
            transform: inView
              ? 'translateY(0)'
              : direction === 'top'
              ? 'translateY(-16px)'
              : 'translateY(16px)',
            transition: `filter ${delay}ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, opacity ${delay}ms ease ${i * 80}ms, transform ${delay}ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
          }}
        >
          {el}
        </span>
      ))}
    </span>
  );
};

export default BlurText;
