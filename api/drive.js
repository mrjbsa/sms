/* Same-origin read proxy for the school / registry JSON files on Google Drive.
   Why: some networks and browsers block direct browser requests to googleapis.com ("Failed to fetch"), and the API key
   may be restricted to certain websites. This runs on the server (Vercel), so every device — phone, PC, any network —
   reads the data the same way. It only returns JSON files and never exposes anything that is not already shared
   "anyone with the link". */
const KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCfwHvrZJLTr30ERbiUngugaxcm1Eq4r1g';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = String((req.query && req.query.id) || '');
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(id)) { res.status(400).json({ error: { message: 'bad id' } }); return; }
  try {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${KEY}`, {
      headers: { Referer: `https://${host}/`, Accept: 'application/json' },
    });
    const text = await r.text();
    if (!r.ok) { res.status(r.status).setHeader('Content-Type', 'application/json').send(text); return; }
    if (text.length > 8 * 1024 * 1024) { res.status(413).json({ error: { message: 'file too large' } }); return; }
    try { JSON.parse(text); } catch (e) { res.status(415).json({ error: { message: 'not a JSON file' } }); return; }
    res.status(200).setHeader('Content-Type', 'application/json; charset=utf-8').send(text);
  } catch (e) {
    res.status(502).json({ error: { message: 'could not reach Google Drive: ' + ((e && e.message) || 'error') } });
  }
};
