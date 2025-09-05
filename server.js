// server.js
const express = require(‘express’);
const path = require(‘path’);
const session = require(‘express-session’);
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, ‘public’)));
app.use(session({
secret: process.env.SESSION_SECRET || ‘gift-card-validator-secret-key’,
resave: false,
saveUninitialized: false,
cookie: {
secure: process.env.NODE_ENV === ‘production’,
maxAge: 24 * 60 * 60 * 1000 // 24 hours
}
}));

// In-memory database
let giftCards = {};

// Admin credentials
const ADMIN_CREDENTIALS = {
username: process.env.ADMIN_USERNAME || ‘admin’,
password: process.env.ADMIN_PASSWORD || ‘admin123’
};

// Routes
app.get(’/’, (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(’/admin’, (req, res) => {
res.sendFile(path.join(__dirname, 'admin.html'));
});

// Customer API - Validate gift card
app.post(’/api/validate’, (req, res) => {
const { code } = req.body;

```
if (!code || code.length !== 16 || !/^[A-Za-z0-9]{16}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid gift card format' });
}

const upperCode = code.toUpperCase();

// If card doesn't exist, create it with pending status
if (!giftCards[upperCode]) {
    giftCards[upperCode] = {
        code: upperCode,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
}

res.json({ status: giftCards[upperCode].status });
```

});

// Admin API - Login
app.post(’/api/admin/login’, (req, res) => {
const { username, password } = req.body;

```
if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    req.session.isAdmin = true;
    res.json({ success: true });
} else {
    res.status(401).json({ error: 'Invalid credentials' });
}
```

});

// Admin API - Get all cards
app.get(’/api/admin/cards’, (req, res) => {
if (!req.session.isAdmin) {
return res.status(401).json({ error: ‘Unauthorized’ });
}

```
const cards = Object.values(giftCards);
res.json(cards);
```

});

// Admin API - Update card status
app.put(’/api/admin/cards/:code’, (req, res) => {
if (!req.session.isAdmin) {
return res.status(401).json({ error: ‘Unauthorized’ });
}

```
const { code } = req.params;
const { status } = req.body;

if (!['accepted', 'declined', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
}

if (giftCards[code]) {
    giftCards[code].status = status;
    giftCards[code].updatedAt = new Date().toISOString();
    res.json({ success: true });
} else {
    res.status(404).json({ error: 'Card not found' });
}
```

});

// Admin API - Logout
app.post(’/api/admin/logout’, (req, res) => {
req.session.destroy((err) => {
if (err) {
return res.status(500).json({ error: ‘Logout failed’ });
}
res.json({ success: true });
});
});

// Error handling middleware
app.use((err, req, res, next) => {
console.error(err.stack);
res.status(500).json({ error: ‘Something went wrong!’ });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`Gift Card Validator running on port ${PORT}`);
});

module.exports = app;
