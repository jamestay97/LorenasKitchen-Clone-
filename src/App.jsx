import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './Layout';
import Home from './components/public/Home';
import Gallery from './components/public/Gallery';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            
            {/* Admin Pages */}
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPage />} />
            
            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;