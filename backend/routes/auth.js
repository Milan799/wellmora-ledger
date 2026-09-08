import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const getJwtSecret = () => process.env.JWT_SECRET || 'wellmora_secure_jwt_secret_key_2026_ledger_auth';

/**
 * Helper to generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
};

/**
 * Helper to safely escape regular expression special characters
 */
const escapeRegex = (str) => {
  return String(str).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

/**
 * Automatically seed default secure admin credentials on first startup if no admin exists
 */
export const ensureDefaultAdmin = async () => {
  try {
    const defaultUsername = process.env.ADMIN_USERNAME || 'WellmoraEnterprise';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'Wellmora@194226';
    const defaultName = process.env.ADMIN_NAME || 'Wellmora Enterprise';
    const defaultEmail = process.env.ADMIN_EMAIL || 'admin@wellmoraenterprise.com';

    const safeUsername = escapeRegex(defaultUsername);
    let user = await User.findOne({ 
      $or: [
        { username: new RegExp(`^${safeUsername}$`, 'i') },
        { email: defaultEmail.toLowerCase() }
      ]
    });

    if (!user) {
      const existingUserCount = await User.countDocuments();
      if (existingUserCount === 0) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);
        user = new User({
          username: defaultUsername,
          name: defaultName,
          email: defaultEmail.toLowerCase(),
          password: hashedPassword
        });
        await user.save();
        console.log(`🔐 Initial admin account initialized: Username: "${defaultUsername}"`);
      }
    }
  } catch (err) {
    console.error('⚠️ Failed to seed default admin credentials:', err.message);
  }
};

// POST /api/auth/register - Disabled (Public registration removed)
router.post('/register', async (req, res) => {
  return res.status(403).json({
    message: 'Public account registration is disabled. Please log in with authorized credentials.'
  });
});

// POST /api/auth/login - Authenticate user credentials
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Safely find user by username or email with escaped regex to prevent ReDoS
    const safeIdentifier = escapeRegex(identifier);
    const user = await User.findOne({
      $or: [
        { username: new RegExp(`^${safeIdentifier}$`, 'i') },
        { email: identifier.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Verify password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error signing in', error: error.message });
  }
});

// GET /api/auth/me - Retrieve current authenticated user profile
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      name: req.user.name,
      email: req.user.email
    }
  });
});

export default router;
