/**
 * Tests for BookCard component
 *
 * What we test:
 *  1. Renders book title, author, price
 *  2. Shows "New" badge for new launches
 *  3. Shows "Bestseller" badge for bestsellers
 *  4. Shows cover image when provided
 *  5. Shows placeholder when no cover image
 *  6. Navigates to /book/:id on click
 *  7. Navigates on Enter key press (accessibility)
 *  8. Shows delivery date
 *  9. Renders tags
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookCard from '../components/BookCard';
import { BookSummary } from '../api/booksApi';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const baseBook: BookSummary = {
  id:           'book-123',
  title:        'The Joy of Minimalism',
  price:        149,
  format:       'Paperback',
  language:     'English',
  coverImage:   null,
  rating:       4.3,
  totalSold:    145,
  isBestseller: false,
  isNewLaunch:  false,
  isFeatured:   true,
  deliveryDays: 3,
  tags:         ['Non-fiction', 'Self Help'],
  author:   { id: 'a1', name: 'Daniel Reed' },
  category: { id: 'c1', name: 'Self-help', slug: 'self-help' },
};

const renderCard = (overrides: Partial<BookSummary> = {}) =>
  render(
    <MemoryRouter>
      <BookCard book={{ ...baseBook, ...overrides }} />
    </MemoryRouter>
  );

describe('BookCard', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('renders title, author and price', () => {
    renderCard();
    // title appears in both the generated cover and the card heading
    expect(screen.getAllByText('The Joy of Minimalism').length).toBeGreaterThanOrEqual(1);
    // author appears in generated cover + card info
    expect(screen.getAllByText('Daniel Reed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₹149')).toBeInTheDocument();
  });

  it('does NOT show New badge when isNewLaunch is false', () => {
    renderCard({ isNewLaunch: false });
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('shows New badge when isNewLaunch is true', () => {
    renderCard({ isNewLaunch: true });
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('shows Bestseller badge when isBestseller is true', () => {
    renderCard({ isBestseller: true });
    expect(screen.getByText('Bestseller')).toBeInTheDocument();
  });

  it('renders cover image when provided', () => {
    renderCard({ coverImage: 'https://example.com/cover.jpg' });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(img).toHaveAttribute('alt', 'The Joy of Minimalism');
  });

  it('renders generated cover when no cover image', () => {
    renderCard({ coverImage: null });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // GeneratedCover replaces the old 📖 placeholder
    expect(document.querySelector('.book-card__generated-cover')).toBeInTheDocument();
  });

  it('navigates to /book/:id on click', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /the joy of minimalism/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/book/book-123');
  });

  it('navigates to /book/:id on Enter key press', () => {
    renderCard();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/book/book-123');
  });

  it('renders first two tags', () => {
    renderCard({ tags: ['Fiction', 'Thriller', 'Horror'] });
    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Thriller')).toBeInTheDocument();
    // Third tag should not render
    expect(screen.queryByText('Horror')).not.toBeInTheDocument();
  });
});
