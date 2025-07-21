import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Enable2FA from './pages/Enable2FA';
import Verify2FA from './pages/Verify2FA';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/enable-2fa" element={<ProtectedRoute><Enable2FA /></ProtectedRoute>} />
      <Route path="/verify-2fa" element={<ProtectedRoute><Verify2FA /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
