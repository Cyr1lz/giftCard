Gift Card Validator

A complete Node.js web application for validating gift cards with separate customer and admin panels.

Customer Panel

- Clean, modern interface for gift card validation
- Input validation (exactly 16 alphanumeric characters)
- Real-time status display (Accepted ✅, Declined ❌, Pending ⏳)
- Mobile-friendly responsive design

Admin Panel

- Secure login system
- Dashboard to view all submitted gift cards
- Ability to change card status (Accept/Decline/Pending)
- Real-time updates that customers see immediately
- Responsive table view with timestamps

Quick Start

1. Install dependencies:

bash
npm install

1. Start the server:

bash
npm start

1. Access the application:

- Customer Panel: http://localhost:3000
- Admin Panel: http://localhost:3000/admin

Admin Credentials

**Username:** admin  
**Password:** admin123

Project Structure


gift-card-validator/
├── server.js              # Main server file with all backend logic
├── package.json           # Project dependencies and scripts
├── public/
│   ├── index.html         # Customer panel
│   └── admin.html         # Admin panel
└── README.md              # This file


API Endpoints

Customer API

- `POST /api/validate` - Validate a gift card code

Admin API

- `POST /api/admin/login` - Admin login
- `GET /api/admin/cards` - Get all gift cards
- `PUT /api/admin/cards/:code` - Update card status
- `POST /api/admin/logout` - Admin logout

Gift Card Format

- **Length:** Exactly 16 characters
- **Characters:** Letters (A-Z, a-z) and numbers (0-9) only
- **Example:** `ABC123XYZ4567890`

How It Works

1. **Customer validates a card:** When a customer enters a gift card code, the system checks if it exists in the database. If not, it creates a new entry with “pending” status.
1. **Admin manages cards:** Admins can view all submitted cards and change their status to accepted, declined, or pending.
1. **Real-time updates:** When customers re-validate a card, they see the current status as set by the admin.

Technology Stack

- **Backend:** Node.js with Express
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Session Management:** Express-session
- **Database:** In-memory storage (for demo purposes)

Production Considerations

For production deployment, consider these improvements:

1. **Database:** Replace in-memory storage with a proper database (PostgreSQL, MongoDB, etc.)
1. **Authentication:** Implement proper password hashing and JWT tokens
1. **Security:** Add CSRF protection, rate limiting, and input sanitization
1. **HTTPS:** Enable SSL/TLS encryption
1. **Environment Variables:** Use environment variables for sensitive configuration
1. **Logging:** Add proper logging and monitoring
1. **Validation:** Add server-side validation for all inputs

Development

For development with auto-reload:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change.

Security Notes

- Current implementation uses simple session-based authentication
- Passwords are stored in plain text (demo only)
- No rate limiting implemented
- CORS is not configured


