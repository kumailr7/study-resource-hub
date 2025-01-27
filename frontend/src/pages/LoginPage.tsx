import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import logo from '../assets/logo.png';

interface LoginResponse {
  token: string;
  isAdmin: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

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

  return (
    <div className={`min-h-screen flex items-center justify-center bg-white`}>
      <Card className={`w-full max-w-md bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500`}>
        <CardHeader className="flex justify-center">
          <img src={logo} alt="Study Resource Hub Logo" className="h-18 w-auto" />
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Input 
              type="text" 
              placeholder="Username" 
              className={`bg-black text-white border border-gray-300 rounded-md`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              className={`bg-black text-white border border-gray-300 rounded-md`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              type="submit"
              variant="default" 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className={`text-sm text-white`}>
              Don't have an account? Contact your administrator
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;