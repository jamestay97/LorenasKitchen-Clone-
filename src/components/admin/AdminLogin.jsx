import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft } from "lucide-react";
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, skip this page
  useEffect(() => {
    base44.auth.me().then(user => {
        if (user) navigate(createPageUrl('Admin'));
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        // Supabase Magic Link Login
        const { error } = await base44.auth.signInWithOtp({ email });
        
        if (error) throw error;
        toast.success("Check your email for the login link!");
    } catch (error) {
        toast.error("Error logging in: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f5f0] to-[#e6f0eb] px-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(createPageUrl('Home'))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6f0eb] mb-4">
              <Lock className="w-8 h-8 text-[#1b4d3e]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1b4d3e] mb-2">Admin Login</h1>
            <p className="text-gray-500 text-sm">
              Enter your email to receive a secure login link
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
                type="email" 
                placeholder="admin@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-[#1b4d3e] hover:bg-[#143d30] text-base"
            >
              {loading ? "Sending link..." : "Send Login Link"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}