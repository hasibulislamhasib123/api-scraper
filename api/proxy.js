export default async function handler(req, res) {
  // 1. Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle pre-flight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 3. Safety check: If no body exists (e.g., browser visit), show message
    if (!req.body) {
      return res.status(200).json({ 
        status: "Running", 
        message: "Proxy server is active. Please send a POST request with 'targetUrl'." 
      });
    }

    const { targetUrl, method, headers, body } = req.body;

    // 4. Validate target URL
    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL is required inside request body.' });
    }

    // Smart URL fix (add http/https if not present)
    let finalUrl = targetUrl;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    // 5. Request processing
    const requestHeaders = headers ? JSON.parse(headers) : {};
    
    // Browser agent fix (to prevent site blocking)
    if (!requestHeaders['User-Agent']) {
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (Vercel Proxy Service)';
    }

    // Actual fetch request
    const response = await fetch(finalUrl, {
      method: method || 'GET',
      headers: requestHeaders,
      body: body && (method === 'POST' || method === 'PUT') ? JSON.stringify(body) : undefined
    });

    // 6. Response handling (JSON or Text)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      // Wrap text in JSON to prevent frontend issues
      return res.status(response.status).send(text);
    }

  } catch (error) {
    // 7. Error handling (send error message without crashing)
    console.error("Proxy Error:", error);
    return res.status(500).json({ 
      error: 'Proxy Internal Error', 
      details: error.message 
    });
  }
}