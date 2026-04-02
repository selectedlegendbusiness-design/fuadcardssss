export async function uploadImageToR2(blob: Blob, filename: string): Promise<string> {
  const baseUrl = import.meta.env.VITE_WORKER_URL || 'https://fuadcards.selectedlegendbusiness.workers.dev';
  const url = `${baseUrl.replace(/\/$/, '')}/${filename}`;
  const authKey = import.meta.env.VITE_WORKER_AUTH_KEY || '1234@';

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': authKey,
      'Content-Type': blob.type,
      'Cache-Control': 'public, max-age=31536000'
    },
    body: blob
  });

  if (!response.ok) {
    throw new Error('Failed to upload image to R2');
  }

  return url;
}
