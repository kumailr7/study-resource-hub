const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const router = express.Router();

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// POST /api/upload-url
// Body: { fileName: string, contentType: string }
// Returns: { uploadUrl, publicUrl }
router.post('/upload-url', async (req, res) => {
  const { fileName, contentType } = req.body;
  if (!fileName || !contentType) {
    return res.status(400).json({ error: 'fileName and contentType required' });
  }

  // Only allow video/audio content types
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'audio/mpeg', 'audio/webm'];
  if (!allowed.includes(contentType)) {
    return res.status(400).json({ error: 'Only video/audio files are allowed' });
  }

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: fileName,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

  res.json({ uploadUrl, publicUrl });
});

module.exports = router;
