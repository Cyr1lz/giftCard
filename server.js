// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)
app.use(session({
  secret: process.env.SESSION_SECRET || 'gift-card-validator-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// In-memory database
let giftCards = {};
let globalPrice = null; // Global price configuration

// Admin credentials
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

// Utility functions
function validateGiftCardCode(code) {
  return code && 
         typeof code === 'string' && 
         code.length <= 25 && 
         code.length >= 1 && 
         /^[A-Z0-9]+$/.test(code);
}

function validatePrice(amount, currency) {
  return typeof amount === 'number' && 
         amount >= 0 && 
         SUPPORTED_CURRENCIES.includes(currency);
}

// Static file routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Customer API - Get current global price
app.get('/api/price', (req, res) => {
  res.json(globalPrice || { amount: null, currency: 'USD', updatedAt: null });
});

// Customer API - Validate gift card
app.post('/api/validate', (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Gift card code is required' });
    }

    const upperCode = code.toUpperCase().trim();

    if (!validateGiftCardCode(upperCode)) {
      return res.status(400).json({ 
        error: 'Invalid gift card format. Use up to 25 characters (letters and numbers only)' 
      });
    }

    // Create card if doesn't exist
    if (!giftCards[upperCode]) {
      giftCards[upperCode] = {
        code: upperCode,
        status: 'pending',
        createdAt: new Date().toISOString(),
        price: null // Individual card price (optional)
      };
    }

    const card = giftCards[upperCode];
    
    // Return card status with pricing info
    res.json({ 
      status: card.status,
      price: card.price || globalPrice, // Individual price or global price
      code: card.code,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt || null
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized. Please log in as admin.' });
  }
  next();
}

// Admin API - Login
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      req.session.isAdmin = true;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin API - Check authentication status
app.get('/api/admin/status', (req, res) => {
  res.json({ isAuthenticated: !!req.session.isAdmin });
});

// Admin API - Get all cards with statistics
app.get('/api/admin/cards', requireAdmin, (req, res) => {
  try {
    const cards = Object.values(giftCards);
    const stats = {
      total: cards.length,
      accepted: cards.filter(card => card.status === 'accepted').length,
      declined: cards.filter(card => card.status === 'declined').length,
      pending: cards.filter(card => card.status === 'pending').length
    };

    res.json({ 
      cards: cards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      stats,
      globalPrice
    });

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to retrieve cards' });
  }
});

// Admin API - Update card status
app.put('/api/admin/cards/:code/status', requireAdmin, (req, res) => {
  try {
    const { code } = req.params;
    const { status } = req.body;
    const upperCode = code.toUpperCase();

    if (!['accepted', 'declined', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: accepted, declined, or pending' });
    }

    if (!giftCards[upperCode]) {
      return res.status(404).json({ error: 'Gift card not found' });
    }

    giftCards[upperCode].status = status;
    giftCards[upperCode].updatedAt = new Date().toISOString();
    
    res.json({ 
      success: true, 
      message: `Card ${upperCode} status updated to ${status}`,
      card: giftCards[upperCode]
    });

  } catch (error) {
    console.error('Update card status error:', error);
    res.status(500).json({ error: 'Failed to update card status' });
  }
});

// Admin API - Update individual card price
app.put('/api/admin/cards/:code/price', requireAdmin, (req, res) => {
  try {
    const { code } = req.params;
    const { amount, currency } = req.body;
    const upperCode = code.toUpperCase();

    if (!giftCards[upperCode]) {
      return res.status(404).json({ error: 'Gift card not found' });
    }

    // Validate price data
    if (amount !== null && amount !== undefined) {
      if (!validatePrice(amount, currency || 'USD')) {
        return res.status(400).json({ 
          error: 'Invalid price. Amount must be a positive number and currency must be supported.' 
        });
      }

      giftCards[upperCode].price = {
        amount: parseFloat(amount),
        currency: currency || (globalPrice ? globalPrice.currency : 'USD')
      };
    } else {
      // Remove individual pricing (will use global price)
      giftCards[upperCode].price = null;
    }

    giftCards[upperCode].updatedAt = new Date().toISOString();
    
    res.json({ 
      success: true, 
      message: `Card ${upperCode} price updated`,
      card: giftCards[upperCode]
    });

  } catch (error) {
    console.error('Update card price error:', error);
    res.status(500).json({ error: 'Failed to update card price' });
  }
});

// Admin API - Get global price
app.get('/api/admin/price', requireAdmin, (req, res) => {
  res.json(globalPrice || { amount: null, currency: 'USD', updatedAt: null });
});

// Admin API - Update global price
app.put('/api/admin/price', requireAdmin, (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!validatePrice(amount, currency)) {
      return res.status(400).json({ 
        error: `Invalid price data. Amount must be a positive number and currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` 
      });
    }

    globalPrice = {
      amount: parseFloat(amount),
      currency: currency,
      updatedAt: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      message: 'Global price updated successfully',
      price: globalPrice
    });

  } catch (error) {
    console.error('Update global price error:', error);
    res.status(500).json({ error: 'Failed to update global price' });
  }
});

// Admin API - Delete card
app.delete('/api/admin/cards/:code', requireAdmin, (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();

    if (!giftCards[upperCode]) {
      return res.status(404).json({ error: 'Gift card not found' });
    }

    delete giftCards[upperCode];
    
    res.json({ 
      success: true, 
      message: `Card ${upperCode} deleted successfully`
    });

  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Admin API - Logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    cardsCount: Object.keys(giftCards).length,
    globalPriceSet: !!globalPrice
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Gift Card Validator running on port ${PORT}`);
  console.log(`📊 Customer panel: http://localhost:${PORT}/`);
  console.log(`🔧 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`💰 Price management enabled`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔑 Admin credentials: ${ADMIN_CREDENTIALS.username} / ${ADMIN_CREDENTIALS.password}`);
  }
});

module.exports = app;