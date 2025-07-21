import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import QRDisplay from '../components/QRDisplay';

const schema = yup.object().shape({
  code: yup.string().length(6, 'Code must be 6 digits').required('TOTP code is required'),
});

const Enable2FA = () => {
  const navigate = useNavigate();
  const [qrData, setQrData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    const fetchQR = async () => {
      try {
        const res = await api.post('/enable-2fa');
        // Backend returns { success, message, qrCode, otpauthUrl }
        const { qrCode, otpauthUrl } = res.data;
        // Extract the secret from the otpauth URL (e.g. otpauth://totp/... ?secret=ABC123&issuer=...)
        let extractedSecret = '';
        if (otpauthUrl) {
          const match = otpauthUrl.match(/secret=([^&]+)/i);
          if (match && match[1]) extractedSecret = match[1];
        }
        setQrData({ qr: qrCode, secret: extractedSecret });
      } catch (error) {
        setErrorMsg('Failed to fetch QR code.');
      }
    };
    fetchQR();
  }, []);

  const onSubmit = async (data) => {
    setErrorMsg('');
    try {
      await api.post('/verify-2fa', { token: data.code });
      navigate('/dashboard');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Enable Two-Factor Authentication</h2>
        {qrData && <QRDisplay qrImage={qrData.qr} secret={qrData.secret} />}
        {errorMsg && <p className="text-red-500 text-center mb-4">{errorMsg}</p>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input label="Enter 6-digit code" name="code" type="text" register={register} error={errors.code} autoComplete="one-time-code" />
          <Button type="submit" loading={isSubmitting}>Verify</Button>
        </form>
      </div>
    </div>
  );
};

export default Enable2FA;
