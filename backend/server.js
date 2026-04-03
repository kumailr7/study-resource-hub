const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const asyncHandler = require('express-async-handler');
const { config } = require('dotenv');
const Joi = require('joi');
const expressMongoSanitize = require('express-mongo-sanitize');
const envalid = require('envalid');
const { Clerk } = require('@clerk/clerk-sdk-node');
const { sendInvitationEmail } = require('./services/emailService');
const crypto = require('crypto');

// Import 
const loginRoutes = require("./routes/login"); // Adjust path as needed
const userRoutes = require("./routes/users"); // Adjust path as needed
const uploadRoutes = require("./routes/uploads");

// Load environment variables
config();
const { cleanEnv, str, port } = envalid;
cleanEnv(process.env, {
  PORT: port(),
  MONGODB_URI: str(),
});

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://localhost:5001',
  'http://studyhub.local',
  'https://studyhub.local',
  'https://hub.devops-dojo.ninja',
  'https://study-resource-hub-bice.vercel.app',
  'https://study-resource-hub.vercel.app',
  // Add any custom frontend URLs here
];

// Allow all origins for easier development (can be restricted later)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests like curl/postman with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow all origins for now - can be restricted in production
    return callback(null, true);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-clerk-id'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(expressMongoSanitize());

// Routes
app.use("/api", loginRoutes); // Prefix login routes with `/api`
app.use("/api", userRoutes);   // Prefix user routes with `/api`
app.use("/api", uploadRoutes); // R2 presigned upload URLs


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware to check if user is admin or super_admin
const requireAdmin = asyncHandler(async (req, res, next) => {
  const clerkId = req.headers['x-clerk-id'];
  if (!clerkId) return res.status(401).json({ error: 'Unauthorized' });
  
  // First try MongoDB
  const user = await UserManagement.findOne({ clerkId });
  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    return next();
  }
  
  // If not found or not admin, check Clerk webhook/event data if provided
  const clerkRole = req.headers['x-clerk-role'];
  if (clerkRole === 'admin' || clerkRole === 'super_admin') {
    return next();
  }
  
  return res.status(403).json({ error: 'Admin access required' });
});

// Middleware to check if user is super_admin
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  const clerkId = req.headers['x-clerk-id'];
  if (!clerkId) return res.status(401).json({ error: 'Unauthorized' });
  
  // First try MongoDB
  const user = await UserManagement.findOne({ clerkId });
  if (user && user.role === 'super_admin') {
    return next();
  }
  
  // If not found, check Clerk header if provided
  const clerkRole = req.headers['x-clerk-role'];
  if (clerkRole === 'super_admin') {
    return next();
  }
  
  return res.status(403).json({ error: 'Super admin access required' });
});

// ── New collections: Sessions, Study Groups, Challenge Participants ──

const sessionSchema = new mongoose.Schema({
  author: { type: String, required: true },
  topic: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  timezone: { type: String, default: 'UTC' },
  tag: { type: String, default: '' },
  meetingLink: { type: String, required: true },
  platform: { type: String, default: 'Google Meet' },
  agenda: { type: String, default: '' },
  willRecord: { type: Boolean, default: false },
  recordingLink: { type: String, default: '' },
  aiSummary: { type: String, default: '' },
  hostLinkedIn: { type: String, default: '' },
  duration: { type: Number, default: 30 },
  attendeeCount: { type: Number, default: 0 },
  registeredUsers: { type: [String], default: [] },
  recordingDeleted: { type: Boolean, default: false },
  recordingDeleteReason: { type: String, default: '' },
}, { timestamps: true });

const studyGroupSchema = new mongoose.Schema({
  title: { type: String, required: true },
  agenda: { type: String, default: '' },
  shortCode: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  memberCount: { type: Number, default: 0 },
  scheduledAt: { type: String, default: '' },
  members: { type: [String], default: [] },
}, { timestamps: true });

const challengeParticipantSchema = new mongoose.Schema({
  challengeId: { type: String, required: true },
  userId: { type: String, required: true },
}, { timestamps: true });
challengeParticipantSchema.index({ challengeId: 1, userId: 1 }, { unique: true });

const downloadRequestSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },
  approvedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });
downloadRequestSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

const userManagementSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, default: '' },
  role: { type: String, enum: ['super_admin', 'admin', 'user'], default: 'user' },
  status: { type: String, enum: ['active', 'invited', 'pending_removal', 'removed'], default: 'active' },
  clerkInvitationId: { type: String, default: null },
  invitationToken: { type: String, default: null },
  invitationExpiresAt: { type: Date, default: null },
  removalRequest: {
    requestedBy: { type: String, default: null },
    reason: { type: String, default: '' },
    requestedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    approved: { type: Boolean, default: null }
  },
  invitedBy: { type: String, default: null },
  invitedAt: { type: Date, default: null },
}, { timestamps: true });
userManagementSchema.index({ clerkId: 1 });
userManagementSchema.index({ email: 1 });
userManagementSchema.index({ clerkInvitationId: 1 });

const SessionModel = mongoose.model('Session', sessionSchema);
const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
const ChallengeParticipant = mongoose.model('ChallengeParticipant', challengeParticipantSchema);
const DownloadRequest = mongoose.model('DownloadRequest', downloadRequestSchema);
const UserManagement = mongoose.model('UserManagement', userManagementSchema);

// ── Sessions routes ──
app.get('/api/sessions', asyncHandler(async (req, res) => {
  const sessions = await SessionModel.find().sort({ createdAt: -1 });
  res.json(sessions);
}));

app.post('/api/sessions', asyncHandler(async (req, res) => {
  const s = new SessionModel(req.body);
  await s.save();
  res.status(201).json(s);
}));

app.delete('/api/sessions/:id', asyncHandler(async (req, res) => {
  const deleted = await SessionModel.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Session not found' });
  res.json({ message: 'Session deleted' });
}));

app.patch('/api/sessions/:id/recording/delete', asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const updated = await SessionModel.findByIdAndUpdate(
    req.params.id,
    { recordingLink: '', recordingDeleted: true, recordingDeleteReason: reason || 'Removed by admin' },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Session not found' });
  res.json(updated);
}));

app.patch('/api/sessions/:id/recording', asyncHandler(async (req, res) => {
  const { recordingLink, aiSummary } = req.body;
  const updated = await SessionModel.findByIdAndUpdate(
    req.params.id, { recordingLink, aiSummary, recordingDeleted: false, recordingDeleteReason: '' }, { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Session not found' });
  res.json(updated);
}));

app.patch('/api/sessions/:id/register', asyncHandler(async (req, res) => {
  const { userId, action } = req.body; // action: 'register' | 'unregister'
  const session = await SessionModel.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const alreadyRegistered = session.registeredUsers.includes(userId);
  if (action === 'register' && !alreadyRegistered) {
    session.registeredUsers.push(userId);
    session.attendeeCount = Math.max(session.attendeeCount, 0) + 1;
  } else if (action === 'unregister' && alreadyRegistered) {
    session.registeredUsers = session.registeredUsers.filter(u => u !== userId);
    session.attendeeCount = Math.max(0, session.attendeeCount - 1);
  }
  await session.save();
  res.json(session);
}));

// ── Download Request routes ──
app.post('/api/download-requests', asyncHandler(async (req, res) => {
  const { sessionId, userId, userEmail, userName } = req.body;
  
  const session = await SessionModel.findById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  
  if (!session.registeredUsers.includes(userId)) {
    return res.status(403).json({ error: 'You must be registered for this session to request download' });
  }
  
  const existing = await DownloadRequest.findOne({ sessionId, userId });
  if (existing) {
    if (existing.status === 'approved' && existing.expiresAt && new Date(existing.expiresAt) > new Date()) {
      return res.status(200).json(existing);
    }
    if (existing.status === 'pending') {
      return res.status(400).json({ error: 'You already have a pending request' });
    }
  }
  
  const request = new DownloadRequest({ sessionId, userId, userEmail, userName });
  await request.save();
  res.status(201).json(request);
}));

app.get('/api/download-requests', asyncHandler(async (req, res) => {
  const requests = await DownloadRequest.find().sort({ createdAt: -1 }).populate('sessionId', 'topic date time');
  res.json(requests);
}));

app.get('/api/download-requests/user/:userId', asyncHandler(async (req, res) => {
  const requests = await DownloadRequest.find({ userId: req.params.userId }).populate('sessionId', 'topic date time');
  res.json(requests);
}));

app.patch('/api/download-requests/:id/approve', asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  const request = await DownloadRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  request.status = 'approved';
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.approvedAt = new Date();
  request.expiresAt = expiresAt;
  
  await request.save();
  res.json(request);
}));

