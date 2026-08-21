import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS Headers for API
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

    // Collect buffer from stream
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'EMPTY_FILE', message: 'No file content received' });
    }

    // 1. Primary: Vercel Blob (if token configured in Vercel)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(cleanFilename, buffer, {
          access: 'public',
          contentType,
          addRandomSuffix: true
        });

        if (blob?.url) {
          return res.status(200).json({
            success: true,
            url: blob.url,
            storageKey: blob.pathname,
            provider: 'vercel-blob'
          });
        }
      } catch (blobErr) {
        console.warn('[API /api/upload] Vercel Blob error, falling back to permanent storage:', blobErr);
      }
    }

    // 2. Permanent Object Storage via Server-Side Cloudflare CDN
    try {
      const fileBlob = new Blob([buffer], { type: contentType });
      const formData = new FormData();
      formData.append('source', fileBlob, cleanFilename);
      formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
      formData.append('action', 'upload');

      const cloudRes = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData
      });

      if (cloudRes.ok) {
        const json = await cloudRes.json();
        const directUrl = json?.image?.url || json?.image?.display_url;
        if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('https://')) {
          return res.status(200).json({
            success: true,
            url: directUrl,
            storageKey: `vehicles/${cleanFilename}`,
            provider: 'permanent-cdn'
          });
        }
      }
    } catch (cdnErr) {
      console.warn('[API /api/upload] Server-side CDN error:', cdnErr);
    }

    return res.status(500).json({
      success: false,
      error: 'STORAGE_UNAVAILABLE',
      message: 'Failed to store image in persistent object storage.'
    });
  } catch (err) {
    console.error('[API /api/upload] Handler error:', err);
    return res.status(500).json({
      success: false,
      error: 'UPLOAD_FAILED',
      message: err.message || 'Internal upload error'
    });
  }
}
