const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  taggedUsers: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, username: String }]
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
