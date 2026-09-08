"use client";

import { useState, useEffect, FormEvent } from "react";

interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBar({
  initialQuery = "",
  onSearch,
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  // Keep the input in sync when the query is driven from outside
  // (example-query chips, back/forward navigation, shared `?q=` links).
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-2" role="search">
      <div className="relative flex-1">
        <label htmlFor="search-input" className="sr-only">
          Search Purdue events
        </label>
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Purdue events (e.g. AI hackathon, pitch night, live music)..."
          autoComplete="off"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              onSearch("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      <button
        id="search-button"
        type="submit"
        disabled={isLoading}
        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-black font-semibold rounded-lg shadow transition-colors flex items-center gap-2 cursor-pointer"
      >
        {isLoading ? (
          <>
            <span
              className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin"
              aria-hidden="true"
            />
            <span>Searching...</span>
          </>
        ) : (
          <span>Search</span>
        )}
      </button>
    </form>
  );
}
