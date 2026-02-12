import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export function SuggestionBox() {
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('suggestions')
        .insert([{ content: suggestion }]);

      if (error) throw error;
      toast.success("Request sent to the kitchen!");
      setSuggestion('');
    } catch (error) {
      toast.error("Failed to send request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container max-w-4xl mx-auto px-6 mb-20">
      <div className="bg-[#2c5f4c] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-white">
        {/* Decorative background pattern */}
        <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/3 -translate-y-1/3">
           <MessageSquare className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm">
            <MessageSquare className="w-10 h-10 text-[#a3c9bb]" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl font-serif font-bold mb-2">Have a special request?</h3>
            <p className="text-[#a3c9bb] mb-6 text-lg">
              We love hearing what you want to see on next week's menu.
            </p>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="e.g. Grandma's Lasagna..." 
                className="flex-1 px-6 py-4 rounded-xl text-slate-900 outline-none focus:ring-4 ring-[#a3c9bb]/30 transition-all placeholder:text-slate-400"
                disabled={isSubmitting}
              />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-white text-[#2c5f4c] px-8 py-4 rounded-xl font-bold hover:bg-[#e8f5e9] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
              >
                {isSubmitting ? 'Sending...' : <>Send <Send className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}