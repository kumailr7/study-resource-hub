import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { SignUp, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import logo from '../assets/logo-2.png';

const SignupPage: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invitationStatus, setInvitationStatus] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [inviteData, setInviteData] = useState<{ email: string; invitedBy: string } | null>(null);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token || !email) {
        setInvitationStatus('invalid');
        return;
      }

      try {
        console.log('Verifying invite with:', { token, email });
        const response = await axios.get<{ valid: boolean; email?: string; invitedBy?: string }>(`${API_BASE_URL}/api/users/verify-invite?token=${token}&email=${encodeURIComponent(email)}`);
        console.log('Verification response:', response.data);
        if (response.data.valid) {
          setInviteData({
            email: response.data.email || '',
            invitedBy: response.data.invitedBy || ''
          });
          setInvitationStatus('valid');
        } else {
          setInvitationStatus('invalid');
        }
      } catch (err) {
        console.error('Invitation verification error:', err);
        setInvitationStatus('invalid');
      }
    };

    verifyInvitation();
  }, [token, email]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/user" replace />;
  }

  if (invitationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <div className="text-white animate-pulse">Verifying invitation...</div>
      </div>
    );
  }

  if (invitationStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#19191f] rounded-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid or Expired Invitation</h1>
          <p className="text-gray-400 mb-6">
            This invitation link is invalid or has expired. Please contact an admin for a new invitation.
          </p>
          <a 
            href="/login" 
            className="inline-block bg-[#ff86c2] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#ff70b0] transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      {/* Left half: branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden bg-[#0e0e13] p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="Logo" className="w-10 h-10 object-cover" />
            <span className="text-white text-xl font-black uppercase tracking-widest">Devops Dojo Hub</span>
          </div>
        </div>
        
        <div>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white">
            Accept Your
            <span className="block text-[#ff86c2]">Invitation</span>
          </h1>
          <p className="text-white/60 text-sm mt-5 leading-relaxed max-w-md">
            You've been invited to join the DevOps Dojo Hub. Create your account to get started.
          </p>
          {inviteData && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/80 text-sm">
                <span className="text-white/50">Invited email:</span> {inviteData.email}
              </p>
            </div>
          )}
        </div>

        <div className="text-white/20 text-xs">
          © {new Date().getFullYear()} Devops Dojo Hub
        </div>
      </div>

      {/* Right half: Clerk SignUp */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0e0e13]">
        <div className="w-full max-w-md">
          <div className="bg-[#19191f] rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <img src={logo} alt="Logo" className="w-8 h-8 object-cover" />
              <span className="text-white text-lg font-bold">Complete Sign Up</span>
            </div>
            <p className="text-gray-400 text-sm">
              Create your account to join the community
            </p>
          </div>

          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/login"
            afterSignUpUrl="/sync-signup"
            appearance={{
              variables: {
                colorPrimary: '#ff86c2',
                colorBackground: '#19191f',
                colorInputBackground: '#ffffff',
                colorInputText: '#111111',
                colorText: '#f8f5fd',
                fontFamily: '"Space Grotesk", sans-serif',
                fontFamilyButtons: '"Space Grotesk", sans-serif',
              },
              elements: {
                socialButtonsBlockButton: {
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: '600',
                  backgroundColor: '#2a2a35',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8f5fd',
                },
                formFieldInput: {
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  fontWeight: '600',
                  border: '1px solid #ddd',
                },
              },
            }}
          />

          <p className="text-xs text-[#888] text-center mt-3">
            Already have an account? <a href="/login" className="text-[#ff86c2]">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;