import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';

const schema = yup.object().shape({
  password: yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
  confirm: yup.string().oneOf([yup.ref('password')], 'Passwords do not match'),
});

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if token is valid on component mount
  React.useEffect(() => {
    const checkToken = async () => {
      try {
        // Optional: You could add an API endpoint to validate the token
        // await api.get(`/validate-reset-token/${token}`);
        setIsLoading(false);
      } catch (err) {
        setErrorMsg('Invalid or expired reset link. Please request a new one.');
        setIsLoading(false);
      }
    };
    
    checkToken();
  }, [token]);

  const onSubmit = async (data) => {
    setMsg('');
    setErrorMsg('');
    try {
      const res = await api.post(`/reset-password/${token}`, { 
        password: data.password 
      });
      
      setMsg(res.data.message);
      setIsSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password reset successful. Please log in with your new password.' 
          } 
        });
      }, 2000);
      
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Password reset failed. The link may have expired.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Loading...</h2>
          <p className="text-gray-600 dark:text-gray-300">Verifying your reset link</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Password Updated!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{msg || 'Your password has been reset successfully.'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Reset Password</h2>
        {errorMsg && <p className="text-red-500 text-center mb-4">{errorMsg}</p>}
        {msg && <p className="text-green-600 text-center mb-4">{msg}</p>}
        <Input 
          label="New Password" 
          name="password" 
          type="password" 
          register={register} 
          error={errors.password} 
          autoComplete="new-password"
        />
        <Input 
          label="Confirm New Password" 
          name="confirm" 
          type="password" 
          register={register} 
          error={errors.confirm}
          className="mt-4"
        />
        <Button 
          type="submit" 
          loading={isSubmitting} 
          className="w-full mt-6"
          disabled={isLoading}
        >
          Reset Password
        </Button>
      </form>
    </div>
  );
};

export default ResetPassword;
