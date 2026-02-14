import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Users, Plus, Pencil, Trash2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const getFirstName = (name) => (name || '').trim().split(/\s+/)[0] || '';

export default function CRMTab({ clients = [], onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const sorted = [...(clients || [])].sort((a, b) =>
    getFirstName(a.name).localeCompare(getFirstName(b.name), undefined, { sensitivity: 'base' })
  );

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', address: '', notes: '' });
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
      if (editingId) {
        const { error } = await supabase.from('clients').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success('Client updated');
      } else {
        const { error } = await supabase.from('clients').insert([form]);
        if (error) throw error;
        toast.success('Client added');
      }
      resetForm();
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      toast.success('Client removed');
      resetForm();
      onRefresh?.();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Notes'];
    const rows = sorted.map((c) => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.address || '',
      (c.notes || '').replace(/\r?\n/g, ' '),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lorena-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('CSV downloaded');
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-[#2c5f4c] p-3 rounded-2xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1a3c30]">CRM</h2>
            <p className="text-sm text-stone-500">Clients in alphabetical order by first name. One-click CSV backup.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2c5f4c] text-white font-semibold hover:bg-[#1a3c30]"
          >
            <Plus className="w-4 h-4" /> Add client
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-8 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">{editingId ? 'Edit client' : 'New client'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name *"
              className="rounded-xl border border-stone-200 px-4 py-2"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="rounded-xl border border-stone-200 px-4 py-2"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="rounded-xl border border-stone-200 px-4 py-2"
            />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address"
              className="rounded-xl border border-stone-200 px-4 py-2 sm:col-span-2"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (allergies, dietary restrictions, delivery preferences)"
              rows={3}
              className="rounded-xl border border-stone-200 px-4 py-2 sm:col-span-2 resize-none"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#2c5f4c] text-white font-semibold hover:bg-[#1a3c30] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Save'}
            </button>
            <button type="button" onClick={resetForm} className="px-5 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold hover:bg-stone-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-stone-800">{client.name}</p>
              {client.email && <p className="text-sm text-stone-500">{client.email}</p>}
              {client.phone && <p className="text-sm text-stone-500">{client.phone}</p>}
              {client.address && <p className="text-sm text-stone-500">{client.address}</p>}
              {client.notes && (
                <p className="text-sm text-amber-700 mt-1">
                  <span className="font-medium">Notes:</span> {client.notes}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleEdit(client)}
                className="p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(client.id)}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-stone-200">
          <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">No clients yet</p>
          <p className="text-sm text-stone-400 mt-1">Add a client to get started</p>
        </div>
      )}
    </div>
  );
}
