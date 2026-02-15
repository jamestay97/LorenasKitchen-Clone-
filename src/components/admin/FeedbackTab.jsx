import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Star, Eye, Trash2, MessageSquare, Loader2, CheckCircle, XCircle, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackTab({ feedbackList = [], mealsLookup = {}, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);
  const mealLookup = mealsLookup;

  const handleApprove = async (id) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('feedback').update({ status: 'approved' }).eq('id', id);
      if (error) throw error;
      toast.success('Feedback approved — it will now show on the homepage');
      onRefresh?.();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeny = async (id) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('feedback').update({ status: 'denied' }).eq('id', id);
      if (error) throw error;
      toast.success('Feedback denied — it will not show on the homepage');
      onRefresh?.();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUnpublish = async (id) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('feedback').update({ status: 'pending' }).eq('id', id);
      if (error) throw error;
      toast.success('Feedback unpublished — moved back to pending review');
      onRefresh?.();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback permanently?')) return;
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('feedback').delete().eq('id', id);
      if (error) throw error;
      toast.success('Feedback deleted');
      onRefresh?.();
    } catch (err) {
      toast.error('Delete failed');
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
      </div>
    );
  }

  const pending = feedbackList.filter((fb) => fb.status === 'pending' || fb.status === 'new');
  const approved = feedbackList.filter((fb) => fb.status === 'approved');
  const denied = feedbackList.filter((fb) => fb.status === 'denied' || fb.status === 'read');

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-[#2c5f4c]" />
        Feedback Inbox
      </h2>
      <p className="text-sm text-stone-500 mb-8">
        Approve feedback to display it on the homepage under the meal it was submitted for. Deny to keep it private.
      </p>

      {pending.length > 0 && (
        <>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">Pending Review ({pending.length})</p>
          <div className="space-y-3 mb-8">
            {pending.map((fb) => (
              <FeedbackCard key={fb.id} fb={fb} mealLookup={mealLookup} updatingId={updatingId} onApprove={handleApprove} onDeny={handleDeny} onDelete={handleDelete} status="pending" />
            ))}
          </div>
        </>
      )}

      {approved.length > 0 && (
        <>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3">Published — Showing on Homepage ({approved.length})</p>
          <div className="space-y-3 mb-8">
            {approved.map((fb) => (
              <FeedbackCard key={fb.id} fb={fb} mealLookup={mealLookup} updatingId={updatingId} onUnpublish={handleUnpublish} onDelete={handleDelete} status="approved" />
            ))}
          </div>
        </>
      )}

      {denied.length > 0 && (
        <>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Denied / Hidden ({denied.length})</p>
          <div className="space-y-3">
            {denied.map((fb) => (
              <FeedbackCard key={fb.id} fb={fb} mealLookup={mealLookup} updatingId={updatingId} onApprove={handleApprove} onDelete={handleDelete} status="denied" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FeedbackCard({ fb, mealLookup, updatingId, onApprove, onDeny, onUnpublish, onDelete, status }) {
  const borderClass = status === 'pending' ? 'border-amber-200 bg-amber-50/30'
    : status === 'approved' ? 'border-emerald-200 bg-emerald-50/30'
    : 'border-stone-200';

  return (
    <div className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 ${borderClass}`}>
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`w-5 h-5 ${n <= (fb.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
            />
          ))}
          {status === 'approved' && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-3 h-3" /> Live
            </span>
          )}
        </div>
        {fb.meal_id != null && (
          <p className="text-[#2c5f4c] text-xs font-semibold mb-1">
            Meal: {mealLookup[fb.meal_id] || `(ID: ${fb.meal_id})`}
          </p>
        )}
        {fb.content && <p className="text-stone-700 text-sm mb-1">&ldquo;{fb.content}&rdquo;</p>}
        {(fb.first_name || fb.user_email) && (
          <p className="text-stone-400 text-xs">
            {fb.first_name || '—'} {fb.user_email && <span className="text-stone-300">({fb.user_email})</span>}
          </p>
        )}
        <p className="text-stone-400 text-xs mt-1">
          {fb.created_at ? new Date(fb.created_at).toLocaleString() : ''}
        </p>
      </div>
      <div className="flex gap-2 shrink-0 flex-wrap">
        {/* PENDING: show Approve and Deny */}
        {status === 'pending' && onApprove && (
          <button
            type="button"
            disabled={updatingId === fb.id}
            onClick={() => onApprove(fb.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {updatingId === fb.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
        )}
        {status === 'pending' && onDeny && (
          <button
            type="button"
            disabled={updatingId === fb.id}
            onClick={() => onDeny(fb.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-200 text-stone-700 text-sm font-semibold hover:bg-stone-300 disabled:opacity-50"
          >
            {updatingId === fb.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Deny
          </button>
        )}
        {/* APPROVED: show Unpublish only (sends back to pending) */}
        {status === 'approved' && onUnpublish && (
          <button
            type="button"
            disabled={updatingId === fb.id}
            onClick={() => onUnpublish(fb.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-semibold hover:bg-amber-200 disabled:opacity-50"
          >
            {updatingId === fb.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
            Unpublish
          </button>
        )}
        {/* DENIED: show Approve to re-approve */}
        {status === 'denied' && onApprove && (
          <button
            type="button"
            disabled={updatingId === fb.id}
            onClick={() => onApprove(fb.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {updatingId === fb.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
        )}
        <button
          type="button"
          disabled={updatingId === fb.id}
          onClick={() => onDelete(fb.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
