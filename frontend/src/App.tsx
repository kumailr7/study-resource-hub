import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import axios from "axios";
import { useClerk, useUser } from '@clerk/clerk-react';
import { ThemeProvider, useTheme } from "./ThemeContext";
import logo from "./assets/logo-2.png";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from './components/ProtectedRoute';
import { LayoutGrid, Trophy, Calendar, LineChart, Package, HelpCircle, LogOut, Bell, Settings, Sun, Moon, Pin, Search, Video, Users, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import BlurText from './components/BlurText';
import SplitText from './components/SplitText';
import BorderGlow from './components/BorderGlow';
import LightPillar from './components/LightPillar';

import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import SignupPage from './pages/SignupPage';
import { API_BASE_URL } from './config';


// Redirect component: redirects to user page if already signed in
const RedirectIfSignedIn: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoaded } = useAuth();
  if (!isLoaded) return <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center"><p className="text-slate-500 text-sm animate-pulse">Loading…</p></div>;
  if (isAuthenticated) return <Navigate to="/user" replace />;
  return <>{children}</>;
};

// Guard component: requires Clerk sign-in
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoaded } = useAuth();
  if (!isLoaded) return <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center"><p className="text-slate-500 text-sm animate-pulse">Loading…</p></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

interface Resource {
  _id: string;
  name: string;
  link: string;
  category: string;
  type: string;
  tags: string[];
  addedBy?: string;
}

interface ResourceCollection {
  id: string;
  title: string;
  links: { name: string; url: string; }[];
  createdAt: string;
}

interface Request {
  _id: string;
  userName: string;
  resourceName: string;
  resourceType: string;
  notes?: string;
  requestDate: string;
  status: string;
  createdAt: string;
  upvotes?: string[];
}

interface ErrorResponse {
  error: string;
}

interface ResourceResponse {
  data: Resource[];
  total: number;
}

interface RequestResponse {
  data: Request[];
  total: number;
}

// Date formatting function
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

interface Session {
  id: string;
  author: string;
  topic: string;
  date: string;
  time: string;
  timezone?: string;
  tag: string;
  meetingLink: string;
  platform: 'Google Meet' | 'Zoom' | 'Teams' | 'Other';
  agenda: string;
  willRecord: boolean;
  recordingLink: string;
  aiSummary: string;
  hostLinkedIn: string;
  duration?: number;
  attendeeCount: number;
  registeredUsers?: string[];
  recordingDeleted?: boolean;
  recordingDeleteReason?: string;
}

interface Suggestion {
  id: string;
  author: string;
  suggestion: string;
  type: string;
}

