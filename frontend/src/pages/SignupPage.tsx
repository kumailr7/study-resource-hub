import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import logo from '../assets/logo-2.png';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for alphanumeric password
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(formData.password)) {
      setError('Password must contain only letters and numbers');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
        username: formData.username,
        password: formData.password,
        role: 'user'
      });

      if (response.data) {
        setSuccess(true);
        setError('');
        setTimeout(() => {
          navigate('/login');
        }, 2000); // Wait 2 seconds before redirecting
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error during signup');
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-content">
          <img src={logo} alt="Logo" className="logo" />
          <h1 className="welcome-title">Create Account</h1>
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              <span role="img" aria-label="check">✅</span>
              Sign up completed! Heading to login page...
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-field"
              required
            />
            <button type="submit" className="login-button">Sign Up</button>
          </form>
          
          <p className="signup-link">
            Already have an account? <a href="/login">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
