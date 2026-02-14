import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Star, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

function mealImages(meal) {
  return {
    main: meal.main_img ?? meal.image_main ?? '/placeholder-main.jpg',
    side1: meal.side1_img ?? meal.image_side1,
    side2: meal.side2_img ?? meal.image_side2,
  };
}

export default function MealCard({ meal, index = 0, approvedFeedback = [], onSubmitFeedback }) {
  const img = mealImages(meal);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFeedback = () => {
    if (rating < 1) return;
    setSubmitting(true);
    onSubmitFeedback?.(meal.id, rating, comment, email);
    setRating(0);
    setComment('');
    setEmail('');
    setShowFeedbackForm(false);
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group bg-white rounded-3xl shadow-lg shadow-stone-200/50 border border-stone-100 overflow-hidden flex flex-col h-full hover:shadow-xl hover:shadow-stone-200/60 transition-shadow duration-300"
    >
      {/* Bento visual */}
      <div className="relative h-52 sm:h-56 bg-stone-900 p-2.5 grid grid-cols-3 gap-2.5">
        <div className="col-span-2 bg-stone-800 rounded-2xl overflow-hidden">
          <img
            src={img.main}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            alt={meal.title}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex-1 bg-stone-800 rounded-xl overflow-hidden">
            <img src={img.side1} className="w-full h-full object-cover" alt={meal.side} />
          </div>
          <div className="flex-1 bg-stone-800 rounded-xl overflow-hidden">
            <img src={img.side2} className="w-full h-full object-cover" alt={meal.side2} />
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-stone-900 leading-tight mb-1">{meal.title}</h3>
          <p className="text-sm text-[#1b4d3e] font-semibold">
            w/ {meal.side || '—'} & {meal.side2 || '—'}
          </p>
        </div>

        {meal.description && (
          <p className="text-sm text-stone-500 leading-relaxed mb-5 flex-1 italic line-clamp-3">
            &ldquo;{meal.description}&rdquo;
          </p>
        )}

        {/* Nutrition */}
        <div className="pt-4 border-t border-stone-100">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-amber-50 rounded-xl py-2">
              <span className="text-[10px] text-amber-600 font-bold uppercase block">Cal</span>
              <span className="text-sm font-bold text-stone-800">{meal.nutrition?.calories ?? '—'}</span>
            </div>
            <div className="bg-emerald-50 rounded-xl py-2">
              <span className="text-[10px] text-emerald-600 font-bold uppercase block">Prot</span>
              <span className="text-sm font-bold text-stone-800">{meal.nutrition?.protein ?? '—'}</span>
            </div>
            <div className="bg-sky-50 rounded-xl py-2">
              <span className="text-[10px] text-sky-600 font-bold uppercase block">Carb</span>
              <span className="text-sm font-bold text-stone-800">{meal.nutrition?.carbs ?? '—'}</span>
            </div>
            <div className="bg-violet-50 rounded-xl py-2">
              <span className="text-[10px] text-violet-600 font-bold uppercase block">Fat</span>
              <span className="text-sm font-bold text-stone-800">{meal.nutrition?.fat ?? '—'}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full bg-[#1b4d3e] text-white py-3.5 rounded-xl font-bold hover:bg-[#153a2f] transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#1b4d3e]/20"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Order This Bento
        </button>

        {/* Per-meal feedback (not gated) */}
        <div className="mt-5 pt-5 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-[#1b4d3e]"
          >
            <MessageCircle className="w-4 h-4" />
            Rate this meal
            {showFeedbackForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFeedbackForm && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="p-1 rounded hover:bg-stone-100"
                  >
                    <Star
                      className={`w-6 h-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional)"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Your comment (optional)"
                rows={2}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm resize-none"
              />
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={submitting || rating < 1}
                className="w-full py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit feedback'}
              </button>
            </div>
          )}

          {approvedFeedback.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Reviews</p>
              {approvedFeedback.map((fb) => (
                <div key={fb.id} className="bg-stone-50 rounded-lg p-3 text-sm">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-3.5 h-3.5 ${n <= (fb.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                      />
                    ))}
                  </div>
                  {fb.content && <p className="text-stone-700 italic">&ldquo;{fb.content}&rdquo;</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
