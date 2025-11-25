export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check if body exists
  if (!req.body) {
    return res.status(200).json({ status: "Running", message: "Proxy is active." });
  }

  const { targetUrl, method, headers, body } = req.body;

  // Validate target URL
  if (!targetUrl) return res.status(400).json({ error: 'Target URL is required' });

  // Auto-add protocol if missing
  let finalUrl = targetUrl;
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = 'https://' + finalUrl;
  }

  try {
    const requestHeaders = headers ? JSON.parse(headers) : {};
    if (!requestHeaders['User-Agent']) {
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    // Set timeout to 15 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(finalUrl, {
      method: method || 'GET',
      headers: requestHeaders,
      body: body && (method === 'POST' || method === 'PUT') ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    // Handle response based on content type
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

  } catch (error) {
    console.error("Proxy Fetch Error:", error);
    const errorDetails = error.name === 'AbortError' ? 'Target server timed out (Geo-blocking?)' : error.message;
    
    return res.status(500).json({ 
      error: 'Proxy Connection Failed', 
      details: errorDetails
    });
  }
}