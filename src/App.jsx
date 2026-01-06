import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './supabaseClient'; // Import the connection we just made

import Layout from './Layout';
import Home from './components/public/Home';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';

const queryClient = new QueryClient();

// This component checks if a user is logged in
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>; // Or a spinner
  
  // If no user, kick them to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If user exists, show the protected page
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/LorenasKitchen-Clone-"> {/* IMPORTANT: Add your repo name here for GitHub Pages */}
        <Layout>
          <Routes>
            {/* Public Home Page */}
            <Route path="/" element={<Home />} />
            
            {/* Login Page */}
            <Route path="/login" element={<AdminLogin />} />

            {/* Protected Admin Page */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;