app.patch('/api/download-requests/:id/reject', asyncHandler(async (req, res) => {
  const { adminId, reason } = req.body;
  const request = await DownloadRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  
  request.status = 'rejected';
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  request.rejectionReason = reason || '';
  
  await request.save();
  res.json(request);
}));

app.patch('/api/download-requests/:id/reset', asyncHandler(async (req, res) => {
  const request = await DownloadRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  
  request.status = 'pending';
  request.reviewedBy = null;
  request.reviewedAt = null;
  request.approvedAt = null;
  request.expiresAt = null;
  request.rejectionReason = '';
  
  await request.save();
  res.json(request);
}));

// ── User Management routes ──
app.get('/api/users', requireAdmin, asyncHandler(async (req, res) => {
  const users = await UserManagement.find().sort({ createdAt: -1 });
  res.json(users);
}));

app.post('/api/users/sync', asyncHandler(async (req, res) => {
  const { clerkId, email, firstName, lastName } = req.body;
  
  if (!clerkId || !email) {
    return res.status(400).json({ error: 'clerkId and email are required' });
  }
  
  // Check if this is an invited user
  const invitedUser = await UserManagement.findOne({ 
    email: email,
    status: 'invited'
  });
  
  if (invitedUser) {
    // Update invited user to active
    invitedUser.clerkId = clerkId;
    invitedUser.name = firstName || lastName || '';
    invitedUser.status = 'active';
    invitedUser.invitationToken = null;
    invitedUser.invitationExpiresAt = null;
    await invitedUser.save();
    
    return res.json({ 
      success: true, 
      message: 'User synced from invitation',
      role: invitedUser.role
    });
  }
  
  // Check if user already exists
  const existingUser = await UserManagement.findOne({ clerkId });
  if (existingUser) {
    return res.json({ 
      success: true, 
      message: 'User already exists',
      role: existingUser.role
    });
  }
  
  // Create new user as regular user
  const newUser = new UserManagement({
    clerkId,
    email,
    name: firstName || lastName || '',
    role: 'user',
    status: 'active'
  });
  await newUser.save();
  
  res.json({ 
    success: true, 
    message: 'User created',
    role: 'user'
  });
}));

// Validate invite via Clerk (check if invitation is still pending)
app.get('/api/users/invite/validate/:clerkId', asyncHandler(async (req, res) => {
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId, status: 'invited' });
  if (!user) {
    return res.status(404).json({ error: 'Invalid or expired invitation' });
  }
  res.json({ 
    valid: true, 
    email: user.email,
    invitedAt: user.invitedAt 
  });
}));

app.get('/api/users/me', asyncHandler(async (req, res) => {
  const { clerkId, email } = req.query;
  if (!clerkId && !email) return res.status(400).json({ error: 'clerkId or email required' });
  
  let user = null;
  if (clerkId) {
    user = await UserManagement.findOne({ clerkId });
  }
  // Fallback: try finding by email if clerkId didn't match
  if (!user && email) {
    user = await UserManagement.findOne({ email });
  }
  
  res.json(user);
}));

// Verify invitation token
app.get('/api/users/verify-invite', asyncHandler(async (req, res) => {
  const token = req.query.token;
  const email = req.query.email;
  
  console.log('Verify invite - token:', token, 'email:', email);
  
  if (!token || !email) {
    return res.status(400).json({ error: 'Token and email are required' });
  }
  
  const user = await UserManagement.findOne({ 
    email: email,
    invitationToken: token,
    status: 'invited'
  });
  
  console.log('Found user:', user ? 'yes' : 'no', 'status:', user?.status, 'token match:', user?.invitationToken === token);
  
  if (!user) {
    return res.status(404).json({ error: 'Invalid or expired invitation' });
  }
  
  if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
    return res.status(400).json({ error: 'Invitation has expired' });
  }
  
  res.json({ 
    valid: true, 
    email: user.email,
    invitedBy: user.invitedBy,
    expiresAt: user.invitationExpiresAt
  });
}));

