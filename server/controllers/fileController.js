const File = require('../models/File');
const Folder = require('../models/Folder');
const Project = require('../models/Project');
const fs = require('fs');
const path = require('path');

// @desc    Upload file to folder
// @route   POST /api/folders/:folderId/files
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { folderId } = req.params;
    const { tags } = req.body;
    
    // Check if folder exists
    const folder = await Folder.findById(folderId);
    if (!folder) {
      // Delete uploaded file if folder doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(folder.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      // Delete uploaded file if user doesn't have access
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to upload to this folder' });
    }
    
    // Determine file type
    let fileType = 'other';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.pdf') fileType = 'pdf';
    else if (ext === '.mid' || ext === '.midi') fileType = 'midi';
    else if (ext === '.mp3') fileType = 'mp3';
    
    // Create file record
    const file = await File.create({
      name: req.file.originalname,
      originalName: req.file.originalname,
      path: req.file.path,
      type: fileType,
      size: req.file.size,
      folder: folderId,
      project: folder.project,
      uploadedBy: req.user._id,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });
    
    // Add file to folder
    folder.files.push(file._id);
    await folder.save();
    
    res.status(201).json(file);
  } catch (error) {
    console.error('Upload file error:', error);
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Download file
// @route   GET /api/files/:id/download
// @access  Private
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(file.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to download this file' });
    }
    
    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Set content disposition and send file
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.sendFile(path.resolve(file.path));
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get file by ID
// @route   GET /api/files/:id
// @access  Private
exports.getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(file.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this file' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Get file by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update file
// @route   PUT /api/files/:id
// @access  Private
exports.updateFile = async (req, res) => {
  try {
    const { name, tags, midiAssociations } = req.body;
    
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(file.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to modify this file' });
    }
    
    // Update file fields
    if (name) file.name = name;
    if (tags) file.tags = tags.split(',').map(tag => tag.trim());
    if (midiAssociations) file.midiAssociations = midiAssociations;
    
    const updatedFile = await file.save();
    res.json(updatedFile);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(file.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }
    
    // Remove file from folder
    if (file.folder) {
      await Folder.findByIdAndUpdate(file.folder, {
        $pull: { files: file._id }
      });
    }
    
    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // Delete file record
    await file.deleteOne();
    
    res.json({ message: 'File removed' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Search files
// @route   GET /api/files/search
// @access  Private
exports.searchFiles = async (req, res) => {
  try {
    const { query, type, tags } = req.query;
    
    // Build search criteria
    const searchCriteria = {
      uploadedBy: req.user._id
    };
    
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { originalName: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (type) {
      searchCriteria.type = type;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      searchCriteria.tags = { $in: tagArray };
    }
    
    // Find files
    const files = await File.find(searchCriteria)
      .sort({ uploadDate: -1 })
      .populate('folder', 'name')
      .populate('project', 'name');
    
    res.json(files);
  } catch (error) {
    console.error('Search files error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Associate MIDI with sheet music
// @route   POST /api/files/:id/associate
// @access  Private
exports.associateMidi = async (req, res) => {
  try {
    const { sheetMusicId, startPosition, endPosition } = req.body;
    const midiFileId = req.params.id;
    
    // Check if both files exist
    const midiFile = await File.findById(midiFileId);
    const sheetMusicFile = await File.findById(sheetMusicId);
    
    if (!midiFile || !sheetMusicFile) {
      return res.status(404).json({ message: 'One or both files not found' });
    }
    
    // Check if MIDI file is actually a MIDI
    if (midiFile.type !== 'midi') {
      return res.status(400).json({ message: 'First file must be a MIDI file' });
    }
    
    // Check if sheet music file is a PDF
    if (sheetMusicFile.type !== 'pdf') {
      return res.status(400).json({ message: 'Second file must be a PDF file' });
    }
    
    // Check if user has access to both files
    if (
      midiFile.uploadedBy.toString() !== req.user._id.toString() ||
      sheetMusicFile.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to associate these files' });
    }
    
    // Add association
    midiFile.midiAssociations.push({
      sheetMusicFile: sheetMusicId,
      startPosition: startPosition || 0,
      endPosition: endPosition || 0
    });
    
    await midiFile.save();
    
    res.json(midiFile);
  } catch (error) {
    console.error('Associate MIDI error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 