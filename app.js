// Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create an Express application
const app = express();
const PORT = 3000;

// Middleware to serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for JSON body parsing
app.use(bodyParser.json());

// Connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'blog.db'), (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create tables (If not already created)
const setupDatabase = () => {
  const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id)
    );
  `;
  db.exec(createTablesQuery, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    }
  });
};
setupDatabase();

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Express Server!');
});

// Fetch all articles
app.get('/articles', (req, res) => {
  const query = `
    SELECT a.id, a.title, a.content, a.category_id, c.name as category_name 
    FROM articles a
    JOIN categories c ON a.category_id = c.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Failed to load articles' });
    } else {
      res.json({ articles: rows });
    }
  });
});
// Route to get categories

app.get('/categories', (req, res) => {
    const query = 'SELECT * FROM categories';
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch categories' });
        } else {
            console.log(rows);  // Логирование категорий
            res.json(rows);
        }
    });
});
// Fetch a specific article
app.get('/article/:id', (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT a.id, a.title, a.content, a.category_id, c.name as category_name 
    FROM articles a
    JOIN categories c ON a.category_id = c.id
    WHERE a.id = ?
  `;
  db.get(query, [id], (err, row) => {
    if (err || !row) {
      res.status(404).json({ error: 'Article not found' });
    } else {
      const commentQuery = 'SELECT id, content FROM comments WHERE article_id = ?';
      db.all(commentQuery, [id], (err, comments) => {
        if (err) {
          res.status(500).json({ error: 'Failed to load comments' });
        } else {
          res.json({
            article: row,
            comments: comments,
          });
        }
      });
    }
  });
});

// Create new article
app.post('/admin/article', (req, res) => {
  const { title, content, category_id } = req.body;
  if (!title || !content || !category_id) {
    return res.status(400).json({ error: 'Title, content, and category_id are required' });
  }

  const query = 'INSERT INTO articles (title, content, category_id) VALUES (?, ?, ?)';
  db.run(query, [title, content, category_id], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to create article' });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

// Create a new category
app.post('/admin/category', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const query = 'INSERT INTO categories (name) VALUES (?)';
  db.run(query, [name], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to create category' });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

// Add a comment to an article
app.post('/article/:id/comments', (req, res) => {
  const articleId = req.params.id;
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const query = 'INSERT INTO comments (article_id, content) VALUES (?, ?)';
  db.run(query, [articleId, content], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to add comment' });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

// Update an article
app.put('/admin/article/:id', (req, res) => {
  const id = req.params.id;
  const { title, content, category_id } = req.body;
  if (!title || !content || !category_id) {
    return res.status(400).json({ error: 'Title, content, and category_id are required' });
  }

  const query = 'UPDATE articles SET title = ?, content = ?, category_id = ? WHERE id = ?';
  db.run(query, [title, content, category_id, id], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to update article' });
    } else {
      res.json({ message: 'Article updated successfully' });
    }
  });
});

// Delete an article
app.delete('/admin/article/:id', (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM articles WHERE id = ?';
  db.run(query, [id], function (err) {
    if (err) {
      res.status(500).json({ error: 'Failed to delete article' });
    } else {
      res.json({ message: 'Article deleted successfully' });
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
