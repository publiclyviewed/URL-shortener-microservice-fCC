require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const { MongoClient } = require('mongodb');

const app = express();
const client = new MongoClient(process.env.MONGO_URI);
const db = client.db('urlshortener');
const urls = db.collection('urls');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => res.sendFile(process.cwd() + '/views/index.html'));

app.post('/api/shorturl', async (req, res) => {
  const url = req.body.url;
  const urlRegex = /^(https?:\/\/)(www\.)?[a-zA-Z0-9-]+\.[a-z]{2,}.*$/;

  if (!urlRegex.test(url)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const hostname = new URL(url).hostname;
    dns.lookup(hostname, async (err) => {
      if (err) return res.json({ error: 'invalid url' });

      const existingUrl = await urls.findOne({ url });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.url,
          short_url: existingUrl.short_url,
        });
      }

      const urlCount = await urls.countDocuments({});
      const urlDoc = { url, short_url: urlCount + 1 };
      await urls.insertOne(urlDoc);
      res.json({ original_url: url, short_url: urlCount + 1 });
    });
  } catch (error) {
    res.json({ error: 'invalid url' });
  }
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const shorturl = parseInt(req.params.short_url, 10);
  if (isNaN(shorturl)) {
    return res.json({ error: 'invalid short url' });
  }

  try {
    const urlDoc = await urls.findOne({ short_url: shorturl });
    if (!urlDoc) {
      return res.json({ error: 'No URL found' });
    }
    res.redirect(urlDoc.url);
  } catch {
    res.json({ error: 'invalid short url' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Listening on port 3000'));

