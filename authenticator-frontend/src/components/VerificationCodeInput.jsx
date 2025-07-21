import React, { useState, useEffect, useRef } from 'react';

const VerificationCodeInput = ({ length = 6, onComplete, error, disabled = false }) => {
  const [code, setCode] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  // Focus the first input on mount
  useEffect(() => {
    if (inputs.current[0]) {
      inputs.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const value = e.target.value;
    
    // Only allow digits
    if (value && !/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Move to next input or submit if complete
    if (value && index < length - 1) {
      inputs.current[index + 1].focus();
    }

    // If all fields are filled, call onComplete
    if (newCode.every(digit => digit !== '') && index === length - 1) {
      onComplete(newCode.join(''));
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const digits = paste.replace(/\D/g, '').split('').slice(0, length);
    
    if (digits.length === length) {
      setCode(digits);
      onComplete(digits.join(''));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-2">
        {code.map((digit, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            ref={(el) => (inputs.current[index] = el)}
            className={`w-12 h-14 text-2xl text-center border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={disabled}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default VerificationCodeInput;
