const express = require('express');
const db = require('../db/db');

module.exports = function (app) {
  const router = express.Router();

  router.get('/api/resources', (req, res) => {
    const posts = db.prepare('SELECT * FROM blog_posts ORDER BY published_at DESC').all();
    res.json({ posts });
  });

  router.get('/api/resources/:slug', (req, res) => {
    const post = db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(req.params.slug);
    if (!post) {
      return res.status(404).json({ error: 'not_found', message: "That article doesn't exist (yet)." });
    }
    const related = db.prepare('SELECT * FROM blog_posts WHERE slug != ? ORDER BY published_at DESC LIMIT 3').all(req.params.slug);
    res.json({ post, related });
  });

  app.use('/', router);
};
