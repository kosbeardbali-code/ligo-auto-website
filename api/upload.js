import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Filename, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      hasVercelBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasCloudinary: !!process.env.CLOUDINARY_URL || !!process.env.CLOUDINARY_CLOUD_NAME
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawFilename = req.headers['x-filename'] || `photo_${Date.now()}.webp`;
    const cleanFilename = decodeURIComponent(String(rawFilename)).replace(/[^a-zA-Z0-9._/-]/g, '_');
    const contentType = req.headers['content-type'] || 'image/webp';

    // 1. Primary: Vercel Blob (native Vercel object storage)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(cleanFilename, req, {
        access: 'public',
        contentType,
        addRandomSuffix: true
      });

      return res.status(200).json({
        success: true,
        url: blob.url,
        storageKey: blob.pathname,
        provider: 'vercel-blob'
      });
    }

    return res.status(503).json({
      success: false,
      error: 'STORAGE_UNCONFIGURED',
      message: 'Vercel Blob is not connected. Please add a Blob store in your Vercel Dashboard under Storage -> Blob.'
    });
  } catch (err) {
    console.error('[API /api/upload] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'UPLOAD_FAILED',
      message: err.message || 'Internal upload error'
    });
  }
}
