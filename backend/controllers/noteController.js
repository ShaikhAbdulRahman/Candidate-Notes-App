const Note = require('../models/Note');
const Candidate = require('../models/Candidate');
const Notification = require('../models/Notification');
const User = require('../models/User');
const extractTaggedUsers = require('../utils/extractTaggedUsers');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

exports.getNotesForCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const notes = await Note.find({ candidateId })
      .populate('authorId', 'name email')
      .sort({ createdAt: 1 });

    console.log(`Found ${notes.length} notes for candidate ${candidateId}`);
    res.json(notes);
  } catch (err) {
    console.error('Get notes error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

exports.createNote = async (req, res, io) => {
  try {    
    const { candidateId } = req.params; 
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const sanitizedContent = purify.sanitize(content.trim(), { ALLOWED_TAGS: [] });
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    let authorName = req.user.name;
    if (!authorName) {
      const userDoc = await User.findById(req.user.userId);
      authorName = userDoc ? userDoc.name : 'Unknown User';
    }
    const taggedUsers = await extractTaggedUsers(sanitizedContent);    
        const note = new Note({
      content: sanitizedContent,
      candidateId,
      authorId: req.user.userId,
      authorName: authorName,
      taggedUsers
    });

    await note.save();
    await note.populate('authorId', 'name email');

    console.log('Note created successfully:', note._id);

    if (taggedUsers.length > 0) {
      const notifications = taggedUsers.map(taggedUser => ({
        userId: taggedUser.userId,
        noteId: note._id,
        candidateId: candidateId,
        candidateName: candidate.name,
        message: sanitizedContent.substring(0, 100) + (sanitizedContent.length > 100 ? '...' : ''),
        isRead: false
      }));

      await Notification.insertMany(notifications);
      
      taggedUsers.forEach(taggedUser => {
        io.emit(`notification-${taggedUser.userId}`, {
          _id: new Date().getTime(),
          noteId: note._id,
          candidateId: candidateId,
          candidateName: candidate.name,
          message: sanitizedContent.substring(0, 100) + (sanitizedContent.length > 100 ? '...' : ''),
          createdAt: new Date(),
          isRead: false
        });
      });
    }
        io.to(`candidate-${candidateId}`).emit('new-note', note);
    
    res.status(201).json(note);
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};