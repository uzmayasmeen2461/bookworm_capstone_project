import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookSummary } from '../api/booksApi';
import './BookCard.css';

interface Props {
  book: BookSummary;
}

// Delivery date helper — adds deliveryDays to today
const getDeliveryDate = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

// Star rating display
const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="book-card__stars" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} className={n <= Math.round(rating) ? 'star star--filled' : 'star'}>★</span>
    ))}
  </span>
);

// Deterministic colour palette — picks a gradient based on the book title
const PALETTES: [string, string][] = [
  ['#1a1a6e', '#4a2080'],  // deep blue-purple
  ['#6e1a1a', '#802040'],  // deep red
  ['#1a4a1a', '#2a7040'],  // forest green
  ['#4a3000', '#806020'],  // amber
  ['#001a4a', '#103080'],  // navy
  ['#3a0050', '#700090'],  // violet
  ['#004040', '#007060'],  // teal
  ['#4a1a00', '#803010'],  // burnt orange
  ['#1a003a', '#400060'],  // dark indigo
];

const getPalette = (title: string): [string, string] => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
};

// Renders a styled book-spine cover when no coverImage is available.
// Pass large=true for the detail page (bigger font, taller layout).
export const GeneratedCover: React.FC<{ title: string; author: string; large?: boolean }> = ({ title, author, large }) => {
  const [from, to] = getPalette(title);
  return (
    <div
      className={`book-card__generated-cover${large ? ' book-card__generated-cover--large' : ''}`}
      style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)` }}
    >
      <div className="book-card__generated-spine" />
      <p className="book-card__generated-title">{title}</p>
      <p className="book-card__generated-author">{author}</p>
    </div>
  );
};

const BookCard: React.FC<Props> = ({ book }) => {
  const navigate = useNavigate();

  return (
    <div
      className="book-card"
      onClick={() => navigate(`/book/${book.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/book/${book.id}`)}
      aria-label={`${book.title} by ${book.author.name}`}
    >
      {/* Cover */}
      <div className="book-card__cover">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            loading="lazy"
            onError={e => {
              // Hide broken external image to fall back to styling
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        <GeneratedCover title={book.title} author={book.author.name} />
        {book.isNewLaunch  && <span className="book-card__badge book-card__badge--new">New</span>}
        {book.isBestseller && <span className="book-card__badge book-card__badge--best">Bestseller</span>}
      </div>

      {/* Info */}
      <div className="book-card__info">
        <p className="book-card__author">{book.author.name}</p>
        <h3 className="book-card__title">{book.title}</h3>

        <div className="book-card__tags">
          {book.tags.slice(0, 2).map(tag => (
            <span key={tag} className="book-card__tag">{tag}</span>
          ))}
        </div>

        <p className="book-card__format">{book.format}</p>

        <div className="book-card__rating">
          <Stars rating={book.rating} />
        </div>

        <p className="book-card__price">₹{book.price}</p>
        <p className="book-card__delivery">
          Delivery by <strong>{getDeliveryDate(book.deliveryDays)}</strong>
        </p>
      </div>
    </div>
  );
};

export default BookCard;
