import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import axios from 'axios';
import { API_BASE_URL, GOOGLE_CLIENT_ID } from '../config';
import logo from '../assets/logo-2.png';
import '../LoginPage.css';
import backgroundImage from '../assets/login-unsplash.jpg';

interface LoginResponse {
  token: string;
  isAdmin: boolean;
}

const quotes = [
  "Get everything you want if you work hard, trust the process, and stick to the plan.",
  "Success is not the key to happiness. Happiness is the key to success.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it."
];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [quote, setQuote] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('isAdmin', response.data.isAdmin.toString());

      setIsAdmin(response.data.isAdmin);

      console.log('Admin status:', response.data.isAdmin);

      if (response.data.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  useEffect(() => {
    // Select a random quote from the array
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  return (
    <div className="login-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="quote-container">
        <h2 className="quote-title">Get Everything You Want Via Links</h2>
        <p className="quote-description">{quote}</p>
      </div>
      <div className="login-background">
        <div className="login-content">
          <img src={logo} alt="Logo" className="logo" />
          <h1 className="welcome-title">Welcome Back</h1>
          <p className="welcome-description">Enter your credentials or use Google to login</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" className="remember-label">Remember me</label>
            </div>
            <button type="submit" className="login-button">Sign In</button>
          </form>
          <p className="signup-link">
            Don't have an access? Contact the administrator <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;