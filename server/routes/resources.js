const express = require('express');
const db = require('../db/db');

module.exports = function (app) {
  const router = express.Router();

  router.get('/api/resources', async (req, res) => {
    const posts = await db.all('SELECT * FROM blog_posts ORDER BY published_at DESC');
    res.json({ posts });
  });

  router.get('/api/resources/:slug', async (req, res) => {
    const post = await db.get('SELECT * FROM blog_posts WHERE slug = ?', [req.params.slug]);
    if (!post) {
      return res.status(404).json({ error: 'not_found', message: "That article doesn't exist (yet)." });
    }
    const related = await db.all('SELECT * FROM blog_posts WHERE slug != ? ORDER BY published_at DESC LIMIT 3', [req.params.slug]);
    res.json({ post, related });
  });

  app.use('/', router);
};
