import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClerk, useUser } from '@clerk/clerk-react';
import {
  LayoutGrid, Package, Bell, LogOut, ExternalLink,
  CheckCircle2, AlertTriangle, Copy, Users as UsersIcon, Shield,
} from 'lucide-react';
import SplitText from '../components/SplitText';

interface User { id: string; username: string; role: string; status: string; }
interface FullRequest {
  _id: string; userName: string; resourceName: string; resourceType: string;
  requestDate: string; status: string; createdAt: string;
}

type AdminTab = 'overview' | 'requests' | 'slack' | 'roles';

const AdminDashboard: React.FC = () => {
  const { userIsAdmin } = useAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [allRequests, setAllRequests] = useState<FullRequest[]>([]);
  const [totalResources, setTotalResources] = useState(0);
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [slackWebhook, setSlackWebhook] = useState(localStorage.getItem('dojo_slack_webhook') || '');
  const [slackStatus, setSlackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, resourcesRes, requestsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/users`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/added-resources?limit=1000`).catch(() => ({ data: { total: 0, data: [] } })),
        axios.get(`${API_BASE_URL}/requests?limit=1000`).catch(() => ({ data: { data: [] } })),
      ]);
      setUsers(usersRes.data || []);
      setTotalResources(resourcesRes.data.total || resourcesRes.data.data?.length || 0);
      setAllRequests(requestsRes.data.data || requestsRes.data || []);
    } catch (e) {
      console.error(e);
    }
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
      onClick={() => setAdminTab(key)}
      className={`w-full flex items-center gap-4 px-4 py-3 text-left text-sm font-medium tracking-wide transition-all ${
        adminTab === key ? 'bg-[#25252c] text-[#ff86c2]' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1c1c24]'
      }`}
    >
      <Icon size={16} />{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0e0e13] text-[#f8f5fd]" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-[#131318] border-b border-white/5 flex items-center justify-between px-10">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-[#ff86c2] uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Devops Dojo</span>
          <span className="text-[10px] text-slate-600 uppercase tracking-[0.25em]">Admin Console</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/user" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#ff86c2] transition-colors uppercase tracking-widest">
            <ExternalLink size={13} /> User View
          </Link>
          <button onClick={() => signOut({ redirectUrl: '/login' })} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      <div className="flex pt-20">
        {/* Sidebar */}
        <aside className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-[#131318] flex flex-col py-8 z-40">
          <div className="px-8 mb-10">
            <h1 className="text-lg font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <SplitText text="Admin Panel" delay={45} />
            </h1>
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] mt-1">Devops Dojo Hub</p>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {navItem('overview', LayoutGrid, 'Overview')}
            {navItem('requests', Package, 'Requested Resources')}
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
        <main className="ml-64 flex-1 p-10 space-y-8 min-h-[calc(100vh-5rem)]">

          {/* ── OVERVIEW ── */}
          {adminTab === 'overview' && (
            <>
              <div>
                <h2 className="text-3xl font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <SplitText text="Overview" delay={55} />
                </h2>
                <p className="text-slate-500 mt-1 text-sm">Platform health at a glance</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {[
                  { label: 'Total Users', value: users.length, accent: '#ff86c2' },
                  { label: 'Total Resources', value: totalResources, accent: '#bf81ff' },
                  { label: 'Pending Requests', value: pending.length, accent: '#facc15' },
                  { label: 'Stale (7+ days)', value: stale.length, accent: stale.length > 0 ? '#ff6e84' : '#4ade80' },
                ].map(c => (
                  <div key={c.label} className="bg-[#131318] p-6 flex flex-col gap-2 relative overflow-hidden" style={{ borderLeft: `3px solid ${c.accent}` }}>
                    <div className="absolute top-0 right-0 w-20 h-20 blur-[40px] opacity-20 pointer-events-none" style={{ background: c.accent }}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</span>
                    <span className="text-4xl font-black leading-none" style={{ color: c.accent, fontFamily: 'Space Grotesk, sans-serif' }}>{c.value}</span>
                  </div>
                ))}
              </div>

              {/* User management table */}
              <div className="bg-[#131318] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>User Management</h3>
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">{users.length} users</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1f1f26]">
                        {['Username', 'Role', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-600 text-sm">No users found</td></tr>
                      )}
                      {users.map(u => (
                        <tr key={u.id} className="border-t border-white/5 hover:bg-[#1a1a21] transition-colors">
                          <td className="px-6 py-3 font-bold text-[#f8f5fd]">{u.username}</td>
                          <td className="px-6 py-3">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 text-[#bf81ff] bg-[#bf81ff]/10">{u.role}</span>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 text-green-400 bg-green-400/10">Active</span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-2">
                              <button className="text-[10px] font-bold uppercase px-3 py-1.5 border border-[#48474d] text-slate-400 hover:text-[#f8f5fd] hover:border-[#76747b] transition-colors">Edit</button>
                              <button className="text-[10px] font-bold uppercase px-3 py-1.5 border border-red-900/40 text-red-500 hover:border-red-400 transition-colors">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── REQUESTED RESOURCES ── */}
          {adminTab === 'requests' && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
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

              <div className="bg-[#131318] overflow-x-auto">
                <table className="w-full text-sm min-w-[920px]">
                  <thead>
                    <tr className="bg-[#1f1f26]">
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
                        <tr key={r._id} className={`border-t border-white/5 hover:bg-[#1a1a21] transition-colors ${isStaleRow ? 'bg-red-950/10' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold ${isFulfilled ? 'text-slate-500 line-through' : 'text-[#f8f5fd]'}`}>{r.resourceName}</span>
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

          {/* ── SLACK ALERTS ── */}
          {adminTab === 'slack' && (
            <>
              <div>
                <h2 className="text-3xl font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
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
                  <div key={c.label} className="bg-[#131318] p-5 flex flex-col gap-2" style={{ borderLeft: `3px solid ${c.accent}` }}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</span>
                    <span className="text-3xl font-black" style={{ color: c.accent, fontFamily: 'Space Grotesk, sans-serif' }}>{c.value}</span>
                  </div>
                ))}
              </div>

              {/* Webhook config */}
              <div className="bg-[#131318] p-8 space-y-6">
                <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Slack Webhook Configuration</h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Incoming Webhook URL</label>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhook}
                    onChange={e => { setSlackWebhook(e.target.value); localStorage.setItem('dojo_slack_webhook', e.target.value); }}
                    className="w-full bg-[#0e0e13] border-b border-[#48474d] focus:border-[#ff86c2] px-0 py-2.5 text-sm text-[#f8f5fd] placeholder-slate-700 outline-none transition-colors"
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
              <div className="bg-[#131318] p-8 space-y-4">
                <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Alert Preview</h3>
                <pre className="bg-[#0e0e13] p-5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {alertText}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(alertText)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#f8f5fd] transition-colors">
                  <Copy size={13} /> Copy Alert Text
                </button>
              </div>

              {/* Stale requests detail */}
              {stale.length > 0 && (
                <div className="bg-[#131318] overflow-hidden">
                  <div className="px-6 py-4 border-b border-red-900/30 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Stale Requests</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1f1f26]">
                        {['Resource', 'Requested By', 'Days Pending', 'Action'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stale.map(r => (
                        <tr key={r._id} className="border-t border-red-900/20 bg-red-950/10 hover:bg-red-950/20 transition-colors">
                          <td className="px-6 py-3 font-bold text-[#f8f5fd]">{r.resourceName}</td>
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
                <h2 className="text-3xl font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  <SplitText text="Role Management" delay={40} />
                </h2>
                <p className="text-slate-500 mt-1 text-sm">Manage user roles via Clerk — assign admin or standard user access</p>
              </div>

              {/* Current admin info */}
              <div className="bg-[#131318] p-6 border-l-4 border-[#bf81ff] space-y-3">
                <p className="text-[10px] font-bold text-[#bf81ff] uppercase tracking-widest">Currently Signed In</p>
                <div className="flex items-center gap-4">
                  {clerkUser?.imageUrl && <img src={clerkUser.imageUrl} alt="avatar" className="w-10 h-10 rounded-full" />}
                  <div>
                    <p className="text-sm font-black text-[#f8f5fd]">{clerkUser?.fullName || clerkUser?.username || '—'}</p>
                    <p className="text-xs text-slate-500">{clerkUser?.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-black uppercase px-2 py-1 text-[#ff86c2] bg-[#ff86c2]/10">Admin</span>
                </div>
              </div>

              {/* How roles work */}
              <div className="bg-[#131318] p-8 space-y-5">
                <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>How Roles Work</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { role: 'admin', color: '#ff86c2', desc: 'Full access: Admin Console, all resources, user management, Slack alerts' },
                    { role: 'user', color: '#4ade80', desc: 'Standard access: view resources, book sessions, join study groups' },
                  ].map(r => (
                    <div key={r.role} className="bg-[#0e0e13] p-5 space-y-2" style={{ borderLeft: `3px solid ${r.color}` }}>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5" style={{ color: r.color, background: r.color + '20' }}>{r.role}</span>
                      <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clerk Dashboard instructions */}
              <div className="bg-[#131318] p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-[#bf81ff]" />
                  <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Set Roles via Clerk Dashboard</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Roles are stored in Clerk's <code className="bg-[#0e0e13] px-1.5 py-0.5 text-[#bf81ff] text-xs font-mono">publicMetadata.role</code> field.
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

              {/* Users from backend */}
              <div className="bg-[#131318] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <h3 className="text-base font-black text-[#f8f5fd]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Platform Users
                  </h3>
                  <p className="text-[10px] text-slate-600 mt-1">Users registered in your backend. Manage their Clerk roles at dashboard.clerk.com</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1f1f26]">
                        {['Username', 'Current Role', 'Clerk Action'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-6 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-600 text-sm">No users found</td></tr>
                      )}
                      {users.map(u => (
                        <tr key={u.id} className="border-t border-white/5 hover:bg-[#1a1a21] transition-colors">
                          <td className="px-6 py-3 font-bold text-[#f8f5fd]">{u.username}</td>
                          <td className="px-6 py-3">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${u.role === 'admin' ? 'text-[#ff86c2] bg-[#ff86c2]/10' : 'text-[#4ade80] bg-[#4ade80]/10'}`}>
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <a
                              href="https://dashboard.clerk.com"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold uppercase px-3 py-1.5 border border-[#48474d] text-slate-400 hover:text-[#bf81ff] hover:border-[#bf81ff] transition-colors inline-flex items-center gap-1">
                              <ExternalLink size={9} /> Edit in Clerk
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
