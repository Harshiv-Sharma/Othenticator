import React from 'react';

const QRDisplay = ({ qrImage, secret }) => (
  <div className="flex flex-col items-center my-6">
    <img src={qrImage} alt="QR Code" className="w-48 h-48 mb-4 border rounded" />
    <p className="text-sm text-gray-700 dark:text-gray-300">Secret: <span className="font-mono select-all">{secret}</span></p>
    <p className="text-xs text-gray-500 mt-2">Scan this code using Google Authenticator or any TOTP-compatible app.</p>
  </div>
);

export default QRDisplay;
