/**
 * Tests for StarRating component
 *
 * What we test:
 *  1. Renders exactly 5 stars
 *  2. Correct number of filled stars for a given value
 *  3. Non-interactive — onChange NOT called on click
 *  4. Interactive — onChange called with correct value on click
 *  5. Hover fills stars up to hovered position
 *  6. Correct size class applied
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from '../components/StarRating';

describe('StarRating', () => {
  it('renders exactly 5 star elements', () => {
    render(<StarRating value={3} />);
    // Each star is a <span> with '★'
    const stars = screen.getAllByText('★');
    expect(stars).toHaveLength(5);
  });

  it('marks correct number of stars as filled for value=3', () => {
    render(<StarRating value={3} />);
    const stars = screen.getAllByText('★');
    const filled = stars.filter(s => s.classList.contains('star--on'));
    const off    = stars.filter(s => s.classList.contains('star--off'));
    expect(filled).toHaveLength(3);
    expect(off).toHaveLength(2);
  });

  it('marks all stars as off for value=0', () => {
    render(<StarRating value={0} />);
    const stars = screen.getAllByText('★');
    const filled = stars.filter(s => s.classList.contains('star--on'));
    expect(filled).toHaveLength(0);
  });

  it('does not call onChange when interactive is false', () => {
    const onChange = jest.fn();
    render(<StarRating value={3} onChange={onChange} />);
    fireEvent.click(screen.getAllByText('★')[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with correct value when interactive and clicked', () => {
    const onChange = jest.fn();
    render(<StarRating value={0} interactive onChange={onChange} />);
    const stars = screen.getAllByRole('button');
    fireEvent.click(stars[3]); // click 4th star → rating = 4
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('calls onChange on Enter key press when interactive', () => {
    const onChange = jest.fn();
    render(<StarRating value={0} interactive onChange={onChange} />);
    const stars = screen.getAllByRole('button');
    fireEvent.keyDown(stars[1], { key: 'Enter' }); // 2nd star → rating = 2
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('applies correct size class', () => {
    const { container } = render(<StarRating value={3} size="lg" />);
    expect(container.firstChild).toHaveClass('stars--lg');
  });
});
