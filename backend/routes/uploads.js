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
  if (!fileName) {
    return res.status(400).json({ error: 'fileName required' });
  }

  // Allow by MIME type or by file extension (browsers report mkv inconsistently)
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    'video/mkv', 'video/avi', 'video/x-msvideo', 'audio/mpeg', 'audio/webm',
    'application/octet-stream'];
  const allowedExts = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'mp3', 'm4a'];
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  const typeOk = !contentType || allowedTypes.includes(contentType);
  const extOk = allowedExts.includes(ext);
  if (!typeOk && !extOk) {
    return res.status(400).json({ error: 'Only video/audio files are allowed (mp4, webm, mkv, mov, avi)' });
  }

  // Use a safe content type if browser sends something odd
  const safeContentType = allowedTypes.includes(contentType) ? contentType : 'application/octet-stream';

  const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
  const { fileSize } = req.body;
  if (fileSize && Number(fileSize) > MAX_BYTES) {
    return res.status(400).json({ error: 'File exceeds 500 MB limit' });
  }

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: fileName,
    ContentType: safeContentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

  res.json({ uploadUrl, publicUrl });
});

module.exports = router;