interface StudyGroup {
  id: string;
  title: string;
  agenda: string;
  shortCode: string;
  createdAt: string;
  isActive: boolean;
  memberCount: number;
  scheduledAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

type Section = 'dashboard' | 'challenges' | 'schedule' | 'analytics' | 'resources' | 'studygroups';

const CHART_COLORS = ['#ff86c2', '#bf81ff', '#4ade80', '#facc15', '#38bdf8', '#fb923c', '#f472b6', '#a78bfa'];
const GRADIENT_PAIRS: [string, string][] = [
  ['#ff86c2', '#5c0028'], ['#bf81ff', '#3d005c'], ['#4ade80', '#003d1a'],
  ['#facc15', '#3d2e00'], ['#38bdf8', '#003d52'], ['#fb923c', '#3d1800'],
];

// Tag → color mapping: keyword matching, case-insensitive
const TAG_COLORS: { keywords: string[]; color: string }[] = [
  { keywords: ['kubernetes', 'k8s', 'kubectl', 'helm', 'eks', 'gke', 'aks'], color: '#4169E1' },   // Persian blue
  { keywords: ['terraform', 'pulumi', 'cloudformation', 'bicep', 'iac', 'ansible'], color: '#7C3AED' }, // Purple
  { keywords: ['docker', 'container', 'compose', 'podman'], color: '#2196F3' },                    // Blue accent
  { keywords: ['security', 'devsecops', 'soc', 'iam', 'vault', 'pentest', 'owasp'], color: '#DC2626' },
  { keywords: ['aws', 'amazon'], color: '#FFB300' },                                               // Yellow gold
  { keywords: ['gcp', 'google cloud'], color: '#0097A7' },                                         // Sea blue
  { keywords: ['azure'], color: '#00BCD4' },                                                       // Turquoise
  { keywords: ['devops', 'ci', 'cd', 'pipeline', 'jenkins', 'github actions'], color: '#ff86c2' },
  { keywords: ['python', 'javascript', 'typescript', 'go', 'rust', 'programming', 'coding'], color: '#4ade80' },
];

const getTagColor = (tag: string): string => {
  if (!tag) return '#ff86c2';
  const lower = tag.toLowerCase();
  for (const entry of TAG_COLORS) {
    if (entry.keywords.some(kw => lower.includes(kw))) return entry.color;
  }
  return '#ff86c2';
};

const ResourceRow: React.FC<{
  resource: Resource;
  i: number;
  userIsAdmin: boolean;
  catMeta: { color: string; abbr: string } | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onBundle: () => void;
}> = ({ resource, i, userIsAdmin, catMeta, onEdit, onDelete, onBundle }) => {
  const [hovered, setHovered] = useState(false);
  const accentColor = getTagColor(`${resource.name} ${(resource.tags || []).join(' ')} ${resource.category || ''}`);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? `${accentColor}10`
          : i % 2 === 0 ? 'var(--surface-container-low, #131318)' : 'var(--surface-container, #19191f)',
        boxShadow: hovered ? `inset 4px 0 0 ${accentColor}, inset 0 0 40px ${accentColor}0a` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <td className="py-4 px-6">
        <p className="text-sm font-bold" style={{ color: hovered ? '#fff' : undefined, transition: 'color 0.2s' }}>{resource.name}</p>
        <p className="text-xs transition-colors duration-200" style={{ color: hovered ? accentColor : '#64748b' }}>{resource.tags?.join(', ')}</p>
      </td>
      <td className="py-4 px-6">
        <span className="text-xs text-slate-400">{resource.addedBy || <span className="text-slate-600 italic">—</span>}</span>
      </td>
      <td className="py-4 px-6">
        <span
          className="px-3 py-1 text-[10px] font-bold uppercase transition-all duration-200"
          style={{
            background: hovered ? `${accentColor}25` : undefined,
            color: hovered ? accentColor : undefined,
            border: hovered ? `1px solid ${accentColor}50` : undefined,
          }}
        >
          {resource.type}
        </span>
      </td>
      <td className="py-4 px-6 max-w-[220px]">
        <div className="flex items-center gap-2">
          {catMeta && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 flex-shrink-0"
              style={{ color: catMeta.color, background: catMeta.color + '20', border: `1px solid ${catMeta.color}40` }}>
              {catMeta.abbr}
            </span>
          )}
          <a href={resource.link} target="_blank" rel="noreferrer"
            className="text-xs font-medium hover:underline underline-offset-4 truncate transition-colors duration-200"
            style={{ color: hovered ? accentColor : '#ff86c2' }}
            title={resource.link}>
            {resource.link}
          </a>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-end gap-3">
          <a href={resource.link} target="_blank" rel="noreferrer"
            className="font-bold transition-colors duration-200"
            style={{ color: hovered ? accentColor : '#64748b' }}
            title="Download/Open">↓</a>
          <button
            title="Add to Collection"
            onClick={onBundle}
            className="text-xs font-bold px-1.5 py-0.5 transition-all duration-200"
            style={{
              color: hovered ? accentColor : '#64748b',
              border: `1px solid ${hovered ? accentColor + '80' : 'rgba(71,71,77,0.5)'}`,
            }}>
            + Bundle
          </button>
          {userIsAdmin && (
            <>
              <button onClick={onEdit} className="transition-colors duration-200" style={{ color: hovered ? accentColor : '#64748b' }}><Settings size={14} /></button>
              <button onClick={onDelete} className="text-slate-500 hover:text-error transition-colors"><LogOut size={14} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const SearchResultRow: React.FC<{
  item: { label: string; sub?: string | null; href: string | null; section: string; sessionId?: string };
  accentColor: string;
  sec: string;
  onSelect: () => void;
}> = ({ item, accentColor, sec, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      className="w-full flex items-start gap-4 px-5 py-3 text-left transition-all duration-200"
      style={{
        background: hovered ? `${accentColor}12` : 'transparent',
        boxShadow: hovered ? `inset 0 0 30px 0 ${accentColor}18` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div
        className="w-[3px] shrink-0 mt-1 rounded-full transition-all duration-200"
        style={{
          minHeight: 32,
          background: accentColor,
          opacity: hovered ? 1 : 0.25,
          boxShadow: hovered ? `0 0 10px 2px ${accentColor}99` : 'none',
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface truncate" style={{ color: hovered ? '#fff' : undefined }}>{item.label}</p>
        {item.sub && (
          <p className="text-xs truncate mt-0.5 transition-colors duration-200" style={{ color: hovered ? accentColor : '#64748b' }}>{item.sub}</p>
        )}
      </div>
      <span
        className="text-[10px] uppercase tracking-widest shrink-0 mt-1 transition-colors duration-200 font-bold"
        style={{ color: hovered ? accentColor : '#374151' }}
      >{sec}</span>
    </button>
  );
};

const CATEGORY_META: Record<string, { color: string; abbr: string }> = {
  'AWS': { color: '#FF9900', abbr: 'AWS' },
  'GCP': { color: '#4285F4', abbr: 'GCP' },
  'Azure': { color: '#0078D4', abbr: 'AZ' },
  'Kubernetes': { color: '#326CE5', abbr: 'K8S' },
  'DevOps': { color: '#ff86c2', abbr: 'OPS' },
  'Programming': { color: '#4ade80', abbr: 'CODE' },
  'IaC': { color: '#facc15', abbr: 'IaC' },
  'Cloud': { color: '#38bdf8', abbr: 'CLOUD' },
  'Security': { color: '#f87171', abbr: 'SEC' },
  'Networking': { color: '#fb923c', abbr: 'NET' },
};

// Syncs the newly signed-up invited user to MongoDB then sends them to /user
const SyncSignup: React.FC = () => {
  const { user } = useUser();
  const [done, setDone] = React.useState(false);

  useEffect(() => {
    if (!user || done) return;
    const sync = async () => {
      try {
        await axios.post(`${API_BASE_URL}/users/sync`, {
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
      } catch (_) {
        // Sync failure is non-fatal; user can still access the app
      } finally {
        setDone(true);
      }
    };
    sync();
  }, [user, done]);

  if (!done) {
    return (
      <div className="min-h-screen bg-[#0e0e13] flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Setting up your account…</p>
      </div>
    );
  }
  return <Navigate to="/user" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login/*" element={<RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn>} />
            <Route path="/signup/*" element={<SignupPage />} />
            <Route path="/sync-signup" element={<RequireAuth><SyncSignup /></RequireAuth>} />
            <Route path="/admin" element={<ProtectedRoute component={AdminDashboard} />} />
            <Route path="/user" element={<RequireAuth><ResourceTable /></RequireAuth>} />
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

// ResourceTable Component
const ResourceTable: React.FC = () => {
  const { userIsAdmin } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { isDarkTheme, toggleTheme } = useTheme();
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceLink, setNewResourceLink] = useState("");
  const [newResourceCategory, setNewResourceCategory] = useState("");
  const [newResourceType, setNewResourceType] = useState("");
  const [newResourceTags, setNewResourceTags] = useState<string[]>([]);
  const [newRequestUserName, setNewRequestUserName] = useState("");
  const [newRequestResourceName, setNewRequestResourceName] = useState("");
  const [newRequestResourceType, setNewRequestResourceType] = useState("");
  const [newRequestNotes, setNewRequestNotes] = useState("");
  const [editResourceId, setEditResourceId] = useState<string | null>(null);
  const [searchTags, setSearchTags] = useState<string>("");
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [resourcePage, setResourcePage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [requestTotal, setRequestTotal] = useState(0);
  const [newRequestDate, setNewRequestDate] = useState("");
  const [newTag, setNewTag] = useState("");

  // Suggestion state
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => {
    try { return JSON.parse(localStorage.getItem('dojo_suggestions') || '[]'); } catch { return []; }
  });
  const [suggAuthor, setSuggAuthor] = useState("");
  const [suggText, setSuggText] = useState("");
  const [suggType, setSuggType] = useState("Resource");

  // Study Groups state
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [sgTitle, setSgTitle] = useState('');
  const [sgAgenda, setSgAgenda] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Schedule state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionAuthor, setSessionAuthor] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionTag, setSessionTag] = useState("");
  const [sessionLink, setSessionLink] = useState("");
  const [sessionPlatform, setSessionPlatform] = useState<Session['platform']>('Google Meet');
  const [sessionAgenda, setSessionAgenda] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [sessionWillRecord, setSessionWillRecord] = useState(false);
  const [editRecordingLink, setEditRecordingLink] = useState("");
  const [editAiSummary, setEditAiSummary] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [sessionLinkedIn, setSessionLinkedIn] = useState("");
  const [sessionDuration, setSessionDuration] = useState("30");
  const [viewAllResources, setViewAllResources] = useState(false);
  const [newResourceAddedBy, setNewResourceAddedBy] = useState('');
  const [sgScheduledAt, setSgScheduledAt] = useState('');
  const [myRegisteredSessions, setMyRegisteredSessions] = useState<Record<string, boolean>>({});
  const [myJoinedGroups, setMyJoinedGroups] = useState<Record<string, boolean>>({});
  const [collections, setCollections] = useState<ResourceCollection[]>(() => {
    try { return JSON.parse(localStorage.getItem('dojo_collections') || '[]'); } catch { return []; }
  });
  const [showCollectionPanel, setShowCollectionPanel] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [addingToCollection, setAddingToCollection] = useState<{ name: string; url: string } | null>(null);

  // Request new modal
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Challenges state (must be at top level — hooks cannot be called inside IIFEs)
  const CHALLENGES = [
    {
      id: 'docker-sprint', tag: 'DEVOPS', color: '#4f8ef7', weekly: true, startOffset: -2, days: 7,
      title: 'The Docker Sprint', tagline: 'Containerise everything. Ship with confidence.',
      desc: 'Master containerisation fundamentals in 7 days. Cover Dockerfile, compose, and multi-stage builds.',
      difficulty: 'Beginner', difficultyColor: '#22c55e',
      prerequisites: ['Basic Linux CLI', 'Git fundamentals'],
      whatYouBuild: 'A fully containerised multi-service app with Docker Compose',
      topics: [
        { day: 'Day 1–2', title: 'Docker Basics', desc: 'Images, containers, layers, and the Docker CLI' },
        { day: 'Day 3–4', title: 'Dockerfile Mastery', desc: 'Writing efficient Dockerfiles, caching, multi-stage builds' },
        { day: 'Day 5–6', title: 'Docker Compose', desc: 'Multi-container apps, networking, volumes, env vars' },
        { day: 'Day 7',   title: 'Final Challenge', desc: 'Containerise a real app and push to Docker Hub' },
      ],
      skills: ['Docker CLI', 'Dockerfile', 'Docker Compose', 'Networking', 'Image Optimisation'],
      outcome: 'Deploy a production-ready containerised application',
    },
    {
      id: 'k8s-deep-dive', tag: 'ORCHESTRATION', color: '#e040fb', weekly: true, startOffset: -1, days: 14,
      title: 'Kubernetes Deep Dive', tagline: 'Orchestrate at scale. Survive production.',
      desc: 'Deploy a full microservices stack on a local cluster. Deployments, Services, Ingress & RBAC.',
      difficulty: 'Intermediate', difficultyColor: '#f59e0b',
      prerequisites: ['Docker basics', 'Basic networking', 'YAML fluency'],
      whatYouBuild: 'A microservices app running on a local K8s cluster with Ingress and RBAC',
      topics: [
        { day: 'Day 1–3',   title: 'K8s Architecture',    desc: 'Nodes, Pods, control plane, kubectl basics' },
        { day: 'Day 4–6',   title: 'Workloads',            desc: 'Deployments, ReplicaSets, DaemonSets, StatefulSets' },
        { day: 'Day 7–9',   title: 'Networking',           desc: 'Services, Ingress, DNS, NetworkPolicies' },
        { day: 'Day 10–12', title: 'Config & Storage',     desc: 'ConfigMaps, Secrets, PersistentVolumes' },
        { day: 'Day 13–14', title: 'RBAC & Final Project', desc: 'Role-based access + deploy full microservices stack' },
      ],
      skills: ['kubectl', 'Deployments', 'Ingress', 'RBAC', 'Helm basics', 'Namespaces'],
      outcome: 'Run and manage a multi-service Kubernetes cluster locally',
    },
    {
      id: 'cicd-pipeline', tag: 'AUTOMATION', color: '#a78bfa', weekly: false, startOffset: 1, days: 5,
      title: 'CI/CD Pipeline Build', tagline: 'Automate the path from code to production.',
      desc: 'Build a full GitHub Actions pipeline with Docker build, test, push and deploy stages.',
      difficulty: 'Beginner', difficultyColor: '#22c55e',
      prerequisites: ['Git & GitHub', 'Basic Docker'],
      whatYouBuild: 'A working CI/CD pipeline that tests, builds, and deploys on every push',
      topics: [
        { day: 'Day 1', title: 'GitHub Actions Basics', desc: 'Workflows, jobs, steps, runners, triggers' },
        { day: 'Day 2', title: 'Build & Test Stage',    desc: 'Lint, unit tests, coverage reports in CI' },
        { day: 'Day 3', title: 'Docker Build & Push',   desc: 'Containerise and push to Docker Hub / GHCR' },
        { day: 'Day 4', title: 'Deploy Stage',          desc: 'Deploy to a server or cloud on merge to main' },
        { day: 'Day 5', title: 'Final Pipeline',        desc: 'End-to-end pipeline for a real project' },
      ],
      skills: ['GitHub Actions', 'YAML Workflows', 'Docker', 'Secrets Management', 'Deployment Automation'],
      outcome: 'Ship code automatically from commit to live environment',
    },
    {
      id: 'aws-practitioner', tag: 'CLOUD', color: '#fb923c', weekly: false, startOffset: 2, days: 10,
      title: 'AWS Cloud Practitioner', tagline: 'Understand the cloud. Pass the exam.',
      desc: 'Cover core AWS services: EC2, S3, IAM, VPC, RDS. Prep for the certification exam.',
      difficulty: 'Beginner', difficultyColor: '#22c55e',
      prerequisites: ['Basic networking concepts', 'No AWS experience needed'],
      whatYouBuild: 'A multi-tier app architecture deployed on AWS core services',
      topics: [
        { day: 'Day 1–2',  title: 'AWS Foundations',    desc: 'Regions, AZs, IAM, billing, shared responsibility' },
        { day: 'Day 3–4',  title: 'Compute & Storage',  desc: 'EC2, S3, EBS, Lambda overview' },
        { day: 'Day 5–6',  title: 'Networking',          desc: 'VPC, subnets, security groups, Route 53' },
        { day: 'Day 7–8',  title: 'Databases',           desc: 'RDS, DynamoDB, ElastiCache basics' },
        { day: 'Day 9–10', title: 'Exam Prep',           desc: 'Practice questions, exam tips, mock test' },
      ],
      skills: ['IAM', 'EC2', 'S3', 'VPC', 'RDS', 'CloudWatch', 'AWS CLI'],
      outcome: 'AWS Certified Cloud Practitioner exam ready',
    },
    {
      id: 'linux-devops', tag: 'LINUX', color: '#4ade80', weekly: true, startOffset: -3, days: 7,
      title: 'Linux for DevOps', tagline: 'Command the terminal. Own the system.',
      desc: 'Shell scripting, systemd, file permissions, networking tools and process management.',
      difficulty: 'Beginner', difficultyColor: '#22c55e',
      prerequisites: ['Basic computer literacy', 'Access to a Linux VM or WSL'],
      whatYouBuild: 'A set of automation shell scripts for real sysadmin tasks',
      topics: [
        { day: 'Day 1–2', title: 'Linux Fundamentals',          desc: 'Filesystem, navigation, users, permissions, package managers' },
        { day: 'Day 3–4', title: 'Shell Scripting',             desc: 'Bash scripting, variables, loops, conditionals, cron jobs' },
        { day: 'Day 5',   title: 'Process & Service Management',desc: 'systemd, journalctl, ps, kill, top' },
        { day: 'Day 6',   title: 'Networking Tools',            desc: 'curl, wget, netstat, ss, iptables basics' },
        { day: 'Day 7',   title: 'Final Challenge',             desc: 'Write a deployment automation script' },
      ],
      skills: ['Bash', 'systemd', 'File Permissions', 'Cron', 'Networking CLI', 'Process Management'],
      outcome: 'Confidently operate and automate any Linux system',
    },
    {
      id: 'terraform-basics', tag: 'IAC', color: '#818cf8', weekly: false, startOffset: 3, days: 7,
      title: 'Terraform Fundamentals', tagline: 'Infrastructure as code. Version it. Automate it.',
      desc: 'Provision cloud infrastructure as code. State management, modules, and remote backends.',
      difficulty: 'Intermediate', difficultyColor: '#f59e0b',
      prerequisites: ['Basic AWS knowledge', 'CLI comfort'],
      whatYouBuild: 'A full AWS infrastructure (VPC, EC2, S3) provisioned entirely via Terraform',
      topics: [
        { day: 'Day 1–2', title: 'Terraform Basics',     desc: 'Providers, resources, variables, outputs, plan/apply' },
        { day: 'Day 3',   title: 'State Management',     desc: 'Local vs remote state, state locking, S3 backend' },
        { day: 'Day 4–5', title: 'Modules',              desc: 'Writing reusable modules, module registry, composition' },
        { day: 'Day 6',   title: 'Real Infrastructure',  desc: 'Provision VPC, EC2, security groups, S3 on AWS' },
        { day: 'Day 7',   title: 'Final Project',        desc: 'Full infra deployment with remote backend + CI' },
      ],
      skills: ['HCL', 'Terraform CLI', 'Remote State', 'Modules', 'AWS Provider', 'Workspaces'],
      outcome: 'Provision and manage cloud infrastructure with zero click-ops',
    },
  ];
  const CHALLENGE_MAX_SLOTS = 15;
  const [challengeParticipants, setChallengeParticipants] = useState<Record<string, number>>({});
  const [joinedChallenges, setJoinedChallenges] = useState<Record<string, boolean>>({});
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const handleJoinChallenge = async (id: string) => {
    if (joinedChallenges[id]) return;
    const current = challengeParticipants[id] || 0;
    if (current >= CHALLENGE_MAX_SLOTS) return;
    const userId = user?.id;
    if (!userId) return;
    try {
      await axios.post(`${API_BASE_URL}/challenge-participants`, { challengeId: id, userId });
      setChallengeParticipants(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
      setJoinedChallenges(prev => ({ ...prev, [id]: true }));
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Already joined — just update local state
        setJoinedChallenges(prev => ({ ...prev, [id]: true }));
      }
    }
  };
  const getChallengeStatus = (c: typeof CHALLENGES[0]) => {
    const now = Date.now();
    const dayMs = 86400000;
    const start = now + c.startOffset * dayMs;
    const end = start + c.days * dayMs;
    const msLeft = end - now;
    if (now < start) {
      const daysUntil = Math.ceil((start - now) / dayMs);
      return { live: false, label: `Starts in ${daysUntil}d`, msLeft: start - now };
    }
    if (msLeft <= 0) return { live: false, label: 'Ended', msLeft: 0 };
    const daysLeft = Math.floor(msLeft / dayMs);
    const hoursLeft = Math.floor((msLeft % dayMs) / 3600000);
    return { live: true, label: daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`, msLeft };
  };

  // Global search overlay
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global search overlay: open on Cmd/Ctrl+K, close on Escape, focus input on open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearchOverlay(true); }
      if (e.key === 'Escape') { setShowSearchOverlay(false); setGlobalQuery(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  // Schedule client-side notification timers for upcoming registered sessions
  const notifTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    // Clear old timers
    Object.values(notifTimersRef.current).forEach(clearTimeout);
    notifTimersRef.current = {};

    if (Notification.permission !== 'granted') return;

    const REMIND_MS = 10 * 60 * 1000; // 10 min before
    Object.keys(myRegisteredSessions).filter(id => myRegisteredSessions[id]).forEach(id => {
      const session = sessions.find(s => s.id === id);
      if (!session) return;
      const sessionMs = new Date(`${session.date}T${session.time}`).getTime();
      const fireAt = sessionMs - REMIND_MS;
      const delay = fireAt - Date.now();
      if (delay <= 0) return; // already past
      notifTimersRef.current[id] = setTimeout(() => {
        new Notification(`⏰ Starting in 10 min: ${session.topic}`, {
          body: `Host: ${session.author} · ${session.time} on ${session.platform}`,
          icon: '/favicon.ico',
          tag: `session-${id}`,
        });
        // play chime via Web Audio API (no file needed)
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.2);
        } catch {}
      }, delay);
    });

    return () => { Object.values(notifTimersRef.current).forEach(clearTimeout); };
  }, [myRegisteredSessions, sessions]);

  useEffect(() => {
    if (showSearchOverlay) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [showSearchOverlay]);

  // Compute cross-section search results
  const globalResults = (() => {
    const q = globalQuery.trim().toLowerCase();
    if (!q) return null;
    const terms = q.split(/[\s,]+/).filter(Boolean);
    const match = (str: string) => terms.some(t => str.toLowerCase().includes(t));

    const resResults = resources.filter(r =>
      match(r.name) || match(r.category || '') || match(r.type || '') ||
      (r.tags || []).some((tag: string) => match(tag))
    ).map(r => ({ section: 'Resources', label: r.name, sub: (r.tags || []).join(', ') || r.category, href: r.link, sessionId: undefined }));

    const sessionResults = sessions.filter(s =>
      match(s.topic) || match(s.tag || '') || match(s.author)
    ).map(s => {
      const sessionMs = new Date(`${s.date}T${s.time}`).getTime();
      const diffDays = Math.round((sessionMs - Date.now()) / 86400000);
      const timeLabel = diffDays === 0 ? 'Today'
        : diffDays > 0 ? `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
        : `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
      return {
        section: 'Sessions',
        label: s.topic,
        sub: `${s.tag || s.platform} · ${timeLabel}`,
        href: null,
        sessionId: s.id,
      };
    });

    const sgResults = studyGroups.filter(g =>
      match(g.title) || match(g.agenda || '')
    ).map(g => ({ section: 'Study Groups', label: g.title, sub: g.agenda, href: null, sessionId: undefined }));

    const suggResults = suggestions.filter(s =>
      match(s.suggestion) || match(s.type || '') || match(s.author)
    ).map(s => ({ section: 'Challenges', label: s.suggestion, sub: `${s.type} · by ${s.author}`, href: null, sessionId: undefined }));

    return [...resResults, ...sessionResults, ...sgResults, ...suggResults];
  })();

  // Sync recording edit fields when selected session changes
  useEffect(() => {
    setEditRecordingLink(selectedSession?.recordingLink || "");
    setEditAiSummary(selectedSession?.aiSummary || "");
    setUploadStatus('idle');
    setUploadProgress(0);
    setShowDeleteRecordingConfirm(false);
    setDeleteRecordingReason('');
  }, [selectedSession?.id]);

  // Fetch resources and requests
  useEffect(() => {
    document.title = "Devops Dojo Hub";
    fetchResources();
    fetchRequests();
  }, [resourcePage, requestPage]);

  // Fetch sessions, study groups, challenge participants from MongoDB
  useEffect(() => {
    const fetchShared = async () => {
      try {
        const [sessRes, sgRes, cpRes] = await Promise.all([
          axios.get<any[]>(`${API_BASE_URL}/sessions`),
          axios.get<any[]>(`${API_BASE_URL}/study-groups`),
          axios.get<{ counts: Record<string, number>; joined: Record<string, boolean> }>(`${API_BASE_URL}/challenge-participants${user?.id ? `?userId=${user.id}` : ''}`),
        ]);
        setSessions(sessRes.data.map((s: any) => ({ ...s, id: s._id })));
        setStudyGroups(sgRes.data.map((g: any) => ({ ...g, id: g._id })));
        setChallengeParticipants(cpRes.data.counts || {});
        setJoinedChallenges(cpRes.data.joined || {});
        // Rebuild my registered sessions from returned data
        const myReg: Record<string, boolean> = {};
        const myGrp: Record<string, boolean> = {};
        if (user?.id) {
          sessRes.data.forEach((s: any) => {
            if ((s.registeredUsers || []).includes(user.id)) myReg[s._id] = true;
          });
          sgRes.data.forEach((g: any) => {
            if ((g.members || []).includes(user.id)) myGrp[g._id] = true;
          });
        }
        setMyRegisteredSessions(myReg);
        setMyJoinedGroups(myGrp);
      } catch (err) {
        console.error('Error fetching shared data:', err);
      }
    };
    fetchShared();
  }, [user?.id]);

  // Fetch resources from the API
  const fetchResources = async () => {
    try {
      const response = await axios.get<ResourceResponse>(
        `${API_BASE_URL}/added-resources?page=${resourcePage}&limit=10`
      );
      setResources(response.data.data);
      setResourceTotal(response.data.total);
      setFilteredResources(response.data.data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    }
  };

  // Fetch requests from the API
  const fetchRequests = async () => {
    try {
      const response = await axios.get<RequestResponse>(
        `${API_BASE_URL}/requests?page=${requestPage}&limit=10`
      );
      setRequests(response.data.data);
      setRequestTotal(response.data.total);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  // Handle Add Tag Function
  const handleAddTag = () => {
    if (newTag && !newResourceTags.includes(newTag)) {
      setNewResourceTags([...newResourceTags, newTag]);
      setNewTag("");
    }
  };

  // Handle Add Resource Function
  const handleAddResource = async () => {
    if (
      newResourceName &&
      newResourceLink &&
      newResourceCategory &&
      newResourceType
    ) {
      try {
        const newResource = {
          name: newResourceName,
          link: newResourceLink,
          category: newResourceCategory,
          type: newResourceType,
          tags: newResourceTags,
          addedBy: newResourceAddedBy,
        };
        await axios.post(
          `${API_BASE_URL}/added-resources`,
          newResource
        );

        // Fetch updated resources
        await fetchResources();

        // Reset form fields
        setNewResourceName("");
        setNewResourceLink("");
        setNewResourceCategory("");
        setNewResourceType("");
        setNewResourceTags([]);
        setNewResourceAddedBy("");
      } catch (error) {
        console.error("Error adding resource:", error);
      }
    }
  };

  // Handle Edit Resource Function
  const handleEditResource = (resource: Resource) => {
    setEditResourceId(resource._id);
    setNewResourceName(resource.name);
    setNewResourceLink(resource.link);
    setNewResourceCategory(resource.category);
    setNewResourceType(resource.type);
    setNewResourceTags(resource.tags);
  };

  // Handle Update Resource Function
  const handleUpdateResource = async () => {
    if (editResourceId) {
      try {
        const updatedResource = {
          name: newResourceName,
          link: newResourceLink,
          category: newResourceCategory,
          type: newResourceType,
          tags: newResourceTags,
        };
        await axios.put(
          `${API_BASE_URL}/added-resources/${editResourceId}`,
          updatedResource
        );

        // Fetch updated resources
        await fetchResources();

        // Reset form fields and edit state
        setEditResourceId(null);
        setNewResourceName("");
        setNewResourceLink("");
        setNewResourceCategory("");
        setNewResourceType("");
        setNewResourceTags([]);
      } catch (error) {
        console.error("Error updating resource:", error);
      }
    }
  };

  // Handle Delete Resource Function
  const handleDeleteResource = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/added-resources/${id}`);

      // Fetch updated resources
      await fetchResources();
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  // Handle Add Request Function
  const handleAddRequest = async () => {
    if (
      newRequestUserName &&
      newRequestResourceName &&
      newRequestResourceType
    ) {
      try {
        const newRequest = {
          userName: newRequestUserName,
          resourceName: newRequestResourceName,
          resourceType: newRequestResourceType,
          notes: newRequestNotes,
          status: "pending",
        };
        const { data } = await axios.post<Request>(
          `${API_BASE_URL}/requests`,
          newRequest
        );
        setRequests([...requests, data]);
        setNewRequestUserName("");
        setNewRequestResourceName("");
        setNewRequestResourceType("");
        setNewRequestNotes("");
        setShowRequestModal(false);
      } catch (error) {
        console.error("Error adding request:", error);
      }
    }
  };

  // Handle Request Status Change Function
  const handleRequestStatusChange = async (id: string, newStatus: string) => {
    try {
      const { data } = await axios.put<Request>(`${API_BASE_URL}/requests/${id}`, {
        status: newStatus,
      });
      setRequests(
        requests.map((request) => (request._id === id ? data : request))
      );
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };

  // Handle Fetch Filtered Resources Function
  const fetchFilteredResources = async (tags: string) => {
    try {
      const response = await axios.get<ResourceResponse>(
        `${API_BASE_URL}/added-resources?tags=${tags}`
      );
      setFilteredResources(response.data.data);
    } catch (error) {
      console.error("Error filtering resources:", error);
    }
  };

  // Handle Search Function
  const handleSearch = () => {
    const tags = searchTags.split(",").map((tag) => tag.trim()); // No lowercase conversion
    if (tags.length === 0 || !tags[0]) {
      setFilteredResources(resources);
    } else {
      const formattedTags = tags.join(","); // Join tags back to a comma-separated string
      fetchFilteredResources(formattedTags);
    }
  };

  // Update the getDaysPending function
  const getDaysPending = (requestDate: string) => {
    if (!requestDate) {
      return "Invalid date";
    }
  
    const requestDateTime = new Date(requestDate).getTime();
    const currentDateTime = new Date().getTime();
    const timeDiff = currentDateTime - requestDateTime;
    const daysPending = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    if (daysPending >= 7) {
      return "Rejected";
    } else {
      return `${daysPending}/7 days`;
    }
  };

  const handleAddSuggestion = () => {
    if (!suggAuthor || !suggText) return;
    const s: Suggestion = { id: Date.now().toString(), author: suggAuthor, suggestion: suggText, type: suggType };
    const updated = [s, ...suggestions];
    setSuggestions(updated);
    localStorage.setItem('dojo_suggestions', JSON.stringify(updated));
    setSuggAuthor(""); setSuggText(""); setSuggType("Resource");
  };

  const handleDeleteSuggestion = (id: string) => {
    const updated = suggestions.filter(s => s.id !== id);
    setSuggestions(updated);
    localStorage.setItem('dojo_suggestions', JSON.stringify(updated));
  };

  const handleCreateStudyGroup = async () => {
    if (!sgTitle.trim()) return;
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const res = await axios.post<any>(`${API_BASE_URL}/study-groups`, {
        title: sgTitle.trim(),
        agenda: sgAgenda.trim(),
        shortCode,
        isActive: true,
        memberCount: 0,
        scheduledAt: sgScheduledAt,
      });
      setStudyGroups(prev => [{ ...res.data, id: res.data._id }, ...prev]);
      setSgTitle(''); setSgAgenda(''); setSgScheduledAt('');
    } catch (err) { console.error('Error creating study group:', err); }
  };

  const handleDeleteStudyGroup = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/study-groups/${id}`);
      setStudyGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) { console.error('Error deleting study group:', err); }
  };

  const handleToggleStudyGroup = async (id: string) => {
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/study-groups/${id}/toggle`);
      setStudyGroups(prev => prev.map(g => g.id === id ? { ...res.data, id: res.data._id } : g));
    } catch (err) { console.error('Error toggling study group:', err); }
  };

  const getJoinLink = (code: string) => `${window.location.origin}/join/${code}`;

  const handleCopyLink = (id: string, code: string) => {
    navigator.clipboard.writeText(getJoinLink(code));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (group: StudyGroup) => {
    const link = getJoinLink(group.shortCode);
    const msg = `🎓 Join my study group: *${group.title}*${group.agenda ? `\n\n📋 Agenda:\n${group.agenda}` : ''}\n\n🔗 Join here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAddSession = async () => {
    if (!sessionAuthor || !sessionTopic || !sessionDate || !sessionTime || !sessionLink) return;
    try {
      const res = await axios.post<any>(`${API_BASE_URL}/sessions`, {
        author: sessionAuthor, topic: sessionTopic,
        date: sessionDate, time: sessionTime,
        tag: sessionTag, meetingLink: sessionLink, platform: sessionPlatform,
        agenda: sessionAgenda, willRecord: sessionWillRecord, recordingLink: '', aiSummary: '',
        hostLinkedIn: sessionLinkedIn, attendeeCount: 0, duration: Number(sessionDuration) || 30,
      });
      setSessions(prev => [...prev, { ...res.data, id: res.data._id }]);
      setSessionAuthor(""); setSessionTopic(""); setSessionDate("");
      setSessionTime(""); setSessionTag(""); setSessionLink("");
      setSessionPlatform('Google Meet'); setSessionAgenda(""); setSessionWillRecord(false); setSessionLinkedIn(""); setSessionDuration("30");
    } catch (err) { console.error('Error adding session:', err); }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error('Error deleting session:', err); }
  };

  const MAX_UPLOAD_MB = 500;
  const handleR2Upload = async (sessionId: string, sessionTopic: string, file: File) => {
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      alert(`File too large. Maximum allowed size is ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    // Find the session to get author and tag
    const session = sessions.find(s => s.id === sessionId);
    const slug = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const topicSlug = slug(sessionTopic);
    const authorSlug = slug(session?.author || 'unknown');
    const tagSlug = slug(session?.tag || 'general');
    const now = new Date();
    const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
    const ext = file.name.split('.').pop() || 'mp4';
    const fileName = `${authorSlug}-${tagSlug}-${topicSlug}-${timestamp}.${ext}`;
    setUploadStatus('uploading');
    setUploadProgress(0);
    try {
      const { data } = await axios.post<{ uploadUrl: string; publicUrl: string }>(`${API_BASE_URL}/upload-url`, { fileName, contentType: file.type, fileSize: file.size });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', data.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.send(file);
      });
      setEditRecordingLink(data.publicUrl);
      setUploadStatus('done');
      setUploadProgress(100);
      // Auto-save to MongoDB immediately after upload
      await handleUpdateRecording(sessionId, data.publicUrl, editAiSummary);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('error');
    }
  };

  const [deleteRecordingReason, setDeleteRecordingReason] = useState('');
  const [showDeleteRecordingConfirm, setShowDeleteRecordingConfirm] = useState(false);

  const handleDeleteRecording = async (id: string) => {
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/sessions/${id}/recording/delete`, { reason: deleteRecordingReason || 'Removed by admin' });
      setSessions(prev => prev.map(s => s.id === id ? { ...res.data, id: res.data._id } : s));
      setSelectedSession(prev => prev?.id === id ? { ...prev, ...res.data, id: res.data._id } : prev);
      setShowDeleteRecordingConfirm(false);
      setDeleteRecordingReason('');
    } catch (err) { console.error('Error deleting recording:', err); }
  };

  const handleUpdateRecording = async (id: string, recordingLink: string, aiSummary: string) => {
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/sessions/${id}/recording`, { recordingLink, aiSummary });
      setSessions(prev => prev.map(s => s.id === id ? { ...res.data, id: res.data._id } : s));
      setSelectedSession(prev => prev?.id === id ? { ...prev, recordingLink, aiSummary } : prev);
    } catch (err) { console.error('Error updating recording:', err); }
  };

  const fetchAllResources = async () => {
    try {
      const response = await axios.get<ResourceResponse>(`${API_BASE_URL}/added-resources?page=1&limit=1000`);
      setFilteredResources(response.data.data);
    } catch (error) { console.error("Error fetching all resources:", error); }
  };

  const handleRegisterSession = async (id: string) => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/sessions/${id}/register`, { userId, action: 'register' });
      setSessions(prev => prev.map(s => s.id === id ? { ...res.data, id: res.data._id } : s));
      setMyRegisteredSessions(prev => ({ ...prev, [id]: true }));
      setSelectedSession(prev => prev?.id === id ? { ...prev, attendeeCount: res.data.attendeeCount } : prev);
      // Request notification permission so we can remind them before the session
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (err) { console.error('Error registering for session:', err); }
  };

  const handleUnregisterSession = async (id: string) => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/sessions/${id}/register`, { userId, action: 'unregister' });
      setSessions(prev => prev.map(s => s.id === id ? { ...res.data, id: res.data._id } : s));
      setMyRegisteredSessions(prev => ({ ...prev, [id]: false }));
      setSelectedSession(prev => prev?.id === id ? { ...prev, attendeeCount: res.data.attendeeCount } : prev);
    } catch (err) { console.error('Error unregistering from session:', err); }
  };

  const handleUpvoteRequest = async (id: string) => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const { data } = await axios.patch<{ upvotes: string[] }>(`${API_BASE_URL}/requests/${id}/upvote`, { userId });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, upvotes: data.upvotes } : r));
    } catch (err) { console.error('Error upvoting request:', err); }
  };

  const GROUP_MEMBER_LIMIT = 15;

  const handleJoinGroup = async (id: string) => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/study-groups/${id}/membership`, { userId, action: 'join' });
      setStudyGroups(prev => prev.map(g => g.id === id ? { ...res.data, id: res.data._id } : g));
      setMyJoinedGroups(prev => ({ ...prev, [id]: true }));
    } catch (err) { console.error('Error joining group:', err); }
  };

  const handleLeaveGroup = async (id: string) => {
    const userId = user?.id;
    if (!userId) return;
    try {
      const res = await axios.patch<any>(`${API_BASE_URL}/study-groups/${id}/membership`, { userId, action: 'leave' });
      setStudyGroups(prev => prev.map(g => g.id === id ? { ...res.data, id: res.data._id } : g));
      setMyJoinedGroups(prev => ({ ...prev, [id]: false }));
    } catch (err) { console.error('Error leaving group:', err); }
  };

  const handleCreateCollection = () => {
    if (!collectionTitle.trim()) return;
    const col: ResourceCollection = {
      id: Date.now().toString(),
      title: collectionTitle.trim(),
      links: addingToCollection ? [addingToCollection] : [],
      createdAt: new Date().toISOString(),
    };
    const updated = [col, ...collections];
    setCollections(updated);
    localStorage.setItem('dojo_collections', JSON.stringify(updated));
    setCollectionTitle('');
    setAddingToCollection(null);
  };

  const handleAddLinkToCollection = (colId: string, link: { name: string; url: string }) => {
    const updated = collections.map(c => c.id === colId
      ? { ...c, links: [...c.links.filter(l => l.url !== link.url), link] }
      : c);
    setCollections(updated);
    localStorage.setItem('dojo_collections', JSON.stringify(updated));
    setAddingToCollection(null);
  };

  const handleDeleteCollection = (id: string) => {
    const updated = collections.filter(c => c.id !== id);
    setCollections(updated);
    localStorage.setItem('dojo_collections', JSON.stringify(updated));
  };

  const platformColor: Record<Session['platform'], string> = {
    'Google Meet': '#00ac47', 'Zoom': '#2D8CFF', 'Teams': '#6264A7', 'Other': '#ff86c2',
  };

  const PlatformIcon = ({ platform, size = 14 }: { platform: Session['platform']; size?: number }) => {
    if (platform === 'Google Meet') return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M22 7.5L17 12l5 4.5V7.5z" fill="#00832d"/>
        <path d="M2 7h11a2 2 0 012 2v6a2 2 0 01-2 2H2a2 2 0 01-2-2V9a2 2 0 012-2z" fill="#0066da"/>
        <path d="M13 12v3a2 2 0 01-2 2H2a2 2 0 01-2-2v-3h13z" fill="#0066da"/>
        <path d="M0 9a2 2 0 012-2h11a2 2 0 012 2v3H0V9z" fill="#2684fc"/>
        <path d="M0 12h15v1H0z" fill="#00ac47" opacity=".5"/>
      </svg>
    );
    if (platform === 'Zoom') return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#2D8CFF"/>
        <path d="M4 8.5h9a1.5 1.5 0 011.5 1.5v5H5A1.5 1.5 0 013.5 13.5v-4A1 1 0 014 8.5z" fill="white"/>
        <path d="M15.5 10.5l5-3v9l-5-3v-3z" fill="white"/>
      </svg>
    );
    if (platform === 'Teams') return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M14 10h4a2 2 0 012 2v4a2 2 0 01-2 2h-4v-8z" fill="#5059C9"/>
        <circle cx="16" cy="7" r="2" fill="#5059C9"/>
        <path d="M10 10H4a2 2 0 00-2 2v4a2 2 0 002 2h6a2 2 0 002-2v-4a2 2 0 00-2-2z" fill="#7B83EB"/>
        <circle cx="7" cy="7" r="2.5" fill="#7B83EB"/>
      </svg>
    );
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ff86c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    );
  };

  // Calendar helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const sessionDates = new Set(sessions.filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  }).map(s => new Date(s.date).getDate()));

  const navItem = (section: Section, Icon: React.FC<any>, label: string) => (
    <button
      onClick={() => setCurrentSection(section)}
      className={`w-full flex items-center gap-4 px-4 py-3 transition-all duration-200 text-left ${
        currentSection === section
          ? 'bg-surface-container-highest text-primary'
          : 'text-slate-500 hover:text-secondary hover:bg-[#1c1c24]'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium tracking-wide">{label}</span>
    </button>
  );

  // Added UI Elements
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-on-background font-body" data-theme={isDarkTheme ? 'dark' : 'light'}>


        {/* ── Sidebar ── */}
        <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-low flex flex-col py-8 z-50">
          <div className="px-8 mb-12">
            <span className="text-xl font-bold text-primary uppercase tracking-widest font-headline">Devops Dojo</span>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] mt-1 uppercase">Hub</p>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItem('dashboard', LayoutGrid, 'Dashboard')}
            {navItem('challenges', Trophy, 'Challenges')}
            {navItem('schedule', Calendar, 'Schedule')}
            {navItem('studygroups', Users, 'Study Groups')}
            {userIsAdmin && navItem('analytics', LineChart, 'Analytics')}
            {navItem('resources', Package, 'Resources')}

            {/* WhatsApp Community Button */}
            <div className="pt-4">
              <BorderGlow color="#22c55e" speed={3} glowBlur={12}>
                <button
                  onClick={() => setShowCommunityModal(true)}
                  className="w-full px-4 py-3 text-left relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #0f1f12 0%, #1a0d2e 100%)',
                    border: '1px solid rgba(34,197,94,0.25)',
                  }}
                >
                  {/* Animated pulse blob */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.15) 0%, rgba(168,85,247,0.1) 60%, transparent 100%)' }} />
                  {/* Shimmer sweep */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', }} />
                  <div className="relative z-10 flex items-center gap-3">
                    {/* WhatsApp icon */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                      <div className="absolute inset-0 rounded-full animate-ping opacity-30"
                        style={{ background: '#22c55e' }} />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.553 4.113 1.519 5.845L.057 23.899a.5.5 0 00.611.611l6.054-1.462A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.93a9.918 9.918 0 01-5.058-1.374l-.363-.215-3.759.908.924-3.758-.236-.374A9.927 9.927 0 012.07 12C2.07 6.508 6.508 2.07 12 2.07S21.93 6.508 21.93 12 17.492 21.93 12 21.93z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-widest leading-none"
                        style={{ background: 'linear-gradient(90deg, #22c55e, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Join Community
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-medium">+200 members · DevOps Dojo</p>
                    </div>
                    <svg className="ml-auto flex-shrink-0 text-slate-600 group-hover:text-green-400 transition-colors" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </button>
              </BorderGlow>
            </div>
          </nav>

          {userIsAdmin && (
            <div className="px-6 mb-8">
              <Link to="/admin" className="block w-full bg-secondary text-on-secondary py-3 text-xs font-extrabold uppercase tracking-widest text-center hover:opacity-90 transition-opacity">
                Admin Panel
              </Link>
            </div>
          )}

          {/* User profile block */}
          <div className="px-4 mx-4 mb-4 p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#2a2a35' }}>
              {user?.imageUrl
                ? <img src={user.imageUrl} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                    {(user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || '?').toUpperCase()}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.fullName || user?.firstName || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.primaryEmailAddress?.emailAddress || ''}
              </p>
            </div>
          </div>

          <div className="px-4 pt-2 space-y-1">
            <button className="w-full flex items-center gap-4 px-4 py-2 text-slate-500 hover:text-secondary hover:bg-[#1c1c24] text-sm">
              <HelpCircle size={16} /><span>Help</span>
            </button>
            <button onClick={() => signOut({ redirectUrl: '/login' })} className="w-full flex items-center gap-4 px-4 py-2 text-slate-500 hover:text-secondary hover:bg-[#1c1c24] text-sm">
              <LogOut size={16} /><span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="ml-64 min-h-screen relative z-10">

          {/* Header */}
          <header className="flex justify-between items-center w-full px-12 h-20 bg-surface-container-low sticky top-0 z-40">
            <h1 className="text-2xl font-black tracking-tighter text-primary font-headline">
              <SplitText text="Devops Dojo Hub" delay={55} />
            </h1>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowSearchOverlay(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-2 bg-surface-container text-slate-400 hover:text-primary hover:bg-surface-container-high transition-colors text-sm"
              >
                <Search size={15} />
                <span>Search</span>
                <span className="ml-2 text-xs text-slate-600 border border-slate-700 px-1.5 py-0.5">⌘K</span>
              </button>
              <div className="flex items-center gap-3 text-slate-400">
                <button className="hover:bg-surface-container-highest p-2 transition-colors"><Bell size={18} /></button>
                <button onClick={() => toggleTheme()} className="hover:bg-surface-container-highest p-2 transition-colors">
                  {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#2a2a35' }}>
                  {user?.imageUrl
                    ? <img src={user.imageUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                        {(user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || '?').toUpperCase()}
                      </div>
                  }
                </div>
              </div>
            </div>
          </header>

          {/* ── Section: Dashboard ── */}
          {currentSection === 'dashboard' && (() => {
            // Chart data
            const byType = Object.entries(resources.reduce((a, r) => { a[r.type || 'Unknown'] = (a[r.type || 'Unknown'] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value }));
            const byCategory = Object.entries(resources.reduce((a, r) => { a[r.category || 'Unknown'] = (a[r.category || 'Unknown'] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value }));
            const allTags = resources.flatMap(r => r.tags || []);
            const byTag = Object.entries(allTags.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {} as Record<string,number>))
              .sort((a,b) => b[1]-a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
            const byStatus = Object.entries(requests.reduce((a, r) => { a[r.status || 'unknown'] = (a[r.status || 'unknown'] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value }));
            const byReqType = Object.entries(requests.reduce((a, r) => { a[r.resourceType || 'Unknown'] = (a[r.resourceType || 'Unknown'] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value }));
            const tooltipStyle = { background: '#19191f', border: 'none', color: '#f8f5fd', fontSize: '11px' };

            return (
            <div className="p-12 space-y-10">

              {/* ── 4 Stat Cards ── */}
              <section className="grid grid-cols-2 xl:grid-cols-4 gap-5">
                {[
                  { label: 'Total Resources', value: resources.length, accent: '#ff86c2', sub: 'Uploaded materials' },
                  { label: 'Active Requests', value: requests.length, accent: '#bf81ff', sub: 'Community requests' },
                  { label: 'Scheduled Sessions', value: sessions.length, accent: '#4ade80', sub: 'Tech & study sessions' },
                  { label: 'Suggestions', value: suggestions.length, accent: '#facc15', sub: 'Community ideas' },
                ].map(card => (
                  <BorderGlow key={card.label} color={card.accent} speed={5} glowBlur={10}>
                    <div className="bg-surface-container-low p-7 flex flex-col gap-3 relative overflow-hidden group" style={{ borderLeft: `4px solid ${card.accent}` }}>
                      <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] pointer-events-none transition-all group-hover:opacity-100 opacity-60" style={{ background: card.accent + '30' }}></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</span>
                      <span className="text-5xl font-black font-headline text-on-surface leading-none">{card.value}</span>
                      <span className="text-[11px] font-medium" style={{ color: card.accent }}>{card.sub}</span>
                    </div>
                  </BorderGlow>
                ))}
              </section>

              {/* ── Charts Row 1: 3 gradient bar charts ── */}
              <section className="grid grid-cols-12 gap-6">
                {/* Resources by Type */}
                <div className="col-span-12 xl:col-span-4 bg-surface-container p-7 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resources Uploaded</p>
                    <h3 className="text-lg font-black font-headline text-on-surface mt-1">By Type</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byType} barSize={28} barGap={8}>
                      <defs>
                        {GRADIENT_PAIRS.map(([top, bot], i) => (
                          <linearGradient key={i} id={`gt${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={top} stopOpacity={1}/>
                            <stop offset="100%" stopColor={bot} stopOpacity={0.6}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <XAxis dataKey="name" tick={{ fill: '#76747b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#76747b', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff06' }} />
                      <Bar dataKey="value" radius={0}>
                        {byType.map((_, i) => <Cell key={i} fill={`url(#gt${i % GRADIENT_PAIRS.length})`} style={{ filter: `drop-shadow(0 0 6px ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]}60)` }} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Resources by Category — donut */}
                <div className="col-span-12 xl:col-span-4 bg-surface-container p-7 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resources Uploaded</p>
                    <h3 className="text-lg font-black font-headline text-on-surface mt-1">By Category</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <defs>
                        {GRADIENT_PAIRS.map(([top, bot], i) => (
                          <radialGradient key={i} id={`gp${i}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={top} stopOpacity={1}/>
                            <stop offset="100%" stopColor={bot} stopOpacity={0.8}/>
                          </radialGradient>
                        ))}
                      </defs>
                      <Pie data={byCategory.length ? byCategory : [{name:'None',value:1}]} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={72} innerRadius={38} paddingAngle={3}>
                        {(byCategory.length ? byCategory : [{name:'None',value:1}]).map((_, i) => (
                          <Cell key={i} fill={`url(#gp${i % GRADIENT_PAIRS.length})`}
                            style={{ filter: `drop-shadow(0 0 4px ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]}80)` }} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#76747b' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Requests by Status */}
                <div className="col-span-12 xl:col-span-4 bg-surface-container p-7 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested Resources</p>
                    <h3 className="text-lg font-black font-headline text-on-surface mt-1">By Status</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byStatus} barSize={36}>
                      <defs>
                        <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity={1}/><stop offset="100%" stopColor="#003d1a" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#facc15" stopOpacity={1}/><stop offset="100%" stopColor="#3d2e00" stopOpacity={0.6}/>
                        </linearGradient>
                        <linearGradient id="gRejected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff6e84" stopOpacity={1}/><stop offset="100%" stopColor="#49001a" stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fill: '#76747b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#76747b', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff06' }} />
                      <Bar dataKey="value" radius={0}>
                        {byStatus.map(entry => {
                          const g = entry.name==='approved'?'gApproved':entry.name==='rejected'?'gRejected':'gPending';
                          const c = entry.name==='approved'?'#4ade80':entry.name==='rejected'?'#ff6e84':'#facc15';
                          return <Cell key={entry.name} fill={`url(#${g})`} style={{ filter: `drop-shadow(0 0 8px ${c}60)` }} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* ── Featured Chart: Top Tags (full-width gradient style like reference) ── */}
              <section className="bg-surface-container p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resources</p>
                    <h3 className="text-2xl font-black font-headline text-on-surface mt-1">Top Tags</h3>
                    <div className="flex items-center gap-6 mt-3">
                      {CHART_COLORS.slice(0,4).map((c,i) => (
                        <span key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="w-2 h-2 inline-block" style={{ background: c }}></span>
                          Tag {i+1}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black font-headline text-on-surface">{byTag.reduce((s,t)=>s+t.value,0)}</p>
                    <p className="text-xs text-slate-500 mt-1">Total tagged resources</p>
                  </div>
                </div>
                {byTag.length === 0
                  ? <p className="text-xs text-slate-500 py-8 text-center">No tags on resources yet.</p>
                  : <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={byTag} layout="vertical" barSize={16} barGap={4}>
                        <defs>
                          {byTag.map((_, i) => (
                            <linearGradient key={i} id={`gh${i}`} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][1]} stopOpacity={0.5}/>
                              <stop offset="100%" stopColor={GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]} stopOpacity={1}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <XAxis type="number" tick={{ fill: '#76747b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#acaab1', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff06' }} />
                        <Bar dataKey="value" radius={0}>
                          {byTag.map((_, i) => (
                            <Cell key={i} fill={`url(#gh${i})`}
                              style={{ filter: `drop-shadow(0 0 6px ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]}50)` }} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </section>

              {/* ── Requested Resources by Type ── */}
              <section className="bg-surface-container p-8 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested Resources</p>
                  <h3 className="text-2xl font-black font-headline text-on-surface mt-1">By Type</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byReqType.length ? byReqType : [{name:'None',value:0}]} barSize={40} barGap={12}>
                    <defs>
                      {GRADIENT_PAIRS.map(([top, bot], i) => (
                        <linearGradient key={i} id={`gr${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={top} stopOpacity={1}/>
                          <stop offset="100%" stopColor={bot} stopOpacity={0.4}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: '#76747b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#76747b', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff06' }} />
                    <Bar dataKey="value" radius={0}>
                      {(byReqType.length ? byReqType : [{name:'None',value:0}]).map((_, i) => (
                        <Cell key={i} fill={`url(#gr${i % GRADIENT_PAIRS.length})`}
                          style={{ filter: `drop-shadow(0 0 10px ${GRADIENT_PAIRS[i % GRADIENT_PAIRS.length][0]}70)` }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>

              {/* ── Suggestions ── */}
              <section className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Suggestions</h3>
                    <p className="text-sm text-slate-500">Community ideas & feature requests</p>
                  </div>
                </div>

                {/* Add suggestion form */}
                <div className="bg-surface-container p-8">
                  <h4 className="text-sm font-bold font-headline text-on-surface mb-6 flex items-center gap-2">
                    <Lightbulb size={16} className="text-primary" /> Submit a Suggestion
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Your Name</label>
                      <input type="text" placeholder="e.g. Alex Rivera" value={suggAuthor} onChange={e => setSuggAuthor(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Type</label>
                      <select value={suggType} onChange={e => setSuggType(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface outline-none transition-colors">
                        <option>Resource</option>
                        <option>Feature</option>
                        <option>Challenge</option>
                        <option>Session Topic</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Suggestion</label>
                      <input type="text" placeholder="e.g. Add Terraform module examples" value={suggText} onChange={e => setSuggText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSuggestion()}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                  </div>
                  <button onClick={handleAddSuggestion}
                    className="mt-6 bg-primary text-on-primary px-8 py-4 text-xs font-black uppercase tracking-[0.2em] neon-glow-primary transition-all">
                    Submit
                  </button>
                </div>

                {/* Suggestion cards */}
                {suggestions.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {suggestions.map(s => (
                      <div key={s.id} className="bg-surface-container-high p-6 flex flex-col gap-3 group">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1"
                            style={{ color: CHART_COLORS[['Resource','Feature','Challenge','Session Topic','Other'].indexOf(s.type) % CHART_COLORS.length],
                                     background: CHART_COLORS[['Resource','Feature','Challenge','Session Topic','Other'].indexOf(s.type) % CHART_COLORS.length] + '20' }}>
                            {s.type}
                          </span>
                          <button onClick={() => handleDeleteSuggestion(s.id)} className="text-slate-600 hover:text-red-400 transition-colors">×</button>
                        </div>
                        <p className="text-sm text-on-surface leading-relaxed flex-1">"{s.suggestion}"</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">— {s.author}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
            );
          })()}

          {/* ── Section: Challenges ── */}
          {currentSection === 'challenges' && (() => {
            const liveChallenge = CHALLENGES.find(c => getChallengeStatus(c).live && c.weekly);
            return (
              <div className="p-12 space-y-10">
                <style>{`
                  @keyframes livePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
                  @keyframes signalRing { 0% { transform:scale(1); opacity:0.7; } 100% { transform:scale(2.2); opacity:0; } }
                  .live-dot { animation: livePulse 1.4s ease-in-out infinite; }
                  .signal-ring { animation: signalRing 1.4s ease-out infinite; }
                `}</style>

                {/* Live Weekly Featured Banner */}
                {liveChallenge && (() => {
                  const st = getChallengeStatus(liveChallenge);
                  const slots = challengeParticipants[liveChallenge.id] || 0;
                  const isFull = slots >= CHALLENGE_MAX_SLOTS;
                  const isJoined = !!joinedChallenges[liveChallenge.id];
                  return (
                    <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #a21caf 35%, #db2777 70%, #f472b6 100%)', minHeight: '120px' }}>
                      {/* Subtle noise/depth overlay */}
                      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 100%)' }} />
                      {/* Pulsing signal dot top-left */}
                      <div className="absolute top-5 left-5 flex items-center justify-center">
                        <span className="signal-ring absolute w-5 h-5 rounded-full border-2 border-white/60" />
                        <span className="live-dot w-2.5 h-2.5 rounded-full bg-white" style={{ boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} />
                      </div>
                      <div className="relative z-10 flex items-center justify-between gap-6 px-8 py-7 pl-14">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/70 mb-1">This Week's Featured</p>
                          <h3 className="text-2xl font-black text-white leading-tight">{liveChallenge.title}</h3>
                          <p className="text-xs text-white/70 mt-1.5 max-w-lg">{liveChallenge.desc}</p>
                          <p className="text-[10px] text-white/50 mt-2 font-bold uppercase tracking-widest">{st.label} · {slots}/{CHALLENGE_MAX_SLOTS} joined</p>
                        </div>
                        <button
                          disabled={isFull || isJoined}
                          onClick={() => handleJoinChallenge(liveChallenge.id)}
                          className="flex-shrink-0 text-xs font-black uppercase tracking-widest px-8 py-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                          style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                          onMouseEnter={e => { if (!isFull && !isJoined) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.30)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'; }}>
                          {isJoined ? '✓ Joined' : isFull ? 'Full' : 'Join Now'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <h2 className="text-4xl font-black font-headline text-on-surface" style={{ letterSpacing: '-0.02em' }}><SplitText text="Challenges" delay={60} /></h2>
                  <p className="text-slate-500 mt-2">Weekly & community learning sprints · max {CHALLENGE_MAX_SLOTS} participants each</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {CHALLENGES.map((c) => {
                    const st = getChallengeStatus(c);
                    const slots = challengeParticipants[c.id] || 0;
                    const pct = (slots / CHALLENGE_MAX_SLOTS) * 100;
                    const isFull = slots >= CHALLENGE_MAX_SLOTS;
                    const isJoined = !!joinedChallenges[c.id];
                    return (
                      <div key={c.id} className="flex flex-col gap-4 group transition-all duration-300 relative overflow-hidden"
                        style={{ borderLeft: `4px solid ${st.live ? c.color : '#48474d'}`, background: `linear-gradient(135deg, ${c.color}${st.live ? '18' : '08'} 0%, #19191f 100%)` }}>
                        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-15 group-hover:opacity-30 transition-opacity pointer-events-none" style={{ background: c.color }} />

                        <div className="p-6 pb-0 relative z-10">
                          {/* Header row: tag left, live badge OR days right — no overlap */}
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.color }}>{c.tag}</span>
                            {st.live ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex items-center justify-center w-4 h-4">
                                  <span className="signal-ring absolute w-3 h-3 rounded-full border" style={{ borderColor: c.color }} />
                                  <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                                  style={{ background: 'linear-gradient(135deg, #ff86c2, #bf81ff)', color: '#0e0e13', borderRadius: '2px' }}>
                                  Live
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.days}d</span>
                            )}
                          </div>
                          <h3 className="text-lg font-black font-headline text-on-surface mb-2">{c.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                        </div>

                        <div className="px-6 relative z-10 space-y-3">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold uppercase tracking-widest" style={{ color: st.live ? c.color : '#64748b' }}>{st.label}</span>
                            <span className="font-bold text-slate-400">{slots} / {CHALLENGE_MAX_SLOTS} joined</span>
                          </div>
                          <div className="h-1.5 bg-surface-container-high w-full">
                            <div className="h-1.5 transition-all duration-500"
                              style={{ width: `${pct}%`, background: isFull ? '#ff6e84' : c.color, boxShadow: st.live ? `0 0 8px ${c.color}80` : 'none' }} />
                          </div>
                          {isFull && <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Challenge full · waitlist open</p>}
                        </div>

                        <div className="px-6 pb-6 relative z-10 flex gap-2">
                          <button
                            onClick={() => setSelectedChallenge(c.id)}
                            className="flex-1 text-xs font-bold uppercase tracking-widest py-3 transition-all"
                            style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                            View Details
                          </button>
                          <button
                            disabled={isFull && !isJoined}
                            onClick={() => handleJoinChallenge(c.id)}
                            className="flex-1 text-xs font-bold uppercase tracking-widest py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: isJoined ? `${c.color}30` : `${c.color}18`, color: c.color, border: `1px solid ${c.color}40` }}
                            onMouseEnter={e => { if (!isJoined && !isFull) { (e.currentTarget as HTMLButtonElement).style.background = c.color; (e.currentTarget as HTMLButtonElement).style.color = '#0e0e13'; } }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isJoined ? `${c.color}30` : `${c.color}18`; (e.currentTarget as HTMLButtonElement).style.color = c.color; }}>
                            {isJoined ? '✓ Joined' : isFull ? 'Full' : 'Join →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Challenge Detail Modal ── */}
          {selectedChallenge && (() => {
            const c = CHALLENGES.find(ch => ch.id === selectedChallenge)!;
            const st = getChallengeStatus(c);
            const slots = challengeParticipants[c.id] || 0;
            const isFull = slots >= CHALLENGE_MAX_SLOTS;
            const isJoined = !!joinedChallenges[c.id];
            return (
              <div
                className="fixed inset-0 z-[200] flex items-start justify-center px-4 py-10 overflow-y-auto"
                style={{ background: 'rgba(7,7,10,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                onClick={e => { if (e.target === e.currentTarget) setSelectedChallenge(null); }}>
                <div className="w-full max-w-2xl relative" style={{ background: '#111116', border: '1px solid #1e1e28' }}>
                  {/* Accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: c.color }} />

                  {/* Modal header */}
                  <div className="px-8 py-7 border-b border-[#1a1a24] relative">
                    <button
                      onClick={() => setSelectedChallenge(null)}
                      className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                      style={{ background: 'transparent', border: '1px solid #2e2e3e' }}>
                      ×
                    </button>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: c.color }}>{c.tag}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.days} DAYS</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.02em' }}>{c.title}</h2>
                    <p className="text-sm italic" style={{ color: c.color }}>{c.tagline}</p>
                    {st.live && (
                      <div className="flex items-center gap-2 mt-3">
                        <div className="relative flex items-center justify-center w-3 h-3">
                          <span className="signal-ring absolute w-3 h-3 rounded-full border" style={{ borderColor: c.color }} />
                          <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                          style={{ background: 'linear-gradient(135deg, #ff86c2, #bf81ff)', color: '#0e0e13', borderRadius: '2px' }}>
                          Live Now
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{st.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Modal body */}
                  <div className="px-8 py-7 space-y-7">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4" style={{ background: '#0d0d0f', border: '1px solid #1a1a24' }}>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-1.5">Difficulty</p>
                        <p className="text-sm font-bold" style={{ color: c.difficultyColor }}>{c.difficulty}</p>
                      </div>
                      <div className="p-4" style={{ background: '#0d0d0f', border: '1px solid #1a1a24' }}>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-1.5">Duration</p>
                        <p className="text-sm font-bold text-white">{c.days} Days</p>
                      </div>
                      <div className="col-span-2 p-4" style={{ background: '#0d0d0f', border: '1px solid #1a1a24' }}>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-1.5">What You'll Build</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{c.whatYouBuild}</p>
                      </div>
                    </div>

                    {/* Prerequisites */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-3">Prerequisites</p>
                      <div className="space-y-1.5">
                        {c.prerequisites.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-2" style={{ borderBottom: '1px solid #1a1a24' }}>
                            <span style={{ color: c.color }}>—</span> {p}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #1a1a24' }} />

                    {/* Timeline */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-3">Challenge Breakdown</p>
                      <div className="space-y-3">
                        {c.topics.map((t, i) => (
                          <div key={i} className="flex gap-4">
                            <span className="text-[10px] text-slate-600 w-16 flex-shrink-0 pt-0.5 font-mono">{t.day}</span>
                            <div style={{ borderLeft: '1px solid #1e1e28', paddingLeft: '16px', flex: 1 }}>
                              <p className="text-xs font-bold text-white mb-0.5">{t.title}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #1a1a24' }} />

                    {/* Skills */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-3">Skills You'll Gain</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.skills.map((s, i) => (
                          <span key={i} className="text-[10px] text-slate-400 px-2.5 py-1" style={{ border: '1px solid #1e1e28' }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* Outcome */}
                    <div className="p-4" style={{ background: `${c.color}0d`, border: `1px solid ${c.color}33` }}>
                      <p className="text-[10px] uppercase tracking-[0.15em] mb-1.5 font-bold" style={{ color: c.color }}>Outcome</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{c.outcome}</p>
                    </div>

                    {/* Slot bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold uppercase tracking-widest text-slate-500">Participants</span>
                        <span className="font-bold" style={{ color: c.color }}>{slots} / {CHALLENGE_MAX_SLOTS}</span>
                      </div>
                      <div className="h-1.5 w-full" style={{ background: '#1e1e28' }}>
                        <div className="h-1.5 transition-all duration-500"
                          style={{ width: `${(slots / CHALLENGE_MAX_SLOTS) * 100}%`, background: isFull ? '#ff6e84' : c.color, boxShadow: st.live ? `0 0 8px ${c.color}80` : 'none' }} />
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      disabled={isFull && !isJoined}
                      onClick={() => { handleJoinChallenge(c.id); if (!isFull && !isJoined) setSelectedChallenge(null); }}
                      className="w-full text-xs font-black uppercase tracking-[0.2em] py-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: isJoined ? `${c.color}25` : c.color, color: isJoined ? c.color : '#0d0d0f', border: isJoined ? `1px solid ${c.color}50` : 'none' }}>
                      {isJoined ? '✓ Already Joined' : isFull ? 'Challenge Full' : 'Join Challenge'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Section: Study Groups ── */}
          {currentSection === 'studygroups' && (() => {
            const active = studyGroups.filter(g => g.isActive);
            const inactive = studyGroups.filter(g => !g.isActive);

            const GroupCard = ({ g }: { g: StudyGroup }) => {
              const link = getJoinLink(g.shortCode);
              const isJoined = myJoinedGroups[g.id];
              const groupTagColor = getTagColor(g.title + ' ' + g.agenda);
              const now = new Date();
              const scheduledDate = g.scheduledAt ? new Date(g.scheduledAt) : null;
              const minsUntil = scheduledDate ? Math.round((scheduledDate.getTime() - now.getTime()) / 60000) : null;
              const timeLabel = minsUntil === null ? null
                : minsUntil < 0 ? 'Session ended'
                : minsUntil < 60 ? `Starts in ${minsUntil}m`
                : minsUntil < 1440 ? `Starts in ${Math.round(minsUntil / 60)}h`
                : scheduledDate!.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' at ' + scheduledDate!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div className="bg-surface-container p-6 flex flex-col gap-4 relative overflow-hidden"
                  style={{ borderLeft: `3px solid ${g.isActive ? groupTagColor : '#48474d'}` }}>
                  <div className="absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-15 pointer-events-none"
                    style={{ background: g.isActive ? groupTagColor : '#48474d' }}></div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 ${g.isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-500 bg-white/5'}`}>
                          {g.isActive ? '● Active' : '○ Inactive'}
                        </span>
                        {timeLabel && (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 ${minsUntil !== null && minsUntil < 60 && minsUntil >= 0 ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 bg-white/5'}`}>
                            🕐 {timeLabel}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black font-headline text-on-surface truncate">{g.title}</h4>
                      {g.agenda && <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{g.agenda}</p>}
                    </div>
                    <button onClick={() => handleDeleteStudyGroup(g.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none">×</button>
                  </div>

                  {/* Members + join/leave */}
                  {(() => {
                    const isFull = (g.memberCount || 0) >= GROUP_MEMBER_LIMIT;
                    return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-slate-500" />
                        <span className="text-xs font-bold text-on-surface">{g.memberCount || 0}</span>
                        <span className="text-[10px] text-slate-500">/ {GROUP_MEMBER_LIMIT}</span>
                        {isFull && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 text-red-400 bg-red-400/10">Full</span>}
                      </div>
                      <button
                        disabled={!isJoined && isFull}
                        onClick={() => isJoined ? handleLeaveGroup(g.id) : handleJoinGroup(g.id)}
                        className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={isJoined
                          ? { color: '#f87171', background: '#f8717120', border: '1px solid #f8717130' }
                          : isFull
                            ? { color: '#64748b', background: '#1e293b', border: '1px solid #334155' }
                            : { color: '#4ade80', background: '#4ade8015', border: '1px solid #4ade8030' }}>
                        {isJoined ? '✕ Leave' : isFull ? 'Full' : '+ Join'}
                      </button>
                    </div>
                    );
                  })()}

                  <div className="bg-surface-container-high px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{link}</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleToggleStudyGroup(g.id)}
                      className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border border-outline-variant hover:border-secondary text-slate-400 hover:text-secondary">
                      {g.isActive ? 'Mark Inactive' : 'Mark Active'}
                    </button>
                    <button onClick={() => handleCopyLink(g.id, g.shortCode)}
                      className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border border-outline-variant hover:border-primary text-slate-400 hover:text-primary">
                      {copiedId === g.id ? '✓ Copied!' : 'Copy Link'}
                    </button>
                    <button onClick={() => handleWhatsAppShare(g)}
                      className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all text-on-surface"
                      style={{ background: '#25D366' }}>
                      WhatsApp
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">
                    Code: <span className="text-secondary font-bold">{g.shortCode}</span>
                    {' · '}{new Date(g.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            };

            return (
              <div className="p-12 space-y-10">
                <div>
                  <h2 className="text-4xl font-black font-headline text-on-surface" style={{ letterSpacing: '-0.02em' }}><SplitText text="Study Groups" delay={60} /></h2>
                  <p className="text-slate-500 mt-2">Create a group, share the link — collaborate anywhere</p>
                </div>

                {/* Create form */}
                <div className="bg-surface-container p-8 space-y-5">
                  <h3 className="text-sm font-bold font-headline text-on-surface flex items-center gap-2">
                    <Users size={16} className="text-primary" /> Create a Study Group
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Group Title</label>
                      <input type="text" placeholder="e.g. K8s Study Circle" value={sgTitle} onChange={e => setSgTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateStudyGroup()}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Agenda (optional)</label>
                      <input type="text" placeholder="e.g. Cover pods, services, ingress" value={sgAgenda} onChange={e => setSgAgenda(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateStudyGroup()}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Scheduled Date & Time</label>
                      <input type="datetime-local" value={sgScheduledAt} onChange={e => setSgScheduledAt(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface outline-none transition-colors [color-scheme:dark]" />
                    </div>
                  </div>
                  <button onClick={handleCreateStudyGroup}
                    className="bg-primary text-on-primary px-8 py-3 text-xs font-black uppercase tracking-[0.2em] neon-glow-primary transition-all">
                    Create Study Group
                  </button>
                </div>

                {studyGroups.length === 0 && (
                  <div className="bg-surface-container p-16 text-center">
                    <Users size={40} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-sm text-slate-500">No study groups yet. Create one above!</p>
                  </div>
                )}

                {/* Active groups */}
                {active.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-green-400 inline-block"></span>
                      <h3 className="text-lg font-black font-headline text-on-surface">Active Groups</h3>
                      <span className="text-xs text-slate-500 font-bold">{active.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {active.map(g => <GroupCard key={g.id} g={g} />)}
                    </div>
                  </div>
                )}

                {/* Inactive groups */}
                {inactive.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-slate-600 inline-block"></span>
                      <h3 className="text-lg font-black font-headline text-slate-500">Inactive Groups</h3>
                      <span className="text-xs text-slate-600 font-bold">{inactive.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                      {inactive.map(g => <GroupCard key={g.id} g={g} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}


          {/* ── Section: Schedule ── */}
          {currentSection === 'schedule' && (
            <div className="p-12 space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-4xl font-black font-headline text-on-surface" style={{ letterSpacing: '-0.02em' }}><SplitText text="Schedule" delay={60} /></h2>
                  <p className="text-slate-500 mt-2">Book or browse community tech sessions & meetings</p>
                </div>
                <button onClick={() => setSelectedSession(null)}
                  className="text-xs font-bold text-primary uppercase tracking-widest hover:underline underline-offset-4">
                  + New Session
                </button>
              </div>

              {/* ── Google Calendar style grid ── */}
              <div className="bg-surface-container overflow-hidden">
                {/* Calendar header */}
                <div className="flex items-center justify-between px-6 py-4 bg-surface-container-high">
                  <button onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                    className="text-slate-400 hover:text-primary transition-colors px-3 py-1 text-lg font-bold">‹</button>
                  <span className="text-base font-black font-headline text-on-surface uppercase tracking-widest">
                    {monthNames[calMonth]} {calYear}
                  </span>
                  <button onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                    className="text-slate-400 hover:text-primary transition-colors px-3 py-1 text-lg font-bold">›</button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 bg-surface-container-high">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest py-3 border-t border-white/5">{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[100px] bg-surface-container-lowest/30 border-r border-b border-white/5" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const today = new Date();
                    const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                    const daySessions = sessions.filter(s => {
                      const d = new Date(s.date);
                      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
                    });
                    return (
                      <div key={day} className="min-h-[100px] p-1.5 border-r border-b border-white/5 bg-surface-container hover:bg-surface-container-high transition-colors">
                        <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 mb-1
                          ${isToday ? 'bg-primary text-on-primary font-black' : 'text-slate-400'}`}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {daySessions.slice(0, 3).map(s => {
                            const tc = s.tag ? getTagColor(s.tag) : platformColor[s.platform];
                            return (
                            <button key={s.id} onClick={() => setSelectedSession(s)}
                              className="w-full text-left px-1.5 py-0.5 text-[10px] font-semibold truncate transition-opacity hover:opacity-80"
                              style={{ background: tc + '30', color: tc, borderLeft: `2px solid ${tc}` }}>
                              {s.time} {s.topic}
                            </button>
                            );
                          })}
                          {daySessions.length > 3 && (
                            <span className="text-[9px] text-slate-500 px-1">+{daySessions.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Bottom: Book form (left) + Agenda panel (right) ── */}
              <div className="grid grid-cols-12 gap-8">

                {/* Book a Session form */}
                <div className="col-span-12 xl:col-span-7 bg-surface-container p-8">
                  <h3 className="text-xl font-bold font-headline text-on-surface mb-8 flex items-center gap-3">
                    <Users size={18} className="text-primary" /> Book a Session
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Author / Host</label>
                      <input type="text" placeholder="Your name" value={sessionAuthor} onChange={e => setSessionAuthor(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Topic</label>
                      <input type="text" placeholder="e.g. Kubernetes Networking" value={sessionTopic} onChange={e => setSessionTopic(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Date</label>
                      <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface outline-none transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Time</label>
                      <input type="time" value={sessionTime} onChange={e => setSessionTime(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface outline-none transition-colors [color-scheme:dark]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tag</label>
                      <input type="text" placeholder="e.g. DevOps, Cloud" value={sessionTag} onChange={e => setSessionTag(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Platform</label>
                      <div className="flex items-center gap-2 border-b border-outline-variant focus-within:border-primary pb-0.5">
                        <PlatformIcon platform={sessionPlatform} size={16} />
                        <select value={sessionPlatform} onChange={e => setSessionPlatform(e.target.value as Session['platform'])}
                          className="flex-1 bg-transparent py-2.5 text-sm text-on-surface outline-none transition-colors">
                          <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Google Meet</option>
                          <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Zoom</option>
                          <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Teams</option>
                          <option style={{ background: '#1e1e2e', color: '#e2e8f0' }}>Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                        Duration (mins)
                        {Number(sessionDuration) > 30 && (
                          <span className="ml-2 text-[9px] font-black text-orange-400 bg-orange-400/10 px-1.5 py-0.5 normal-case tracking-normal">⚠ Keep sessions to 30 min</span>
                        )}
                      </label>
                      <input type="number" min="5" max="180" value={sessionDuration} onChange={e => setSessionDuration(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Meeting Link</label>
                      <input type="url" placeholder="https://meet.google.com/..." value={sessionLink} onChange={e => setSessionLink(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Host LinkedIn (optional)</label>
                      <input type="url" placeholder="https://linkedin.com/in/..." value={sessionLinkedIn} onChange={e => setSessionLinkedIn(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Session Agenda</label>
                      <textarea rows={3} placeholder="e.g. 1. Intro to K8s networking  2. CNI plugins overview  3. Live demo with Cilium..." value={sessionAgenda} onChange={e => setSessionAgenda(e.target.value)}
                        className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-2.5 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors resize-none" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Will this session be recorded?</label>
                      <div className="flex gap-8 py-1">
                        {[{ val: true, label: 'Yes — Recording Enabled' }, { val: false, label: 'No' }].map(opt => (
                          <label key={String(opt.val)} className="flex items-center gap-2.5 cursor-pointer group">
                            <span className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${sessionWillRecord === opt.val ? 'border-primary bg-primary' : 'border-outline-variant bg-transparent'}`}
                              onClick={() => setSessionWillRecord(opt.val)}>
                              {sessionWillRecord === opt.val && <span className="w-2 h-2 bg-on-primary block"></span>}
                            </span>
                            <span className={`text-sm transition-colors ${sessionWillRecord === opt.val ? 'text-on-surface font-bold' : 'text-slate-500 group-hover:text-slate-300'}`}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={handleAddSession}
                    className="mt-6 bg-primary text-on-primary px-8 py-4 text-xs font-black uppercase tracking-[0.2em] neon-glow-primary transition-all">
                    Schedule Session
                  </button>
                </div>

                {/* Session Agenda panel */}
                <div className="col-span-12 xl:col-span-5">
                  {selectedSession ? (() => {
                    const sessionColor = selectedSession.tag ? getTagColor(selectedSession.tag) : platformColor[selectedSession.platform];
                    return (
                    <div className="bg-surface-container h-full p-8 space-y-6 relative" style={{ borderLeft: `4px solid ${sessionColor}` }}>
                      {/* Ambient glow */}
                      <div className="absolute top-0 right-0 w-40 h-40 blur-[80px] opacity-20 pointer-events-none"
                        style={{ background: sessionColor }}></div>

                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                            style={{ color: sessionColor }}>Session Agenda</p>
                          <h3 className="text-2xl font-black font-headline text-on-surface" style={{ letterSpacing: '-0.01em' }}>
                            {selectedSession.topic}
                          </h3>
                          {(selectedSession.duration || 30) > 30 && (
                            <span className="inline-block mt-2 text-[9px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 uppercase tracking-widest">⚠ {selectedSession.duration} min session</span>
                          )}
                        </div>
                        <button onClick={() => setSelectedSession(null)} className="text-slate-500 hover:text-on-surface transition-colors text-xl leading-none">×</button>
                      </div>

                      {/* Meta row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-high p-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Host</p>
                          <p className="text-sm font-bold text-on-surface">{selectedSession.author}</p>
                          {selectedSession.hostLinkedIn && (
                            <a href={selectedSession.hostLinkedIn} target="_blank" rel="noreferrer"
                              className="text-[10px] font-bold mt-1 inline-flex items-center gap-1 hover:underline underline-offset-2"
                              style={{ color: '#0A66C2' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                              LinkedIn
                            </a>
                          )}
                        </div>
                        <div className="bg-surface-container-high p-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date & Time</p>
                          <p className="text-sm font-bold text-on-surface mb-1">{selectedSession.date}</p>
                          <p className="text-xs text-slate-400">
                            {(() => {
                              const sessionDateTime = new Date(`${selectedSession.date}T${selectedSession.time}:00`);
                              const hostTimezone = selectedSession.timezone || 'UTC';
                              const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                              
                              if (hostTimezone !== userTimezone && hostTimezone !== 'UTC') {
                                const options: Intl.DateTimeFormatOptions = {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: userTimezone,
                                  timeZoneName: 'short'
                                };
                                const convertedTime = sessionDateTime.toLocaleString('en-US', options);
                                const timePart = convertedTime.split(', ')[1] || convertedTime;
                                return (
                                  <span>
                                    <span className="text-slate-500 line-through mr-2">{selectedSession.time}</span>
                                    <span className="text-green-400">{timePart}</span>
                                  </span>
                                );
                              }
                              return selectedSession.time;
                            })()}
                          </p>
                          {selectedSession.timezone && selectedSession.timezone !== 'UTC' && (
                            <p className="text-[9px] text-slate-500 mt-1">
                              Host: {selectedSession.timezone}
                            </p>
                          )}
                        </div>
                        <div className="bg-surface-container-high p-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Platform</p>
                          <span className="text-xs font-bold uppercase px-2 py-1 inline-flex items-center gap-1.5"
                            style={{ color: sessionColor, background: sessionColor + '25' }}>
                            <PlatformIcon platform={selectedSession.platform} size={13} />
                            {selectedSession.platform}
                          </span>
                        </div>
                        <div className="bg-surface-container-high p-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Attendees</p>
                          <p className="text-2xl font-black text-on-surface leading-none">{selectedSession.attendeeCount || 0}</p>
                          <button
                            onClick={() => myRegisteredSessions[selectedSession.id]
                              ? handleUnregisterSession(selectedSession.id)
                              : handleRegisterSession(selectedSession.id)}
                            className="mt-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 transition-all"
                            style={myRegisteredSessions[selectedSession.id]
                              ? { color: '#f87171', background: '#f8717120' }
                              : { color: '#4ade80', background: '#4ade8020' }}>
                            {myRegisteredSessions[selectedSession.id] ? '✕ Unregister' : '✓ Register'}
                          </button>
                        </div>
                        {selectedSession.tag && (
                          <div className="bg-surface-container-high p-4 col-span-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tag</p>
                            <span className="text-xs font-bold uppercase px-2 py-1"
                              style={{ color: sessionColor, background: sessionColor + '20' }}>{selectedSession.tag}</span>
                          </div>
                        )}
                      </div>

                      {/* Agenda */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Agenda</p>
                        <div className="bg-surface-container-high p-5 text-sm text-on-surface-variant leading-relaxed whitespace-pre-line min-h-[80px]">
                          {selectedSession.agenda || <span className="text-slate-600 italic">No agenda provided.</span>}
                        </div>
                      </div>

                      {/* Meeting link CTA */}
                      {(() => {
                        const isPast = new Date(selectedSession.date + 'T' + selectedSession.time) < new Date();
                        if (isPast) {
                          return (
                            <div className="flex items-center justify-center gap-3 w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-slate-700 text-slate-400 cursor-not-allowed">
                              <Video size={14} /> Meeting Ended
                            </div>
                          );
                        }
                        return (
                          <a href={selectedSession.meetingLink} target="_blank" rel="noreferrer"
                            className="flex items-center justify-center gap-3 w-full py-4 text-xs font-black uppercase tracking-[0.2em] transition-all"
                            style={{ background: sessionColor, color: '#0e0e13' }}>
                            <Video size={14} /> Join Meeting
                          </a>
                        );
                      })()}

                      {/* Recording section */}
                      {selectedSession.willRecord && (() => {
                        const isPast = new Date(selectedSession.date + 'T' + selectedSession.time) < new Date();
                        return (
                          <div className="bg-surface-container-high p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Recording</p>
                              {selectedSession.recordingLink
                                ? <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">● Available</span>
                                : selectedSession.recordingDeleted
                                ? <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">● Unavailable</span>
                                : <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isPast ? '○ Pending Upload' : '○ Planned'}</span>
                              }
                            </div>

                            {/* Recording deleted notice */}
                            {selectedSession.recordingDeleted && !selectedSession.recordingLink && (
                              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20">
                                <span className="text-red-400 text-lg leading-none">⚠</span>
                                <div>
                                  <p className="text-xs font-bold text-red-400">Recording Unavailable</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{selectedSession.recordingDeleteReason || 'This recording has been removed by an admin.'}</p>
                                </div>
                              </div>
                            )}

                            {selectedSession.recordingLink && (
                              <div className="flex items-center gap-4">
                                <a href={selectedSession.recordingLink} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-2 text-secondary text-xs font-bold hover:underline underline-offset-2">
                                  <Video size={13} /> Watch Recording
                                </a>
                                <a href={selectedSession.recordingLink} download
                                  className="flex items-center gap-2 text-slate-400 hover:text-secondary text-xs font-bold hover:underline underline-offset-2 transition-colors">
                                  ↓ Download
                                </a>
                                {/* Admin: delete recording */}
                                {userIsAdmin && !showDeleteRecordingConfirm && (
                                  <button onClick={() => setShowDeleteRecordingConfirm(true)}
                                    className="text-[10px] text-slate-600 hover:text-red-400 font-bold uppercase tracking-widest transition-colors ml-auto">
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Admin delete confirm */}
                            {userIsAdmin && showDeleteRecordingConfirm && (
                              <div className="space-y-2 p-3 border border-red-500/30 bg-red-500/5">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Remove Recording</p>
                                <input
                                  type="text"
                                  placeholder="Reason (e.g. Copyright issue, re-upload needed)"
                                  value={deleteRecordingReason}
                                  onChange={e => setDeleteRecordingReason(e.target.value)}
                                  className="w-full bg-transparent border-b border-red-500/30 focus:border-red-400 px-0 py-1.5 text-xs text-on-surface placeholder-slate-600 outline-none"
                                />
                                <div className="flex gap-3">
                                  <button onClick={() => handleDeleteRecording(selectedSession.id)}
                                    className="text-[10px] font-black uppercase tracking-widest text-white bg-red-500 px-4 py-2 hover:bg-red-600 transition-colors">
                                    Confirm Remove
                                  </button>
                                  <button onClick={() => { setShowDeleteRecordingConfirm(false); setDeleteRecordingReason(''); }}
                                    className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            {isPast && !selectedSession.recordingLink && (
                              <div className="space-y-3">
                                {/* R2 file upload */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Upload Recording to R2</label>
                                  <label className={`flex items-center justify-center gap-2 w-full py-3 border border-dashed cursor-pointer transition-colors text-xs font-bold uppercase tracking-widest
                                    ${uploadStatus === 'uploading' ? 'border-secondary text-secondary cursor-not-allowed' :
                                      uploadStatus === 'done' ? 'border-green-500 text-green-400' :
                                      uploadStatus === 'error' ? 'border-red-500 text-red-400' :
                                      'border-outline-variant text-slate-500 hover:border-secondary hover:text-secondary'}`}>
                                    <Video size={13} />
                                    {uploadStatus === 'uploading' ? `Uploading… ${uploadProgress}%` :
                                     uploadStatus === 'done' ? 'Uploaded ✓ — saving…' :
                                     uploadStatus === 'error' ? 'Upload failed — retry' :
                                     'Choose video file (mp4 / webm / mkv)'}
                                    <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv,.mp4,.webm,.mov,.avi"
                                      className="hidden"
                                      disabled={uploadStatus === 'uploading'}
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleR2Upload(selectedSession.id, selectedSession.topic, file);
                                      }} />
                                  </label>
                                  {uploadStatus === 'uploading' && (
                                    <div className="w-full bg-surface-container-high h-1">
                                      <div className="h-1 bg-secondary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">AI Summary (optional)</label>
                                  <textarea rows={3} placeholder="Paste an AI-generated summary of the session..." value={editAiSummary} onChange={e => setEditAiSummary(e.target.value)}
                                    className="w-full bg-surface-container border-b border-outline-variant focus:border-secondary px-0 py-2 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors resize-none" />
                                </div>
                                <button
                                  disabled={!editRecordingLink || uploadStatus === 'uploading'}
                                  onClick={() => handleUpdateRecording(selectedSession.id, editRecordingLink, editAiSummary)}
                                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-on-secondary bg-secondary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                                  Save Recording
                                </button>
                              </div>
                            )}
                            {/* Allow replacing recording if already uploaded */}
                            {isPast && selectedSession.recordingLink && (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">AI Summary</label>
                                  <textarea rows={3} placeholder="Paste an AI-generated summary of the session..." value={editAiSummary} onChange={e => setEditAiSummary(e.target.value)}
                                    className="w-full bg-surface-container border-b border-outline-variant focus:border-secondary px-0 py-2 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors resize-none" />
                                </div>
                                <button
                                  onClick={() => handleUpdateRecording(selectedSession.id, selectedSession.recordingLink, editAiSummary)}
                                  className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-on-secondary bg-secondary hover:opacity-90 transition-opacity">
                                  Save Summary
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {userIsAdmin && (
                        <button onClick={() => handleDeleteSession(selectedSession.id)}
                          className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-red-400 transition-colors">
                          Remove Session
                        </button>
                      )}
                    </div>
                    );
                  })() : (
                    <div className="bg-surface-container h-full p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={16} />
                        <p className="text-xs font-bold text-slate-500">Click a session to view agenda & link</p>
                      </div>
                      {sessions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">All Sessions</p>
                          {[...sessions].sort((a,b) => new Date(a.date+'T'+a.time).getTime()-new Date(b.date+'T'+b.time).getTime()).map(s => {
                            const isRegistered = myRegisteredSessions[s.id] || false;
                            return (
                            <div key={s.id} className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-high hover:bg-surface-container-highest transition-colors group">
                              <button onClick={() => setSelectedSession(s)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                <PlatformIcon platform={s.platform} size={14} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-on-surface truncate">{s.topic}</p>
                                  <p className="text-[10px] text-slate-500">{s.date} · {s.time} · <span className="text-slate-400">{s.attendeeCount || 0} attending</span>{s.recordingDeleted && <span className="text-red-400 ml-1">· rec. removed</span>}</p>
                                </div>
                              </button>
                              <button
                                onClick={() => isRegistered ? handleUnregisterSession(s.id) : handleRegisterSession(s.id)}
                                className={`text-[9px] font-bold uppercase px-2 py-1 whitespace-nowrap transition-all flex-shrink-0 ${
                                  isRegistered
                                    ? 'bg-primary/20 text-primary hover:bg-red-500/20 hover:text-red-400'
                                    : 'bg-surface-container-highest text-slate-500 hover:bg-primary/10 hover:text-primary'
                                }`}
                              >
                                {isRegistered ? '✓ Attending' : "I'll Attend"}
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Recorded Sessions ── */}
              {(() => {
                const recorded = sessions.filter(s => s.willRecord);
                if (recorded.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-black font-headline text-on-surface">Recorded Sessions</h3>
                      <p className="text-sm text-slate-500 mt-1">Sessions with available recordings & AI summaries</p>
                    </div>
                    <div className="bg-surface-container overflow-x-auto">
                      <table className="w-full text-sm min-w-[700px]">
                        <thead>
                          <tr className="bg-surface-container-high">
                            {['Host', 'Session Name', 'Date', 'Recording', 'AI Summary'].map(h => (
                              <th key={h} className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest px-5 py-3 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {recorded.map((s, i) => (
                            <tr key={s.id} className={`border-t border-white/5 hover:bg-surface-container-high transition-colors cursor-pointer ${i % 2 !== 0 ? 'bg-surface-container-low/20' : ''}`}
                              onClick={() => setSelectedSession(s)}>
                              <td className="px-5 py-3 font-bold text-on-surface whitespace-nowrap">{s.author}</td>
                              <td className="px-5 py-3 text-on-surface">
                                <div className="font-medium">{s.topic}</div>
                                {s.tag && <span className="text-[10px] text-primary">{s.tag}</span>}
                              </td>
                              <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{s.date}</td>
                              <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                                {s.recordingLink
                                  ? <div className="flex items-center gap-3">
                                      <a href={s.recordingLink} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-1.5 text-secondary font-bold text-xs hover:underline underline-offset-2 whitespace-nowrap">
                                        <Video size={12} /> Watch
                                      </a>
                                      <a href={s.recordingLink} download
                                        className="flex items-center gap-1.5 text-slate-400 hover:text-secondary font-bold text-xs hover:underline underline-offset-2 whitespace-nowrap transition-colors">
                                        ↓ Download
                                      </a>
                                    </div>
                                  : s.recordingDeleted
                                  ? <div className="space-y-0.5">
                                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">⚠ Unavailable</span>
                                      {s.recordingDeleteReason && <p className="text-[10px] text-slate-500 leading-snug max-w-[180px]">{s.recordingDeleteReason}</p>}
                                    </div>
                                  : <span className="text-[10px] text-slate-600 italic">Not uploaded yet</span>
                                }
                              </td>
                              <td className="px-5 py-3 text-slate-400 text-xs max-w-[240px]">
                                {s.aiSummary
                                  ? <span className="line-clamp-2 leading-relaxed">{s.aiSummary}</span>
                                  : <span className="text-slate-600 italic">No summary yet</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ── Past Sessions History ── */}
              {(() => {
                const now = new Date();
                const past = sessions
                  .filter(s => new Date(s.date + 'T' + (s.time || '23:59')) < now)
                  .sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
                if (past.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-black font-headline text-on-surface">Past Sessions</h3>
                      <p className="text-sm text-slate-500 mt-1">History of completed sessions</p>
                    </div>
                    <div className="space-y-1">
                      {past.map(s => (
                        <div key={s.id}
                          className="flex items-center gap-4 px-4 py-3 bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer group"
                          onClick={() => setSelectedSession(s)}
                          style={{ borderLeft: `3px solid ${platformColor[s.platform]}50` }}>
                          <div className="w-1.5 h-1.5 flex-shrink-0 opacity-40" style={{ background: platformColor[s.platform] }}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate group-hover:text-primary transition-colors">{s.topic}</p>
                            <p className="text-[10px] text-slate-500">{s.author} · {s.date} at {s.time}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5"
                              style={{ color: platformColor[s.platform], background: platformColor[s.platform] + '20' }}>{s.platform}</span>
                            {s.willRecord && (
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 ${s.recordingLink ? 'text-green-400 bg-green-400/10' : 'text-slate-500 bg-white/5'}`}>
                                {s.recordingLink ? '● Recorded' : '○ Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ── Section: Analytics ── */}
          {currentSection === 'analytics' && (() => {
            // ── Derived data ──
            const approvedReqs  = requests.filter(r => r.status === 'approved').length;
            const pendingReqs   = requests.filter(r => r.status === 'pending').length;
            const rejectedReqs  = requests.filter(r => r.status === 'rejected' || getDaysPending(r.requestDate) === 'Rejected').length;
            const totalAttendees = sessions.reduce((s, x) => s + (x.attendeeCount || 0), 0);

            // Resources by type
            const byType = Object.entries(resources.reduce((a, r) => { a[r.type || 'Unknown'] = (a[r.type || 'Unknown'] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

            // Resources by category
            const byCategory = Object.entries(resources.reduce((a, r) => { a[r.category || 'Unknown'] = (a[r.category || 'Unknown'] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

            // Requests by status for chart
            const reqStatusData = [
              { name: 'Approved', value: approvedReqs, color: '#4ade80' },
              { name: 'Pending',  value: pendingReqs,  color: '#FFB300' },
              { name: 'Rejected', value: rejectedReqs, color: '#ff6e84' },
            ].filter(d => d.value > 0);

            // Sessions by platform
            const byPlatform = Object.entries(sessions.reduce((a, s) => { a[s.platform] = (a[s.platform] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, value]) => ({ name, value }));

            // Top resource contributors
            const topContributors = Object.entries(resources.reduce((a, r) => { const k = r.addedBy || 'Unknown'; a[k] = (a[k] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 7);

            // Top session hosts
            const topHosts = Object.entries(sessions.reduce((a, s) => {
              if (!a[s.author]) a[s.author] = { sessions: 0, attendees: 0 };
              a[s.author].sessions += 1;
              a[s.author].attendees += (s.attendeeCount || 0);
              return a;
            }, {} as Record<string, { sessions: number; attendees: number }>))
              .map(([name, d]) => ({ name, ...d })).sort((a,b) => b.sessions - a.sessions).slice(0, 5);

            // Top suggestion authors
            const topSuggesters = Object.entries(suggestions.reduce((a, s) => { a[s.author] = (a[s.author] || 0) + 1; return a; }, {} as Record<string,number>))
              .map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);

            // Requests over time (last 8 weeks)
            const now = Date.now();
            const weekMs = 7 * 86400000;
            const reqsOverTime = Array.from({ length: 8 }, (_, i) => {
              const weekStart = now - (7 - i) * weekMs;
              const weekEnd = weekStart + weekMs;
              const label = new Date(weekStart).toLocaleDateString('en', { month: 'short', day: 'numeric' });
              const count = requests.filter(r => { const d = new Date(r.createdAt || r.requestDate).getTime(); return d >= weekStart && d < weekEnd; }).length;
              return { label, count };
            });

            const kpiCards = [
              { label: 'Total Resources', value: resourceTotal || resources.length, sub: `${byType[0]?.name || '—'} is top type`, color: '#ff86c2' },
              { label: 'Sessions Hosted', value: sessions.length, sub: `${totalAttendees} total attendees`, color: '#bf81ff' },
              { label: 'Study Groups', value: studyGroups.length, sub: `${studyGroups.filter(g => g.isActive).length} active`, color: '#4ade80' },
              { label: 'Resource Requests', value: requests.length, sub: `${pendingReqs} pending review`, color: '#FFB300' },
            ];

            return (
              <div className="p-12 space-y-10">
                {/* Header */}
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-black font-headline text-on-surface" style={{ letterSpacing: '-0.02em' }}><SplitText text="Analytics" delay={60} /></h2>
                    <p className="text-slate-500 mt-1">Platform performance · community insights · resource trends</p>
                  </div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">Live data</span>
                </div>

                {/* KPI Cards — Sypher-style with sparklines */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {kpiCards.map((card, ci) => {
                    // Generate a fake sparkline trend for each card (7 points)
                    const sparkData = Array.from({ length: 7 }, (_, i) => ({
                      v: Math.max(1, Math.round(card.value * (0.6 + Math.random() * 0.4) * ((i + 1) / 7)))
                    }));
                    sparkData[sparkData.length - 1].v = card.value as number;
                    return (
                      <div key={card.label} className="bg-surface-container-low p-6 relative overflow-hidden group" style={{ borderTop: `3px solid ${card.color}` }}>
                        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`spark-${ci}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={card.color} stopOpacity={0.25} />
                                  <stop offset="95%" stopColor={card.color} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="v" stroke={card.color} strokeWidth={1.5} fill={`url(#spark-${ci})`} dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{card.label}</p>
                        <p className="text-4xl font-black font-headline" style={{ color: card.color }}>{card.value}</p>
                        <p className="text-xs text-slate-500 mt-2">{card.sub}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Resources by Type — area/line style */}
                  <div className="lg:col-span-2 bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resources</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-2">By Type</h3>
                    <p className="text-xs text-slate-600 mb-5">{resources.length} total resources across {byType.length} types</p>
                    {/* Inline category bars (Sypher-style) */}
                    <div className="space-y-3 mb-6">
                      {byType.map((t, i) => (
                        <div key={t.name} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-28 truncate shrink-0">{t.name}</span>
                          <div className="flex-1 h-2 bg-surface-container-high">
                            <div className="h-2 transition-all duration-700" style={{ width: `${(t.value / (byType[0]?.value || 1)) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                          <span className="text-xs font-bold text-on-surface w-6 text-right shrink-0">{t.value}</span>
                          <span className="text-[10px] text-slate-600 w-8 text-right shrink-0">{Math.round((t.value / (resources.length || 1)) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart data={byType} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="typeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff86c2" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ff86c2" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, fontSize: 11 }} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                        <Area type="monotone" dataKey="value" stroke="#ff86c2" strokeWidth={2} fill="url(#typeGrad)" dot={{ fill: '#ff86c2', r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Request Status Donut */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Requests</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">Status Breakdown</h3>
                    {reqStatusData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={150}>
                          <PieChart>
                            <Pie data={reqStatusData} dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={3}>
                              {reqStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 mt-2">
                          {reqStatusData.map(d => (
                            <div key={d.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-slate-400">{d.name}</span></div>
                              <span className="font-bold text-on-surface">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <p className="text-slate-600 text-sm">No request data yet.</p>}
                  </div>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Resources by Category */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resources</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">By Category</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={byCategory} layout="vertical" barSize={14}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="value" name="Resources" radius={0}>
                          {byCategory.map((entry, i) => <Cell key={i} fill={getTagColor(entry.name)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Requests over time */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Requests</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">Over Time (8 weeks)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={reqsOverTime} barSize={22}>
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="count" name="Requests" fill="#ff86c2" radius={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Leaderboards Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Top Resource Contributors */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Leaderboard</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">Top Resource Sharers</h3>
                    {topContributors.length === 0 ? <p className="text-slate-600 text-sm">No data yet.</p> : (
                      <div className="space-y-3">
                        {topContributors.map((c, i) => (
                          <div key={c.name} className="flex items-center gap-3">
                            <span className="text-[10px] font-black w-5 text-right shrink-0" style={{ color: i === 0 ? '#FFB300' : i === 1 ? '#94a3b8' : i === 2 ? '#fb923c' : '#374151' }}>#{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-on-surface truncate">{c.name}</span>
                                <span className="text-xs font-black text-primary ml-2 shrink-0">{c.count}</span>
                              </div>
                              <div className="h-1 bg-surface-container-high">
                                <div className="h-1 transition-all" style={{ width: `${(c.count / (topContributors[0]?.count || 1)) * 100}%`, background: '#ff86c2' }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Session Hosts */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Leaderboard</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">Top Session Hosts</h3>
                    {topHosts.length === 0 ? <p className="text-slate-600 text-sm">No sessions yet.</p> : (
                      <div className="space-y-3">
                        {topHosts.map((h, i) => (
                          <div key={h.name} className="flex items-center gap-3">
                            <span className="text-[10px] font-black w-5 text-right shrink-0" style={{ color: i === 0 ? '#FFB300' : i === 1 ? '#94a3b8' : i === 2 ? '#fb923c' : '#374151' }}>#{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-on-surface truncate">{h.name}</span>
                                <span className="text-xs font-black text-secondary ml-2 shrink-0">{h.sessions} sessions</span>
                              </div>
                              <div className="h-1 bg-surface-container-high">
                                <div className="h-1 transition-all" style={{ width: `${(h.sessions / (topHosts[0]?.sessions || 1)) * 100}%`, background: '#bf81ff' }} />
                              </div>
                              <p className="text-[10px] text-slate-600 mt-0.5">{h.attendees} total attendees</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Suggesters */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Leaderboard</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">Top Suggesters</h3>
                    {topSuggesters.length === 0 ? <p className="text-slate-600 text-sm">No suggestions yet.</p> : (
                      <div className="space-y-3">
                        {topSuggesters.map((s, i) => (
                          <div key={s.name} className="flex items-center gap-3">
                            <span className="text-[10px] font-black w-5 text-right shrink-0" style={{ color: i === 0 ? '#FFB300' : i === 1 ? '#94a3b8' : i === 2 ? '#fb923c' : '#374151' }}>#{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-on-surface truncate">{s.name}</span>
                                <span className="text-xs font-black ml-2 shrink-0" style={{ color: '#4ade80' }}>{s.count}</span>
                              </div>
                              <div className="h-1 bg-surface-container-high">
                                <div className="h-1 transition-all" style={{ width: `${(s.count / (topSuggesters[0]?.count || 1)) * 100}%`, background: '#4ade80' }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sessions platform breakdown + study groups activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Sessions by Platform */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sessions</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-5">By Platform</h3>
                    {byPlatform.length === 0 ? <p className="text-slate-600 text-sm">No session data yet.</p> : (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={byPlatform} barSize={36}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: '#19191f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                          <Bar dataKey="value" name="Sessions" radius={0}>
                            {byPlatform.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Study Groups Activity */}
                  <div className="bg-surface-container-low p-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Study Groups</p>
                    <h3 className="text-lg font-black text-on-surface font-headline mb-4">Activity Overview</h3>
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      {[
                        { label: 'Total Groups', value: studyGroups.length, color: '#4ade80' },
                        { label: 'Active', value: studyGroups.filter(g => g.isActive).length, color: '#ff86c2' },
                        { label: 'Total Members', value: studyGroups.reduce((s, g) => s + (g.memberCount || 0), 0), color: '#bf81ff' },
                      ].map(m => (
                        <div key={m.label} className="bg-surface-container p-4 text-center">
                          <p className="text-2xl font-black font-headline" style={{ color: m.color }}>{m.value}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    {studyGroups.length > 0 && (
                      <div className="space-y-2">
                        {studyGroups.slice(0, 3).map(g => (
                          <div key={g.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                            <span className="font-bold text-on-surface truncate">{g.title}</span>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span className="text-slate-500">{g.memberCount || 0} members</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 uppercase ${g.isActive ? 'text-green-400 bg-green-400/10' : 'text-slate-600 bg-white/5'}`}>{g.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ── Section: Resources ── */}
          {currentSection === 'resources' && (
            <div className="p-12 space-y-12">
              <div>
                <h2 className="text-4xl font-black font-headline text-on-surface" style={{ letterSpacing: '-0.02em' }}><SplitText text="Resources" delay={60} /></h2>
                <p className="text-slate-500 mt-2">Contribute and browse community materials</p>
              </div>

              {/* Stat blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <BorderGlow color="#bf81ff" speed={5} glowBlur={10}>
                  <div className="bg-surface-container-low p-7 flex flex-col gap-3 relative overflow-hidden group" style={{ borderLeft: '4px solid #bf81ff' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] pointer-events-none transition-all group-hover:opacity-100 opacity-60" style={{ background: '#bf81ff30' }}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Requests</span>
                    <div className="flex items-end gap-4">
                      <span className="text-5xl font-black font-headline text-on-surface leading-none">{requests.length}</span>
                      <span className="text-xs font-bold mb-1" style={{ color: '#bf81ff' }}>
                        +{requests.filter(r => {
                          const d = new Date(r.createdAt || r.requestDate);
                          return !isNaN(d.getTime()) && (Date.now() - d.getTime()) < 86400000;
                        }).length} today
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Community resource requests</span>
                  </div>
                </BorderGlow>
                <BorderGlow color="#ff86c2" speed={6} glowBlur={10}>
                  <div className="bg-surface-container-low p-7 flex flex-col gap-3 relative overflow-hidden group" style={{ borderLeft: '4px solid #ff86c2' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] pointer-events-none transition-all group-hover:opacity-100 opacity-60" style={{ background: '#ff86c230' }}></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Materials</span>
                    <div className="flex items-end gap-4">
                      <span className="text-5xl font-black font-headline text-on-surface leading-none">{resourceTotal || resources.length}</span>
                      <span className="text-xs font-bold mb-1" style={{ color: '#ff86c2' }}>Updated 5m ago</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Shared by the community</span>
                  </div>
                </BorderGlow>
              </div>

              {/* Requested Resources */}
              {(() => {
                const nameCounts: Record<string, number> = {};
                requests.forEach(r => {
                  const key = r.resourceName?.toLowerCase().trim();
                  if (key) nameCounts[key] = (nameCounts[key] || 0) + 1;
                });
                const isDup = (r: Request) => nameCounts[r.resourceName?.toLowerCase().trim()] > 1;
                const isStaleReq = (r: Request) => {
                  const d = new Date(r.createdAt || r.requestDate);
                  return !isNaN(d.getTime()) && (Date.now() - d.getTime()) > 7 * 86400000 && r.status === 'pending';
                };
                return (
                  <div>
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h3 className="text-2xl font-black font-headline text-on-surface">Requested Resources</h3>
                        <p className="text-sm text-slate-500">Materials sought by the community</p>
                      </div>
                      <button onClick={() => setShowRequestModal(true)} className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:underline underline-offset-8">Request New</button>
                    </div>
                    {/* Filter out requests that have been fulfilled by an uploaded resource */}
                    {(() => {
                      const uploadedNames = new Set(resources.map(r => r.name.toLowerCase().trim()));
                      const unfulfilledRequests = requests.filter(r => !uploadedNames.has(r.resourceName?.toLowerCase().trim()));
                      if (unfulfilledRequests.length === 0) return (
                        <div className="py-16 text-center border border-dashed border-outline-variant">
                          <p className="text-2xl mb-2">✓</p>
                          <p className="text-sm font-bold text-on-surface">All requests fulfilled</p>
                          <p className="text-xs text-slate-500 mt-1">Every requested resource has been uploaded by the community.</p>
                        </div>
                      );
                      return null;
                    })()}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {requests.filter(r => !new Set(resources.map(res => res.name.toLowerCase().trim())).has(r.resourceName?.toLowerCase().trim())).map(request => {
                        const upvoteCount = request.upvotes?.length || 0;
                        const isHighPriority = upvoteCount >= 5;
                        const hasUpvoted = request.upvotes?.includes(user?.id || '') || false;
                        return (
                        <div key={request._id} className={`bg-surface-container-high p-6 flex items-start justify-between relative overflow-hidden
                          ${isHighPriority ? 'border-l-2 border-orange-400' : isDup(request) ? 'border-l-2 border-primary' : isStaleReq(request) ? 'border-l-2 border-red-500' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{request.resourceType}</span>
                              {isHighPriority && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 text-orange-400 bg-orange-400/10">🔥 High Priority</span>
                              )}
                              {isDup(request) && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 text-primary bg-primary/10">⚠ Duplicate</span>
                              )}
                              {isStaleReq(request) && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 text-red-400 bg-red-400/10">Overdue</span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-on-surface">{request.resourceName}</h4>
                            <p className="text-xs text-slate-500 mt-1">by {request.userName}</p>
                            {request.notes && (
                              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{request.notes}</p>
                            )}
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              <span className={`text-[10px] font-bold uppercase px-3 py-1 ${
                                request.status==='approved'||request.status==='fulfilled'?'bg-green-500/20 text-green-400'
                                :request.status==='rejected'?'bg-red-500/20 text-red-400'
                                :'bg-yellow-500/20 text-yellow-400'}`}>
                                {request.status === 'fulfilled' ? 'Done' : request.status}
                              </span>
                              <button
                                onClick={() => handleUpvoteRequest(request._id)}
                                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 transition-all ${
                                  hasUpvoted
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-surface-container-highest text-slate-500 hover:text-primary hover:bg-primary/10'
                                }`}
                              >
                                👍 {hasUpvoted ? 'Voted' : 'Need This'} · {upvoteCount}
                              </button>
                            </div>
                          </div>
                          <button className="bg-surface-container-highest p-2 text-primary hover:bg-primary hover:text-on-primary transition-all flex-shrink-0 ml-3">
                            <Pin size={16} />
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Contribute form */}
              <div className="bg-surface-container p-8">
                <h3 className="text-xl font-bold font-headline text-on-surface mb-8 flex items-center gap-3">
                  <Pin size={18} className="text-primary" /> Contribute Resource
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Resource Name</label>
                    <input type="text" placeholder="e.g. Docker Deep Dive" value={newResourceName} onChange={e => setNewResourceName(e.target.value)}
                      className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Category</label>
                    <select value={newResourceCategory} onChange={e => setNewResourceCategory(e.target.value)}
                      className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface outline-none transition-colors">
                      <option value="">Select Category</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Cloud">Cloud</option>
                      <option value="Programming">Programming</option>
                      <option value="Security">Security</option>
                      <option value="Networking">Networking</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Type</label>
                    <select value={newResourceType} onChange={e => setNewResourceType(e.target.value)}
                      className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface outline-none transition-colors">
                      <option value="">Select Type</option>
                      <option value="Article">Article</option>
                      <option value="Video">Video</option>
                      <option value="Documentation">Documentation</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Access Link</label>
                    <input type="url" placeholder="https://..." value={newResourceLink} onChange={e => setNewResourceLink(e.target.value)}
                      className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Uploaded By (your name)</label>
                    <input type="text" placeholder="e.g. John Doe" value={newResourceAddedBy} onChange={e => setNewResourceAddedBy(e.target.value)}
                      className="w-full bg-surface-container-low border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                  </div>
                </div>
                {(!newResourceName || !newResourceLink || !newResourceCategory || !newResourceType) && (newResourceName || newResourceLink || newResourceCategory || newResourceType) && (
                  <p className="mt-4 text-xs text-red-400 flex items-center gap-2">
                    <span>⚠</span> Please fill in all required fields: Name, Category, Type and Link.
                  </p>
                )}
                <button
                  onClick={editResourceId ? handleUpdateResource : handleAddResource}
                  disabled={!editResourceId && (!newResourceName || !newResourceLink || !newResourceCategory || !newResourceType)}
                  className="mt-6 bg-primary text-on-primary px-8 py-4 text-xs font-black uppercase tracking-[0.2em] neon-glow-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {editResourceId ? 'Update Resource' : 'Upload Resource'}
                </button>
              </div>

              {/* Available Resources Table */}
              <div>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Available Resources</h3>
                    <p className="text-sm text-slate-500">Recently verified materials</p>
                  </div>
                  <button
                    className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:underline underline-offset-8"
                    onClick={() => {
                      if (!viewAllResources) { setViewAllResources(true); fetchAllResources(); }
                      else { setViewAllResources(false); fetchResources(); }
                    }}>
                    {viewAllResources ? 'Show Less' : 'View All'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-surface-container-high">
                    <tr>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uploaded By</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="py-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link</th>
                      <th className="py-4 px-6 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map((resource, i) => {
                      const catMeta = CATEGORY_META[resource.category] || CATEGORY_META[Object.keys(CATEGORY_META).find(k => resource.category?.toLowerCase().includes(k.toLowerCase())) || ''];
                      return (
                      <ResourceRow
                        key={resource._id}
                        resource={resource}
                        i={i}
                        userIsAdmin={userIsAdmin}
                        catMeta={catMeta}
                        onEdit={() => handleEditResource(resource)}
                        onDelete={() => handleDeleteResource(resource._id)}
                        onBundle={() => { setAddingToCollection({ name: resource.name, url: resource.link }); setShowCollectionPanel(true); }}
                      />
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Resource Collections Panel */}
              {showCollectionPanel && (
                <div className="bg-surface-container p-8 space-y-6 relative" style={{ borderLeft: '4px solid #bf81ff' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Resource Bundles</p>
                      <h3 className="text-xl font-black font-headline text-on-surface">My Collections</h3>
                      {addingToCollection && (
                        <p className="text-xs text-slate-400 mt-1">Adding: <span className="text-primary font-bold">{addingToCollection.name}</span></p>
                      )}
                    </div>
                    <button onClick={() => { setShowCollectionPanel(false); setAddingToCollection(null); }}
                      className="text-slate-500 hover:text-on-surface text-xl leading-none transition-colors">×</button>
                  </div>

                  {/* Create new collection */}
                  <div className="bg-surface-container-high p-5 space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Create New Bundle</p>
                    <div className="flex gap-3">
                      <input type="text" placeholder="Bundle title (e.g. Kubernetes Essentials)" value={collectionTitle} onChange={e => setCollectionTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                        className="flex-1 bg-surface-container border-b border-outline-variant focus:border-secondary px-0 py-2 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors" />
                      <button onClick={handleCreateCollection}
                        className="bg-secondary text-on-secondary px-5 py-2 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap">
                        Create
                      </button>
                    </div>
                  </div>

                  {/* Collections list */}
                  {collections.length === 0 ? (
                    <p className="text-sm text-slate-600 italic">No bundles yet. Create one above to start grouping resources.</p>
                  ) : (
                    <div className="space-y-4">
                      {collections.map(col => (
                        <div key={col.id} className="bg-surface-container-high p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-on-surface">{col.title}</h4>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-500">{col.links.length} link{col.links.length !== 1 ? 's' : ''}</span>
                              {addingToCollection && (
                                <button onClick={() => handleAddLinkToCollection(col.id, addingToCollection)}
                                  className="text-[9px] font-black uppercase px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all">
                                  + Add Here
                                </button>
                              )}
                              <button onClick={() => handleDeleteCollection(col.id)}
                                className="text-slate-600 hover:text-red-400 transition-colors text-xs">✕</button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {col.links.map((lnk, li) => (
                              <div key={li} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-4">{li + 1}.</span>
                                <span className="text-xs font-bold text-on-surface flex-shrink-0">{lnk.name}</span>
                                <a href={lnk.url} target="_blank" rel="noreferrer"
                                  className="text-primary text-[10px] hover:underline underline-offset-2 truncate">{lnk.url}</a>
                              </div>
                            ))}
                            {col.links.length === 0 && <p className="text-[10px] text-slate-600 italic">No links yet — click "+ Add Here" on a resource.</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </main>

        {/* Community Join Modal */}
        {showCommunityModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            style={{ background: 'rgba(14,14,19,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowCommunityModal(false); }}
          >
            <BorderGlow color="#22c55e" speed={4} glowBlur={18} style={{ width: '100%', maxWidth: 480 }}>
              <div className="relative overflow-hidden p-8" style={{ background: 'linear-gradient(160deg, #0d1f10 0%, #12082a 60%, #0d0d14 100%)' }}>
                {/* Background glow blobs */}
                <div className="absolute top-0 right-0 w-48 h-48 blur-[80px] pointer-events-none" style={{ background: 'rgba(34,197,94,0.12)' }} />
                <div className="absolute bottom-0 left-0 w-48 h-48 blur-[80px] pointer-events-none" style={{ background: 'rgba(168,85,247,0.12)' }} />

                {/* Close */}
                <button onClick={() => setShowCommunityModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>

                {/* WhatsApp logo + pulse */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#22c55e' }} />
                    <div className="absolute inset-0 rounded-full animate-pulse opacity-15" style={{ background: '#a855f7', animationDelay: '0.5s' }} />
                    <div className="w-16 h-16 rounded-full flex items-center justify-center relative"
                      style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 0 32px rgba(34,197,94,0.4), 0 0 60px rgba(168,85,247,0.2)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.553 4.113 1.519 5.845L.057 23.899a.5.5 0 00.611.611l6.054-1.462A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.93a9.918 9.918 0 01-5.058-1.374l-.363-.215-3.759.908.924-3.758-.236-.374A9.927 9.927 0 012.07 12C2.07 6.508 6.508 2.07 12 2.07S21.93 6.508 21.93 12 17.492 21.93 12 21.93z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-[9px] font-black uppercase tracking-[0.2em]"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    200+ Members · Active Community
                  </div>
                  <h2 className="text-2xl font-black font-headline mb-2"
                    style={{ background: 'linear-gradient(90deg, #22c55e, #a855f7, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200%' }}>
                    DevOps Dojo Community
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Join a growing community of <span className="text-green-400 font-semibold">200+ tech enthusiasts</span> where we discuss DevOps, Cloud, Kubernetes, Terraform, and everything in between — plus off-topic catch-ups and networking.
                  </p>
                </div>

                {/* Perks */}
                <div className="space-y-2 mb-6">
                  {[
                    { icon: '🚀', text: 'Deep-dive tech discussions — DevOps, Cloud, K8s & more' },
                    { icon: '💬', text: 'Off-topic catch-ups, memes, and community vibes' },
                    { icon: '🤝', text: 'Network with engineers across the industry' },
                    { icon: '📢', text: 'Be first to hear about sessions & resources' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-start gap-3 px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm flex-shrink-0">{icon}</span>
                      <p className="text-xs text-slate-400">{text}</p>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <a
                    href="https://chat.whatsapp.com/HgdRuGAmLEr0BFoAVDrPkI"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-3.5 font-black text-sm uppercase tracking-widest transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', boxShadow: '0 0 24px rgba(34,197,94,0.4)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.553 4.113 1.519 5.845L.057 23.899a.5.5 0 00.611.611l6.054-1.462A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.93a9.918 9.918 0 01-5.058-1.374l-.363-.215-3.759.908.924-3.758-.236-.374A9.927 9.927 0 012.07 12C2.07 6.508 6.508 2.07 12 2.07S21.93 6.508 21.93 12 17.492 21.93 12 21.93z"/>
                    </svg>
                    Join the Group
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText('https://chat.whatsapp.com/HgdRuGAmLEr0BFoAVDrPkI'); }}
                    className="flex items-center justify-center gap-2 w-full py-3 font-bold text-xs uppercase tracking-widest transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                    style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copy Invite Link to Share
                  </button>
                </div>
              </div>
            </BorderGlow>
          </div>
        )}

        {/* Request New Modal */}
        {showRequestModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            style={{ background: 'rgba(14,14,19,0.8)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowRequestModal(false); }}
          >
            <div className="w-full max-w-md bg-[#19191f] border border-[rgba(255,134,194,0.2)]" style={{ boxShadow: '0 0 60px rgba(255,134,194,0.08)' }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Community</p>
                  <h2 className="text-lg font-black text-on-surface font-headline">Request a Resource</h2>
                </div>
                <button onClick={() => setShowRequestModal(false)} className="text-slate-600 hover:text-slate-400 text-lg leading-none">✕</button>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kumail"
                    value={newRequestUserName}
                    onChange={e => setNewRequestUserName(e.target.value)}
                    className="w-full bg-[#0e0e13] border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Resource Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kubernetes Deep Dive"
                    value={newRequestResourceName}
                    onChange={e => setNewRequestResourceName(e.target.value)}
                    className="w-full bg-[#0e0e13] border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Resource Type</label>
                  <select
                    value={newRequestResourceType}
                    onChange={e => setNewRequestResourceType(e.target.value)}
                    className="w-full bg-[#0e0e13] border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface outline-none transition-colors"
                  >
                    <option value="">Select type…</option>
                    {['Video', 'Documentation', 'Course', 'Blog', 'Tool', 'Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Notes <span className="text-slate-600 normal-case font-normal">(optional — why do you need this?)</span></label>
                  <textarea
                    placeholder="e.g. Need this for CKA exam prep, covers PV/PVC concepts"
                    value={newRequestNotes}
                    onChange={e => setNewRequestNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-[#0e0e13] border-b border-outline-variant focus:border-primary px-0 py-3 text-sm text-on-surface placeholder-slate-600 outline-none transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleAddRequest}
                  disabled={!newRequestUserName || !newRequestResourceName || !newRequestResourceType}
                  className="flex-1 py-3 bg-primary text-[#0e0e13] text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(255,134,194,0.4)] transition-all"
                >
                  Submit Request
                </button>
                <button onClick={() => setShowRequestModal(false)} className="px-5 py-3 border border-outline-variant text-slate-500 hover:text-on-surface text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Global Search Overlay ── */}
        {showSearchOverlay && (
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-[15vh] px-4"
            style={{ background: 'rgba(14,14,19,0.75)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowSearchOverlay(false); setGlobalQuery(''); } }}
          >
            {/* Search box */}
            <div className="w-full max-w-2xl" style={{ filter: 'drop-shadow(0 0 40px rgba(255,134,194,0.15))' }}>
              <div className="flex items-center bg-[#19191f] border border-[rgba(255,134,194,0.25)] px-5 py-4 gap-3">
                <Search size={18} className="text-primary shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by tag, topic, or keyword… (e.g. docker, k8s)"
                  value={globalQuery}
                  onChange={e => setGlobalQuery(e.target.value)}
                  className="flex-1 bg-transparent text-on-surface text-base outline-none placeholder-slate-600"
                />
                {globalQuery && (
                  <button onClick={() => setGlobalQuery('')} className="text-slate-600 hover:text-slate-400 text-xs shrink-0">✕ Clear</button>
                )}
                <button onClick={() => { setShowSearchOverlay(false); setGlobalQuery(''); }} className="text-slate-600 hover:text-slate-400 text-xs shrink-0 ml-1 border border-slate-700 px-1.5 py-0.5">Esc</button>
              </div>

              {/* Results */}
              {globalQuery.trim() && (
                <div className="bg-[#14141a] border border-[rgba(255,255,255,0.06)] border-t-0 max-h-[55vh] overflow-y-auto">
                  {!globalResults || globalResults.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-10">No results for "<span className="text-on-surface">{globalQuery}</span>"</p>
                  ) : (
                    (['Resources', 'Sessions', 'Study Groups', 'Challenges'] as const).map(sec => {
                      const items = globalResults.filter(r => r.section === sec);
                      if (items.length === 0) return null;
                      const sectionKey = sec === 'Resources' ? 'resources' : sec === 'Sessions' ? 'schedule' : sec === 'Study Groups' ? 'studygroups' : 'challenges';
                      return (
                        <div key={sec}>
                          <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{sec}</span>
                            <span className="text-[10px] text-slate-600">{items.length} result{items.length > 1 ? 's' : ''}</span>
                          </div>
                          {items.map((item, i) => {
                            const accentColor = getTagColor(`${item.label} ${item.sub || ''}`);
                            return (
                              <SearchResultRow
                                key={i}
                                item={item}
                                accentColor={accentColor}
                                sec={sec}
                                onSelect={() => {
                                  setShowSearchOverlay(false);
                                  setGlobalQuery('');
                                  setCurrentSection(sectionKey as Section);
                                  if (item.sessionId) {
                                    const s = sessions.find(s => s.id === item.sessionId);
                                    if (s) setSelectedSession(s);
                                  } else if (item.href) {
                                    window.open(item.href, '_blank');
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Hint */}
              {!globalQuery.trim() && (
                <div className="bg-[#14141a] border border-[rgba(255,255,255,0.06)] border-t-0 px-5 py-4 flex gap-6 text-xs text-slate-600">
                  <span><kbd className="border border-slate-700 px-1 py-0.5 text-slate-500">↵</kbd> navigate</span>
                  <span><kbd className="border border-slate-700 px-1 py-0.5 text-slate-500">Esc</kbd> close</span>
                  <span className="ml-auto">Search across Resources · Sessions · Study Groups · Challenges</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </ThemeProvider>
  );
};

export default App;
