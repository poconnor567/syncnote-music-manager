const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProjectById, updateProject, deleteProject } = require('../controllers/projectController');
const { getFolders, createFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createProject)
  .get(getProjects);

router.route('/:id')
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

// Folder routes within projects
router.route('/:projectId/folders')
  .get(getFolders)
  .post(createFolder);

module.exports = router; 