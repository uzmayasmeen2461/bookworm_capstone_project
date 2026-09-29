import React from 'react';
import { BooksFilters } from '../api/booksApi';
import './FiltersBar.css';

interface Props {
  filters: BooksFilters;
  onChange: (updated: Partial<BooksFilters>) => void;
}

const FiltersBar: React.FC<Props> = ({ filters, onChange }) => {
  return (
    <div className="filters-bar">
      {/* Search */}
      <div className="filters-bar__search">
        <input
          type="text"
          placeholder="Search you want to read here"
          value={filters.search || ''}
          onChange={e => onChange({ search: e.target.value, page: 1 })}
          className="filters-bar__input"
        />
        <span className="filters-bar__search-icon">🔍</span>
      </div>

      {/* Language */}
      <select
        className="filters-bar__select"
        value={filters.language || ''}
        onChange={e => onChange({ language: e.target.value || undefined, page: 1 })}
        aria-label="Language"
      >
        <option value="">Language — All</option>
        <option value="English">English</option>
        <option value="Hindi">Hindi</option>
        <option value="Tamil">Tamil</option>
        <option value="Marathi">Marathi</option>
      </select>

      {/* Format */}
      <select
        className="filters-bar__select"
        value={filters.format || ''}
        onChange={e => onChange({ format: e.target.value || undefined, page: 1 })}
        aria-label="Format"
      >
        <option value="">Format — All</option>
        <option value="Paperback">Paperback</option>
        <option value="Hardcover">Hardcover</option>
        <option value="eBook">eBook</option>
      </select>

      {/* Price Range */}
      <select
        className="filters-bar__select"
        value={filters.maxPrice || ''}
        onChange={e => onChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
        aria-label="Price Range"
      >
        <option value="">Price — All</option>
        <option value="100">Under ₹100</option>
        <option value="250">Under ₹250</option>
        <option value="500">Under ₹500</option>
        <option value="1000">Under ₹1000</option>
      </select>

      {/* Sort */}
      <select
        className="filters-bar__select"
        value={filters.sort || 'relevance'}
        onChange={e => onChange({ sort: e.target.value as BooksFilters['sort'], page: 1 })}
        aria-label="Sort by"
      >
        <option value="relevance">Sort — Relevance</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="rating">Top Rated</option>
      </select>
    </div>
  );
};

export default FiltersBar;
