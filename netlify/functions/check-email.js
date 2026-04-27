const admin = require('firebase-admin');

// Initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    })
  });
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) return { statusCode: 400, headers, body: JSON.stringify({ exists: false }) };

    await admin.auth().getUserByEmail(email);
    // User found
    return { statusCode: 200, headers, body: JSON.stringify({ exists: true }) };
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      return { statusCode: 200, headers, body: JSON.stringify({ exists: false }) };
    }
    // Any other error → don't block the user, assume exists
    return { statusCode: 200, headers, body: JSON.stringify({ exists: true, error: e.message }) };
  }
};