app.patch('/api/users/:clerkId/role', requireSuperAdmin, asyncHandler(async (req, res) => {
  const { role, updatedBy } = req.body;
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  if (role === 'admin' || role === 'super_admin') {
    user.role = role;
  } else if (role === 'user') {
    user.role = 'user';
  }
  await user.save();
  res.json(user);
}));

app.post('/api/users/:clerkId/request-removal', requireAdmin, asyncHandler(async (req, res) => {
  const { reason, requestedBy } = req.body;
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'super_admin') return res.status(400).json({ error: 'Cannot request removal of super admin' });
  
  user.status = 'pending_removal';
  user.removalRequest = {
    requestedBy,
    reason,
    requestedAt: new Date(),
    reviewedBy: null,
    reviewedAt: null,
    approved: null
  };
  await user.save();
  res.json(user);
}));

app.patch('/api/users/:clerkId/approve-removal', requireSuperAdmin, asyncHandler(async (req, res) => {
  const { reviewedBy } = req.body;
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.status !== 'pending_removal') return res.status(400).json({ error: 'No pending removal request' });
  
  user.status = 'removed';
  user.removalRequest.approved = true;
  user.removalRequest.reviewedBy = reviewedBy;
  user.removalRequest.reviewedAt = new Date();
  await user.save();
  res.json(user);
}));

app.patch('/api/users/:clerkId/reject-removal', requireSuperAdmin, asyncHandler(async (req, res) => {
  const { reviewedBy } = req.body;
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.status = 'active';
  user.removalRequest = {
    requestedBy: null,
    reason: '',
    requestedAt: null,
    reviewedBy,
    reviewedAt: new Date(),
    approved: false
  };
  await user.save();
  res.json(user);
}));

app.get('/api/users/pending-removals', requireSuperAdmin, asyncHandler(async (req, res) => {
  const users = await UserManagement.find({ status: 'pending_removal' }).sort({ 'removalRequest.requestedAt': -1 });
  res.json(users);
}));

app.post('/api/users/invite', requireAdmin, asyncHandler(async (req, res) => {
  const { email, invitedBy } = req.body;
  
  // First check in our MongoDB - allow re-inviting if previous invite was cancelled or expired
  const existing = await UserManagement.findOne({ email });
  if (existing && existing.status === 'active') {
    return res.status(400).json({ error: 'User already exists and is active in database' });
  }
  if (existing && existing.status === 'invited') {
    return res.status(400).json({ error: 'User already has a pending invitation. Use resend instead.' });
  }
  
  try {
    // Check if user already exists in Clerk
    const clerkClient = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });
    
    // Try to get user by email - if exists, error
    try {
      const existingUser = await clerkClient.users.getUserByEmail(email);
      if (existingUser) {
        // If user exists in Clerk, just add to our DB as active
        if (existing) {
          existing.status = 'active';
          existing.clerkId = existingUser.id;
          existing.clerkInvitationId = null;
          existing.invitationToken = null;
          existing.invitationExpiresAt = null;
          await existing.save();
        } else {
          const newUser = new UserManagement({
            clerkId: existingUser.id,
            email,
            name: existingUser.firstName || existingUser.lastName || '',
            role: 'user',
            status: 'active',
            invitedBy,
            invitedAt: new Date()
          });
          await newUser.save();
        }
        return res.status(200).json({ 
          success: true,
          message: 'User exists in Clerk. Added to database as active user.',
          email 
        });
      }
    } catch (e) {
      // User doesn't exist in Clerk, which is what we want for new invitation
    }
    
    // Generate unique invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Get inviter name for the email
    let inviterName = 'An admin';
    try {
      const inviterUser = await UserManagement.findOne({ clerkId: invitedBy });
      if (inviterUser && inviterUser.name) {
        inviterName = inviterUser.name;
      }
    } catch (e) {
      // Ignore errors, use default
    }
    
    // Send invitation email via MailerSend
    const emailResult = await sendInvitationEmail(email, invitationToken, inviterName);
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send invitation email: ' + emailResult.error });
    }
    
    // If there was an existing record, update it; otherwise create new
    if (existing) {
      existing.clerkId = `invited_${Date.now()}`;
      existing.clerkInvitationId = null;
      existing.invitationToken = invitationToken;
      existing.invitationExpiresAt = invitationExpiresAt;
      existing.status = 'invited';
      existing.invitedAt = new Date();
      await existing.save();
    } else {
      const user = new UserManagement({
        clerkId: `invited_${Date.now()}`,
        email,
        name: '',
        role: 'user',
        status: 'invited',
        clerkInvitationId: null,
        invitationToken: invitationToken,
        invitationExpiresAt: invitationExpiresAt,
        invitedBy,
        invitedAt: new Date()
      });
      await user.save();
    }
    
    res.status(201).json({ 
      success: true,
      message: 'Invitation email sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Invitation error:', error);
    res.status(500).json({ error: 'Failed to send invitation: ' + error.message });
  }
}));

