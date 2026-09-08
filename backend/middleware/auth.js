import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'wellmora_secure_jwt_secret_key_2026_ledger_auth';
};

/**
 * Authentication Middleware to verify Bearer JWT token or query token (for downloads)
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Check if user still exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};
