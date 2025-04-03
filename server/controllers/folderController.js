const Folder = require('../models/Folder');
const Project = require('../models/Project');
const File = require('../models/File');

// @desc    Create a new folder
// @route   POST /api/projects/:projectId/folders
// @access  Private
exports.createFolder = async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const { projectId } = req.params;
    
    console.log('Creating folder:', { name, parentId, projectId });
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    
    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner of the project
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to modify this project' });
    }
    
    // Check if parent folder exists if parentId is provided
    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found' });
      }
      
      // Check if parent folder belongs to the project
      if (parentFolder.project.toString() !== projectId) {
        return res.status(400).json({ message: 'Parent folder does not belong to this project' });
      }
    }
    
    // Create folder
    const folder = await Folder.create({
      name: name.trim(),
      project: projectId,
      parent: parentId || null,
      createdBy: req.user._id
    });
    
    console.log('Folder created:', folder);
    
    // Update parent folder if parentId is provided
    if (parentId) {
      await Folder.findByIdAndUpdate(parentId, {
        $push: { subfolders: folder._id }
      });
    } else {
      // Add to project's root folders if no parent
      await Project.findByIdAndUpdate(projectId, {
        $push: { folders: folder }
      });
    }
    
    // Return the complete folder data
    const populatedFolder = await Folder.findById(folder._id)
      .populate({
        path: 'files',
        select: '_id name originalName path type size tags uploadDate createdAt'
      })
      .populate('subfolders');
    
    console.log('Populated folder files:', populatedFolder.files);
    
    res.status(201).json(populatedFolder);
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get folders for a project
// @route   GET /api/projects/:projectId/folders
// @access  Private
exports.getFolders = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner of the project
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }
    
    // Get all folders for the project
    const folders = await Folder.find({ project: projectId })
      .populate({
        path: 'files',
        select: '_id name originalName path type size tags uploadDate createdAt'
      })
      .populate('subfolders');
    
    console.log('Populated folders with files example:', folders.length > 0 ? folders[0].files : []);
    
    res.json(folders);
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get folder by ID
// @route   GET /api/folders/:id
// @access  Private
exports.getFolderById = async (req, res) => {
  try {
    console.log('Getting folder by ID:', req.params.id);
    
    const folder = await Folder.findById(req.params.id)
      .populate({
        path: 'files',
        select: 'name originalName path type size tags uploadDate createdAt updatedAt'
      })
      .populate({
        path: 'subfolders',
        select: 'name files createdAt updatedAt'
      })
      .populate({
        path: 'project',
        select: 'name owner'
      });
    
    if (!folder) {
      console.log('Folder not found');
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    console.log('Found folder:', folder.name);
    
    // Check if user has access to the project
    const project = folder.project;
    if (!project) {
      return res.status(404).json({ message: 'Associated project not found' });
    }
    
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this folder' });
    }
    
    res.json(folder);
  } catch (error) {
    console.error('Get folder by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update folder
// @route   PUT /api/folders/:id
// @access  Private
exports.updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(folder.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to modify this folder' });
    }
    
    // Update folder
    folder.name = name || folder.name;
    
    const updatedFolder = await folder.save();
    res.json(updatedFolder);
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Check if user has access to the project
    const project = await Project.findById(folder.project);
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this folder' });
    }
    
    // Delete all files in the folder
    await File.deleteMany({ folder: folder._id });
    
    // Remove folder from parent's subfolders if it has a parent
    if (folder.parent) {
      await Folder.findByIdAndUpdate(folder.parent, {
        $pull: { subfolders: folder._id }
      });
    } else {
      // Remove from project's folders if it's a root folder
      await Project.findByIdAndUpdate(folder.project, {
        $pull: { folders: folder._id }
      });
    }
    
    // Delete all subfolders recursively
    // This is a simplified approach - in production, you'd want a more robust solution
    const deleteSubfolders = async (folderId) => {
      const subfolders = await Folder.find({ parent: folderId });
      
      for (const subfolder of subfolders) {
        await deleteSubfolders(subfolder._id);
        await File.deleteMany({ folder: subfolder._id });
        await subfolder.deleteOne();
      }
    };
    
    await deleteSubfolders(folder._id);
    
    // Delete the folder
    await folder.deleteOne();
    
    res.json({ message: 'Folder removed' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 