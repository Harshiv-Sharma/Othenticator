import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';

const schema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
  code: yup.string().when('show2FA', {
    is: true,
    then: yup.string().required('Verification code is required').length(6, 'Code must be 6 digits')
  })
});

const Login = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      code: ''
    }
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setLoading(true);
    
    try {
      const requestData = {
        email: data.email,
        password: data.password,
        ...(show2FA && { token: data.code })
      };
      
      const response = await api.post('/login', requestData);
      
      if (response.status === 202 && response.data.twoFactorRequired) {
        // 2FA required - show code input
        setShow2FA(true);
        setTempToken(response.data.tempToken);
        setValue('code', ''); // Reset code field
      } else if (response.data.token) {
        // Login successful
        localStorage.setItem('token', response.data.token);
        
        // Store user data if needed
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // Redirect based on 2FA status
        if (response.data.user?.is2FAEnabled) {
          navigate('/dashboard');
        } else {
          navigate('/enable-2fa');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      setErrorMsg(errorMessage);
      
      // Reset 2FA state on error
      if (show2FA) {
        setShow2FA(false);
        setTempToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          {show2FA ? 'Two-Factor Authentication' : 'Login to Your Account'}
        </h2>
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
            {errorMsg}
          </div>
        )}
        
        {!show2FA ? (
          <>
            <div className="space-y-4">
              <Input 
                label="Email" 
                name="email" 
                type="email" 
                register={register} 
                error={errors.email} 
                autoComplete="email"
                disabled={isSubmitting}
              />
              <Input 
                label="Password" 
                name="password" 
                type="password" 
                register={register} 
                error={errors.password} 
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="mt-6">
              <Button 
                type="submit" 
                loading={loading}
                className="w-full"
              >
                Continue
              </Button>
            </div>
            
            <div className="mt-4 text-center text-sm">
              <Link 
                to="/forgot-password" 
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400 text-center">
              Enter the 6-digit verification code from your authenticator app.
            </p>
            
            <div className="space-y-4">
              <Input 
                label="Verification Code" 
                name="code" 
                type="text" 
                placeholder="123456"
                register={register} 
                error={errors.code}
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                disabled={loading}
              />
              
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setTempToken('');
                  }}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                  disabled={loading}
                >
                  Back to login
                </button>
                
                <button
                  type="button"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                  disabled={loading}
                >
                  Resend code
                </button>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                type="submit" 
                loading={loading}
                className="w-full"
              >
                Verify & Continue
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default Login;
