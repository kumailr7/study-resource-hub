import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const SyncUserOnSignup: React.FC = () => {
  const { user, isLoaded } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'syncing' | 'done' | 'error'>('syncing');

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded || !user) {
        return;
      }

      try {
        const email = searchParams.get('email');
        
        // Sync user to backend
        await axios.post(`${API_BASE_URL}/users/sync`, {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username || ''
        });

        // Fetch the user from database to get the stored username
        const userRes = await axios.get<{ username?: string }>(`${API_BASE_URL}/users/me?clerkId=${user.id}`);
        const storedUsername = userRes.data?.username;

        setStatus('done');
        setTimeout(() => {
          if (storedUsername) {
            navigate(`/${storedUsername}`, { replace: true });
          } else {
            navigate('/user', { replace: true });
          }
        }, 500);
      } catch (err) {
        console.error('Sync error:', err);
        setStatus('error');
        setTimeout(() => {
          navigate('/user', { replace: true });
        }, 1000);
      }
    };

    if (isLoaded && user) {
      syncUser();
    }
  }, [user, isLoaded, navigate, searchParams]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center text-white text-center">
        <div className="text-4xl mb-4">⚙️</div>
        <p className="animate-pulse">Setting up your account...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
      <div className="text-white">
        {status === 'done' ? '✓ Ready!' : '⚠️ Continuing...'}
      </div>
    </div>
  );
};

export default SyncUserOnSignup;