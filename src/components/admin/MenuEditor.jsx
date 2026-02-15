import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Input } from '../ui/UiKit';
import {
  format,
  addDays,
  parseISO,
  startOfWeek,
} from 'date-fns';
import {
  Save,
  RefreshCw,
  Image as ImageIcon,
  ChevronDown,
  Zap,
  RotateCcw,
  ImagePlus,
  FileText,
  X,
  BookOpen,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { invokeGenerateTextWithRetry } from '../../services/aiService';

const BENTO_IMAGE_PROMPT = (name) =>
  `professional food photography, ${name}, single dish on white plate, restaurant quality, 4k, appetizing`;

/** Sum nutrition from main + side1 + side2 dishes when all three exist in recipeBook with nutrition. */
function summedNutrition(meal, recipeBook) {
  // Parse a nutrition value that could be a number (450) or string ("35g") into a number
  const parseNutrVal = (v) => {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v);
      return Number.isNaN(n) ? 0 : n;
    }
    return 0;
  };
  // Format back: calories stay as number, others get "g" suffix
  const fmtG = (v) => v > 0 ? `${Math.round(v)}g` : '—';

  if (!recipeBook?.length) return meal.nutrition ?? null;
  const byName = (name) => recipeBook.find((r) => (r.name || '').toLowerCase() === (name || '').trim().toLowerCase());
  const mainD = byName(meal.title);
  const side1D = byName(meal.side);
  const side2D = byName(meal.side2);
  const n = (d) => (d?.nutrition && typeof d.nutrition === 'object' ? d.nutrition : null);
  const dishes = [n(mainD), n(side1D), n(side2D)].filter(Boolean);
  // If we found at least 2 of the 3 dishes in the recipe book, sum their nutrition
  if (dishes.length >= 2) {
    const sum = (key) => dishes.reduce((acc, d) => acc + parseNutrVal(d[key]), 0);
    const firstServing = dishes[0]?.servingSize;
    return {
      calories: Math.round(sum('calories')),
      protein: fmtG(sum('protein')),
      carbs: fmtG(sum('carbs')),
      fat: fmtG(sum('fat')),
      sugar: fmtG(sum('sugar')),
      servingSize: firstServing || '1 plate',
    };
  }
  return meal.nutrition ?? null;
}

/** Map DB meal row (image_main, image_side1, image_side2) to editor state (main_img, side1_img, side2_img) */
function mealRowToEditor(row) {
  return {
    id: row.id,
    title: row.title ?? '',
    side: row.side ?? '',
    side2: row.side2 ?? '',
    description: row.description ?? '',
    nutrition: row.nutrition ?? null,
    ingredients: row.ingredients ?? null,
    main_img: row.image_main ?? row.main_img ?? '',
    side1_img: row.image_side1 ?? row.side1_img ?? '',
    side2_img: row.image_side2 ?? row.side2_img ?? '',
    isGenerating: false,
  };
}

/** Map editor meal to DB meals table row (image_main, image_side1, image_side2) */
function mealToRow(meal, menuId) {
  return {
    menu_id: menuId,
    title: meal.title || null,
    side: meal.side || null,
    side2: meal.side2 || null,
    description: meal.description || null,
    image_main: meal.main_img || null,
    image_side1: meal.side1_img || null,
    image_side2: meal.side2_img || null,
    nutrition: meal.nutrition ?? null,
  };
}

