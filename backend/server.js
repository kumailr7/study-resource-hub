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

// Load environment variables
config();
const { cleanEnv, str, port } = envalid;
cleanEnv(process.env, {
  PORT: port(),
  MONGODB_URI: str(),
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(expressMongoSanitize());

// Routes
app.use("/api", loginRoutes); // Prefix login routes with `/api`
app.use("/api/users", userRoutes); // Use user routes


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define schemas and models
const requestSchema = new mongoose.Schema({
  userName: String,
  resourceName: String,
  resourceType: String,
  requestDate: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' },
});
const addedResourceSchema = new mongoose.Schema({
  name: String,
  link: String,
  category: String,
  type: String,
  tags: { type: [String], default: [] },
});

const Request = mongoose.model('Request', requestSchema);
const AddedResource = mongoose.model('AddedResource', addedResourceSchema);

// Validation schemas
const validateRequest = (data) => {
  const schema = Joi.object({
    userName: Joi.string().required(),
    resourceName: Joi.string().required(),
    resourceType: Joi.string().required(),
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
