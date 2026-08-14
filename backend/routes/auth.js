import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'wellmora_default_secure_jwt_secret_key_2026_!@#';

/**
 * Helper to generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Automatically seed / update fixed secure admin credentials on server startup
 */
export const ensureDefaultAdmin = async () => {
  try {
    const defaultUsername = 'WellmoraEnterprise';
    const defaultPassword = 'Wellmora@194226';
    const defaultName = 'Wellmora Enterprise';
    const defaultEmail = 'admin@wellmoraenterprise.com';

    let user = await User.findOne({ 
      $or: [
        { username: new RegExp(`^${defaultUsername}$`, 'i') },
        { email: defaultEmail }
      ]
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    if (!user) {
      user = new User({
        username: defaultUsername,
        name: defaultName,
        email: defaultEmail,
        password: hashedPassword
      });
      await user.save();
      console.log(`🔐 Fixed secure admin account initialized: Username: "${defaultUsername}"`);
    } else {
      // Ensure fixed credentials match latest configured password
      const isMatch = await bcrypt.compare(defaultPassword, user.password);
      if (!isMatch || user.username !== defaultUsername) {
        user.username = defaultUsername;
        user.password = hashedPassword;
        user.name = defaultName;
        await user.save();
        console.log(`🔐 Updated admin account to fixed credentials: Username: "${defaultUsername}"`);
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

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: new RegExp(`^${identifier}$`, 'i') },
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