export default function MenuEditor({
  dishes = [],
  gallery = [],
  refreshData,
  editMode,
  editId,
  initialData,
  onSuccess,
}) {
  const [dateStr, setDateStr] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [loading, setLoading] = useState(false);
  const [recipeBook, setRecipeBook] = useState([]);
  const [openLib, setOpenLib] = useState(null);
  const [galleryPickerFor, setGalleryPickerFor] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const closeDropdownTimeoutRef = useRef(null);

  const [meals, setMeals] = useState([
    {
      id: '1',
      title: '',
      side: '',
      side2: '',
      description: '',
      nutrition: null,
      ingredients: null,
      main_img: '',
      side1_img: '',
      side2_img: '',
      isGenerating: false,
    },
    {
      id: '2',
      title: '',
      side: '',
      side2: '',
      description: '',
      nutrition: null,
      ingredients: null,
      main_img: '',
      side1_img: '',
      side2_img: '',
      isGenerating: false,
    },
    {
      id: '3',
      title: '',
      side: '',
      side2: '',
      description: '',
      nutrition: null,
      ingredients: null,
      main_img: '',
      side1_img: '',
      side2_img: '',
      isGenerating: false,
    },
  ]);

  useEffect(() => {
    setRecipeBook(Array.isArray(dishes) ? [...dishes].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : []);
  }, [dishes]);

  useEffect(() => {
    if (initialData?.week_start) {
      setDateStr(initialData.week_start);
      if (initialData.meals?.length) {
        setMeals(
          initialData.meals.slice(0, 3).map((m) => mealRowToEditor(m))
        );
      }
    } else if (editId) {
      loadMenuForEdit();
    }
  }, [editId, initialData?.week_start]);

  const loadMenuForEdit = async () => {
    if (!editId) return;
    const { data } = await supabase.from('menus').select('*, meals(*)').eq('id', editId).single();
    if (data?.week_start) {
      setDateStr(data.week_start);
      if (data.meals?.length) {
        setMeals(
          data.meals.slice(0, 3).map((m) => mealRowToEditor(m))
        );
      }
    }
  };

  const weekMonday = useCallback((dateVal) => {
    const d = typeof dateVal === 'string' ? parseISO(dateVal) : dateVal;
    return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }, []);

  const handleDateChange = (e) => {
    const raw = e.target.value;
    if (!raw) return;
    setDateStr(weekMonday(raw));
  };

  const handleMealChange = (index, field, value) => {
    const updated = [...meals];
    updated[index][field] = value;
    setMeals(updated);
    // Open the recipe book dropdown as user types (search-as-you-type)
    if (['title', 'side', 'side2'].includes(field) && value.trim()) {
      setOpenLib({ index, field });
    }
  };

  const generateImage = async (promptText) => {
    const { data, error } = await supabase.functions.invoke('pollinations-proxy', {
      body: {
        type: 'image',
        prompt: BENTO_IMAGE_PROMPT(promptText),
        seed: Math.floor(Math.random() * 1000000),
      },
    });
    if (error) throw error;
    return data?.url || null;
  };

  const triggerAI = async (index, field, value) => {
    if (!value?.trim()) return;
    const trimmed = value.trim();
    const part = field === 'title' ? 'main' : field === 'side' ? 'side1' : 'side2';
    const match = recipeBook.find(
      (r) => (r.name || '').toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      applyFromLibrary(index, part, match);
      // After applying from library, check if all 3 are filled and auto-generate description/nutrition
      const m = { ...meals[index] };
      if (part === 'main') m.title = match.name;
      else if (part === 'side1') m.side = match.name;
      else m.side2 = match.name;
      if (m.title?.trim() && m.side?.trim() && m.side2?.trim() && !m.description) {
        autoGenerateText(index, m);
      }
      return;
    }

    const updated = [...meals];
    updated[index].isGenerating = true;
    setMeals(updated);

    try {
      const imgField = field === 'title' ? 'main_img' : field === 'side' ? 'side1_img' : 'side2_img';
      const url = await generateImage(trimmed);
      updated[index][imgField] = url || updated[index][imgField];
      setMeals([...updated]);

      // Auto-generate description & nutrition whenever all 3 items are filled
      const m = updated[index];
      if (m.title?.trim() && (m.side?.trim() || m.side2?.trim())) {
        const { data: textData } = await invokeGenerateTextWithRetry({
          main: m.title,
          side1: m.side || '',
          side2: m.side2 || '',
        });
        if (textData) {
          updated[index].description = textData.description ?? updated[index].description;
          updated[index].nutrition = textData.nutrition ?? updated[index].nutrition;
          updated[index].ingredients = textData.ingredients?.length ? textData.ingredients : (updated[index].ingredients ?? []);
          setMeals([...updated]);
        }
      }
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('AI generation failed');
    } finally {
      setMeals((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], isGenerating: false };
        return next;
      });
    }
  };

  // Helper: auto-generate description/nutrition for a meal after library items are applied
  const autoGenerateText = async (index, mealSnapshot) => {
    setMeals((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], isGenerating: true };
      return next;
    });
    try {
      const { data: textData } = await invokeGenerateTextWithRetry({
        main: mealSnapshot.title,
        side1: mealSnapshot.side || '',
        side2: mealSnapshot.side2 || '',
      });
      if (textData) {
        setMeals((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              ...next[index],
              description: textData.description ?? next[index].description,
              nutrition: textData.nutrition ?? next[index].nutrition,
              ingredients: textData.ingredients?.length ? textData.ingredients : (next[index].ingredients ?? []),
              isGenerating: false,
            };
          }
          return next;
        });
      } else {
        setMeals((prev) => {
          const next = [...prev];
          if (next[index]) next[index] = { ...next[index], isGenerating: false };
          return next;
        });
      }
    } catch {
      setMeals((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], isGenerating: false };
        return next;
      });
    }
  };

  const handleRegenerateImage = async (index, slot) => {
    setOpenActionMenu(null);
    const field = slot === 'main' ? 'title' : slot === 'side1' ? 'side' : 'side2';
    const value = meals[index][field];
    if (!value?.trim()) {
      toast.error('Enter a dish name first');
      return;
    }
    const updated = [...meals];
    updated[index].isGenerating = true;
    setMeals(updated);
    try {
      const url = await generateImage(value.trim());
      const imgField = slot === 'main' ? 'main_img' : slot === 'side1' ? 'side1_img' : 'side2_img';
      updated[index][imgField] = url || '';
      updated[index].isGenerating = false;
      setMeals([...updated]);
      toast.success('Image updated');
    } catch (e) {
      updated[index].isGenerating = false;
      setMeals([...updated]);
      toast.error('Regeneration failed');
    }
  };

  const handleRegenerateDescription = async (index) => {
    setOpenActionMenu(null);
    const m = meals[index];
    if (!m.title?.trim()) {
      toast.error('Enter main dish first');
      return;
    }
    const updated = [...meals];
    updated[index].isGenerating = true;
    setMeals(updated);
    try {
      const { data } = await invokeGenerateTextWithRetry({
        main: m.title,
        side1: m.side || '',
        side2: m.side2 || '',
      });
      if (data) {
        updated[index].description = data.description ?? '';
        updated[index].nutrition = data.nutrition ?? null;
        updated[index].ingredients = data.ingredients ?? null;
        updated[index].isGenerating = false;
        setMeals([...updated]);
        toast.success('Description & nutrition updated');
      } else {
        updated[index].isGenerating = false;
        setMeals([...updated]);
        toast.error('Regeneration failed');
      }
    } catch (e) {
      updated[index].isGenerating = false;
      setMeals([...updated]);
      toast.error('Regeneration failed');
    }
  };

  const applyFromLibrary = (index, part, dish) => {
    const updated = [...meals];
    if (part === 'main') {
      updated[index].title = dish.name;
      updated[index].main_img = dish.image_url || dish.url || '';
      updated[index].description = dish.description ?? '';
      updated[index].nutrition = dish.nutrition ?? null;
      updated[index].ingredients = dish.ingredients ?? null;
    } else if (part === 'side1') {
      updated[index].side = dish.name;
      updated[index].side1_img = dish.image_url || dish.url || '';
    } else {
      updated[index].side2 = dish.name;
      updated[index].side2_img = dish.image_url || dish.url || '';
    }
    setMeals(updated);
    setOpenLib(null);
    toast.success(`Loaded "${dish.name}"`);

    // Auto-generate description + nutrition when main + at least one side are filled
    const m = updated[index];
    if (m.title?.trim() && (m.side?.trim() || m.side2?.trim()) && !m.description?.trim()) {
      autoGenerateText(index, m);
    }
  };

  const setImageFromGallery = (index, slot, imageUrl) => {
    const updated = [...meals];
    const imgField = slot === 'main' ? 'main_img' : slot === 'side1' ? 'side1_img' : 'side2_img';
    updated[index][imgField] = imageUrl;
    setMeals(updated);
    setGalleryPickerFor(null);
    toast.success('Image set from gallery');
  };

  // Auto-skip duplicates: only save new dishes, never prompt

  const doSave = async () => {
    setLoading(true);
    try {
      const weekStart = weekMonday(dateStr);
      const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
      const mealsToSave = meals.map((m) => ({ ...m, isGenerating: false }));

      // 1) Backup components to dishes (schema: name, type, image_url, description only). Duplicate detection: only save new.
      let newCount = 0;
      let skipCount = 0;
      for (const meal of mealsToSave) {
        if (!meal.title) continue;
        const components = [
          { name: meal.title, type: 'main', img: meal.main_img, desc: meal.description },
          { name: meal.side, type: 'side', img: meal.side1_img },
          { name: meal.side2, type: 'side', img: meal.side2_img },
        ];
        for (const item of components) {
          if (!item.name) continue;
          const exists = recipeBook.some(
            (r) => (r.name || '').toLowerCase() === item.name.toLowerCase()
          );
          if (!exists) {
            await supabase.from('dishes').insert({
              name: item.name,
              type: item.type,
              image_url: item.img || null,
              description: item.desc || null,
            });
            newCount++;
          } else {
            skipCount++;
          }
        }
      }

      // 2) Upsert menu (menus table: week_start, week_end, status) and get id
      // Do not send id in payload: upsert matches on week_start and returns the row id.
      const menuPayload = {
        week_start: weekStart,
        week_end: weekEnd,
        status: 'active',
      };
      const { data: savedMenu, error: menuError } = await supabase
        .from('menus')
        .upsert(menuPayload, { onConflict: 'week_start' })
        .select('id')
        .single();
      if (menuError) throw menuError;
      const menuId = savedMenu.id;

      // 3) Update meals in place by slot index so meal IDs stay stable and feedback.meal_id still matches the dish
      const { data: existingMeals } = await supabase
        .from('meals')
        .select('id')
        .eq('menu_id', menuId)
        .order('id');
      const existingIds = (existingMeals ?? []).map((m) => m.id);

      for (let i = 0; i < mealsToSave.length; i++) {
        const meal = mealsToSave[i];
        const nutritionToSave = (summedNutrition(meal, recipeBook) || meal.nutrition) ?? null;
        const row = mealToRow({ ...meal, nutrition: nutritionToSave }, menuId);
        if (existingIds[i] != null) {
          const { error: updateErr } = await supabase
            .from('meals')
            .update(row)
            .eq('id', existingIds[i]);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase.from('meals').insert(row);
          if (insertErr) throw insertErr;
        }
      }

      // Remove any extra meal rows (e.g. we had 5 slots, now we have 3)
      if (existingIds.length > mealsToSave.length) {
        const idsToDelete = existingIds.slice(mealsToSave.length);
        for (const id of idsToDelete) {
          const { error: delErr } = await supabase.from('meals').delete().eq('id', id);
          if (delErr) throw delErr;
        }
      }

      if (skipCount > 0 && newCount === 0) {
        toast.success('Menu saved. All dishes already in recipe book; no duplicates added.');
      } else if (skipCount > 0) {
        toast.success(`Menu saved. ${newCount} new dish(es) added to recipe book; ${skipCount} already existed and were skipped.`);
      } else {
        toast.success('Menu saved. Recipe book updated.');
      }
      refreshData?.();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMenu = () => {
    const hasAny = meals.some((m) => m.title?.trim());
    if (!hasAny) {
      toast.error('Add at least one main dish');
      return;
    }
    doSave();
  };

  const getGalleryUrl = (item) => item?.url || item?.image_url || item?.src || '';

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[1800px] mx-auto min-h-screen bg-transparent">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-3xl shadow-xl border border-stone-100 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-[#1a3c30] tracking-tight flex items-center gap-2">
            <Zap className="text-[#2c5f4c]" /> Menu Builder
          </h2>
          <p className="text-sm text-stone-500 mt-1">1 main + 2 sides per meal • AI images & nutrition</p>
          <div className="flex items-center gap-3 mt-4 bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-100">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Week (Mon – Sun)</span>
            <input
              type="date"
              value={weekMonday(dateStr)}
              onChange={handleDateChange}
              className="bg-transparent text-sm font-semibold border-none focus:ring-0 cursor-pointer text-[#1a3c30]"
            />
            <span className="text-sm text-stone-600">
              {format(parseISO(weekMonday(dateStr)), 'EEEE, MMM d')} – {format(addDays(parseISO(weekMonday(dateStr)), 6), 'EEEE, MMM d')}
            </span>
          </div>
        </div>
        <Button
          onClick={handleSaveMenu}
          disabled={loading}
          className="bg-[#2c5f4c] text-white rounded-xl px-8 h-12 shadow-lg hover:bg-[#1a3c30] transition-all font-semibold"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5 mr-2" /> Save Menu</>}
        </Button>
      </div>

      {/* Bento grid */}
      <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
        {meals.map((meal, index) => (
          <div
            key={meal.id || index}
            className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-visible flex flex-col relative group min-w-0"
          >
            {/* Bento visual */}
            <div className="h-64 bg-stone-900 p-3 grid grid-cols-3 gap-3 relative overflow-visible">
              {/* Main */}
              <div className="col-span-2 bg-stone-800 rounded-2xl relative overflow-visible">
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  {meal.main_img ? (
                    <img src={meal.main_img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-stone-600">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <SlotActions
                  slot="main"
                  index={index}
                  openActionMenu={openActionMenu}
                  setOpenActionMenu={setOpenActionMenu}
                  onRegenerateImage={() => handleRegenerateImage(index, 'main')}
                  onRegenerateDescription={() => handleRegenerateDescription(index)}
                  onOpenGallery={() => setGalleryPickerFor({ index, slot: 'main' })}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { key: 'side1', img: meal.side1_img },
                  { key: 'side2', img: meal.side2_img },
                ].map(({ key, img }) => (
                  <div key={key} className="flex-1 bg-stone-800 rounded-xl relative overflow-visible">
                    <div className="absolute inset-0 rounded-xl overflow-hidden">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-stone-600">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <SlotActions
                      slot={key}
                      index={index}
                      openActionMenu={openActionMenu}
                      setOpenActionMenu={setOpenActionMenu}
                      onRegenerateImage={() => handleRegenerateImage(index, key)}
                      onOpenGallery={() => setGalleryPickerFor({ index, slot: key })}
                    />
                  </div>
                ))}
              </div>
              {meal.isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center text-white">
                    <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-2" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Generating…</p>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="p-7 space-y-4 flex-1 min-w-0">
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">Main</label>
                  <Input
                    placeholder="e.g. Garlic Butter Salmon"
                    value={meal.title}
                    onChange={(e) => handleMealChange(index, 'title', e.target.value)}
                    onFocus={() => {
                      if (closeDropdownTimeoutRef.current) {
                        clearTimeout(closeDropdownTimeoutRef.current);
                        closeDropdownTimeoutRef.current = null;
                      }
                      setOpenLib({ index, field: 'title' });
                    }}
                    onBlur={() => {
                      if (closeDropdownTimeoutRef.current) clearTimeout(closeDropdownTimeoutRef.current);
                      closeDropdownTimeoutRef.current = setTimeout(() => setOpenLib(null), 200);
                      triggerAI(index, 'title', meal.title);
                    }}
                    className="font-semibold border-stone-200 h-11 rounded-xl"
                  />
                  {openLib?.index === index && openLib?.field === 'title' && (
                    <RecipeBookDropdown
                      recipeBook={recipeBook}
                      type="main"
                      query={meal.title}
                      onSelect={(r) => applyFromLibrary(index, 'main', r)}
                      onClose={() => setOpenLib(null)}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative min-w-0">
                    <label className="text-xs font-semibold text-stone-500 block mb-1">Side 1</label>
                    <Input
                      placeholder="Side 1"
                      value={meal.side}
                      onChange={(e) => handleMealChange(index, 'side', e.target.value)}
                      onFocus={() => {
                        if (closeDropdownTimeoutRef.current) {
                          clearTimeout(closeDropdownTimeoutRef.current);
                          closeDropdownTimeoutRef.current = null;
                        }
                        setOpenLib({ index, field: 'side' });
                      }}
                      onBlur={() => {
                        if (closeDropdownTimeoutRef.current) clearTimeout(closeDropdownTimeoutRef.current);
                        closeDropdownTimeoutRef.current = setTimeout(() => setOpenLib(null), 200);
                        triggerAI(index, 'side', meal.side);
                      }}
                      className="text-sm border-stone-200 h-10 rounded-lg"
                    />
                    {openLib?.index === index && openLib?.field === 'side' && (
                      <RecipeBookDropdown
                        recipeBook={recipeBook}
                        type="side"
                        query={meal.side}
                        onSelect={(r) => applyFromLibrary(index, 'side1', r)}
                        onClose={() => setOpenLib(null)}
                      />
                    )}
                  </div>
                  <div className="relative min-w-0">
                    <label className="text-xs font-semibold text-stone-500 block mb-1">Side 2</label>
                    <Input
                      placeholder="Side 2"
                      value={meal.side2}
                      onChange={(e) => handleMealChange(index, 'side2', e.target.value)}
                      onFocus={() => {
                        if (closeDropdownTimeoutRef.current) {
                          clearTimeout(closeDropdownTimeoutRef.current);
                          closeDropdownTimeoutRef.current = null;
                        }
                        setOpenLib({ index, field: 'side2' });
                      }}
                      onBlur={() => {
                        if (closeDropdownTimeoutRef.current) clearTimeout(closeDropdownTimeoutRef.current);
                        closeDropdownTimeoutRef.current = setTimeout(() => setOpenLib(null), 200);
                        triggerAI(index, 'side2', meal.side2);
                      }}
                      className="text-sm border-stone-200 h-10 rounded-lg"
                    />
                    {openLib?.index === index && openLib?.field === 'side2' && (
                      <RecipeBookDropdown
                        recipeBook={recipeBook}
                        type="side"
                        query={meal.side2}
                        onSelect={(r) => applyFromLibrary(index, 'side2', r)}
                        onClose={() => setOpenLib(null)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Description</label>
                  <Button
                    type="button"
                    onClick={() => handleRegenerateDescription(index)}
                    disabled={!meal.title?.trim() || meal.isGenerating}
                    className="text-xs rounded-lg px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> Generate with AI
                  </Button>
                </div>
                <textarea
                  value={meal.description || ''}
                  onChange={(e) => handleMealChange(index, 'description', e.target.value)}
                  className="w-full text-sm border border-stone-200 rounded-xl p-3 h-20 resize-none focus:ring-2 focus:ring-[#2c5f4c]/20 focus:border-[#2c5f4c]"
                  placeholder="AI-generated or edit here…"
                />
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nutrition preview</p>
                {(() => {
                  const displayNutr = summedNutrition(meal, recipeBook);
                  return (
                <div>
                  {displayNutr?.servingSize && (
                    <p className="text-xs text-stone-500 mb-2">Serving size: {displayNutr.servingSize}</p>
                  )}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { l: 'Cal', v: displayNutr?.calories },
                    { l: 'Prot', v: displayNutr?.protein },
                    { l: 'Carbs', v: displayNutr?.carbs },
                    { l: 'Fat', v: displayNutr?.fat },
                    { l: 'Sug', v: displayNutr?.sugar },
                  ].map((n, i) => (
                    <div key={i} className="bg-stone-50 border border-stone-100 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-stone-400 uppercase">{n.l}</p>
                      <p className="text-sm font-bold text-stone-800">{n.v !== undefined && n.v !== null ? String(n.v) : '—'}</p>
                    </div>
                  ))}
                </div>
                </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gallery picker modal */}
      {galleryPickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setGalleryPickerFor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-bold text-stone-800">Choose from gallery</h3>
              <button onClick={() => setGalleryPickerFor(null)} className="p-2 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {gallery.length === 0 ? (
                <p className="col-span-full text-sm text-stone-500">No gallery images. Upload in the Gallery tab.</p>
              ) : (
                gallery.map((item) => {
                  const url = getGalleryUrl(item);
                  if (!url) return null;
                  return (
                    <button
                      key={item.id || url}
                      type="button"
                      onClick={() => setImageFromGallery(galleryPickerFor.index, galleryPickerFor.slot, url)}
                      className="aspect-square rounded-xl overflow-hidden border-2 border-stone-200 hover:border-[#2c5f4c] focus:border-[#2c5f4c] focus:ring-2 focus:ring-[#2c5f4c]/20"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotActions({
  slot,
  index,
  openActionMenu,
  setOpenActionMenu,
  onRegenerateImage,
  onRegenerateDescription,
  onOpenGallery,
}) {
  const key = `${index}-${slot}`;
  const isOpen = openActionMenu === key;
  const isMain = slot === 'main';
  return (
    <div className="absolute top-2 right-2 z-10">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpenActionMenu(isOpen ? null : key); }}
        className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-lg backdrop-blur-sm flex items-center gap-1"
      >
        <MoreVertical className="w-4 h-4" />
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {isOpen && (
        <>
          <div className="absolute right-0 top-full mt-1 min-w-[260px] py-1.5 bg-white rounded-xl shadow-xl border border-stone-200 z-20 whitespace-nowrap">
            <button
              type="button"
              onClick={() => { onRegenerateImage(); }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-3"
            >
              <RotateCcw className="w-4 h-4 shrink-0" /> Regenerate image
            </button>
            <button
              type="button"
              onClick={() => { onOpenGallery(); }}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-3"
            >
              <ImagePlus className="w-4 h-4 shrink-0" /> Choose from gallery
            </button>
            {isMain && (
              <button
                type="button"
                onClick={() => { onRegenerateDescription(); }}
                className="w-full px-4 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-3"
              >
                <FileText className="w-4 h-4 shrink-0" /> Regenerate description
              </button>
            )}
          </div>
          <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenu(null)} aria-hidden="true" />
        </>
      )}
    </div>
  );
}

function RecipeBookDropdown({ recipeBook, type, query, onSelect, onClose }) {
  const q = (query || '').toLowerCase().trim();
  // Show all matching dishes; prioritize exact prefix matches first, then includes
  const filtered = recipeBook.filter((r) => {
    const name = (r.name || '').toLowerCase();
    const typeMatch = type === 'main' ? (r.type === 'main' || !r.type) : (r.type === 'side' || !r.type);
    return typeMatch && (!q || name.includes(q));
  }).sort((a, b) => {
    if (!q) return 0;
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aStarts = aName.startsWith(q);
    const bStarts = bName.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  }).slice(0, 10);
  return (
    <div className="absolute left-0 z-50 mt-1.5 min-w-[320px] w-max max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-stone-200 py-1.5 max-h-72 overflow-y-auto">
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
          <BookOpen className="w-4 h-4 shrink-0" /> Recipe book
        </span>
        {q && <span className="text-xs text-stone-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-3 text-sm text-stone-500">No matches for "{query}". On blur, AI will generate a new dish.</p>
      ) : (
        filtered.map((r) => (
          <button
            key={r.id || r.name}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onSelect(r); }}
            className="w-full px-4 py-2.5 text-left hover:bg-[#e6f0eb] flex items-center gap-3 min-w-0 transition-colors"
          >
            {(r.image_url || r.url) ? (
              <img src={r.image_url || r.url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-stone-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-stone-800 truncate block">{r.name}</span>
              {r.description && <span className="text-xs text-stone-400 truncate block">{r.description}</span>}
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${(r.type === 'side') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {r.type === 'side' ? 'Side' : 'Main'}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
