import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@/components/ui/UiKit'; // Using your new UI Kit
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Send Magic Link
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/admin', // Redirects here after clicking email
      },
    });

    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success('Check your email for the magic login link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f0] px-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          className="mb-6 pl-0 hover:bg-transparent"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <Card className="p-8 border border-gray-100 shadow-xl bg-white">
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
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              className="w-full bg-[#1b4d3e] hover:bg-[#153a2f] h-12 text-base"
              disabled={loading}
            >
              {loading ? 'Sending Link...' : 'Send Login Link'}
            </Button>
          </form>

          <p className="text-xs text-center text-gray-500 mt-6">
            Powered by Supabase Secure Auth
          </p>
        </Card>
      </div>
    </div>
  );
}