// Resend invitation via MailerSend
app.post('/api/users/:clerkId/resend-invite', requireAdmin, asyncHandler(async (req, res) => {
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.status !== 'invited') return res.status(400).json({ error: 'User is not in invited status' });
  
  try {
    // Generate new invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Get inviter name for the email
    let inviterName = 'An admin';
    try {
      const inviterUser = await UserManagement.findOne({ clerkId: user.invitedBy });
      if (inviterUser && inviterUser.name) {
        inviterName = inviterUser.name;
      }
    } catch (e) {
      // Ignore errors, use default
    }
    
    // Send invitation email via MailerSend
    const emailResult = await sendInvitationEmail(user.email, invitationToken, inviterName);
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to resend invitation email: ' + emailResult.error });
    }
    
    // Update our record
    user.invitationToken = invitationToken;
    user.invitationExpiresAt = invitationExpiresAt;
    user.invitedAt = new Date();
    await user.save();
    
    res.json({ success: true, message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ error: 'Failed to resend invitation: ' + error.message });
  }
}));

// Cancel invitation (remove from our DB)
app.delete('/api/users/:clerkId/cancel-invite', requireAdmin, asyncHandler(async (req, res) => {
  const user = await UserManagement.findOne({ clerkId: req.params.clerkId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.status !== 'invited') return res.status(400).json({ error: 'Can only cancel invited users' });
  
  // Remove from our database
  await UserManagement.deleteOne({ _id: user._id });
  res.json({ message: 'Invitation cancelled' });
}));

// ── Study Groups routes ──
app.get('/api/study-groups', asyncHandler(async (req, res) => {
  const groups = await StudyGroup.find().sort({ createdAt: -1 });
  res.json(groups);
}));

app.post('/api/study-groups', asyncHandler(async (req, res) => {
  const g = new StudyGroup(req.body);
  await g.save();
  res.status(201).json(g);
}));

app.delete('/api/study-groups/:id', asyncHandler(async (req, res) => {
  const deleted = await StudyGroup.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Study group not found' });
  res.json({ message: 'Study group deleted' });
}));

app.patch('/api/study-groups/:id/toggle', asyncHandler(async (req, res) => {
  const group = await StudyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Study group not found' });
  group.isActive = !group.isActive;
  await group.save();
  res.json(group);
}));

app.patch('/api/study-groups/:id/membership', asyncHandler(async (req, res) => {
  const { userId, action } = req.body; // action: 'join' | 'leave'
  const group = await StudyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Study group not found' });

  const alreadyMember = group.members.includes(userId);
  if (action === 'join' && !alreadyMember) {
    if (group.memberCount >= 15) return res.status(400).json({ error: 'Group is full' });
    group.members.push(userId);
    group.memberCount += 1;
  } else if (action === 'leave' && alreadyMember) {
    group.members = group.members.filter(u => u !== userId);
    group.memberCount = Math.max(0, group.memberCount - 1);
  }
  await group.save();
  res.json(group);
}));

// ── Challenge Participants routes ──
app.get('/api/challenge-participants', asyncHandler(async (req, res) => {
  const participants = await ChallengeParticipant.find();
  // Return counts per challengeId and optionally which ones current user joined
  const { userId } = req.query;
  const counts = {};
  const joined = {};
  for (const p of participants) {
    counts[p.challengeId] = (counts[p.challengeId] || 0) + 1;
    if (userId && p.userId === userId) joined[p.challengeId] = true;
  }
  res.json({ counts, joined });
}));

app.post('/api/challenge-participants', asyncHandler(async (req, res) => {
  const { challengeId, userId } = req.body;
  if (!challengeId || !userId) return res.status(400).json({ error: 'challengeId and userId required' });
  // Check slot limit
  const count = await ChallengeParticipant.countDocuments({ challengeId });
  if (count >= 15) return res.status(400).json({ error: 'Challenge is full' });
  try {
    const p = await ChallengeParticipant.create({ challengeId, userId });
    res.status(201).json(p);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Already joined' });
    throw e;
  }
}));

// ── Define schemas and models ──
const requestSchema = new mongoose.Schema({
  userName: String,
  resourceName: String,
  resourceType: String,
  notes: { type: String, default: '' },
  requestDate: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' },
  upvotes: { type: [String], default: [] },
});
const addedResourceSchema = new mongoose.Schema({
  name: String,
  link: String,
  category: String,
  type: String,
  tags: { type: [String], default: [] },
  addedBy: { type: String, default: '' },
});

const Request = mongoose.model('Request', requestSchema);
const AddedResource = mongoose.model('AddedResource', addedResourceSchema);

// Validation schemas
const validateRequest = (data) => {
  const schema = Joi.object({
    userName: Joi.string().required(),
    resourceName: Joi.string().required(),
    resourceType: Joi.string().required(),
    notes: Joi.string().allow('').optional(),
    requestDate: Joi.date().optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending'),
  });
  return schema.validate(data);
};

const validateResource = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    link: Joi.string().uri().required(),
    category: Joi.string().required(),
    type: Joi.string().required(),
    tags: Joi.array().items(Joi.string()),
    addedBy: Joi.string().allow('').optional(),
  });
  return schema.validate(data);
};

