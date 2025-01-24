const mongoose = require('mongoose');
require('dotenv').config();

const requestSchema = new mongoose.Schema({
  userName: String,
  resourceName: String,
  resourceType: String,
  requestDate: String,
  status: { type: String, default: 'pending' }
});

const addedResourceSchema = new mongoose.Schema({
  name: String,
  link: String,
  category: String,
  type: String,
  tags: [String]
});

const Request = mongoose.model('Request', requestSchema);
const AddedResource = mongoose.model('AddedResource', addedResourceSchema);

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    const collections = await mongoose.connection.db.listCollections().toArray();
    const requestsCollectionExists = collections.some(col => col.name === 'requests');
    const addedResourcesCollectionExists = collections.some(col => col.name === 'addedresources');

    if (!requestsCollectionExists) {
      await Request.init();
      console.log('Requests collection created');
    } else {
      console.log('Requests collection already exists');
    }

    if (!addedResourcesCollectionExists) {
      await AddedResource.init();
      console.log('Added Resources collection created');
    } else {
      console.log('Added Resources collection already exists');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

migrate(); 