import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { BookOpen, Search, Image as ImageIcon, Plus, Pencil, Trash2, Loader2, Sparkles, FileText } from 'lucide-react';

const BENTO_IMAGE_PROMPT = (name) =>
  `professional food photography, ${name}, single dish on white plate, restaurant quality, 4k, appetizing`;

export default function FoodLibrary({ dishes = [], onRefresh }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'main' | 'side'
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'main',
    image_url: '',
    description: '',
    nutrition: null,
    ingredients: null,
  });

  const sorted = [...dishes].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const filtered = sorted.filter((d) => {
    const matchesQuery = !query.trim() || (d.name || '').toLowerCase().includes(query.trim().toLowerCase());
    const matchesType = typeFilter === 'all' || (d.type || 'main') === typeFilter;
    return matchesQuery && matchesType;
  });

  const resetForm = () => {
    setForm({ name: '', type: 'main', image_url: '', description: '', nutrition: null, ingredients: null });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type || 'main',
        image_url: form.image_url?.trim() || null,
        description: form.description?.trim() || null,
        nutrition: form.nutrition ?? null,
        ingredients: Array.isArray(form.ingredients) ? form.ingredients : null,
      };
      if (editingId) {
        const { error } = await supabase.from('dishes').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Dish updated');
      } else {
        const { error } = await supabase.from('dishes').insert([payload]);
        if (error) throw error;
        toast.success('Dish added');
      }
      resetForm();
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editFormRef = useRef(null);

  // Scroll the inline edit form into view when editing an existing dish
  useEffect(() => {
    if (editingId && showForm && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editingId, showForm]);

  const handleEdit = (d) => {
    setEditingId(d.id);
    setForm({
      name: d.name || '',
      type: d.type || 'main',
      image_url: d.image_url || d.url || '',
      description: d.description || '',
      nutrition: d.nutrition ?? null,
      ingredients: d.ingredients ?? null,
    });
    setShowForm(true);
  };

  const handleGenerateImage = async () => {
    const name = form.name?.trim();
    if (!name) {
      toast.error('Enter a dish name first');
      return;
    }
    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('pollinations-proxy', {
        body: {
          type: 'image',
          prompt: BENTO_IMAGE_PROMPT(name),
          seed: Math.floor(Math.random() * 1000000),
        },
      });
      if (error) throw error;
      if (data?.url) {
        setForm((f) => ({ ...f, image_url: data.url }));
        toast.success('Image generated');
      } else {
        toast.error('No image URL returned');
      }
    } catch (err) {
      console.error(err);
      toast.error('Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateDescription = async () => {
    const name = form.name?.trim();
    if (!name) {
      toast.error('Enter a dish name first');
      return;
    }
    setGeneratingText(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { main: name, side1: '', side2: '' },
      });
      if (error) throw error;
      if (data && !data.error) {
        setForm((f) => ({
          ...f,
          description: data.description ?? f.description,
          nutrition: data.nutrition ?? f.nutrition,
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : f.ingredients,
        }));
        toast.success('Description & nutrition generated');
      } else {
        toast.error('Could not generate description');
      }
    } catch (err) {
      console.error(err);
      toast.error('Description generation failed');
    } finally {
      setGeneratingText(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dish from the recipe book?')) return;
    try {
      const { error } = await supabase.from('dishes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Dish removed');
      resetForm();
      onRefresh?.();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  /* ---------- Inline edit form (rendered at top for Add, or inline for Edit) ---------- */
  const renderEditForm = () => (
    <div ref={editingId ? editFormRef : null} className="p-6 bg-white rounded-2xl border-2 border-[#2c5f4c]/30 shadow-md">
      <h3 className="text-lg font-bold text-[#1a3c30] mb-4">{editingId ? 'Edit dish' : 'Add dish'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-bold text-stone-500 mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Turkey Tacos"
            className="w-full p-3 rounded-xl border border-stone-200"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full p-3 rounded-xl border border-stone-200"
          >
            <option value="main">Main</option>
            <option value="side">Side</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-stone-500 mb-1">Image URL</label>
          <div className="flex gap-2">
            <input
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://... or generate below"
              className="flex-1 p-3 rounded-xl border border-stone-200"
            />
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={generatingImage || !form.name?.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 disabled:opacity-50 shrink-0"
            >
              {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate photo
            </button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-stone-500 mb-1">Description</label>
          <div className="flex gap-2 mb-2">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description — or generate below"
              rows={2}
              className="flex-1 p-3 rounded-xl border border-stone-200"
            />
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generatingText || !form.name?.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200 disabled:opacity-50 shrink-0 self-start"
              title="Generate or regenerate description and nutrition"
            >
              {generatingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Generate text
            </button>
          </div>
          {form.nutrition && typeof form.nutrition === 'object' && (
            <div className="mt-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nutrition</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { l: 'Cal', v: form.nutrition.calories },
                  { l: 'Prot', v: form.nutrition.protein },
                  { l: 'Carbs', v: form.nutrition.carbs },
                  { l: 'Fat', v: form.nutrition.fat },
                  { l: 'Sug', v: form.nutrition.sugar },
                ].map((n, i) => (
                  <div key={i} className="bg-white border border-stone-100 p-2 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">{n.l}</p>
                    <p className="text-sm font-bold text-stone-800">{n.v ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving || !form.name?.trim()}
          className="px-4 py-2 rounded-xl bg-[#2c5f4c] text-white font-bold disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
        </button>
        <button onClick={resetForm} className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-[#2c5f4c] p-3 rounded-2xl">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1a3c30]">Recipe Book</h2>
            <p className="text-sm text-stone-500">Add, edit, or remove dishes. Use them in Menu Builder.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2c5f4c] text-white font-semibold hover:bg-[#1a3c30]"
        >
          <Plus className="w-4 h-4" /> Add dish
        </button>
      </div>

      {/* Add-new form at the top (only when adding, not editing) */}
      {showForm && !editingId && (
        <div className="mb-8">{renderEditForm()}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex rounded-xl border border-stone-200 overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-3 text-sm font-semibold ${typeFilter === 'all' ? 'bg-[#2c5f4c] text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('main')}
            className={`px-4 py-3 text-sm font-semibold border-l border-stone-200 ${typeFilter === 'main' ? 'bg-[#2c5f4c] text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Mains
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('side')}
            className={`px-4 py-3 text-sm font-semibold border-l border-stone-200 ${typeFilter === 'side' ? 'bg-[#2c5f4c] text-white' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
          >
            Sides
          </button>
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#2c5f4c]/20 focus:border-[#2c5f4c]"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((d) => {
          const isEditing = editingId === d.id && showForm;

          // If this dish is being edited, show the inline form spanning full width
          if (isEditing) {
            return (
              <div key={d.id || d.name} className="sm:col-span-2">
                {renderEditForm()}
              </div>
            );
          }

          return (
            <div
              key={d.id || d.name}
              className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4 shadow-sm group"
            >
              {(d.image_url || d.url) ? (
                <img
                  src={d.image_url || d.url}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-8 h-8 text-stone-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-800 truncate">{d.name}</p>
                <p className="text-xs text-stone-500 capitalize">{d.type || 'dish'}</p>
                {d.description && (
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">{d.description}</p>
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(d)}
                  className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">
            {query.trim() ? 'No matches' : 'No dishes in the recipe book yet'}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            {query.trim() ? 'Try a different search' : 'Add dishes above or save a menu in Menu Builder'}
          </p>
        </div>
      )}
    </div>
  );
}