// API routes
app.get('/', (req, res) => {
  res.send('Welcome to the Cloud Study Resource Hub API!');
});

// Get all requests with pagination
app.get('/api/requests', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const requests = await Request.find()
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const totalRequests = await Request.countDocuments();
  res.json({ total: totalRequests, page: Number(page), limit: Number(limit), data: requests });
}));

// Create a new request
app.post('/api/requests', asyncHandler(async (req, res) => {
  const { error } = validateRequest(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const newRequest = new Request(req.body);
  await newRequest.save();
  res.json(newRequest);
}));

// Update a request
app.put('/api/requests/:id', asyncHandler(async (req, res) => {
  const updatedRequest = await Request.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updatedRequest) return res.status(404).json({ error: 'Request not found' });
  res.json(updatedRequest);
}));

// Upvote / un-upvote a request
app.patch('/api/requests/:id/upvote', asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const request = await Request.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  const already = request.upvotes.includes(userId);
  if (already) {
    request.upvotes = request.upvotes.filter(u => u !== userId);
  } else {
    request.upvotes.push(userId);
  }
  await request.save();
  res.json({ upvotes: request.upvotes });
}));

// Delete a request
app.delete('/api/requests/:id', asyncHandler(async (req, res) => {
  const deletedRequest = await Request.findByIdAndDelete(req.params.id);
  if (!deletedRequest) return res.status(404).json({ error: 'Request not found' });
  res.json({ message: 'Request deleted' });
}));

// Get all added resources with pagination and tag filtering
app.get('/api/added-resources', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, tags = "" } = req.query;
  const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : []; // Do not convert tags to lowercase

  let query = {};
  if (tagArray.length > 0) {
    query.tags = { $in: tagArray }; // Match tags exactly as they are
  }

  const resources = await AddedResource.find(query)
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const totalResources = await AddedResource.countDocuments(query);
  res.json({ total: totalResources, page: Number(page), limit: Number(limit), data: resources });
}));


// Create a new added resource
app.post('/api/added-resources', asyncHandler(async (req, res) => {
  const { error } = validateResource(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const newResource = new AddedResource(req.body);
  await newResource.save();
  res.status(201).json(newResource);
}));

// Update a resource
app.put('/api/added-resources/:id', asyncHandler(async (req, res) => {
  const updatedResource = await AddedResource.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updatedResource) return res.status(404).json({ error: 'Resource not found' });
  res.json(updatedResource);
}));

// Delete a resource
app.delete('/api/added-resources/:id', asyncHandler(async (req, res) => {
  const deletedResource = await AddedResource.findByIdAndDelete(req.params.id);
  if (!deletedResource) return res.status(404).json({ error: 'Resource not found' });
  res.json({ message: 'Resource deleted' });
}));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
