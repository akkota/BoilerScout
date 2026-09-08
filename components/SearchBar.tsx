"use client";

import { useState, FormEvent } from "react";

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
      <div className="relative flex-1">
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Purdue events (e.g. AI hackathon, pitch night, live music)..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSearch("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
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
          <span>Searching...</span>
        ) : (
          <span>Search</span>
        )}
      </button>
    </form>
  );
}
