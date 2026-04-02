/**
 * Cloudflare Worker for R2 Image Hosting
 * 
 * This worker handles:
 * 1. PUT requests to upload images (requires Authorization header)
 * 2. GET requests to serve images (with CORS and Cache-Control)
 * 3. OPTIONS requests for CORS preflight
 * 
 * Setup Instructions:
 * 1. Create an R2 bucket named "fuadcards-images"
 * 2. Create a new Cloudflare Worker
 * 3. Bind the R2 bucket to the worker with the variable name "MY_BUCKET"
 * 4. Add the secret "AUTH_KEY" with value "1234@"
 * 5. Add the secret "ALLOWED_ORIGIN" with value "https://fuadcards.pages.dev" (or "*" for testing)
 */

export interface Env {
  MY_BUCKET: R2Bucket;
  AUTH_KEY: string;
  ALLOWED_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // Remove leading slash

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Handle GET requests (Serve Images)
    if (request.method === 'GET') {
      if (!key) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      try {
        const object = await env.MY_BUCKET.get(key);

        if (object === null) {
          return new Response('Object Not Found', { status: 404, headers: corsHeaders });
        }

        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        // Force cache for 1 year to help with Google Indexing
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(object.body, {
          headers,
        });
      } catch (e: any) {
        return new Response(`Error retrieving object: ${e.message}`, { status: 500, headers: corsHeaders });
      }
    }

    // Handle PUT requests (Upload Images)
    if (request.method === 'PUT') {
      if (!key) {
        return new Response('Missing key', { status: 400, headers: corsHeaders });
      }

      // Check Authorization
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== env.AUTH_KEY) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      try {
        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
        
        await env.MY_BUCKET.put(key, request.body, {
          httpMetadata: {
            contentType: contentType,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        return new Response(`Put ${key} successfully!`, {
          status: 200,
          headers: corsHeaders,
        });
      } catch (e: any) {
        return new Response(`Error putting object: ${e.message}`, { status: 500, headers: corsHeaders });
      }
    }

    // Reject other methods
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        ...corsHeaders,
        'Allow': 'GET, PUT, OPTIONS',
      },
    });
  },
};
