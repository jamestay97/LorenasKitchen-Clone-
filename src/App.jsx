import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Layout from './Layout';
import Home from './components/public/Home';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';
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

    // 2. Listen for the "Magic Link" event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // THE BOUNCER LOGIC:
  // If the URL contains a Supabase token, show a loader and WAIT.
  // This prevents the Router from "eating" the token before Supabase reads it.
  if (window.location.hash.includes('access_token')) {
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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={session ? <Navigate to="/admin" /> : <AdminLogin />} />
          
          {/* Protected Route: If no session, go to login */}
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