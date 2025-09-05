// server.js - Enhanced version with database support
const express = require(‘express’);
const path = require(‘path’);
const session = require(‘express-session’);
const fs = require(‘fs’);
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, ‘public’)));
app.use(session({
secret: process.env.SESSION_SECRET || ‘gift-card-validator-secret’,
resave: false,
saveUninitialized: false,
cookie: { secure: false } // Set to true in production with HTTPS
}));

// Database setup - File-based for simplicity (use MongoDB/PostgreSQL for production)
const DB_FILE = path.join(__dirname, ‘database.json’);

// Initialize database file
function initDatabase() {
if (!fs.existsSync(DB_FILE)) {
fs.writeFileSync(DB_FILE, JSON.stringify({}));
}
}

// Read from database
function readDatabase() {
try {
const data = fs.readFileSync(DB_FILE, ‘utf8’);
return JSON.parse(data);
} catch (error) {
console.error(‘Database read error:’, error);
return {};
}
}

// Write to database
function writeDatabase(data) {
try {
fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
return true;
} catch (error) {
console.error(‘Database write error:’, error);
return false;
}
}

// Admin credentials (use environment variables in production)
const ADMIN_CREDENTIALS = {
username: process.env.ADMIN_USERNAME || ‘admin’,
password: process.env.ADMIN_PASSWORD || ‘admin123’
};

// Initialize database on startup
initDatabase();

// Routes
app.get(’/’, (req, res) => {
res.sendFile(path.join(__dirname, ‘public’, ‘index.html’));
});

app.get(’/admin’, (req, res) => {
res.sendFile(path.join(__dirname, ‘public’, ‘admin.html’));
});

// Customer API - Validate gift card
app.post(’/api/validate’, (req, res) => {
const { code } = req.body;

console.log(‘Validating card:’, code);

if (!code || code.length !== 16 || !/^[A-Za-z0-9]{16}$/.test(code)) {
return res.status(400).json({ error: ‘Invalid gift card format’ });
}

const upperCode = code.toUpperCase();
const giftCards = readDatabase();

// If card doesn’t exist, create it with pending status
if (!giftCards[upperCode]) {
giftCards[upperCode] = {
code: upperCode,
status: ‘pending’,
createdAt: new Date().toISOString()
};

```
if (!writeDatabase(giftCards)) {
  return res.status(500).json({ error: 'Database error' });
}

console.log('Created new card:', upperCode);
```

}

res.json({ status: giftCards[upperCode].status });
});

// Admin API - Login
app.post(’/api/admin/login’, (req, res) => {
const { username, password } = req.body;

console.log(‘Admin login attempt:’, { username });

if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
req.session.isAdmin = true;
console.log(‘Admin login successful’);
res.json({ success: true });
} else {
console.log(‘Admin login failed’);
res.status(401).json({ error: ‘Invalid username or password’ });
}
});

// Admin API - Get all cards
app.get(’/api/admin/cards’, (req, res) => {
if (!req.session.isAdmin) {
return res.status(401).json({ error: ‘Unauthorized’ });
}

const giftCards = readDatabase();
const cards = Object.values(giftCards);

console.log(`Admin viewing ${cards.length} cards`);
res.json(cards);
});

// Admin API - Update card status
app.put(’/api/admin/cards/:code’, (req, res) => {
if (!req.session.isAdmin) {
return res.status(401).json({ error: ‘Unauthorized’ });
}

const { code } = req.params;
const { status } = req.body;

if (![‘accepted’, ‘declined’, ‘pending’].includes(status)) {
return res.status(400).json({ error: ‘Invalid status’ });
}

const giftCards = readDatabase();

if (giftCards[code]) {
giftCards[code].status = status;
giftCards[code].updatedAt = new Date().toISOString();

```
if (writeDatabase(giftCards)) {
  console.log(`Updated card ${code} to ${status}`);
  res.json({ success: true });
} else {
  res.status(500).json({ error: 'Database error' });
}
```

} else {
res.status(404).json({ error: ‘Card not found’ });
}
});

// Admin API - Logout
app.post(’/api/admin/logout’, (req, res) => {
req.session.destroy((err) => {
if (err) {
console.error(‘Logout error:’, err);
return res.status(500).json({ error: ‘Logout failed’ });
}
res.json({ success: true });
});
});

// Health check endpoint
app.get(’/health’, (req, res) => {
res.json({
status: ‘healthy’,
timestamp: new Date().toISOString(),
cardsCount: Object.keys(readDatabase()).length
});
});

// Error handling middleware
app.use((err, req, res, next) => {
console.error(‘Server error:’, err);
res.status(500).json({ error: ‘Internal server error’ });
});

// 404 handler
app.use((req, res) => {
res.status(404).json({ error: ‘Route not found’ });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`🎁 Gift Card Validator running on port ${PORT}`);
console.log(`📊 Database initialized with ${Object.keys(readDatabase()).length} cards`);
console.log(`🔐 Admin credentials: ${ADMIN_CREDENTIALS.username} / ${ADMIN_CREDENTIALS.password}`);
});

// Export for testing
module.exports = app;