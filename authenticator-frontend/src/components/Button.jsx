import React from 'react';

const Button = ({ children, loading, ...rest }) => (
  <button
    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
    disabled={loading}
    {...rest}
  >
    {loading ? 'Loading...' : children}
  </button>
);

export default Button;
