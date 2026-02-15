import React from 'react';
import { format, parseISO, startOfWeek, endOfWeek, isPast, isFuture } from 'date-fns';
import { Archive, Calendar, Edit3, Trash2 } from 'lucide-react';

export default function MenuHistory({ menus = [], onEdit, onDelete }) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const categorize = (menu) => {
    const start = menu.week_start ? parseISO(menu.week_start) : null;
    if (!start) return 'past';
    if (start > thisWeekEnd) return 'upcoming';
    if (start < thisWeekStart) return 'past';
    return 'current';
  };

  const sorted = [...(menus || [])].sort((a, b) => {
    const da = a.week_start || '';
    const db = b.week_start || '';
    return db.localeCompare(da);
  });

  const currentWeek = sorted.filter((m) => categorize(m) === 'current');
  const upcoming = sorted.filter((m) => categorize(m) === 'upcoming');
  const past = sorted.filter((m) => categorize(m) === 'past');

  const renderList = (list, label, icon) => {
    if (!list.length) return null;
    return (
      <div className="mb-8">
        <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2 mb-4">
          {icon} {label}
        </h3>
        <div className="space-y-2">
          {list.map((menu) => {
            const start = menu.week_start ? format(parseISO(menu.week_start), 'MMM d') : '—';
            const end = menu.week_end ? format(parseISO(menu.week_end), 'MMM d') : '—';
            const mealCount = (menu.meals || []).filter((m) => m?.title).length;
            return (
              <div
                key={menu.id || menu.week_start}
                className="bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between gap-4 shadow-sm hover:border-[#2c5f4c]/30 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="bg-stone-100 p-2.5 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#2c5f4c]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800">
                      {start} – {end}
                    </p>
                    <p className="text-sm text-stone-500">
                      {mealCount} meal{mealCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(menu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2c5f4c] text-white text-sm font-semibold hover:bg-[#1a3c30] transition-colors"
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(menu)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#2c5f4c] p-3 rounded-2xl">
          <Archive className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#1a3c30]">Menu History</h2>
          <p className="text-sm text-stone-500">Edit past or upcoming weeks. Newest first.</p>
        </div>
      </div>

      {renderList(currentWeek, 'This week', <span className="text-emerald-500">●</span>)}
      {renderList(upcoming, 'Upcoming', <span className="text-amber-500">●</span>)}
      {renderList(past, 'Past menus', <span className="text-stone-400">●</span>)}

      {sorted.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200">
          <Archive className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">No menus yet</p>
          <p className="text-sm text-stone-400 mt-1">Create one in Menu Builder</p>
        </div>
      )}
    </div>
  );
}
