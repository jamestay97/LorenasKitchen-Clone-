import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, startOfWeek } from "date-fns";
import { Save, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function MenuEditor({ activeMenu, onUpdate }) {
  const [currentMenuId, setCurrentMenuId] = useState(activeMenu?.id || null);
  const [date, setDate] = useState(activeMenu ? new Date(activeMenu.week_start) : new Date());
  
  // Default empty meals if none exist
  const [meals, setMeals] = useState(activeMenu?.meals || [
    { id: '1', title: '', side: '', side2: '', image_seed: Math.floor(Math.random() * 1000) },
    { id: '2', title: '', side: '', side2: '', image_seed: Math.floor(Math.random() * 1000) },
    { id: '3', title: '', side: '', side2: '', image_seed: Math.floor(Math.random() * 1000) }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  // Update state when the prop changes (e.g. loading a different menu)
  useEffect(() => {
    if (activeMenu) {
        setCurrentMenuId(activeMenu.id);
        setDate(new Date(activeMenu.week_start));
        setMeals(activeMenu.meals || []);
    }
  }, [activeMenu]);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
        const weekStart = format(date, 'yyyy-MM-dd');
        const weekEnd = format(addDays(date, 6), 'yyyy-MM-dd');
        
        const menuData = {
            week_start: weekStart,
            week_end: weekEnd,
            meals: meals,
            status: 'active'
        };

        if (currentMenuId) {
            await base44.entities.Menu.update(currentMenuId, menuData);
            toast.success("Menu updated successfully!");
        } else {
            const newMenu = await base44.entities.Menu.create(menuData);
            setCurrentMenuId(newMenu.id);
            toast.success("New menu created!");
        }
        
        if (onUpdate) onUpdate();
    } catch (error) {
        console.error(error);
        toast.error("Failed to save menu");
    } finally {
        setIsProcessing(false);
    }
  };

  const updateMeal = (index, field, value) => {
    const newMeals = [...meals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setMeals(newMeals);
  };

  const addMeal = () => {
    setMeals([...meals, { id: Date.now().toString(), title: '', side: '', side2: '', image_seed: Math.floor(Math.random() * 1000) }]);
  };

  const removeMeal = (index) => {
    const newMeals = meals.filter((_, i) => i !== index);
    setMeals(newMeals);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1b4d3e]">Weekly Menu</h2>
          <p className="text-sm text-gray-500">Plan your meals for the week</p>
        </div>
        
        <div className="flex items-center gap-3">
            <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a week start</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
            </Popover>
            
            <Button onClick={handleSave} disabled={isProcessing} className="bg-[#1b4d3e] hover:bg-[#143d30]">
                {isProcessing ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Menu</>}
            </Button>
        </div>
      </div>

      <div className="space-y-6">
        {meals.map((meal, index) => (
            <div key={meal.id || index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeMeal(index)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-1 flex justify-center pb-2">
                        <div className="w-8 h-8 rounded-full bg-[#1b4d3e] text-white flex items-center justify-center font-bold text-sm">
                            {index + 1}
                        </div>
                    </div>
                    
                    <div className="md:col-span-5 space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Main Dish</label>
                        <Input 
                            placeholder="e.g. Roasted Chicken" 
                            value={meal.title}
                            onChange={(e) => updateMeal(index, 'title', e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    
                    <div className="md:col-span-3 space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Side 1</label>
                        <Input 
                            placeholder="e.g. Mashed Potatoes" 
                            value={meal.side}
                            onChange={(e) => updateMeal(index, 'side', e.target.value)}
                            className="bg-white"
                        />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Side 2</label>
                        <Input 
                            placeholder="e.g. Green Beans" 
                            value={meal.side2}
                            onChange={(e) => updateMeal(index, 'side2', e.target.value)}
                            className="bg-white"
                        />
                    </div>
                </div>
            </div>
        ))}
        
        <Button variant="outline" onClick={addMeal} className="w-full border-dashed border-2">
            + Add Another Meal
        </Button>
      </div>
    </div>
  );
}