import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui/UiKit';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CreatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      // This is the core Supabase command to update the authenticated user's password
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      // Send them to the admin dashboard since they are already logged in
      navigate('/admin');
    } catch (error) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f0] flex items-center justify-center p-4">
      <Card className="p-8 border border-gray-100 shadow-xl bg-white w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6f0eb] mb-4 text-[#1b4d3e]">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#1b4d3e]">Secure Your Account</h1>
          <p className="text-gray-500 text-sm">Set your new administrative password below</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Confirm Password</label>
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full bg-[#1b4d3e] h-12 mt-4" disabled={loading}>
            {loading ? "Updating..." : "Set Password & Enter Hub"}
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <p className="text-xs text-stone-500 leading-relaxed">
            Once you set this password, you can use it to log in directly from the main login screen next time.
          </p>
        </div>
      </Card>
    </div>
  );
}