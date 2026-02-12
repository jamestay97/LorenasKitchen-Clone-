import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function GalleryManager() {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        const { data } = await supabase.from('gallery_images').select('*').order('created_at', { ascending: false });
        setImages(data || []);
    };

    const handleFileUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Storage Bucket
            const { error: uploadError } = await supabase.storage
                .from('meal-gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('meal-gallery')
                .getPublicUrl(filePath);

            // 3. Save to Database
            await supabase.from('gallery_images').insert([{ 
                image_url: publicUrl, 
                caption: file.name 
            }]);

            toast.success('Image uploaded!');
            fetchImages();
        } catch (error) {
            toast.error('Error uploading image');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id, url) => {
        if (!confirm('Delete this image?')) return;
        
        // Extract filename from URL for storage deletion logic if needed
        await supabase.from('gallery_images').delete().match({ id });
        fetchImages();
        toast.success('Image deleted');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-[#1b4d3e]">Meal Gallery</h2>
                <label className={`cursor-pointer bg-[#1b4d3e] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? <Loader2 className="animate-spin w-5 h-5"/> : <Upload className="w-5 h-5" />}
                    Upload Photo
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {images.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-200 rounded-[40px]">
                        <ImageIcon className="w-12 h-12 mb-2" />
                        <p className="font-bold">No images in gallery yet</p>
                    </div>
                )}
                
                {images.map(img => (
                    <div key={img.id} className="group relative aspect-square bg-stone-100 rounded-3xl overflow-hidden shadow-sm">
                        <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                onClick={() => handleDelete(img.id, img.image_url)}
                                className="bg-red-500 text-white p-3 rounded-xl hover:scale-110 transition-transform"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}