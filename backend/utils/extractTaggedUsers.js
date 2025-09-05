const User = require('../models/User');

const extractTaggedUsers = async (content) => {
  try {
    const tagRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = content.match(tagRegex);
    
    if (!matches || matches.length === 0) {
      return [];
    }
    const usernames = matches.map(match => match.substring(1));
        const uniqueUsernames = [...new Set(usernames)];

    const users = await User.find({ 
      name: { 
        $in: uniqueUsernames.map(name => new RegExp(`^${name}$`, 'i'))
      } 
    });
    
    return users.map(user => ({ 
      userId: user._id, 
      username: user.name 
    }));
    
  } catch (error) {
    console.error('Error extracting tagged users:', error);
    return [];
  }
};

module.exports = extractTaggedUsers;