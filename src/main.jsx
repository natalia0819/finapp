import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { aplicarTema, leerTema } from './lib/tema';
import './styles.css';

aplicarTema(leerTema());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
