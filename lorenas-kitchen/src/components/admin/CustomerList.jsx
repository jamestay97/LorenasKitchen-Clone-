import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // 1. Get all unique emails from Suggestions
      const suggestions = await base44.entities.Suggestion.list('-created_at', 100);
      
      // Group by email to find "Last Seen" and "Total Requests"
      const customerMap = {};
      
      suggestions.forEach(s => {
        const email = s.user_email || 'Anonymous';
        if (!customerMap[email]) {
            customerMap[email] = {
                email: email,
                first_seen: s.created_at,
                last_seen: s.created_at,
                total_requests: 0,
                status: 'active'
            };
        }
        customerMap[email].total_requests += 1;
        // Update last seen if this suggestion is newer
        if (new Date(s.created_at) > new Date(customerMap[email].last_seen)) {
            customerMap[email].last_seen = s.created_at;
        }
      });

      setCustomers(Object.values(customerMap));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between gap-4">
        <div>
            <h2 className="text-xl font-bold text-[#1b4d3e]">Customer Database</h2>
            <p className="text-sm text-gray-500">People interacting with your menu</p>
        </div>
        
        <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
                placeholder="Search emails..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requests</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
             <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400">Loading customers...</TableCell>
             </TableRow>
          ) : filtered.length === 0 ? (
             <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400">No customers found.</TableCell>
             </TableRow>
          ) : (
            filtered.map((customer) => (
                <TableRow key={customer.email}>
                    <TableCell className="font-medium flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#1b4d3e]">
                            <User className="w-4 h-4" />
                        </div>
                        {customer.email}
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="bg-[#e6f0eb] text-[#1b4d3e]">Active</Badge>
                    </TableCell>
                    <TableCell>{customer.total_requests}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                        {format(new Date(customer.last_seen), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => window.location.href = `mailto:${customer.email}`}>
                            <Mail className="w-4 h-4 mr-2" /> Email
                        </Button>
                    </TableCell>
                </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}