const express = require('express');
const { authMiddleware } = require('../utils/jwt');
const Document = require('../models/Document');
const { chat, generateSlides } = require('../services/groqService');

const router = express.Router();

// ─── Send a message about a document ────────────────────────────────
router.post('/:documentId', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const doc = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user.id,
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is not ready for chat yet' });
    }

    // Save user message to history
    doc.chatHistory.push({
      role: 'user',
      content: message.trim(),
    });

    // Get AI response from Groq
    const aiResponse = await chat(doc.textContent, doc.chatHistory.slice(0, -1), message.trim());

    // Save AI response to history
    doc.chatHistory.push({
      role: 'assistant',
      content: aiResponse,
    });

    await doc.save();

    res.json({
      reply: aiResponse,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ─── Get chat history for a document ────────────────────────────────
router.get('/:documentId', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user.id,
    }).select('chatHistory');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ messages: doc.chatHistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// ─── Clear chat history for a document ──────────────────────────────
router.delete('/:documentId', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user.id,
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    doc.chatHistory = [];
    await doc.save();

    res.json({ message: 'Chat history cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// ─── Generate visual slides for a document conversation ─────────────
router.post('/:documentId/slides', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      userId: req.user.id,
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.status !== 'ready') {
      return res.status(400).json({ error: 'Document is not ready yet' });
    }

    if (!doc.chatHistory || doc.chatHistory.length === 0) {
      return res.status(400).json({ error: 'No conversation to visualize yet. Chat about the document first.' });
    }

    const slides = await generateSlides(doc.textContent, doc.chatHistory);

    res.json({ slides });
  } catch (err) {
    console.error('Slides generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate slides' });
  }
});

module.exports = router;
