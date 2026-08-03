import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// There is no auto-login. The dev bypass that used to live here signed the dashboard in by posting
// a hardcoded OTP straight to verify-otp; that code path no longer exists on the backend, and a
// convenience that mints a session without authentication does not belong in the app at all.
// To work locally, sign in through the normal phone flow and let the token be stored as usual.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
