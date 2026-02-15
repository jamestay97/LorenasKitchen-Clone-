import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui/UiKit';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionReady(true);
      if (!session) {
        toast.error('Invalid or expired link. Request a new reset link from the login page.');
        navigate('/login');
      }
    };
    check();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. Signing you in...');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#f4f5f0] flex items-center justify-center p-4">
        <p className="text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f0] flex flex-col items-center justify-center p-4">
      <Button variant="ghost" className="mb-6" onClick={() => navigate('/login')}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
      </Button>

      <Card className="p-8 border border-gray-100 shadow-xl bg-white w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6f0eb] mb-4 text-[#1b4d3e]">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#1b4d3e]">Set new password</h1>
          <p className="text-gray-500 text-sm">Choose a new password for your admin account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">New password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-[#1b4d3e]" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
