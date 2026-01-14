import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Home from './components/public/Home';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';
import Gallery from './components/public/Gallery';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/gallery" element={<Gallery />} />
          
          {/* Catch-All Route: Redirects errors back to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;