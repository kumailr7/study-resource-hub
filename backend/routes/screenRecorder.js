const express = require('express');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const router = express.Router();
const crypto = require('crypto');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// POST /api/screen-record/auth
// Body: { password }
// Returns: { success: true }
router.post('/screen-record/auth', async (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.SCREEN_RECORDER_PASSWORD;

  if (password && password === expectedPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// POST /api/screen-record/upload-url
// Headers: x-upload-password
// Body: { author?, title?, tags? }
// Returns: { presignedUrl, key }
router.post('/screen-record/upload-url', async (req, res) => {
  const password = req.headers['x-upload-password'];
  const expectedPassword = process.env.SCREEN_RECORDER_PASSWORD;

  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { author = 'user', title = 'recording', tags = '' } = req.body;
  
  // Generate filename: author-tags-title-date.webm
  const date = new Date().toISOString().split('T')[0];
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  const safeTags = tags ? `-${tags.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : '';
  const uuid = crypto.randomUUID().slice(0, 8);
  const key = `${author}${safeTags}-${safeTitle}-${date}-${uuid}.webm`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: 'video/webm',
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

  res.json({ presignedUrl, key });
});

// GET /api/screen-record/video/:key
// Returns signed URL to view video
router.get('/screen-record/video/:key', async (req, res) => {
  const { key } = req.params;
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url: signedUrl });
  } catch (err) {
    console.error('Error getting video URL:', err);
    res.status(404).json({ error: 'Video not found' });
  }
});

module.exports = router;