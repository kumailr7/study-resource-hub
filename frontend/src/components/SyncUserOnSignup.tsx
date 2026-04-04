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
    console.log('SyncSignup component loaded');
    console.log('isLoaded:', isLoaded);
    console.log('user:', user);
    
    const syncUser = async () => {
      if (!isLoaded || !user) {
        console.log('Skipping sync - not loaded or no user');
        return;
      }

      try {
        const token = searchParams.get('token');
        const email = searchParams.get('email');
        
        console.log('Clerk user data:', {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.primaryEmailAddress?.emailAddress
        });

        const syncRes = await axios.post<{ username: string }>(`${API_BASE_URL}/users/sync`, {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username || ''
        });

        console.log('Backend response:', syncRes.data);

        setStatus('done');
        setTimeout(() => {
          const username = syncRes.data?.username || user.username || user.firstName?.toLowerCase().replace(/\s+/g, '') || '';
          console.log('Redirecting to:', username);
          if (username) {
            navigate(`/${username}`, { replace: true });
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
      <div className="min-h-screen bg-[#0e0e13] flex flex-col items-center justify-center text-white">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p className="animate-pulse mb-4">Setting up your account...</p>
        <button onClick={() => console.log('User object:', user)} className="text-xs text-slate-500">
          Debug: Click to see user in console
        </button>
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