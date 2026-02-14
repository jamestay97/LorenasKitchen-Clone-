import React, { useState } from 'react';
import { BookOpen, Search, Image as ImageIcon } from 'lucide-react';

export default function FoodLibrary({ dishes = [] }) {
  const [query, setQuery] = useState('');
  const sorted = [...dishes].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const filtered = query.trim()
    ? sorted.filter((d) => (d.name || '').toLowerCase().includes(query.trim().toLowerCase()))
    : sorted;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#2c5f4c] p-3 rounded-2xl">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#1a3c30]">Recipe Book</h2>
          <p className="text-sm text-stone-500">Every saved dish appears here. Use them in Menu Builder.</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#2c5f4c]/20 focus:border-[#2c5f4c]"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((d) => (
          <div
            key={d.id || d.name}
            className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 shadow-sm"
          >
            {(d.image_url || d.url) ? (
              <img
                src={d.image_url || d.url}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-8 h-8 text-stone-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-stone-800 truncate">{d.name}</p>
              <p className="text-xs text-stone-500 capitalize">{d.type || 'dish'}</p>
              {d.description && (
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{d.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">
            {query.trim() ? 'No matches' : 'No dishes in the recipe book yet'}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            {query.trim() ? 'Try a different search' : 'Save a menu in Menu Builder to add dishes here'}
          </p>
        </div>
      )}
    </div>
  );
}
