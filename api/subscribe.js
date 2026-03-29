export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, captcha } = req.body;

  if (!email || !captcha) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Verify reCAPTCHA
  const captchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_SECRET}&response=${captcha}`
  });
  const captchaData = await captchaRes.json();
  if (!captchaData.success) {
    return res.status(400).json({ error: 'Invalid captcha' });
  }

  // Add contact to Brevo
  const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      email,
      listIds: [3],
      updateEnabled: true
    })
  });

  if (brevoRes.ok || brevoRes.status === 204) {
    return res.status(200).json({ success: true });
  } else {
    const err = await brevoRes.json();
    console.error('Brevo error:', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
