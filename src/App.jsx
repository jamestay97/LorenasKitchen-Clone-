import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 
import Layout from './Layout';
import Home from './components/public/Home';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';
import CreatePassword from './components/admin/CreatePassword'; 
import Gallery from './components/public/Gallery';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. UPDATED: Listen for ALL auth events, especially PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // This forces the hash to the reset page so the router picks it up
        window.location.hash = '#/reset-password';
      }
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // THE BOUNCER: Updated to handle recovery types
  if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
    return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f5f0]">
          <Loader2 className="w-10 h-10 animate-spin text-[#1b4d3e] mb-4" />
          <p className="text-[#1b4d3e] font-medium italic">Opening the kitchen doors...</p>
       </div>
    );
  }

  if (loading) return null;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={session ? <Navigate to="/admin" /> : <AdminLogin />} />
          
          {/* IMPORTANT: Added the route for the password setup page */}
          <Route path="/reset-password" element={<CreatePassword />} />
          
          <Route 
            path="/admin" 
            element={session ? <AdminPage /> : <Navigate to="/login" />} 
          />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;