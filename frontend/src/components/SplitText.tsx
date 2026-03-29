import React, { useEffect, useRef, useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number; // ms stagger per character
}

const SplitText: React.FC<SplitTextProps> = ({ text, className = '', delay = 50 }) => {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Pre-compute word/char structure with global indices
  const words = text.split(' ');
  const structure: { chars: { char: string; idx: number }[] }[] = [];
  let idx = 0;
  for (const word of words) {
    structure.push({ chars: word.split('').map(char => ({ char, idx: idx++ })) });
  }

  return (
    <span
      ref={ref}
      className={className}
      aria-label={text}
      style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.28em' }}
    >
      {structure.map((w, wi) => (
        <span key={wi} style={{ display: 'inline-flex' }}>
          {w.chars.map(({ char, idx: i }) => (
            <span
              key={i}
              style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', lineHeight: 'inherit' }}
            >
              <span
                style={{
                  display: 'inline-block',
                  transform: inView ? 'translateY(0)' : 'translateY(110%)',
                  opacity: inView ? 1 : 0,
                  transition: `transform 700ms cubic-bezier(0.16,1,0.3,1) ${i * delay}ms, opacity 350ms ease ${i * delay}ms`,
                }}
              >
                {char}
              </span>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
};

export default SplitText;
