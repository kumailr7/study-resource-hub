const express = require('express');
const { S3Client, GetObjectCommand, PutObjectCommand, GetObjectCommandOutput } = require('@aws-sdk/client-s3');
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

// Convert VTT format for web captions
function toVTT(transcript) {
  let vtt = "WEBVTT\n\n";
  let index = 1;
  
  if (transcript.paragraphs && transcript.paragraphs.length > 0) {
    for (const para of transcript.paragraphs) {
      if (para.text) {
        const start = formatVTTTime(para.start);
        const end = formatVTTTime(para.end);
        vtt += `${index}\n${start} --> ${end}\n${para.text}\n\n`;
        index++;
      }
    }
  } else if (transcript.words && transcript.words.length > 0) {
    // Fallback: word-by-word
    let currentStart = 0;
    let currentWords = [];
    const words = transcript.words;
    
    for (let i = 0; i < words.length; i++) {
      currentWords.push(words[i].text);
      // Create new caption every ~5 words or 3 seconds
      if (currentWords.length >= 5 || (words[i].end - currentStart > 3000)) {
        const start = formatVTTTime(currentStart);
        const end = formatVTTTime(words[i].end);
        vtt += `${index}\n${start} --> ${end}\n${currentWords.join(' ')}\n\n`;
        index++;
        currentStart = words[i].end;
        currentWords = [];
      }
    }
    // Last segment
    if (currentWords.length > 0) {
      const start = formatVTTTime(currentStart);
      const end = formatVTTTime(words[words.length - 1].end);
      vtt += `${index}\n${start} --> ${end}\n${currentWords.join(' ')}\n\n`;
    }
  }
  
  return vtt;
}

function formatVTTTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

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
  
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflare-dev.com`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: 'video/webm',
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  res.json({ presignedUrl, key, publicUrl });
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

// POST /api/screen-record/transcribe
// Body: { videoKey }
// Returns: { captionsUrl, vttKey }
router.post('/screen-record/transcribe', async (req, res) => {
  const { videoKey } = req.body;
  
  if (!videoKey) {
    return res.status(400).json({ error: 'videoKey is required' });
  }

  try {
    const AssemblyAI = require('assemblyai').default || require('assemblyai');
    const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    
    console.log('[Transcribe] Starting transcription for:', videoKey);
    
    // Get video URL from R2
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: videoKey,
    });
    const videoUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
    
    // Submit transcription request
    const transcript = await aai.transcripts.transcribe({
      audio: videoUrl,
      speech_model: 'universal-3-pro',
    });
    
    console.log('[Transcribe] Completed, id:', transcript.id);
    
    // Convert to VTT
    const vttContent = toVTT(transcript);
    const vttKey = videoKey.replace('.webm', '.vtt');
    
    // Upload VTT to R2
    const vttCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: `captions/${vttKey}`,
      Body: vttContent,
      ContentType: 'text/vtt',
    });
    
    await s3.send(vttCommand);
    
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
    const captionsUrl = `${R2_PUBLIC_URL}/captions/${vttKey}`;
    
    res.json({ captionsUrl, vttKey });
  } catch (err) {
    console.error('[Transcribe] Error:', err);
    res.status(500).json({ error: 'Transcription failed: ' + err.message });
  }
});

module.exports = router;