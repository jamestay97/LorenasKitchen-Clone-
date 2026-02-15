import React, { useState, useEffect } from 'react';
import { supabase, getRedirectURL } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui/UiKit';
import { Lock, ArrowLeft, Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const toSend = (showForgotPassword ? resetEmail : email).trim();
    if (!toSend) {
      toast.error('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(toSend, {
        // Base URL only so Supabase gets a clean hash (#access_token=...); we send user to #/reset-password in onAuthStateChange
        redirectTo: getRedirectURL(),
      });
      if (error) throw error;
      toast.success('Check your email for a link to reset your password.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
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
          <h1 className="text-2xl font-bold text-[#1b4d3e]">Admin sign in</h1>
          <p className="text-gray-500 text-sm">Use your email and password to access the admin hub.</p>
        </div>

        {!showForgotPassword ? (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
              <Button type="submit" className="w-full bg-[#1b4d3e]" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-medium text-[#1b4d3e] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#1b4d3e]">
              <KeyRound className="w-5 h-5" />
              <h2 className="text-lg font-bold">Reset password</h2>
            </div>
            <p className="text-sm text-stone-500">
              Enter your email and we’ll send you a link to set a new password.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Email</label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-[#1b4d3e]" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setResetEmail(''); }}
              className="w-full mt-2 text-sm font-medium text-stone-500 hover:text-stone-700"
            >
              Back to sign in
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
