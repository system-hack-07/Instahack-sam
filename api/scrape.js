const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "No username" });

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    const response = await axios.get(`https://www.instagram.com/${username}/`, { headers, timeout: 15000 });
    const html = response.data;
    const $ = cheerio.load(html);
    let posts = [];

    $('script[type="application/json"]').each((i, script) => {
      const content = $(script).html();
      if (content && (content.includes('image_versions2') || content.includes('polaris_timeline'))) {
        try {
          const data = JSON.parse(content);
          posts = posts.concat(extractPosts(data));
        } catch (e) {}
      }
    });

    const uniquePosts = Array.from(new Map(posts.map(p => [p.url, p])).values());

    res.json({
      success: true,
      username,
      total: uniquePosts.length,
      posts: uniquePosts.slice(0, 30)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Fetch failed" });
  }
};

function extractPosts(obj) {
  let posts = [];
  function recurse(o) {
    if (!o) return;
    if (o.image_versions2?.candidates) {
      const best = o.image_versions2.candidates.sort((a, b) => (b.width||0)*(b.height||0) - (a.width||0)*(a.height||0))[0];
      if (best?.url) posts.push({ id: o.pk || Date.now().toString(), url: best.url });
    }
    if (typeof o === 'object') Object.values(o).forEach(recurse);
  }
  recurse(obj);
  return posts;
}
