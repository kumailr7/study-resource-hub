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
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests like curl/postman with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy does not allow access from ${origin}`), false);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// ── New collections: Sessions, Study Groups, Challenge Participants ──

const sessionSchema = new mongoose.Schema({
  author: { type: String, required: true },
  topic: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
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

const SessionModel = mongoose.model('Session', sessionSchema);
const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
const ChallengeParticipant = mongoose.model('ChallengeParticipant', challengeParticipantSchema);

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
