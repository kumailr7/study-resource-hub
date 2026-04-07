import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClerk, useUser } from '@clerk/clerk-react';
import {
  LayoutGrid, Package, Bell, LogOut, ExternalLink,
  CheckCircle2, AlertTriangle, Copy, Users as UsersIcon, Shield, Download, X, RefreshCw, UserPlus, Trash2
} from 'lucide-react';
import SplitText from '../components/SplitText';

interface ManagedUser {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
  status: 'active' | 'invited' | 'pending_removal' | 'removed';
  removalRequest?: {
    requestedBy: string;
    reason: string;
    requestedAt: string;
    reviewedBy: string;
    reviewedAt: string;
    approved: boolean;
  };
  invitedBy?: string;
  invitedAt?: string;
  createdAt: string;
}

interface FullRequest {
  _id: string; userName: string; resourceName: string; resourceType: string;
  requestDate: string; status: string; createdAt: string;
}

type AdminTab = 'overview' | 'users' | 'removals' | 'requests' | 'downloads' | 'slack' | 'roles';

const AdminDashboard: React.FC = () => {
  const { userIsAdmin, userIsSuperAdmin, userRole } = useAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<ManagedUser[]>([]);
  const [allRequests, setAllRequests] = useState<FullRequest[]>([]);
  const [downloadRequests, setDownloadRequests] = useState<any[]>([]);
  const [totalResources, setTotalResources] = useState(0);
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [slackWebhook, setSlackWebhook] = useState(localStorage.getItem('dojo_slack_webhook') || '');
  const [slackStatus, setSlackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [adminSidebarOpen, setAdminSidebarOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  useEffect(() => {
    if (clerkUser?.id && userRole) { fetchAll(); }
  }, [clerkUser?.id, userRole]);

  const fetchAll = async () => {
    try {
      const clerkId = clerkUser?.id;
      const headers = { 
        'x-clerk-id': clerkId || '',
        'x-clerk-role': userRole || ''
      };
      console.log('Fetching users with headers:', headers);
      
      const usersRes = await axios.get(`${API_BASE_URL}/users`, { headers })
        .catch((e) => { 
          console.error('Users API error:', e.response?.status, e.response?.data); 
          return { data: [], error: e.response?.data }; 
        });
      
      console.log('Users API response:', usersRes.data);
      
      const [removalsRes, resourcesRes, requestsRes, dlRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users/pending-removals`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/added-resources?limit=1000`).catch(() => ({ data: { total: 0, data: [] } })),
        axios.get(`${API_BASE_URL}/requests?limit=1000`).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE_URL}/download-requests`, { headers }).catch(() => ({ data: [] })),
      ]);
      setManagedUsers(usersRes.data || []);
      setPendingRemovals(removalsRes.data || []);
      setTotalResources(resourcesRes.data.total || resourcesRes.data.data?.length || 0);
      setAllRequests(requestsRes.data.data || requestsRes.data || []);
      setDownloadRequests(dlRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      const res = await axios.post<{ success?: boolean; email?: string; error?: string }>(`${API_BASE_URL}/users/invite`, { email: inviteEmail, invitedBy: clerkUser?.id }, { headers });
      setShowInviteModal(false);
      setInviteEmail('');
      fetchAll();
      if (res.data.success) {
        alert(`Invitation sent to ${res.data.email}! They will receive an email to join.`);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error inviting user');
    }
  };

  const handlePromoteToAdmin = async (clerkId: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/users/${clerkId}/role`, { role: 'admin', updatedBy: clerkUser?.id }, { headers });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleDemoteToUser = async (clerkId: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/users/${clerkId}/role`, { role: 'user', updatedBy: clerkUser?.id }, { headers });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleRequestRemoval = async () => {
    if (!removeUserId || !removeReason.trim()) return;
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.post(`${API_BASE_URL}/users/${removeUserId}/request-removal`, { reason: removeReason, requestedBy: clerkUser?.id }, { headers });
      setShowRemoveModal(false);
      setRemoveUserId(null);
      setRemoveReason('');
      fetchAll();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error requesting removal');
    }
  };

  const handleApproveRemoval = async (clerkId: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/users/${clerkId}/approve-removal`, { reviewedBy: clerkUser?.id }, { headers });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleRejectRemoval = async (clerkId: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/users/${clerkId}/reject-removal`, { reviewedBy: clerkUser?.id }, { headers });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleMakeSuperAdmin = async (clerkId: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/users/${clerkId}/role`, { role: 'super_admin', updatedBy: clerkUser?.id }, { headers });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      super_admin: { bg: '#7c3aed20', text: '#a78bfa', label: 'SUPER ADMIN' },
      admin: { bg: '#ff86c220', text: '#ff86c2', label: 'ADMIN' },
      user: { bg: '#4ade8020', text: '#4ade80', label: 'USER' },
    };
    const c = colors[role as keyof typeof colors] || colors.user;
    return <span className="text-[9px] font-black uppercase px-2 py-0.5" style={{ background: c.bg, color: c.text }}>{c.label}</span>;
  };

  const handleResendInvite = async (clerkId: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.post(`${API_BASE_URL}/users/${clerkId}/resend-invite`, {}, { headers });
      fetchAll();
      alert('Invitation resent');
    } catch (e) { console.error(e); }
  };

  const handleCancelInvite = async (clerkId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.delete(`${API_BASE_URL}/users/${clerkId}/cancel-invite`, { headers });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleApproveDownload = async (id: string) => {
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/download-requests/${id}/approve`, { adminId: clerkUser?.id }, { headers });
      setDownloadRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'approved', reviewedAt: new Date(), expiresAt: new Date(Date.now() + 24*60*60*1000) } : r));
    } catch (e) { console.error(e); }
  };

  const handleRejectDownload = async (id: string) => {
    if (!rejectReason.trim()) { alert('Please provide a reason for rejection'); return; }
    try {
      const headers = { 'x-clerk-id': clerkUser?.id || '' };
      await axios.patch(`${API_BASE_URL}/download-requests/${id}/reject`, { adminId: clerkUser?.id, reason: rejectReason }, { headers });
      setDownloadRequests(prev => prev.map(r => r._id === id ? { ...r, status: 'rejected', reviewedAt: new Date(), rejectionReason: rejectReason } : r));
      setRejectReason('');
    } catch (e) { console.error(e); }
  };

  const markRequestStatus = async (id: string, status: string) => {
    try {
      await axios.put(`${API_BASE_URL}/requests/${id}`, { status });
      setAllRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    } catch (e) {
      console.error(e);
    }
  };

  const getDaysPending = (r: FullRequest) => {
    const d = new Date(r.createdAt || r.requestDate);
    if (isNaN(d.getTime())) return 0;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  };

  const pending = allRequests.filter(r => r.status === 'pending');
  const fulfilled = allRequests.filter(r => r.status === 'fulfilled' || r.status === 'done');
  const stale = pending.filter(r => getDaysPending(r) >= 7);

  const nameCounts: Record<string, number> = {};
  allRequests.forEach(r => {
    const key = r.resourceName?.toLowerCase().trim();
    if (key) nameCounts[key] = (nameCounts[key] || 0) + 1;
  });
  const isDuplicate = (r: FullRequest) => nameCounts[r.resourceName?.toLowerCase().trim()] > 1;

  const sendSlackAlert = async () => {
    if (!slackWebhook) return;
    localStorage.setItem('dojo_slack_webhook', slackWebhook);
    setSlackStatus('sending');
    const text = stale.length > 0
      ? `⚠️ *Devops Dojo Hub — Weekly Alert*\n\n${stale.length} request(s) pending 7+ days:\n${stale.map(r => `• *${r.resourceName}* by ${r.userName} (${getDaysPending(r)} days)`).join('\n')}`
      : `✅ *Devops Dojo Hub — Weekly Check*\nNo stale requests this week!`;
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setSlackStatus('sent');
      setTimeout(() => setSlackStatus('idle'), 3000);
    } catch {
      setSlackStatus('error');
    }
  };

  const alertText = stale.length > 0
    ? `⚠️ Devops Dojo Hub — Weekly Alert\n\n${stale.length} request(s) pending 7+ days:\n\n${stale.map(r => `• ${r.resourceName} — by ${r.userName} (${getDaysPending(r)} days)`).join('\n')}\n\nPlease review these requests.`
    : `✅ Devops Dojo Hub — Weekly Check\n\nNo stale requests this week! All ${pending.length} pending request(s) are within the 7-day window.`;

  const navItem = (key: AdminTab, Icon: React.FC<any>, label: string) => (
    <button
      onClick={() => { setAdminTab(key); setAdminSidebarOpen(false); }}
      className={`w-full flex items-center gap-4 px-4 py-3 text-left text-sm font-medium tracking-wide transition-all ${
        adminTab === key ? 'bg-surface-container-highest text-primary' : 'text-slate-500 hover:text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <Icon size={16} />{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 lg:h-20 bg-surface-container-low border-b border-outline-variant flex items-center justify-between px-4 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 text-slate-500 hover:text-primary transition-colors"
            onClick={() => setAdminSidebarOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="text-lg font-black text-[#ff86c2] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Devops Dojo</span>
          <span className="hidden sm:inline text-[10px] text-slate-600 uppercase tracking-[0.25em]">Admin Console</span>
        </div>
        <div className="flex items-center gap-3 lg:gap-6">
          <Link to="/user" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest">
            <ExternalLink size={13} /> <span className="hidden sm:inline">User View</span>
          </Link>
          <button onClick={() => signOut({ redirectUrl: '/login' })} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest">
            <LogOut size={13} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile sidebar backdrop */}
      {adminSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setAdminSidebarOpen(false)} />
      )}

      <div className="flex pt-16 lg:pt-20">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-16 lg:top-20 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] w-64 bg-surface-container-low flex flex-col py-8 z-50 transition-transform duration-300 lg:translate-x-0 ${adminSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-8 mb-10">
            <h1 className="text-lg font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <SplitText text="Admin Panel" delay={45} />
            </h1>
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] mt-1">Devops Dojo Hub</p>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {navItem('overview', LayoutGrid, 'Overview')}
            {userIsSuperAdmin && navItem('users', UsersIcon, 'User Management')}
            {userIsSuperAdmin && navItem('removals', Trash2, 'Removal Requests')}
            {userIsAdmin && navItem('requests', Package, 'Requested Resources')}
            {navItem('downloads', Download, 'Download Requests')}
            {navItem('slack', Bell, 'Slack Alerts')}
            {navItem('roles', Shield, 'Role Management')}
          </nav>
          <div className="px-8 pb-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 inline-block"></span>
              {userIsAdmin ? 'Admin Access' : 'Read Only'}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="lg:ml-64 flex-1 p-4 lg:p-10 space-y-8 min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-5rem)] w-full overflow-x-auto">

          {/* ── OVERVIEW ── */}
          {adminTab === 'overview' && (
            <>
              <div>
                <h2 className="text-3xl font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <SplitText text="Overview" delay={55} />
                </h2>
                <p className="text-slate-500 mt-1 text-sm">Platform health at a glance</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {[
                  { label: 'Total Users', value: managedUsers.length, accent: '#ff86c2' },
                  { label: 'Total Resources', value: totalResources, accent: '#bf81ff' },
                  { label: 'Pending Requests', value: pending.length, accent: '#facc15' },
                  { label: 'Pending Removals', value: pendingRemovals.length, accent: pendingRemovals.length > 0 ? '#ff6e84' : '#4ade80' },
                ].map(c => (
                  <div key={c.label} className="bg-surface-container-low p-6 flex flex-col gap-2 relative overflow-hidden" style={{ borderLeft: `3px solid ${c.accent}` }}>
                    <div className="absolute top-0 right-0 w-20 h-20 blur-[40px] opacity-20 pointer-events-none" style={{ background: c.accent }}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</span>
                    <span className="text-4xl font-black leading-none" style={{ color: c.accent, fontFamily: 'Space Grotesk, sans-serif' }}>{c.value}</span>
                  </div>
                ))}
              </div>

              {/* Stats for non-super-admins */}
              {!userIsSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { label: 'Total Resources', value: totalResources, accent: '#bf81ff' },
                    { label: 'Pending Requests', value: pending.length, accent: '#facc15' },
                    { label: 'Stale (7+ days)', value: stale.length, accent: stale.length > 0 ? '#ff6e84' : '#4ade80' },
                  ].map(c => (
                    <div key={c.label} className="bg-surface-container-low p-6 flex flex-col gap-2 relative overflow-hidden" style={{ borderLeft: `3px solid ${c.accent}` }}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</span>
                      <span className="text-4xl font-black leading-none" style={{ color: c.accent }}>{c.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── USER MANAGEMENT (Super Admin Only) ── */}
          {adminTab === 'users' && userIsSuperAdmin && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-black text-on-surface">User Management</h2>
                  <p className="text-slate-500 mt-1 text-sm">Manage users, roles, and permissions</p>
                </div>
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#ff86c2] text-[#0e0e13] text-xs font-black uppercase tracking-widest hover:opacity-90">
                  <UserPlus size={14} /> Invite User
                </button>
              </div>

              {/* Invite Modal */}
              {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface-container-low p-6 rounded-xl w-96 space-y-4 border border-outline-variant">
                    <h3 className="text-lg font-black text-on-surface">Invite User</h3>
                    <input type="email" placeholder="Enter email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      className="w-full bg-surface border border-outline-variant px-4 py-2 text-sm text-on-surface placeholder-slate-600 outline-none focus:border-primary" />
                    <div className="flex gap-3">
                      <button onClick={handleInviteUser} className="flex-1 py-2 bg-[#ff86c2] text-[#0e0e13] text-xs font-black uppercase hover:opacity-90">Send Invite</button>
                      <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 border border-outline-variant text-slate-400 text-xs font-bold uppercase hover:text-on-surface">Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="bg-surface-container-low overflow-x-auto">
                {managedUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No users found. Click "Invite User" to add users.
                  </div>
                ) : (
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container-high">
                      {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {managedUsers.filter(u => u.status !== 'removed').map(u => (
                      <tr key={u._id} className="border-t border-outline-variant hover:bg-surface-container-high transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#ff86c2]/20 flex items-center justify-center text-[10px] font-bold text-[#ff86c2]">
                              {(u.name || u.email)[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-on-surface">{u.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{u.email}</td>
                        <td className="px-5 py-3">{getRoleBadge(u.role)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                            u.status === 'active' ? 'text-green-400 bg-green-400/10' 
                            : u.status === 'invited' ? 'text-amber-400 bg-amber-400/10'
                            : u.status === 'pending_removal' ? 'text-orange-400 bg-orange-400/10'
                            : 'text-red-400 bg-red-400/10'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            {u.status === 'invited' && (
                              <>
                                <button onClick={() => handleResendInvite(u.clerkId)} className="text-[9px] font-bold uppercase px-2 py-1 text-amber-400 border border-amber-600/50 hover:bg-amber-400/10">
                                  Resend
                                </button>
                                <button onClick={() => handleCancelInvite(u.clerkId)} className="text-[9px] font-bold uppercase px-2 py-1 text-red-400 border border-red-900/40 hover:bg-red-400/10">
                                  Cancel
                                </button>
                              </>
                            )}
                            {u.role === 'user' && u.status === 'active' && (
                              <button onClick={() => handlePromoteToAdmin(u.clerkId)} className="text-[9px] font-bold uppercase px-2 py-1 text-[#bf81ff] border border-[#bf81ff]/50 hover:bg-[#bf81ff]/10">
                                Promote
                              </button>
                            )}
                            {u.role === 'admin' && u.clerkId !== clerkUser?.id && (
                              <button onClick={() => handleDemoteToUser(u.clerkId)} className="text-[9px] font-bold uppercase px-2 py-1 text-slate-400 border border-slate-600 hover:text-on-surface">
                                Demote
                              </button>
                            )}
                            {u.role === 'user' && u.status === 'active' && (
                              <button onClick={() => { setRemoveUserId(u.clerkId); setShowRemoveModal(true); }} className="text-[9px] font-bold uppercase px-2 py-1 text-red-400 border border-red-900/40 hover:bg-red-400/10">
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>

              {/* Remove User Modal */}
              {showRemoveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface-container-low p-6 rounded-xl w-96 space-y-4 border border-red-500/30">
                    <h3 className="text-lg font-black text-red-400">Request User Removal</h3>
                    <p className="text-xs text-slate-400">This request will be reviewed by a Super Admin.</p>
                    <textarea placeholder="Reason for removal (required)" value={removeReason} onChange={e => setRemoveReason(e.target.value)}
                      className="w-full bg-surface border border-outline-variant px-4 py-2 text-sm text-on-surface placeholder-slate-600 outline-none focus:border-red-400 h-24 resize-none" />
                    <div className="flex gap-3">
                      <button onClick={handleRequestRemoval} disabled={!removeReason.trim()} className="flex-1 py-2 bg-red-500 text-white text-xs font-black uppercase hover:bg-red-600 disabled:opacity-50">Submit Request</button>
                      <button onClick={() => { setShowRemoveModal(false); setRemoveReason(''); setRemoveUserId(null); }} className="px-4 py-2 border border-outline-variant text-slate-400 text-xs font-bold uppercase">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── REMOVAL REQUESTS (Super Admin Only) ── */}
          {adminTab === 'removals' && userIsSuperAdmin && (
            <>
              <div>
                <h2 className="text-3xl font-black text-on-surface">Removal Requests</h2>
                <p className="text-slate-500 mt-1 text-sm">Review and approve user removal requests</p>
              </div>

              {pendingRemovals.length === 0 ? (
                <div className="bg-surface-container-low p-12 text-center">
                  <p className="text-slate-500">No pending removal requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRemovals.map(u => (
                    <div key={u._id} className="bg-surface-container-low p-6 border border-yellow-500/30">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#ff86c2]/20 flex items-center justify-center text-sm font-bold text-[#ff86c2]">
                              {(u.name || u.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{u.name || '—'}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                            {getRoleBadge(u.role)}
                          </div>
                          <div className="mt-3 p-3 bg-surface">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for removal:</p>
                            <p className="text-sm text-slate-300">{u.removalRequest?.reason}</p>
                          </div>
                          <p className="text-[10px] text-slate-600">Requested: {u.removalRequest?.requestedAt ? new Date(u.removalRequest.requestedAt).toLocaleString() : '—'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveRemoval(u.clerkId)} className="px-4 py-2 bg-green-500 text-[#0e0e13] text-xs font-black uppercase hover:bg-green-400">
                            Approve
                          </button>
                          <button onClick={() => handleRejectRemoval(u.clerkId)} className="px-4 py-2 border border-red-500 text-red-400 text-xs font-bold uppercase hover:bg-red-500/10">
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── REQUESTED RESOURCES ── */}
          {adminTab === 'requests' && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <SplitText text="Requested Resources" delay={35} />
                  </h2>
                  <p className="text-slate-500 mt-1 text-sm">Review, action, and track all resource requests</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-yellow-400 inline-block"></span>Pending</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-400 inline-block"></span>Stale 7d+</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#ff86c2] inline-block"></span>Duplicate</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-400 inline-block"></span>Done</span>
                </div>
              </div>

              {/* Stale alert banner */}
              {stale.length > 0 && (
                <div className="bg-red-950/30 border border-red-900/40 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">
                      <span className="font-black">{stale.length} request{stale.length > 1 ? 's' : ''}</span> pending 7+ days.{' '}
                      <button onClick={() => setAdminTab('slack')} className="underline hover:text-red-200 transition-colors">Send Slack alert →</button>
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-surface-container-low overflow-x-auto">
                <table className="w-full text-sm min-w-[920px]">
                  <thead>
                    <tr className="bg-surface-container-high">
                      {['Resource Name', 'Requested By', 'Type', 'Date', 'Days', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-5 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRequests.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-600">No requests found</td></tr>
                    )}
                    {allRequests.map(r => {
                      const days = getDaysPending(r);
                      const dup = isDuplicate(r);
                      const isStaleRow = r.status === 'pending' && days >= 7;
                      const isFulfilled = r.status === 'fulfilled' || r.status === 'done';
                      return (
                        <tr key={r._id} className={`border-t border-outline-variant hover:bg-surface-container-high transition-colors ${isStaleRow ? 'bg-red-950/10' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${isFulfilled ? 'text-slate-500 line-through' : 'text-on-surface'}`}>{r.resourceName}</span>
                              {dup && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 text-[#ff86c2] bg-[#ff86c2]/10">⚠ Dup</span>}
                              {isStaleRow && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 text-red-400 bg-red-400/10">Overdue</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-400">{r.userName}</td>
                          <td className="px-5 py-3">
                            {r.resourceType && <span className="text-[10px] font-bold uppercase px-2 py-0.5 text-[#bf81ff] bg-[#bf81ff]/10">{r.resourceType}</span>}
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {r.requestDate ? new Date(r.requestDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {isFulfilled
                              ? <span className="text-[10px] text-slate-600">—</span>
                              : <span className={`text-xs font-bold ${days >= 7 ? 'text-red-400' : 'text-slate-400'}`}>{days}d</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                              isFulfilled ? 'text-green-400 bg-green-400/10'
                              : r.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10'
                              : r.status === 'rejected' ? 'text-red-400 bg-red-400/10'
                              : 'text-slate-400 bg-white/5'
                            }`}>{isFulfilled ? 'Done' : r.status}</span>
                          </td>
                          <td className="px-5 py-3">
                            {isFulfilled
                              ? <span className="text-[10px] text-green-500 flex items-center gap-1"><CheckCircle2 size={11} /> Done</span>
                              : (
                                <div className="flex gap-2">
                                  <button onClick={() => markRequestStatus(r._id, 'fulfilled')}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1.5 text-green-400 border border-green-900/50 hover:border-green-400 hover:bg-green-400/10 transition-all whitespace-nowrap">
                                    <CheckCircle2 size={10} /> Mark Done
                                  </button>
                                  <button onClick={() => markRequestStatus(r._id, 'rejected')}
                                    className="text-[9px] font-black uppercase px-2.5 py-1.5 text-red-500 border border-red-900/40 hover:border-red-400 transition-all">
                                    Reject
                                  </button>
                                </div>
                              )
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── DOWNLOAD REQUESTS ── */}
          {adminTab === 'downloads' && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    <SplitText text="Download Requests" delay={35} />
                  </h2>
                  <p className="text-slate-500 mt-1 text-sm">Review and approve session recording download requests</p>
                </div>
                <button onClick={fetchAll} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-on-surface transition-colors">
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {/* Summary cards */}
              {(() => {
                const pendingDl = downloadRequests.filter(r => r.status === 'pending');
                const approvedDl = downloadRequests.filter(r => r.status === 'approved');
                const rejectedDl = downloadRequests.filter(r => r.status === 'rejected');
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-surface-container-low p-5 flex flex-col gap-2" style={{ borderLeft: '3px solid #facc15' }}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending</span>
                      <span className="text-3xl font-black" style={{ color: '#facc15', fontFamily: 'Space Grotesk, sans-serif' }}>{pendingDl.length}</span>
                    </div>
                    <div className="bg-surface-container-low p-5 flex flex-col gap-2" style={{ borderLeft: '3px solid #4ade80' }}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Approved (24h)</span>
                      <span className="text-3xl font-black" style={{ color: '#4ade80', fontFamily: 'Space Grotesk, sans-serif' }}>{approvedDl.length}</span>
                    </div>
                    <div className="bg-surface-container-low p-5 flex flex-col gap-2" style={{ borderLeft: '3px solid #f87171' }}>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rejected</span>
                      <span className="text-3xl font-black" style={{ color: '#f87171', fontFamily: 'Space Grotesk, sans-serif' }}>{rejectedDl.length}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-surface-container-low overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-surface-container-high">
                      {['Session', 'User', 'Email', 'Status', 'Requested', 'Expires', 'Actions'].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-5 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {downloadRequests.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-600">No download requests found</td></tr>
                    )}
                    {downloadRequests.map(r => {
                      const session = r.sessionId || {};
                      const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
                      return (
                        <tr key={r._id} className="border-t border-outline-variant hover:bg-surface-container-high transition-colors">
                          <td className="px-5 py-3">
                            <div>
                              <span className="font-bold text-on-surface">{session.topic || '—'}</span>
                              {session.date && <span className="text-xs text-slate-500 ml-2">{session.date}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-400">{r.userName}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{r.userEmail}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                              r.status === 'approved' ? 'text-green-400 bg-green-400/10'
                              : r.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10'
                              : 'text-red-400 bg-red-400/10'
                            }`}>
                              {r.status === 'approved' && isExpired ? 'Expired' : r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {r.expiresAt ? (
                              <span className={isExpired ? 'text-red-400' : 'text-green-400'}>
                                {new Date(r.expiresAt).toLocaleString()}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {r.status === 'pending' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveDownload(r._id)}
                                  className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1.5 text-green-400 border border-green-900/50 hover:border-green-400 hover:bg-green-400/10 transition-all whitespace-nowrap">
                                  <CheckCircle2 size={10} /> Approve
                                </button>
                                <button onClick={() => { setRejectReason(''); handleRejectDownload(r._id); }}
                                  className="text-[9px] font-black uppercase px-2.5 py-1.5 text-red-500 border border-red-900/40 hover:border-red-400 transition-all">
                                  Reject
                                </button>
                              </div>
                            )}
                            {r.status === 'rejected' && r.rejectionReason && (
                              <span className="text-[10px] text-slate-500">{r.rejectionReason}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── SLACK ALERTS ── */}
          {adminTab === 'slack' && (
            <>
              <div>
                <h2 className="text-3xl font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <SplitText text="Slack Alerts" delay={55} />
                </h2>
                <p className="text-slate-500 mt-1 text-sm">Send weekly stale resource alerts to your Slack workspace</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Pending Requests', value: pending.length, accent: '#facc15' },
                  { label: 'Stale (7+ days)', value: stale.length, accent: stale.length > 0 ? '#ff6e84' : '#4ade80' },
                  { label: 'Fulfilled Total', value: fulfilled.length, accent: '#4ade80' },
                ].map(c => (
                  <div key={c.label} className="bg-surface-container-low p-5 flex flex-col gap-2" style={{ borderLeft: `3px solid ${c.accent}` }}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</span>
                    <span className="text-3xl font-black" style={{ color: c.accent, fontFamily: 'Space Grotesk, sans-serif' }}>{c.value}</span>
                  </div>
                ))}
              </div>

              {/* Webhook config */}
              <div className="bg-surface-container-low p-8 space-y-6">
                <h3 className="text-base font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Slack Webhook Configuration</h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Incoming Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhook}
                    onChange={e => { setSlackWebhook(e.target.value); localStorage.setItem('dojo_slack_webhook', e.target.value); }}
                    className="w-full bg-surface border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-700 outline-none transition-colors"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Create at api.slack.com → Your Apps → Incoming Webhooks</p>
                </div>
                <button
                  onClick={sendSlackAlert}
                  disabled={!slackWebhook || slackStatus === 'sending'}
                  className="flex items-center gap-2 px-8 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: slackStatus === 'sent' ? '#4ade80' : '#ff86c2', color: '#0e0e13' }}>
                  <Bell size={14} />
                  {slackStatus === 'sending' ? 'Sending...' : slackStatus === 'sent' ? '✓ Sent!' : slackStatus === 'error' ? 'Error — Try Again' : 'Send Weekly Alert'}
                </button>
              </div>

              {/* Alert preview */}
              <div className="bg-surface-container-low p-8 space-y-4">
                <h3 className="text-base font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Alert Preview</h3>
                <pre className="bg-surface p-5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {alertText}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(alertText)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-on-surface transition-colors">
                  <Copy size={13} /> Copy Alert Text
                </button>
              </div>

              {/* Stale requests detail */}
              {stale.length > 0 && (
                <div className="bg-surface-container-low overflow-hidden">
                  <div className="px-6 py-4 border-b border-red-900/30 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <h3 className="text-base font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Stale Requests</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container-high">
                        {['Resource', 'Requested By', 'Days Pending', 'Action'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stale.map(r => (
                        <tr key={r._id} className="border-t border-red-900/20 bg-red-950/10 hover:bg-red-950/20 transition-colors">
                          <td className="px-6 py-3 font-bold text-on-surface">{r.resourceName}</td>
                          <td className="px-6 py-3 text-slate-400">{r.userName}</td>
                          <td className="px-6 py-3 text-red-400 font-bold">{getDaysPending(r)}d</td>
                          <td className="px-6 py-3">
                            <button onClick={() => markRequestStatus(r._id, 'fulfilled')}
                              className="flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1.5 text-green-400 border border-green-900/50 hover:border-green-400 hover:bg-green-400/10 transition-all">
                              <CheckCircle2 size={10} /> Mark Done
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── ROLE MANAGEMENT ── */}
          {adminTab === 'roles' && (
            <>
              <div>
                <h2 className="text-3xl font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <SplitText text="Role Management" delay={40} />
                </h2>
                <p className="text-slate-500 mt-1 text-sm">Manage user roles via Clerk — assign admin or standard user access</p>
              </div>

              {/* Current admin info */}
              <div className="bg-surface-container-low p-6 border-l-4 border-[#bf81ff] space-y-3">
                <p className="text-[10px] font-bold text-[#bf81ff] uppercase tracking-widest">Currently Signed In</p>
                <div className="flex items-center gap-4">
                  {clerkUser?.imageUrl && <img src={clerkUser.imageUrl} alt="avatar" className="w-10 h-10 rounded-full" />}
                  <div>
                    <p className="text-sm font-black text-on-surface">{clerkUser?.fullName || clerkUser?.username || '—'}</p>
                    <p className="text-xs text-slate-500">{clerkUser?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <span className={`ml-auto text-[10px] font-black uppercase px-2 py-1 ${userIsSuperAdmin ? 'text-[#a78bfa] bg-[#a78bfa]/10' : 'text-[#ff86c2] bg-[#ff86c2]/10'}`}>
                    {userIsSuperAdmin ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
              </div>

              {/* How roles work */}
              <div className="bg-surface-container-low p-8 space-y-5">
                <h3 className="text-base font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>How Roles Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { role: 'admin', color: '#ff86c2', desc: 'Full access: Admin Console, all resources, user management, Slack alerts' },
                    { role: 'user', color: '#4ade80', desc: 'Standard access: view resources, book sessions, join study groups' },
                  ].map(r => (
                    <div key={r.role} className="bg-surface p-5 space-y-2" style={{ borderLeft: `3px solid ${r.color}` }}>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5" style={{ color: r.color, background: r.color + '20' }}>{r.role}</span>
                      <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clerk Dashboard instructions */}
              <div className="bg-surface-container-low p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-[#bf81ff]" />
                  <h3 className="text-base font-black text-on-surface" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Set Roles via Clerk Dashboard</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Roles are stored in Clerk's <code className="bg-surface px-1.5 py-0.5 text-[#bf81ff] text-xs font-mono">publicMetadata.role</code> field.
                  To assign a role to a user, follow these steps:
                </p>
                <ol className="space-y-3">
                  {[
                    { step: '1', text: 'Go to dashboard.clerk.com and open your application' },
                    { step: '2', text: 'Navigate to Users → select the user you want to promote' },
                    { step: '3', text: 'Click "Edit" on Public Metadata and set: { "role": "admin" }' },
                    { step: '4', text: 'For standard users, set: { "role": "user" } or leave empty' },
                    { step: '5', text: 'The user will have admin access on their next sign-in' },
                  ].map(item => (
                    <li key={item.step} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#bf81ff]/10 text-[#bf81ff] text-[10px] font-black flex items-center justify-center">{item.step}</span>
                      <p className="text-sm text-slate-400 leading-relaxed pt-0.5">{item.text}</p>
                    </li>
                  ))}
                </ol>
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90"
                  style={{ background: '#bf81ff', color: '#0e0e13' }}>
                  <ExternalLink size={12} /> Open Clerk Dashboard
                </a>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
