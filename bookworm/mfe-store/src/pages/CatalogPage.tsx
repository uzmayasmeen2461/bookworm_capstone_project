import React, { useState, useCallback } from 'react';
import BookCard from '../components/BookCard';
import FiltersBar from '../components/FiltersBar';
import CategorySidebar from '../components/CategorySidebar';
import { useCategories } from '../hooks/useCategories';
import { useFeaturedBooks } from '../hooks/useFeaturedBooks';
import { useBooks } from '../hooks/useBooks';
import { BooksFilters } from '../api/booksApi';
import './CatalogPage.css';

const CatalogPage: React.FC = () => {
  const [filters, setFilters] = useState<BooksFilters>({
    sort: 'relevance',
    page: 1,
    limit: 20,
  });

  // selectedCategory drives both the sidebar highlight and the filter
  const [selectedCategory, setSelectedCategory] = useState('');

  const { categories, loading: catsLoading } = useCategories();
  const { data: featured, loading: featuredLoading } = useFeaturedBooks();
  // Only fetch filtered list when a category/search/filter is active
  const isFiltering = !!(
    selectedCategory || filters.search || filters.format ||
    filters.language || filters.maxPrice
  );
  const { data: filtered, loading: filteredLoading } = useBooks(
    isFiltering ? filters : {}
  );

  const handleFilterChange = useCallback((updated: Partial<BooksFilters>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  }, []);

  const handleCategorySelect = useCallback((slug: string) => {
    setSelectedCategory(slug);
    setFilters(prev => ({ ...prev, category: slug || undefined, page: 1 }));
  }, []);

  const isLoading = isFiltering ? filteredLoading : featuredLoading;

  return (
    <div className="catalog">
      {/* Filters bar spans full width above the two-column layout */}
      <FiltersBar filters={filters} onChange={handleFilterChange} />

      <div className="catalog__body">
        {/* Left: category sidebar */}
        <CategorySidebar
          categories={categories}
          selected={selectedCategory}
          onSelect={handleCategorySelect}
          loading={catsLoading}
        />

        {/* Right: book sections */}
        <main className="catalog__main">
          {isLoading ? (
            <div className="catalog__loading">
              <div className="catalog__spinner" />
              <p>Loading books…</p>
            </div>
          ) : isFiltering ? (
            /* ── Filtered results ── */
            <section className="catalog__section">
              <h2 className="catalog__section-title">
                {selectedCategory
                  ? categories.find(c => c.slug === selectedCategory)?.name || 'Books'
                  : 'Search Results'}
                {filtered && (
                  <span className="catalog__count"> ({filtered.pagination.total})</span>
                )}
              </h2>
              {filtered?.books.length === 0 ? (
                <p className="catalog__empty">No books found. Try different filters.</p>
              ) : (
                <div className="catalog__grid">
                  {filtered?.books.map(book => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* ── Home view: featured sections ── */
            <>
              {featured?.recommended && featured.recommended.length > 0 && (
                <section className="catalog__section">
                  <h2 className="catalog__section-title">Recommended for You</h2>
                  <div className="catalog__row">
                    {featured.recommended.map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </section>
              )}

              {featured?.bestsellers && featured.bestsellers.length > 0 && (
                <section className="catalog__section">
                  <h2 className="catalog__section-title">Bestsellers this Month</h2>
                  <div className="catalog__row">
                    {featured.bestsellers.map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </section>
              )}

              {featured?.newLaunches && featured.newLaunches.length > 0 && (
                <section className="catalog__section">
                  <h2 className="catalog__section-title">New Launches</h2>
                  <div className="catalog__row">
                    {featured.newLaunches.map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CatalogPage;
