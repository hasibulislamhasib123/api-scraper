export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { targetUrl, method, headers, body } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: method || 'GET',
      headers: headers ? JSON.parse(headers) : {},
      body: body ? JSON.stringify(body) : undefined
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text); // টেক্সট বা HTML আসলে সরাসরি পাঠিয়ে দিবে
    }

  } catch (error) {
    return res.status(500).json({ error: 'Proxy Error', details: error.message });
  }
}