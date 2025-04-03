const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['pdf', 'midi', 'mp3', 'wav', 'image', 'youtube', 'other']
  },
  size: {
    type: Number,
    required: true
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  midiAssociations: [{
    sheetMusicFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    startPosition: {
      type: Number,
      default: 0
    },
    endPosition: {
      type: Number,
      default: 0
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('File', FileSchema); 