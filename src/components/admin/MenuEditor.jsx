import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Wand2, Loader2, Camera, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function MenuEditor({ dishes, refreshData }) {
    const [loadingIdx, setLoadingIdx] = useState(null);
    const [aiStatus, setAiStatus] = useState('');
    const [slots, setSlots] = useState([
        { main: '', side1: '', side2: '', description: '', nutrition: '', image_url: '' },
        { main: '', side1: '', side2: '', description: '', nutrition: '', image_url: '' },
        { main: '', side1: '', side2: '', description: '', nutrition: '', image_url: '' },
    ]);

    const generateMealDetails = async (idx) => {
        const slot = slots[idx];
        if (!slot.main) return toast.error("Enter a Main Dish first!");

        setLoadingIdx(idx);
        setAiStatus('Calculating Nutrition...');

        try {
            // 1. Fetch AI Text
            const response = await fetch('[https://text.pollinations.ai/](https://text.pollinations.ai/)', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a nutrition API. Return ONLY a JSON object. No markdown, no intro text. Example format: {"description": "...", "calories": 500, "macros": "P: 30g, C: 40g, F: 10g"}' },
                        { role: 'user', content: `Analyze: ${slot.main} with ${slot.side1} and ${slot.side2}` }
                    ],
                    model: 'openai'
                })
            });

            const rawText = await response.text();
            
            // --- THE FIX: ROBUST JSON EXTRACTION ---
            let data;
            try {
                // This regex finds the first { and the last } and grabs everything in between
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON found");
                data = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("Raw AI Output:", rawText);
                throw new Error("AI response was messy. Try clicking generate again.");
            }

            // 2. Image Gen
            setAiStatus('Generating Photo...');
            const seed = Math.floor(Math.random() * 100000);
            const imageUrl = `https://image.pollinations.ai/prompt/Gourmet%20${encodeURIComponent(slot.main)}%20plated%20bento?nologo=true&seed=${seed}`;

            // 3. Save to Supabase
            setAiStatus('Saving to DB...');
            const { error } = await supabase.from('recipes').insert([{
                main_dish: slot.main,
                side1: slot.side1 || 'N/A',
                side2: slot.side2 || 'N/A',
                description: data.description,
                calories: data.calories.toString(), // Ensuring it's a string
                image_url: imageUrl
            }]);

            if (error) throw error;

            const newSlots = [...slots];
            newSlots[idx] = { 
                ...slot, 
                description: data.description, 
                nutrition: `${data.calories} kcal (${data.macros})`,
                image_url: imageUrl 
            };
            setSlots(newSlots);
            toast.success("Meal analysis saved!");
            if(refreshData) refreshData();

        } catch (err) {
            console.error("Process Error:", err);
            toast.error(err.message);
        } finally {
            setLoadingIdx(null);
            setAiStatus('');
        }
    };

    const updateSlot = (idx, field, val) => {
        const copy = [...slots];
        copy[idx][field] = val;
        setSlots(copy);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {slots.map((slot, idx) => (
                <div key={idx} className="bg-white rounded-[45px] p-8 border border-stone-200 shadow-xl overflow-hidden relative">
                    {/* Image Area */}
                    <div className="h-52 -mx-8 -mt-8 mb-8 bg-stone-100 relative">
                        {slot.image_url ? (
                            <img src={slot.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-200"><Camera className="w-10 h-10" /></div>
                        )}
                        {loadingIdx === idx && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-[#1b4d3e]">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <span className="font-bold text-[10px] uppercase tracking-widest">{aiStatus}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <input className="w-full p-4 bg-stone-50 rounded-2xl font-bold text-[#1b4d3e] outline-none" placeholder="Main Dish..." value={slot.main} onChange={e => updateSlot(idx, 'main', e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                            <input className="p-3 bg-stone-50 rounded-xl text-sm outline-none" placeholder="Side 1" value={slot.side1} onChange={e => updateSlot(idx, 'side1', e.target.value)} />
                            <input className="p-3 bg-stone-50 rounded-xl text-sm outline-none" placeholder="Side 2" value={slot.side2} onChange={e => updateSlot(idx, 'side2', e.target.value)} />
                        </div>

                        {slot.nutrition && (
                            <div className="bg-emerald-50 p-4 rounded-2xl">
                                <p className="text-[10px] font-black text-emerald-700 uppercase mb-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Nutrition Analysis
                                </p>
                                <p className="text-xs text-emerald-900 font-medium">{slot.nutrition}</p>
                            </div>
                        )}

                        <button onClick={() => generateMealDetails(idx)} disabled={loadingIdx !== null} className="w-full bg-[#1b4d3e] text-white py-5 rounded-2xl font-bold hover:shadow-lg transition-all disabled:opacity-50">
                            Analyze & Save Meal
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}