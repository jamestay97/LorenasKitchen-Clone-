import React from 'react';
// IMPORT HashRouter (renamed to Router for convenience)
import { HashRouter as Router, Routes, Route } from 'react-router-dom'; 
import Layout from './Layout';
import Home from './components/public/Home';
import AdminPage from './components/admin/AdminPage';
import AdminLogin from './components/admin/AdminLogin';

function App() {
  return (
    <Router> 
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
