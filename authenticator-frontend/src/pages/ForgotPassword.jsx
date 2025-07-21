 import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import VerificationCodeInput from '../components/VerificationCodeInput';

// Step 1: Email submission
const emailSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
});

// Password strength indicator
const getPasswordStrength = (password = '') => {
  if (!password) return 0;
  
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  
  return strength;
};

// Step 3: New password
const passwordSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password'), null], 'Passwords must match')
});

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Verification Code, 3: New Password
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const emailForm = useForm({
    resolver: yupResolver(emailSchema),
  });

  const passwordForm = useForm({
    resolver: yupResolver(passwordSchema),
  });

  const handleEmailSubmit = async (data) => {
    setIsSubmitting(true);
    setErrorMsg('');
    setMsg('');
    
    try {
      const res = await api.post('/forgot-password', { email: data.email });
      setEmail(data.email);
      setMsg(res.data.message || 'A verification code has been sent to your email.');
      setStep(2);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationComplete = async (code) => {
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const res = await api.post('/verify-reset-code', {
        email,
        code
      });
      
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
        setStep(3);
        setMsg('');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (data) => {
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      await api.post('/reset-password', {
        email,
        token: resetToken,
        password: data.password
      });
      
      setMsg('Your password has been reset successfully. You can now log in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Forgot Password</h2>
      <p className="text-gray-600 dark:text-gray-300 text-center">
        Enter your email address and we'll send you a verification code.
      </p>
      
      {errorMsg && <p className="text-red-500 text-center">{errorMsg}</p>}
      {msg && <p className="text-green-600 text-center">{msg}</p>}
      
      <Input
        label="Email"
        name="email"
        type="email"
        register={emailForm.register}
        error={emailForm.formState.errors.email}
        autoComplete="email"
      />
      
      <Button
        type="submit"
        loading={isSubmitting}
        className="w-full mt-6"
        disabled={isSubmitting}
      >
        Send Verification Code
      </Button>
    </form>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Verify Your Email</h2>
      <p className="text-gray-600 dark:text-gray-300 text-center">
        We've sent a 6-digit verification code to <span className="font-semibold">{email}</span>.
        Please enter it below.
      </p>
      
      {errorMsg && <p className="text-red-500 text-center">{errorMsg}</p>}
      {msg && <p className="text-green-600 text-center">{msg}</p>}
      
      <VerificationCodeInput 
        onComplete={handleVerificationComplete} 
        error={errorMsg}
        disabled={isSubmitting}
      />
      
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        Didn't receive a code?{' '}
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setErrorMsg('');
            setMsg('');
          }}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          disabled={isSubmitting}
        >
          Resend Code
        </button>
      </p>
    </div>
  );

  const renderStep3 = () => (
    <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Create New Password</h2>
      <p className="text-gray-600 dark:text-gray-300 text-center">
        Create a new password for your account.
      </p>
      
      {errorMsg && <p className="text-red-500 text-center">{errorMsg}</p>}
      {msg && <p className="text-green-600 text-center">{msg}</p>}
      
      <div className="space-y-2">
        <Input
          label="New Password"
          name="password"
          type="password"
          register={passwordForm.register}
          error={passwordForm.formState.errors.password}
          autoComplete="new-password"
          onChange={(e) => {
            passwordForm.setValue('password', e.target.value, { shouldValidate: true });
          }}
        />
        {passwordForm.watch('password') && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  getPasswordStrength(passwordForm.watch('password')) <= 2 ? 'bg-red-500' :
                  getPasswordStrength(passwordForm.watch('password')) <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{
                  width: `${(getPasswordStrength(passwordForm.watch('password')) / 5) * 100}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Password strength: {
                getPasswordStrength(passwordForm.watch('password')) <= 2 ? 'Weak' :
                getPasswordStrength(passwordForm.watch('password')) <= 3 ? 'Medium' : 'Strong'
              }
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li className={`flex items-center ${passwordForm.watch('password')?.length >= 8 ? 'text-green-500' : 'text-gray-400'}`}>
                <span className="mr-1">•</span>
                At least 8 characters
              </li>
              <li className={`flex items-center ${/[a-z]/.test(passwordForm.watch('password') || '') ? 'text-green-500' : 'text-gray-400'}`}>
                <span className="mr-1">•</span>
                At least one lowercase letter
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(passwordForm.watch('password') || '') ? 'text-green-500' : 'text-gray-400'}`}>
                <span className="mr-1">•</span>
                At least one uppercase letter
              </li>
              <li className={`flex items-center ${/[0-9]/.test(passwordForm.watch('password') || '') ? 'text-green-500' : 'text-gray-400'}`}>
                <span className="mr-1">•</span>
                At least one number
              </li>
            </ul>
          </div>
        )}
      </div>
      
      <Input
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        register={passwordForm.register}
        error={passwordForm.formState.errors.confirmPassword}
        autoComplete="new-password"
      />
      
      <Button
        type="submit"
        loading={isSubmitting}
        className="w-full mt-6"
        disabled={isSubmitting}
      >
        Reset Password
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default ForgotPassword;
