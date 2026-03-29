import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { SignIn, SignUp, useUser, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Turnstile } from '@marsidev/react-turnstile';
import logo from '../assets/logo-2.png';
import backgroundImage from '../assets/login-unsplash.jpg';
import SplitText from '../components/SplitText';

const TURNSTILE_SITE_KEY =
  process.env.REACT_APP_TURNSTILE_SITE_KEY || '0x4AAAAAAACxrrCJdrKqydSZ4';

const LoginPage: React.FC = () => {
  const { isLoaded, isSignedIn } = useUser();
  const location = useLocation();
  const showSignup = location.pathname.startsWith('/signup');
  const isSSOCallback = location.pathname.includes('/sso-callback');

  const [turnstileVerified, setTurnstileVerified] = useState(false);

  if (isSSOCallback) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center text-[#f8f5fd]">
        <p className="animate-pulse">Completing sign-in...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center text-[#f8f5fd]">
        <p className="animate-pulse">Loading authentication...</p>
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/user" replace />;
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>

      {/* ── Left half: image + overlay + branding ── */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between relative overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(14,14,19,0.82) 0%, rgba(14,14,19,0.55) 50%, rgba(255,134,194,0.18) 100%)',
          }}
        />

        {/* Pink glow blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 blur-[120px] opacity-30 pointer-events-none" style={{ background: '#ff86c2' }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 blur-[100px] opacity-20 pointer-events-none" style={{ background: '#bf81ff' }} />

        {/* Top: logo + name */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="Logo" className="w-10 h-10 object-cover" />
            <SplitText text="Devops Dojo Hub" className="text-white text-xl font-black uppercase tracking-widest" delay={50} />
          </div>
          <p className="text-white/40 text-xs tracking-widest uppercase">Community · Resources · Collaboration</p>
        </div>

        {/* Middle: big headline */}
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
            <SplitText text="Level Up Your" className="glow-heading" delay={40} />
            <SplitText text="DevOps" className="glow-sub" delay={40} />
            <SplitText text="Skills." className="glow-heading" delay={40} />
          </h1>
          <p className="text-white/75 text-sm mt-5 leading-relaxed max-w-xs glow-paragraph">
            Access curated resources, join live study sessions, and collaborate with the community.
          </p>
        </div>

        {/* Bottom: feature pills */}
        <div className="relative z-10 p-12 space-y-3">
          {[
            { icon: '📚', label: 'Shared Resources' },
            { icon: '🗓️', label: 'Scheduled Sessions' },
            { icon: '👥', label: 'Study Groups' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span
                className="text-xs px-3 py-1.5 font-bold uppercase tracking-widest"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(6px)' }}
              >
                {item.icon} {item.label}
              </span>
            </div>
          ))}
          <p className="text-white/20 text-[10px] uppercase tracking-widest pt-4">
            © {new Date().getFullYear()} Devops Dojo Hub
          </p>
        </div>
      </div>

      {/* ── Right half: Turnstile gate → Clerk SignIn/SignUp ── */}
      <div
        className="flex-1 lg:w-1/2 flex items-center justify-center p-8 relative"
        style={{ background: '#0e0e13' }}
      >
        {/* Subtle background texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 blur-[160px] opacity-10" style={{ background: '#ff86c2' }} />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 blur-[120px] opacity-8" style={{ background: '#bf81ff' }} />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {!turnstileVerified ? (
            /* ── Turnstile verification gate ── */
            <div className="flex flex-col items-center gap-6 text-center">
              <div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, #6b21a8, #db2777)' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2 className="text-white text-xl font-bold mb-1">Security Check</h2>
                <p className="text-white/40 text-sm">Verifying you're human before continuing</p>
              </div>

              <Turnstile
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={() => setTurnstileVerified(true)}
                onError={() => setTurnstileVerified(false)}
                onExpire={() => setTurnstileVerified(false)}
                options={{ theme: 'dark', size: 'normal' }}
              />

              <p className="text-white/20 text-xs">
                Protected by{' '}
                <span className="text-white/40 font-semibold">Cloudflare Turnstile</span>
              </p>
            </div>
          ) : (
            /* ── Clerk auth forms ── */
            <>
              {showSignup ? (
                <>
                  <SignUp
                    routing="path"
                    path="/signup"
                    signInUrl="/login"
                    afterSignUpUrl="/user"
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
                    Already have an account? <Link to="/login" className="text-[#ff86c2]">Sign in</Link>
                  </p>
                </>
              ) : (
                <>
                  <SignIn
                    routing="path"
                    path="/login"
                    signUpUrl="/signup"
                    afterSignInUrl="/user"
                    appearance={{
                      variables: {
                        colorPrimary: '#ff86c2',
                        colorBackground: '#19191f',
                        colorInputBackground: '#ffffff',
                        colorInputText: '#111111',
                        colorText: '#f8f5fd',
                        colorTextSecondary: '#76747b',
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
                    Don't have an account? <Link to="/signup" className="text-[#ff86c2]">Sign up</Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
