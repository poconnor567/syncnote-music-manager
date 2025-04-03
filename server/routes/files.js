const express = require('express');
const router = express.Router();
const { getFileById, updateFile, deleteFile, downloadFile, searchFiles, associateMidi, uploadFile, addYouTubeVideo, moveFile } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes are protected
router.use(protect);

// Search files
router.get('/search', searchFiles);

// File routes
router.route('/:id')
  .get(getFileById)
  .put(updateFile)
  .delete(deleteFile);

// Download file
router.get('/:id/download', downloadFile);

// Preview file (for inline display)
router.get('/:id/preview', (req, res, next) => {
  // Set flag for preview mode
  req.isPreview = true;
  next();
}, downloadFile);

// Associate MIDI with sheet music
router.post('/:id/associate', associateMidi);

// Upload file to folder
router.post('/upload/:folderId', upload.single('file'), uploadFile);

// Add YouTube video
router.post('/youtube', addYouTubeVideo);

// Move file to another folder
router.put('/:id/move', moveFile);

module.exports = router; 