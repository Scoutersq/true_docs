const express = require('express');
const fs = require('fs');
const upload = require('../middleware/upload');
const { authMiddleware } = require('../utils/jwt');
const Document = require('../models/Document');
const { extractText } = require('../services/documentParser');
const { analyzeDocument } = require('../services/groqService');

const router = express.Router();

// ─── Upload a document ──────────────────────────────────────────────
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create document record in DB
    const doc = await Document.create({
      userId: req.user.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      status: 'processing',
    });

    // Extract text in the background (don't block the response)
    res.status(201).json({
      document: {
        id: doc._id.toString(),
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        status: doc.status,
      },
    });

    // ── Async processing after response is sent ──────────────────
    try {
      console.log(`Processing document: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB, ${req.file.mimetype})`);

      const textContent = await extractText(req.file.path, req.file.mimetype);

      if (!textContent || textContent.trim().length === 0) {
        doc.status = 'error';
        doc.errorMessage = 'Could not extract any text from the document';
        await doc.save();
        return;
      }

      console.log(`Extracted ${textContent.length} chars from ${req.file.originalname}`);

      // Cap stored text to ~10 MB to stay well within MongoDB's 16 MB BSON limit
      const MAX_STORED_CHARS = 10_000_000;
      doc.textContent = textContent.length > MAX_STORED_CHARS
        ? textContent.slice(0, MAX_STORED_CHARS)
        : textContent;

      // Get initial AI analysis (groqService handles truncation internally)
      const welcomeMessage = await analyzeDocument(textContent, req.file.originalname);

      doc.chatHistory.push({
        role: 'assistant',
        content: welcomeMessage,
      });

      doc.status = 'ready';
      await doc.save();
      console.log(`Document ready: ${req.file.originalname}`);
    } catch (err) {
      console.error('Document processing error:', err.message || err);
      doc.status = 'error';
      // Show a user-friendly message, not raw stack traces
      doc.errorMessage = err.message ||
        'Failed to process the document. The file may be too large or in an unsupported format.';
      await doc.save();
    }
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// ─── Get document status (polling endpoint) ─────────────────────────
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const response = {
      id: doc._id,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
      status: doc.status,
      errorMessage: doc.errorMessage,
    };

    // Include initial AI message when ready
    if (doc.status === 'ready' && doc.chatHistory.length > 0) {
      response.initialMessage = doc.chatHistory[0];
    }

    res.json(response);
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Failed to check document status' });
  }
});

// ─── Dashboard stats for the current user ───────────────────────────
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const docs = await Document.find({ userId })
      .select('originalName fileSize mimeType status chatHistory createdAt updatedAt')
      .sort({ createdAt: -1 });

    const totalDocuments = docs.length;
    const readyDocs = docs.filter((d) => d.status === 'ready');
    const processingDocs = docs.filter((d) => d.status === 'processing');
    const errorDocs = docs.filter((d) => d.status === 'error');

    const totalChats = docs.reduce((sum, d) => sum + (d.chatHistory?.length || 0), 0);
    const totalStorageBytes = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);

    // File type breakdown
    const fileTypes = {};
    docs.forEach((d) => {
      const ext = d.originalName?.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDocs = docs.filter((d) => new Date(d.createdAt) >= sevenDaysAgo);

    // Documents list for the dashboard (with chat count per doc)
    const documentsList = docs.map((d) => ({
      _id: d._id,
      originalName: d.originalName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      status: d.status,
      chatCount: d.chatHistory?.length || 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    res.json({
      stats: {
        totalDocuments,
        readyCount: readyDocs.length,
        processingCount: processingDocs.length,
        errorCount: errorDocs.length,
        totalChats,
        totalStorageBytes,
        recentUploads: recentDocs.length,
        fileTypes,
      },
      documents: documentsList,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ─── Get all documents for the current user ─────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user.id })
      .select('originalName fileSize status createdAt')
      .sort({ createdAt: -1 });

    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ─── Delete a document ──────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove file from disk
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
