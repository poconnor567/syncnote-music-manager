const File = require('../models/File');
const Folder = require('../models/Folder');
const Project = require('../models/Project');
const fs = require('fs');
const path = require('path');

// @desc    Upload file to folder
// @route   POST /api/files/upload/:folderId
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { folderId } = req.params;
    const { tags } = req.body;
    
    console.log('File upload initiated with file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      folderId
    });
    
    // First check if this is a project ID rather than a folder ID
    const project = await Project.findById(folderId);
    if (project) {
      console.log('Folder ID is actually a project ID, uploading to project root');
      
      // Check if user has access to the project
      if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        // Delete uploaded file if user doesn't have access
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Not authorized to upload to this project' });
      }
      
      // Determine file type
      let fileType = 'other';
      const ext = path.extname(req.file.originalname).toLowerCase();
      const mimetype = req.file.mimetype.toLowerCase();
      
      if (ext === '.pdf') {
        fileType = 'pdf';
      } else if (ext === '.mid' || ext === '.midi') {
        fileType = 'midi';
      } else if (ext === '.mp3') {
        fileType = 'mp3';
      } else if (ext === '.wav') {
        fileType = 'wav';
      } else if (mimetype.startsWith('image/') || 
                ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        fileType = 'image';
      }
      
      console.log(`File type detected: ${fileType} for file ${req.file.originalname} with mimetype ${mimetype}`);
      
      // Create file record attached directly to project (without folder)
      const file = await File.create({
        name: req.file.originalname,
        originalName: req.file.originalname,
        path: req.file.path,
        type: fileType,
        size: req.file.size,
        project: project._id,
        uploadedBy: req.user._id,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      });
      
      // Add file to project
      project.files.push(file._id);
      await project.save();
      
      console.log('File uploaded successfully to project root:', {
        name: file.name,
        type: file.type,
        size: file.size,
        project: project.name
      });
      
      return res.status(201).json(file);
    }
    
    // If it's not a project ID, proceed with normal folder upload
    // Check if folder exists
    const folder = await Folder.findById(folderId);
    if (!folder) {
      // Delete uploaded file if folder doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Check if user has access to the project
    const folderProject = await Project.findById(folder.project);
    if (folderProject.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      // Delete uploaded file if user doesn't have access
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to upload to this folder' });
    }
    
    // Determine file type
    let fileType = 'other';
    const ext = path.extname(req.file.originalname).toLowerCase();
    const mimetype = req.file.mimetype.toLowerCase();
    
    if (ext === '.pdf') {
      fileType = 'pdf';
    } else if (ext === '.mid' || ext === '.midi') {
      fileType = 'midi';
    } else if (ext === '.mp3') {
      fileType = 'mp3';
    } else if (ext === '.wav') {
      fileType = 'wav';
    } else if (mimetype.startsWith('image/') || 
              ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      fileType = 'image';
    }
    
    console.log(`File type detected: ${fileType} for file ${req.file.originalname} with mimetype ${mimetype}`);
    
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
    
    console.log('File uploaded successfully to folder:', {
      name: file.name,
      type: file.type,
      size: file.size,
      folder: folder.name
    });
    
    res.status(201).json(file);
  } catch (error) {
    console.error('Upload file error:', error);
    // Delete uploaded file if there's an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file after upload failure:', unlinkError);
      }
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
    
    // Set appropriate content type for known file types
    const contentTypeMap = {
      'pdf': 'application/pdf',
      'mp3': 'audio/mpeg',
      'midi': 'audio/midi',
      'wav': 'audio/wav',
      'image': 'image/jpeg' // Default, will be overridden if needed
    };
    
    if (contentTypeMap[file.type]) {
      res.setHeader('Content-Type', contentTypeMap[file.type]);
    }
    
    // For image files, try to determine the exact content type
    if (file.type === 'image') {
      const extension = file.originalName.split('.').pop().toLowerCase();
      const imageContentTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp'
      };
      if (imageContentTypes[extension]) {
        res.setHeader('Content-Type', imageContentTypes[extension]);
      }
    }
    
    // Set content disposition based on whether this is a preview or download
    if (req.isPreview) {
      // For preview, set to inline so the browser tries to display it
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    } else {
      // For download, use attachment to force a download
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    }
    
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
    
    console.log('Update file request:', { id: req.params.id, name, tags, midiAssociations });
    
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
    
    // Handle tags - could be an array or a comma-separated string
    if (tags) {
      if (Array.isArray(tags)) {
        // If tags is already an array, use it directly
        file.tags = tags.map(tag => tag.trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        // If tags is a string, split it by commas
        file.tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      } else {
        // Log unexpected format but don't update tags
        console.warn('Unexpected tags format:', tags);
      }
    }
    
    if (midiAssociations) file.midiAssociations = midiAssociations;
    
    const updatedFile = await file.save();
    console.log('File updated successfully:', updatedFile);
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

// @desc    Add YouTube video
// @route   POST /api/files/youtube
// @access  Private
exports.addYouTubeVideo = async (req, res) => {
  try {
    console.log('YouTube video add request body:', req.body);
    const { url, name, tags = [], projectId, folderId } = req.body;
    
    // Validate required fields
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }
    
    console.log('YouTube URL received:', url);
    
    // Validate URL is a YouTube URL
    const isValidYouTubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
    if (!isValidYouTubeUrl) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }
    
    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has permission to access the project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }
    
    let file;
    
    if (folderId) {
      // Check if folder exists and user has access to it
      const folder = await Folder.findById(folderId);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }
      
      if (folder.project.toString() !== projectId) {
        return res.status(400).json({ message: 'Folder does not belong to the project' });
      }
      
      // Create file entry for the YouTube video in the specified folder
      file = new File({
        name,
        originalName: name,
        path: url, // Store the YouTube URL in the path field
        type: 'youtube',
        size: 0, // YouTube videos don't have a file size since they're just URLs
        uploadedBy: req.user._id,
        project: projectId,
        folder: folderId,
        tags
      });
      
      console.log('Creating YouTube file entry with path:', file.path);
      await file.save();
      
      // Add file to folder
      folder.files.push(file._id);
      await folder.save();
      
    } else {
      // Create file entry for the YouTube video at the project root
      file = new File({
        name,
        originalName: name,
        path: url, // Store the YouTube URL in the path field
        type: 'youtube',
        size: 0, // YouTube videos don't have a file size since they're just URLs
        uploadedBy: req.user._id,
        project: projectId,
        tags
      });
      
      console.log('Creating YouTube file entry with path:', file.path);
      await file.save();
      
      // Add file to project
      project.files.push(file._id);
      await project.save();
    }
    
    // Log the response object to verify the path is present
    console.log('YouTube file saved with path:', file.path);
    
    res.status(201).json({
      message: 'YouTube video added successfully',
      file
    });
    
  } catch (err) {
    console.error('Error adding YouTube video:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Move file to a different folder
// @route   PUT /api/files/:id/move
// @access  Private
exports.moveFile = async (req, res) => {
  try {
    const { targetFolderId } = req.body;
    const fileId = req.params.id;
    
    console.log(`Moving file ${fileId} to folder ${targetFolderId}`);
    
    // Validate inputs
    if (!targetFolderId) {
      return res.status(400).json({ message: 'Target folder ID is required' });
    }
    
    // Find the file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Find the target folder
    const targetFolder = await Folder.findById(targetFolderId);
    if (!targetFolder) {
      return res.status(404).json({ message: 'Target folder not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(file.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to move this file' });
    }
    
    // Check if target folder belongs to the same project
    if (targetFolder.project.toString() !== file.project.toString()) {
      return res.status(400).json({ message: 'Cannot move file to a folder in a different project' });
    }
    
    // Remove file from current folder
    if (file.folder) {
      await Folder.findByIdAndUpdate(file.folder, {
        $pull: { files: file._id }
      });
    }
    
    // Add file to target folder
    await Folder.findByIdAndUpdate(targetFolderId, {
      $push: { files: file._id }
    });
    
    // Update file record
    file.folder = targetFolderId;
    await file.save();
    
    console.log(`Successfully moved file ${fileId} to folder ${targetFolderId}`);
    
    res.json({ 
      message: 'File moved successfully',
      file
    });
  } catch (error) {
    console.error('Move file error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 