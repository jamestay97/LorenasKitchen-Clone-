import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Star, CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackTab({ feedbackList = [], onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(status === 'approved' ? 'Feedback approved' : 'Feedback rejected');
      onRefresh?.();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!feedbackList.length) {
    return (
      <div className="p-10 text-center">
        <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500 font-medium">No feedback yet</p>
        <p className="text-sm text-stone-400 mt-1">Visitor feedback from the homepage will appear here.</p>
        <p className="text-xs text-stone-400 mt-4">Make sure the feedback table exists (see supabase/migrations).</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-[#2c5f4c]" />
        Feedback inbox
      </h2>
      <p className="text-sm text-stone-500 mb-8">
        Approve feedback to show it on the homepage. Rejected entries stay hidden.
      </p>
      <div className="space-y-4">
        {feedbackList.map((fb) => (
          <div
            key={fb.id}
            className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-5 h-5 ${n <= (fb.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                  />
                ))}
              </div>
              {fb.content && <p className="text-stone-700 text-sm mb-1">&ldquo;{fb.content}&rdquo;</p>}
              {fb.user_email && <p className="text-stone-400 text-xs">{fb.user_email}</p>}
              <p className="text-stone-400 text-xs mt-1">
                {fb.created_at ? new Date(fb.created_at).toLocaleString() : ''} ·{' '}
                <span className={fb.status === 'pending' ? 'text-amber-600' : fb.status === 'approved' ? 'text-emerald-600' : 'text-stone-400'}>
                  {fb.status}
                </span>
              </p>
            </div>
            {fb.status === 'pending' && (
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={updatingId === fb.id}
                  onClick={() => handleStatus(fb.id, 'approved')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {updatingId === fb.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={updatingId === fb.id}
                  onClick={() => handleStatus(fb.id, 'rejected')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-300 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Deny
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
