export default async function handler(req, res) {
  const { code } = req.query;
  const CLIENT_ID = '1497679566897156156'; // Substitua pelo seu ID
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET; // Configurado na Vercel

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://ioxx-mu.vercel.app/api/callback'
    })
  });

  const data = await response.json();
  res.redirect(`/?access_token=${data.access_token}`);
}
