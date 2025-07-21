import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';

const schema = yup.object().shape({
  code: yup.string().length(6, 'Code must be 6 digits').required('TOTP code is required'),
});

const Verify2FA = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    try {
      const res = await api.post('/verify-2fa', { code: data.code });
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      navigate('/dashboard');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Verify Two-Factor Authentication</h2>
        {errorMsg && <p className="text-red-500 text-center mb-4">{errorMsg}</p>}
        <Input label="Enter 6-digit code" name="code" type="text" register={register} error={errors.code} autoComplete="one-time-code" />
        <Button type="submit" loading={isSubmitting}>Verify</Button>
      </form>
    </div>
  );
};

export default Verify2FA;
