export default function handler(req, res) {
  const CLIENT_ID = '1497679566897156156'; // Substitua pelo seu ID
  const REDIRECT_URI = encodeURIComponent('https://fault-one.vercel.app/api/callback');
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&scope=identify&state=${state}`;
  
  res.redirect(authUrl);
}
