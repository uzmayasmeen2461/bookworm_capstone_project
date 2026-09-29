import React from 'react';
import { Category } from '../api/categoriesApi';
import './CategorySidebar.css';

interface Props {
  categories: Category[];
  selected: string;           // slug of selected category, '' = All
  onSelect: (slug: string) => void;
  loading: boolean;
}

const CategorySidebar: React.FC<Props> = ({ categories, selected, onSelect, loading }) => {
  return (
    <aside className="cat-sidebar">
      <ul className="cat-sidebar__list">
        {/* "All" is always first */}
        <li>
          <button
            className={`cat-sidebar__item ${selected === '' ? 'cat-sidebar__item--active' : ''}`}
            onClick={() => onSelect('')}
          >
            All
          </button>
        </li>

        {loading ? (
          <li className="cat-sidebar__loading">Loading…</li>
        ) : (
          categories.map(cat => (
            <li key={cat.id}>
              <button
                className={`cat-sidebar__item ${selected === cat.slug ? 'cat-sidebar__item--active' : ''}`}
                onClick={() => onSelect(cat.slug)}
              >
                {cat.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
};

export default CategorySidebar;
