const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept only specific file types
  const allowedFileTypes = [
    'application/pdf', // PDF files
    'audio/midi', 'audio/x-midi', // MIDI files
    'audio/mpeg', 'audio/mp3', // MP3 files
    'audio/wav', 'audio/wave', 'audio/x-wav', // WAV files
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif' // Image files
  ];
  
  console.log('File upload attempt:', { 
    originalname: file.originalname,
    mimetype: file.mimetype
  });
  
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported. Please upload PDF, MIDI, MP3, WAV, or image files only.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  }
});

module.exports = upload; 