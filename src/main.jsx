import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ensureDevSession } from './api/dev-auth';
import './index.css';

function mount() {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// In dev, sign in as the test investor before mounting (resolves immediately in
// production, where ensureDevSession is a no-op).
ensureDevSession().finally(mount);
