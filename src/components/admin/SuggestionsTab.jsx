import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { MessageSquare, Eye, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuggestionsTab({ suggestions = [], onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);

  const handleMarkRead = async (id) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('suggestions').update({ status: 'read' }).eq('id', id);
      if (error) throw error;
      toast.success('Marked as read');
      onRefresh?.();
    } catch {
      toast.error('Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this suggestion permanently?')) return;
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('suggestions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      onRefresh?.();
    } catch {
      toast.error('Delete failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!suggestions.length) {
    return (
      <div className="p-10 text-center">
        <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500 font-medium">No suggestions yet</p>
        <p className="text-sm text-stone-400 mt-1">Visitor suggestions from the homepage will appear here.</p>
      </div>
    );
  }

  const unread = suggestions.filter((s) => s.status === 'new');
  const read = suggestions.filter((s) => s.status !== 'new');

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-[#2c5f4c]" />
        Suggestion Inbox
      </h2>
      <p className="text-sm text-stone-500 mb-8">
        Read and manage meal suggestions from visitors. These are private and won't appear on the homepage.
      </p>

      {unread.length > 0 && (
        <>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">New ({unread.length})</p>
          <div className="space-y-3 mb-8">
            {unread.map((s) => (
              <SuggestionCard key={s.id} s={s} updatingId={updatingId} onMarkRead={handleMarkRead} onDelete={handleDelete} isNew />
            ))}
          </div>
        </>
      )}

      {read.length > 0 && (
        <>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Read ({read.length})</p>
          <div className="space-y-3">
            {read.map((s) => (
              <SuggestionCard key={s.id} s={s} updatingId={updatingId} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SuggestionCard({ s, updatingId, onMarkRead, onDelete, isNew }) {
  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 ${isNew ? 'border-amber-200 bg-amber-50/30' : 'border-stone-200'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-stone-700 text-sm mb-1">{s.content}</p>
        {s.user_email && <p className="text-stone-400 text-xs">{s.user_email}</p>}
        <p className="text-stone-400 text-xs mt-1">
          {s.created_at ? new Date(s.created_at).toLocaleString() : ''}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {isNew && onMarkRead && (
          <button
            type="button"
            disabled={updatingId === s.id}
            onClick={() => onMarkRead(s.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2c5f4c] text-white text-sm font-semibold hover:bg-[#1a3c30] disabled:opacity-50"
          >
            {updatingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Mark read
          </button>
        )}
        <button
          type="button"
          disabled={updatingId === s.id}
          onClick={() => onDelete(s.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
