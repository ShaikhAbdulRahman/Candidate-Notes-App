const mongoose = require('mongoose');

const validateInput = {
  candidate: (req, res, next) => {
    const { name, email } = req.body;
    
    const errors = [];
    
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Invalid email format');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    
    next();
  },

  note: (req, res, next) => {
    const { content } = req.body;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ error: 'Note content too long (max 5000 characters)' });
    }
    
    next();
  },
  objectId: (paramName) => (req, res, next) => {
    const id = req.params[paramName];
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }
    
    next();
  },

  userRegistration: (req, res, next) => {
    const { name, email, password } = req.body;
    
    const errors = [];
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Invalid email format');
      }
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (password && password.length > 128) {
      errors.push('Password too long (max 128 characters)');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
        req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();
    
    next();
  }
};

module.exports = validateInput;