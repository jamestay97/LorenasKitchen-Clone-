import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChefHat, LogOut, MessageCircle, Users } from "lucide-react";
import MenuEditor from '@/components/admin/MenuEditor';
import SuggestionManager from '@/components/admin/SuggestionManager';
import CustomerList from '@/components/admin/CustomerList'; // <--- Import New Component
import { createPageUrl } from '@/utils';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [activeTab, setActiveTab] = useState("menu");
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        navigate(createPageUrl('AdminLogin'));
        return;
      }
      setIsAdmin(true);
      fetchActiveMenu();
    } catch (e) {
      navigate(createPageUrl('AdminLogin'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveMenu = async () => {
    const menus = await base44.entities.Menu.list('-created_date', 1);
    if (menus.length > 0) setActiveMenu(menus[0]);
  };

  const handleLogout = async () => {
      await base44.auth.signOut();
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading admin panel...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#f4f5f0] pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg text-[#1b4d3e]">Lorena's Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 border border-gray-100 rounded-xl h-auto flex flex-wrap justify-start">
            <TabsTrigger value="menu" className="data-[state=active]:bg-[#1b4d3e] data-[state=active]:text-white gap-2 px-4 py-2">
              <ChefHat className="w-4 h-4" /> Menu Editor
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:bg-[#1b4d3e] data-[state=active]:text-white gap-2 px-4 py-2">
              <MessageCircle className="w-4 h-4" /> Requests
            </TabsTrigger>
            <TabsTrigger value="crm" className="data-[state=active]:bg-[#1b4d3e] data-[state=active]:text-white gap-2 px-4 py-2">
              <Users className="w-4 h-4" /> Customers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <MenuEditor activeMenu={activeMenu} onUpdate={fetchActiveMenu} />
          </TabsContent>
          
          <TabsContent value="requests">
            <SuggestionManager />
          </TabsContent>

          <TabsContent value="crm">
            <CustomerList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}