export default async function handler(req, res) {
  // CORS Headers (যাতে ফ্রন্টএন্ড থেকে যেকোনো ডোমেইন কল করতে পারে)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // প্রি-ফ্লাইট রিকোয়েস্ট হ্যান্ডলিং
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ফ্রন্টএন্ড থেকে পাঠানো ডেটা রিসিভ করা
  let { targetUrl, method, headers, body } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  // ১. স্মার্ট প্রটোকল ডিটেকশন:
  // যদি ইউজার ভুল করে http/https না দেয়, আমরা ডিফল্ট হিসেবে https জুড়ে দিব।
  // তবে ইউজার যদি http দেয়, আমরা সেটাকে রেসপেক্ট করব (কারণ আপনার ইনসিকিউর API দরকার হতে পারে)।
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    // হেডার্স প্রসেসিং
    const requestHeaders = headers ? JSON.parse(headers) : {};

    // ২. ব্রাউজার ইমুলেশন:
    // কিছু API সার্ভার থেকে আসা রিকোয়েস্ট ব্লক করে দেয়। তাই আমরা একটি ফেইক ব্রাউজার ইউজার এজেন্ট দিচ্ছি।
    if (!requestHeaders['User-Agent']) {
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    // ৩. রিকোয়েস্ট পাঠানো:
    // Vercel এর সার্ভার থেকে রিকোয়েস্ট যাচ্ছে, তাই এখানে HTTP বা HTTPS কোনো সমস্যাই না।
    // Mixed Content এরর এখানে হবে না।
    const response = await fetch(targetUrl, {
      method: method || 'GET',
      headers: requestHeaders,
      body: body && (method === 'POST' || method === 'PUT' || method === 'PATCH') ? JSON.stringify(body) : undefined
    });

    // ৪. রেসপন্স হ্যান্ডলিং (যেকোনো ফরম্যাট সাপোর্ট করার জন্য):
    const contentType = response.headers.get("content-type");

    // যদি রেসপন্স JSON হয়
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      // যদি রেসপন্স JSON না হয় (যেমন: প্লেইন টেক্সট বা HTML এরর পেজ)
      const text = await response.text();
      try {
        // টেক্সটটা যদি আসলে JSON স্ট্রিং হয়, পার্স করার চেষ্টা করি
        const possibleJson = JSON.parse(text);
        return res.status(response.status).json(possibleJson);
      } catch (e) {
        // একদমই জঞ্জাল ডাটা আসলে সেটাকে একটা অবজেক্টের মধ্যে ভরে পাঠাই, যাতে ফ্রন্টএন্ড না ভাঙ্গে
        return res.status(response.status).json({ 
          message: "Non-JSON response received from Target API", 
          raw_content: text,
          status: response.status 
        });
      }
    }

  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).json({ 
      error: 'Failed to fetch data via proxy', 
      details: error.message 
    });
  }
}