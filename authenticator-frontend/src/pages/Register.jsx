import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .matches(
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      'Invalid email format'
    ),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  terms: yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required('You must accept the terms and conditions'),
});

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty, isValid } 
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      terms: false
    }
  });

  const onSubmit = async (data) => {
    setError('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/register', {
        email: data.email.trim(),
        password: data.password,
      });
      
      if (response.data && response.data.token) {
        // Store the token and user data
        localStorage.setItem('token', response.data.token);
        
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        setRegistrationSuccess(true);
        
        // Redirect to 2FA setup or dashboard
        setTimeout(() => {
          navigate('/enable-2fa');
        }, 2000);
      } else {
        throw new Error('Registration response was invalid');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Account Created!</h2>
            <p className="text-gray-600 dark:text-gray-300">Your account has been successfully created.</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">Redirecting to setup 2FA...</p>
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">Create an Account</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <Input 
            label="Email Address" 
            name="email" 
            type="email" 
            register={register} 
            error={errors.email} 
            autoComplete="email"
            disabled={isLoading}
            autoFocus
          />
          
          <Input 
            label="Password" 
            name="password" 
            type="password" 
            register={register} 
            error={errors.password} 
            autoComplete="new-password"
            disabled={isLoading}
            helperText="At least 8 characters with uppercase, lowercase, number, and special character"
          />
          
          <Input 
            label="Confirm Password" 
            name="confirmPassword" 
            type="password" 
            register={register} 
            error={errors.confirmPassword} 
            autoComplete="new-password"
            disabled={isLoading}
          />
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                {...register('terms')}
                disabled={isLoading}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-700 dark:text-gray-300">
                I agree to the <a href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</a>
              </label>
              {errors.terms && (
                <p className="mt-1 text-red-600 text-sm">{errors.terms.message}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Button 
            type="submit" 
            loading={isLoading}
            disabled={!isDirty || !isValid || isLoading}
            className="w-full"
          >
            Create Account
          </Button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;
