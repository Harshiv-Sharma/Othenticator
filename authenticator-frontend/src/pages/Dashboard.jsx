import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { logout } from '../utils/auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/protected');
        // backend returns { success, message, user }
        setUser(res.data.user);
      } catch (err) {
        setError('Failed to fetch user data');
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (error) {
    return <div className="min-h-screen flex items-center justify-center">{error}</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Dashboard</h2>
        <p className="mb-4 text-center text-gray-700 dark:text-gray-200">Welcome, <span className="font-semibold">{user.email}</span></p>
        <div className="mb-6 text-center">
          <span className="text-sm mr-2">Two-Factor Auth:</span>
          <span className={`font-semibold ${user.is2FAEnabled ? 'text-green-600' : 'text-red-600'}`}>{user.is2FAEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        {user.is2FAEnabled && (
          <button
            onClick={async () => {
              try {
                await api.post('/disable-2fa');
                // refresh user data
                const res = await api.get('/protected');
                setUser(res.data.user);
              } catch (e) {
                alert(e.response?.data?.message || 'Failed to disable 2FA');
              }
            }}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4"
          >
            Disable 2FA
          </button>
        )}
        <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500">Logout</button>
      </div>
    </div>
  );
};

export default Dashboard;
