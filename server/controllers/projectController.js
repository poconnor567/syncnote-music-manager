const Project = require('../models/Project');
const Folder = require('../models/Folder');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Create project
    const project = await Project.create({
      name,
      description,
      owner: req.user._id,
      folders: [] // Initialize with empty folders array
    });
    
    // Create root folder for the project
    const rootFolder = await Folder.create({
      name: 'Root',
      project: project._id,
      parent: null,
      createdBy: req.user._id
    });
    
    // Add root folder to project
    project.folders.push(rootFolder._id);
    await project.save();
    
    // Return populated project
    const populatedProject = await Project.findById(project._id)
      .populate({
        path: 'folders',
        select: 'name files subfolders parent createdAt updatedAt'
      });
    
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all projects for current user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    // Find projects where user is owner
    const projects = await Project.find({ owner: req.user._id });
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate({
        path: 'folders',
        select: 'name files subfolders parent createdAt updatedAt'
      });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner of the project
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }
    
    // Update project fields
    project.name = name || project.name;
    project.description = description || project.description;
    
    // Save the updated project
    const updatedProject = await project.save();
    
    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner
    if (project.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }
    
    // Delete all folders and files associated with the project
    // This would be handled better with cascading delete in a production app
    await Folder.deleteMany({ project: project._id });
    
    // Delete the project
    await project.deleteOne();
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 