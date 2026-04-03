import React, { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { SignUp, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import logo from '../assets/logo-2.png';
import backgroundImage from '../assets/login-unsplash.jpg';
import SplitText from '../components/SplitText';

const SignupPage: React.FC = () => {
  const { isLoaded, isSignedIn } = useUser();
  const [searchParams] = useSearchParams();
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
        const response = await axios.get<{ valid: boolean; email?: string; invitedBy?: string }>(`${API_BASE_URL}/users/verify-invite?token=${token}&email=${encodeURIComponent(email)}`);
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
      <div className="min-h-screen flex" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
        <div
          className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(14,14,19,0.82) 0%, rgba(14,14,19,0.55) 50%, rgba(255,134,194,0.18) 100%)',
            }}
          />
          <div className="relative z-10 p-12">
            <div className="flex items-center gap-3 mb-2">
              <img src={logo} alt="Logo" className="w-10 h-10 object-cover" />
              <span className="text-white text-xl font-black uppercase tracking-widest">Devops Dojo Hub</span>
            </div>
          </div>
          <div className="relative z-10 px-12">
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-white">
              Invalid
              <span className="block text-red-500">Invitation</span>
            </h1>
            <p className="text-white/60 text-sm mt-5 leading-relaxed max-w-md">
              This invitation link is invalid or has expired. Please contact an admin for a new invitation.
            </p>
          </div>
          <div className="relative z-10 p-12">
            <p className="text-white/20 text-[10px] uppercase tracking-widest">
              © {new Date().getFullYear()} Devops Dojo Hub
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 bg-[#0e0e13]">
          <a 
            href="/login" 
            className="bg-[#ff86c2] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#ff70b0] transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
      {/* Left half: image + overlay + branding */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(14,14,19,0.82) 0%, rgba(14,14,19,0.55) 50%, rgba(255,134,194,0.18) 100%)',
          }}
        />
        <div className="absolute top-0 left-0 w-64 h-64 blur-[120px] opacity-30 pointer-events-none" style={{ background: '#ff86c2' }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 blur-[100px] opacity-20 pointer-events-none" style={{ background: '#bf81ff' }} />

        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="Logo" className="w-10 h-10 object-cover" />
            <SplitText text="Devops Dojo Hub" className="text-white text-xl font-black uppercase tracking-widest" delay={50} />
          </div>
          <p className="text-white/40 text-xs tracking-widest uppercase">Community · Resources · Collaboration</p>
        </div>

        <div className="relative z-10 px-12">
          <style>{`
            @keyframes neonPulse {
              0%   { text-shadow: 0 0 8px rgba(255,134,194,0.6), 0 0 20px rgba(255,134,194,0.4), 0 0 40px rgba(191,129,255,0.3); }
              50%  { text-shadow: 0 0 16px rgba(255,134,194,1),   0 0 40px rgba(255,134,194,0.7), 0 0 80px rgba(191,129,255,0.5); }
              100% { text-shadow: 0 0 8px rgba(255,134,194,0.6), 0 0 20px rgba(255,134,194,0.4), 0 0 40px rgba(191,129,255,0.3); }
            }
            @keyframes neonPulsePink {
              0%   { text-shadow: 0 0 10px rgba(255,134,194,0.8), 0 0 30px rgba(255,134,194,0.5), 0 0 60px rgba(255,134,194,0.3); }
              50%  { text-shadow: 0 0 20px rgba(255,134,194,1),   0 0 50px rgba(255,134,194,0.8), 0 0 100px rgba(255,134,194,0.4); }
              100% { text-shadow: 0 0 10px rgba(255,134,194,0.8), 0 0 30px rgba(255,134,194,0.5), 0 0 60px rgba(255,134,194,0.3); }
            }
            .glow-heading { color: #fff; animation: neonPulse 3s ease-in-out infinite; }
            .glow-sub     { color: #ff86c2; animation: neonPulsePink 3s ease-in-out infinite; }
            .glow-paragraph { color: #e8e2ff; opacity: 0.95; }
          `}</style>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight flex flex-col gap-1">
            <SplitText text="Accept Your" className="glow-heading" delay={40} />
            <SplitText text="Invitation" className="glow-sub" delay={40} />
          </h1>
          <p className="text-white/75 text-sm mt-5 leading-relaxed max-w-xs glow-paragraph">
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

        <div className="relative z-10 p-12 space-y-3">
          <p className="text-white/20 text-[10px] uppercase tracking-widest pt-4">
            © {new Date().getFullYear()} Devops Dojo Hub
          </p>
        </div>
      </div>

      {/* Right half: Clerk SignUp */}
      <div
        className="flex-1 lg:w-1/2 flex items-center justify-center p-8 relative"
        style={{ background: '#0e0e13' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 blur-[160px] opacity-10" style={{ background: '#ff86c2' }} />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 blur-[120px] opacity-8" style={{ background: '#bf81ff' }} />
        </div>

        <div className="relative z-10 w-full max-w-md">
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
                socialButtonsBlockButtonText: {
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: '600',
                  color: '#f8f5fd',
                },
                formFieldInput: {
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  fontWeight: '600',
                  border: '1px solid #ddd',
                },
                otpCodeFieldInput: {
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  fontWeight: '700',
                  border: '2px solid #ddd',
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