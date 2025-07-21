import React from 'react';

const Input = ({ label, type = 'text', name, register, error, ...rest }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200" htmlFor={name}>
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      className={`w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
        ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} 
        bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400`}
      {...register(name)}
      {...rest}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
  </div>
);

export default Input;
