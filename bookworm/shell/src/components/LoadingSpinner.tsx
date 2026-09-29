import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner: React.FC = () => (
  <div className="spinner-container">
    <div className="spinner" />
    <p className="spinner-text">Loading...</p>
  </div>
);

export default LoadingSpinner;
