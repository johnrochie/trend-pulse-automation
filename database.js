const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './articles.db';
    this.db = new sqlite3.Database(this.dbPath);
    this.initDatabase();
  }

  initDatabase() {
    const createArticlesTable = `
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        url TEXT,
        image_url TEXT,
        source_name TEXT,
        category TEXT,
        published_at DATETIME,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        generated_at DATETIME,
        published_at_site DATETIME,
        status TEXT DEFAULT 'fetched', -- fetched, generated, published, error
        ai_generated_content TEXT,
        tags TEXT,
        trending_score INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createProcessedUrlsTable = `
      CREATE TABLE IF NOT EXISTS processed_urls (
        url TEXT PRIMARY KEY,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT
      )
    `;

    this.db.serialize(() => {
      this.db.run(createArticlesTable);
      this.db.run(createProcessedUrlsTable);
      console.log('✅ Database initialized');
    });
  }

  async articleExists(sourceId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id FROM articles WHERE source_id = ?',
        [sourceId],
        (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        }
      );
    });
  }

  async urlProcessed(url) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT url FROM processed_urls WHERE url = ?',
        [url],
        (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        }
      );
    });
  }

  async saveArticle(article) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO articles (
          source_id, title, description, url, image_url, 
          source_name, category, published_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        article.sourceId,
        article.title,
        article.description,
        article.url,
        article.imageUrl,
        article.sourceName,
        article.category,
        article.publishedAt,
        'fetched'
      ];

      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        resolve(this.lastID);
      });
    });
  }

  async markUrlProcessed(url, status = 'processed') {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT OR REPLACE INTO processed_urls (url, status) VALUES (?, ?)';
      this.db.run(sql, [url, status], function(err) {
        if (err) reject(err);
        resolve();
      });
    });
  }

  async getArticlesToGenerate(limit = 5) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM articles 
        WHERE status = 'fetched' 
        AND ai_generated_content IS NULL
        ORDER BY published_at DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  async updateArticleWithAIContent(articleId, aiContent) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE articles 
        SET ai_generated_content = ?, 
            generated_at = CURRENT_TIMESTAMP,
            status = 'generated'
        WHERE id = ?
      `;
      
      this.db.run(sql, [aiContent, articleId], function(err) {
        if (err) reject(err);
        resolve(this.changes);
      });
    });
  }

  async getArticlesToPublish(limit = 5) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM articles 
        WHERE status = 'generated' 
        AND published_at_site IS NULL
        ORDER BY generated_at DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }

  async markArticlePublished(articleId) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE articles 
        SET published_at_site = CURRENT_TIMESTAMP,
            status = 'published'
        WHERE id = ?
      `;
      
      this.db.run(sql, [articleId], function(err) {
        if (err) reject(err);
        resolve(this.changes);
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_articles,
          SUM(CASE WHEN status = 'fetched' THEN 1 ELSE 0 END) as fetched,
          SUM(CASE WHEN status = 'generated' THEN 1 ELSE 0 END) as generated,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
          MIN(published_at) as oldest_article,
          MAX(published_at) as newest_article
        FROM articles
      `;
      
      this.db.get(sql, (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = new Database();