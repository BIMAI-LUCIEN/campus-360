import crypto from 'node:crypto';

export interface CloudinaryUploadResult {
  asset_id: string;
  public_id: string;
  version: number;
  format: string;
  resource_type: string;
  bytes: number;
  url: string;
  secure_url: string;
  pages?: number;
}

export const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are not configured.');
  }

  return { cloudName, apiKey, apiSecret };
};

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );

export const uploadToCloudinary = async (
  bytes: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    resourceType?: 'image' | 'raw' | 'auto';
  } = {},
): Promise<CloudinaryUploadResult> => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  const resourceType = options.resourceType || 'image';
  const folder = options.folder || 'campus-360/documents';
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const base64Data = `data:application/pdf;base64,${bytes.toString('base64')}`;

  const params: Record<string, string> = {
    folder,
    timestamp: timestamp.toString(),
  };

  if (options.publicId) {
    params.public_id = options.publicId;
  }

  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys.map((key) => `${key}=${params[key]}`).join('&') + apiSecret;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  const formData = new URLSearchParams();
  formData.append('file', base64Data);
  formData.append('api_key', apiKey);
  formData.append('signature', signature);
  for (const [k, v] of Object.entries(params)) {
    formData.append(k, v);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Cloudinary] Upload error:', response.status, errorText);
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  return (await response.json()) as CloudinaryUploadResult;
};

export const getCloudinaryPageImageUrl = (secureUrl: string, page = 1) => {
  if (!secureUrl.includes('cloudinary.com')) return secureUrl;
  if (secureUrl.includes('/image/upload/')) {
    return secureUrl
      .replace('/image/upload/', `/image/upload/pg_${page}/`)
      .replace(/\.pdf$/i, '.jpg');
  }
  return secureUrl;
};
