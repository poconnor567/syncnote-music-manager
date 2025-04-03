const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  subfolders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Folder', FolderSchema); 