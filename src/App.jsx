import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './Layout';
import Home from './components/public/Home';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';
import ResetPassword from './components/admin/ResetPassword';
import Gallery from './components/public/Gallery';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes (e.g. magic link, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY' && session) {
        window.location.hash = '#/reset-password';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // THE BOUNCER LOGIC:
  // If the URL contains a Supabase token, show a loader until Supabase sets the session.
  // Only block while we're still waiting (token in hash but no session yet).
  if (window.location.hash.includes('access_token') && !session) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
          <Loader2 className="w-10 h-10 animate-spin text-[#1b4d3e] mb-4" />
          <p className="font-script text-2xl text-[#1b4d3e]">Verifying your kitchen pass...</p>
       </div>
    );
  }

  // If we are just loading normally
  if (loading) {
     return null; // or a spinner
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home session={session} />} />
          <Route path="/login" element={<AdminRoute session={session} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminRoute session={session} requireAuth />} />

          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function AdminRoute({ session, requireAuth }) {
  const [isAdmin, setIsAdmin] = useState(null);
  useEffect(() => {
    if (!session?.user?.email) {
      setIsAdmin(false);
      return;
    }
    supabase.from('admins').select('id').eq('email', session.user.email).maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); })
      .catch(() => { setIsAdmin(false); });
  }, [session?.user?.email]);

  if (requireAuth) {
    if (!session) return <Navigate to="/login" />;
    if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-[#1b4d3e]" /></div>;
    if (!isAdmin) return <Navigate to="/" />;
    return <AdminPage />;
  }
  if (!session) return <AdminLogin />;
  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-[#1b4d3e]" /></div>;
  return isAdmin ? <Navigate to="/admin" /> : <Navigate to="/" />;
}

export default App;