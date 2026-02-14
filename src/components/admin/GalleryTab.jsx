import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { LayoutGrid, Upload, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const BUCKET = 'gallery';

export default function GalleryTab({ gallery = [], onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      const { error: insertError } = await supabase.from('gallery_images').insert([
        { image_url: publicUrl, title: title.trim() || null, category: category.trim() || null },
      ]);
      if (insertError) throw insertError;
      toast.success('Photo added to gallery');
      setTitle('');
      setCategory('');
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error(err.message?.includes('Bucket') ? 'Create a storage bucket named "gallery" in Supabase.' : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id, imageUrl) => {
    setDeletingId(id);
    try {
      await supabase.from('gallery_images').delete().eq('id', id);
      toast.success('Photo removed');
      onRefresh?.();
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#2c5f4c] p-3 rounded-2xl">
          <LayoutGrid className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#1a3c30]">Kitchen Gallery</h2>
          <p className="text-sm text-stone-500">Upload and manage photos for the homepage &quot;From the Kitchen&quot; strip.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-8">
        <h3 className="font-semibold text-stone-800 mb-4">Upload photo</h3>
        <p className="text-xs text-stone-500 mb-3">Create a storage bucket named &quot;gallery&quot; in Supabase if upload fails.</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full max-w-xs rounded-lg border border-stone-200 px-3 py-2 text-sm mb-2"
        />
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className="w-full max-w-xs rounded-lg border border-stone-200 px-3 py-2 text-sm mb-4"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="block mb-2"
        />
        {uploading && <Loader2 className="w-5 h-5 animate-spin text-[#2c5f4c]" />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {gallery.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm group relative">
            <div className="aspect-square bg-stone-100">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-stone-300" />
                </div>
              )}
            </div>
            <div className="p-2">
              {item.title && <p className="text-sm font-medium text-stone-800 truncate">{item.title}</p>}
              {item.category && <p className="text-xs text-stone-500">{item.category}</p>}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            >
              {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200">
          <LayoutGrid className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">No gallery photos yet</p>
          <p className="text-sm text-stone-400 mt-1">Upload photos above to show on the homepage</p>
        </div>
      )}
    </div>
  );
}
