const Candidate = require('../models/Candidate');

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    console.error('Get candidates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const candidate = new Candidate({ name, email, createdBy: req.user.userId });
    await candidate.save();
    await candidate.populate('createdBy', 'name email');

    res.status(201).json(candidate);
  } catch (err) {
    console.error('Create candidate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await Candidate.findById(id).populate('createdBy', 'name email');

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    res.json(candidate);
  } catch (err) {
    console.error('Get candidate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
