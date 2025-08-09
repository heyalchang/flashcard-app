import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AppMinimal from './AppMinimal';
import reportWebVitals from './reportWebVitals';

// Use AppMinimal if REACT_APP_MINIMAL env var is set
const AppComponent = process.env.REACT_APP_MINIMAL === 'true' ? AppMinimal : App;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <AppComponent />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
