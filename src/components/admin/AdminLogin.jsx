import React, { useState, useEffect } from 'react';
import { supabase, getRedirectURL } from '../../supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui/UiKit'; 
import { Lock, ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/admin');
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('Welcome back, Chef!');
      navigate('/admin');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // This is the "Offline/Local" magic button
  const handleSetupLink = async () => {
    if (!email) return toast.error("Please enter your email address first.");
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // We use our new helper to ensure the link points to localhost
        redirectTo: `${getRedirectURL()}#/reset-password`,
      });
      if (error) throw error;
      toast.success("Setup link sent! Check your inbox.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f0] flex flex-col items-center justify-center p-4">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Home
        </Button>

        <Card className="p-8 border border-gray-100 shadow-xl bg-white w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6f0eb] mb-4 text-[#1b4d3e]">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#1b4d3e]">Admin Hub</h1>
            <p className="text-gray-500 text-sm">Secure access for Lorena's Kitchen</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Email Address</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-[#1b4d3e]" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-100 text-center">
             <p className="text-xs text-stone-400 mb-3 uppercase font-bold tracking-widest">First Time or Forgot Password?</p>
             <button 
               onClick={handleSetupLink} 
               disabled={loading}
               className="flex items-center justify-center gap-2 w-full py-2 text-sm font-bold text-[#1b4d3e] hover:bg-emerald-50 rounded-lg transition-colors"
             >
               <Mail className="w-4 h-4" /> Send Email Setup Link
             </button>
          </div>
        </Card>
    </div>
  );
}
