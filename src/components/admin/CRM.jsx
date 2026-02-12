import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { toast } from 'sonner';
import { UserPlus, Download, Search, MapPin, FileText, AlertCircle } from 'lucide-react';

export default function CRM({ clients, refreshData }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [newClient, setNewClient] = useState({ name: '', address: '', notes: '' });

    // 1. Download Backup Functionality
    const downloadBackup = () => {
        const headers = ['Name', 'Address', 'Notes/Allergies', 'Joined Date'];
        const rows = clients.map(c => [
            `"${c.name}"`, 
            `"${c.address || ''}"`, 
            `"${c.notes || ''}"`, 
            `"${c.created_at}"`
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `crm_backup_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Client data downloaded successfully!");
    };

    // 2. Add Client with Duplicate Detection
    const handleAddClient = async () => {
        if (!newClient.name) return toast.error("Name is required");

        // Duplicate Check
        const exists = clients.find(c => c.name.toLowerCase() === newClient.name.toLowerCase());
        if (exists) {
            if (!window.confirm(`"${newClient.name}" already exists. Do you want to create a duplicate?`)) {
                return;
            }
        }

        const { error } = await supabase.from('clients').insert([newClient]);
        if (error) {
            toast.error("Failed to add client");
        } else {
            toast.success("Client added!");
            setNewClient({ name: '', address: '', notes: '' });
            refreshData();
        }
    };

    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black text-[#1b4d3e]">Client CRM</h2>
                <button onClick={downloadBackup} className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-[#1b4d3e] px-4 py-2 rounded-xl font-bold transition-colors">
                    <Download className="w-4 h-4" /> Backup Data
                </button>
            </div>

            {/* Add New Client Card */}
            <div className="bg-white p-8 rounded-[40px] border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-[#1b4d3e] mb-6 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Add New Client
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                        className="p-4 bg-stone-50 rounded-2xl font-bold" 
                        placeholder="Client Name"
                        value={newClient.name}
                        onChange={e => setNewClient({...newClient, name: e.target.value})}
                    />
                    <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-5 h-5 text-stone-400" />
                        <input 
                            className="w-full p-4 pl-12 bg-stone-50 rounded-2xl font-medium" 
                            placeholder="Delivery Address"
                            value={newClient.address}
                            onChange={e => setNewClient({...newClient, address: e.target.value})}
                        />
                    </div>
                    <div className="relative">
                        <FileText className="absolute left-4 top-4 w-5 h-5 text-stone-400" />
                        <input 
                            className="w-full p-4 pl-12 bg-stone-50 rounded-2xl font-medium" 
                            placeholder="Allergies / Notes"
                            value={newClient.notes}
                            onChange={e => setNewClient({...newClient, notes: e.target.value})}
                        />
                    </div>
                </div>
                <button onClick={handleAddClient} className="mt-4 w-full bg-[#1b4d3e] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity">
                    Save Client Profile
                </button>
            </div>

            {/* Client List */}
            <div className="relative">
                <Search className="absolute left-4 top-4 w-5 h-5 text-stone-400" />
                <input 
                    className="w-full p-4 pl-12 bg-white border border-stone-200 rounded-2xl font-medium mb-6" 
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                    <div key={client.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                        <h4 className="text-lg font-bold text-[#1b4d3e] mb-2">{client.name}</h4>
                        {client.address && (
                            <p className="text-sm text-stone-500 flex items-start gap-2 mb-2">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> {client.address}
                            </p>
                        )}
                        {client.notes && (
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs font-bold flex gap-2 items-start mt-4">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                {client.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}