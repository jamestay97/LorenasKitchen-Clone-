import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SuggestionManager() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      // Fetch newest first
      const data = await base44.entities.Suggestion.list('-created_at', 50);
      setSuggestions(data);
    } catch (e) {
      toast.error("Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
        await base44.entities.Suggestion.update(id, { status: 'read' });
        setSuggestions(suggestions.map(s => s.id === id ? { ...s, status: 'read' } : s));
    } catch (e) {
        toast.error("Couldn't update status");
    }
  };

  const deleteSuggestion = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
        await base44.entities.Suggestion.delete(id);
        setSuggestions(suggestions.filter(s => s.id !== id));
        toast.success("Deleted!");
    } catch (e) {
        toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading requests...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-[#1b4d3e]">Customer Requests</h2>
            <p className="text-sm text-gray-500">See what your customers are craving</p>
        </div>
        <Badge variant="outline" className="bg-[#e6f0eb] text-[#1b4d3e]">
            {suggestions.filter(s => s.status === 'new').length} New
        </Badge>
      </div>

      <div className="divide-y divide-gray-100">
        {suggestions.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No requests yet.</p>
            </div>
        ) : (
            suggestions.map((item) => (
                <div key={item.id} className={`p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-gray-50 transition-colors ${item.status === 'new' ? 'bg-[#f4f5f0]/50' : ''}`}>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#1b4d3e] text-sm">
                                {item.user_email || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-400">
                                • {format(new Date(item.created_at), 'MMM d, h:mm a')}
                            </span>
                            {item.status === 'new' && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">New</span>
                            )}
                        </div>
                        <p className="text-gray-700 text-sm">{item.content}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {item.status === 'new' && (
                            <Button size="sm" variant="ghost" onClick={() => markAsRead(item.id)} title="Mark as Read">
                                <Check className="w-4 h-4 text-gray-400 hover:text-green-600" />
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteSuggestion(item.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" />
                        </Button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}