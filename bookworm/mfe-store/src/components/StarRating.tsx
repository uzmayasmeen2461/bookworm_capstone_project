import React, { useState } from 'react';
import './StarRating.css';

interface Props {
  value: number;           // current value
  interactive?: boolean;   // if true, user can click to set rating
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<Props> = ({
  value,
  interactive = false,
  onChange,
  size = 'md',
}) => {
  const [hovered, setHovered] = useState(0);

  const display = interactive ? (hovered || value) : value;

  return (
    <div className={`stars stars--${size} ${interactive ? 'stars--interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star ${n <= display ? 'star--on' : 'star--off'}`}
          onClick={() => interactive && onChange?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(0)}
          role={interactive ? 'button' : undefined}
          aria-label={interactive ? `Rate ${n} star${n > 1 ? 's' : ''}` : undefined}
          tabIndex={interactive ? 0 : undefined}
          onKeyDown={e => interactive && e.key === 'Enter' && onChange?.(n)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;
