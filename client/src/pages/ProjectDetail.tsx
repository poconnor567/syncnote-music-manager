import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Breadcrumbs,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  MusicNote as MusicNoteIcon,
  AudioFile as AudioFileIcon,
  PictureAsPdf as PdfIcon,
  CreateNewFolder as CreateNewFolderIcon
} from '@mui/icons-material';
import { projectsAPI, foldersAPI } from '../services/api';
import { Project, Folder, FileItem } from '../types';
import Layout from '../components/Layout/Layout';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFolderDialog, setOpenFolderDialog] = useState(false);
  const [openEditFolderDialog, setOpenEditFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
  }, [projectId]);

  const fetchProjectDetails = async (id: string) => {
    try {
      setLoading(true);
      const projectData = await projectsAPI.getProjectById(id);
      
      // Ensure project data is properly populated
      console.log('Project data:', projectData);
      
      // If folders are not populated, fetch them separately
      if (projectData.folders && projectData.folders.length > 0 && typeof projectData.folders[0] === 'string') {
        const foldersData = await foldersAPI.getFolders(id);
        projectData.folders = foldersData.filter(folder => !folder.parent);
      }
      
      setProject(projectData);
      setCurrentFolder(null);
      setFolderPath([]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project details');
      console.error('Error fetching project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder: Folder) => {
    try {
      setLoading(true);
      console.log('Clicking folder:', folder);
      
      // Make sure we have a valid folder ID
      if (!folder._id) {
        throw new Error('Invalid folder ID');
      }
      
      const folderData = await foldersAPI.getFolderById(folder._id);
      console.log('Folder data:', folderData);
      
      if (!folderData) {
        throw new Error('Folder not found');
      }
      
      setCurrentFolder(folderData);
      
      // Update folder path
      if (folderData.parent) {
        // If it's a subfolder, we need to build the path
        try {
          const parentId = typeof folderData.parent === 'string' 
            ? folderData.parent
            : folderData.parent._id;
          
          const parentFolder = await foldersAPI.getFolderById(parentId);
          setFolderPath([parentFolder]);
        } catch (err) {
          console.error('Error fetching parent folder:', err);
          // Continue even if we can't build the full path
          setFolderPath([]);
        }
      } else {
        // If it's a top-level folder, reset the path
        setFolderPath([]);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch folder details');
      console.error('Error fetching folder details:', err);
      // Don't reset current folder on error to allow user to try again
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProject = () => {
    setCurrentFolder(null);
    setFolderPath([]);
  };

  const handleBackToParentFolder = async () => {
    if (currentFolder && currentFolder.parent) {
      const parentId = typeof currentFolder.parent === 'string' 
        ? currentFolder.parent 
        : currentFolder.parent._id;
      
      try {
        const parentFolder = await foldersAPI.getFolderById(parentId);
        setCurrentFolder(parentFolder);
        // Update path by removing the last item
        setFolderPath(folderPath.slice(0, -1));
      } catch (err: any) {
        setError(err.message || 'Failed to navigate to parent folder');
        console.error('Error navigating to parent folder:', err);
      }
    } else {
      handleBackToProject();
    }
  };

  const handleOpenFolderDialog = () => {
    setOpenFolderDialog(true);
  };

  const handleCloseFolderDialog = () => {
    setOpenFolderDialog(false);
    setNewFolderName('');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !projectId) {
      return;
    }

    try {
      const folderData = {
        name: newFolderName.trim(),
        parentId: currentFolder ? currentFolder._id : undefined
      };

      await foldersAPI.createFolder(projectId, folderData);
      handleCloseFolderDialog();
      
      // Refresh data
      if (currentFolder) {
        await handleFolderClick(currentFolder);
      } else {
        await fetchProjectDetails(projectId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
      console.error('Error creating folder:', err);
    }
  };

  const handleOpenEditFolderDialog = (folder: Folder, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent folder click event
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setOpenEditFolderDialog(true);
  };

  const handleCloseEditFolderDialog = () => {
    setOpenEditFolderDialog(false);
    setNewFolderName('');
    setEditingFolder(null);
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder || !newFolderName.trim()) {
      return;
    }

    try {
      await foldersAPI.updateFolder(editingFolder._id, { name: newFolderName.trim() });
      handleCloseEditFolderDialog();
      
      // Refresh data
      if (currentFolder) {
        await handleFolderClick(currentFolder);
      } else {
        await fetchProjectDetails(projectId!);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update folder');
      console.error('Error updating folder:', err);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to delete the project "${project.name}"? This will permanently delete all folders and files in this project.`)) {
      return;
    }

    try {
      await projectsAPI.deleteProject(project._id);
      // Navigate back to dashboard after successful deletion
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      console.error('Error deleting project:', err);
    }
  };

  const handleDeleteFolder = async (folder: Folder, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent folder click event
    
    if (!window.confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents? This action cannot be undone.`)) {
      return;
    }

    try {
      await foldersAPI.deleteFolder(folder._id);
      
      // Refresh data
      if (currentFolder) {
        if (currentFolder._id === folder._id) {
          // If we're deleting the current folder, go back
          handleBackToParentFolder();
        } else {
          await handleFolderClick(currentFolder);
        }
      } else {
        await fetchProjectDetails(projectId!);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete folder');
      console.error('Error deleting folder:', err);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'midi':
        return <MusicNoteIcon color="primary" />;
      case 'mp3':
        return <AudioFileIcon color="secondary" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !project) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  if (error && !project) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mt: 4 }}>
            Project not found
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/dashboard')} 
              sx={{ mr: 2 }}
              aria-label="back to dashboard"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              {project.name}
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                component={Link}
                to={`/projects/${project._id}/edit`}
                sx={{ mr: 1 }}
              >
                Edit Project
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteProject}
                sx={{ mr: 1 }}
              >
                Delete Project
              </Button>
              <Button
                variant="contained"
                startIcon={<CreateNewFolderIcon />}
                onClick={handleOpenFolderDialog}
              >
                New Folder
              </Button>
            </Box>
          </Box>
          
          {project.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {project.description}
            </Typography>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {/* Breadcrumbs navigation */}
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link 
              to="#" 
              onClick={(e) => { e.preventDefault(); handleBackToProject(); }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {project.name}
            </Link>
            
            {folderPath.map((folder, index) => (
              <Link 
                key={folder._id}
                to="#" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  handleFolderClick(folder);
                }}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {folder.name}
              </Link>
            ))}
            
            {currentFolder && (
              <Typography color="text.primary">{currentFolder.name}</Typography>
            )}
          </Breadcrumbs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Content */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          {currentFolder ? (
            // Folder view
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h6">
                    {currentFolder.name}
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    <Tooltip title="Edit Folder">
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenEditFolderDialog(currentFolder, e)}
                        sx={{ mr: 0.5 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Folder">
                      <IconButton
                        size="small"
                        onClick={(e) => handleDeleteFolder(currentFolder, e)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleBackToParentFolder}
                >
                  Back
                </Button>
              </Box>
              
              {/* Subfolders */}
              {currentFolder.subfolders && currentFolder.subfolders.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Folders
                  </Typography>
                  <Grid container spacing={2}>
                    {currentFolder.subfolders.map((subfolder) => (
                      <Grid item xs={12} sm={6} md={4} key={subfolder._id}>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                          onClick={() => handleFolderClick(subfolder)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                              <FolderIcon color="primary" sx={{ mr: 1, flexShrink: 0 }} />
                              <Typography variant="body1" noWrap>
                                {subfolder.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', ml: 1 }}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleOpenEditFolderDialog(subfolder, e)}
                                  sx={{ mr: 0.5 }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleDeleteFolder(subfolder, e)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {/* Files */}
              {currentFolder.files && currentFolder.files.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Files
                  </Typography>
                  <List>
                    {currentFolder.files.map((file) => (
                      <ListItem 
                        key={file._id}
                        divider
                        secondaryAction={
                          <Box>
                            <Tooltip title="Edit">
                              <IconButton edge="end" aria-label="edit" sx={{ mr: 1 }}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton edge="end" aria-label="delete">
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          {getFileIcon(file.type)}
                        </ListItemIcon>
                        <ListItemText 
                          primary={file.name} 
                          secondary={`Uploaded: ${formatDate(file.uploadDate || file.createdAt)}`} 
                        />
                        {file.tags && file.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
                            {file.tags.map((tag, index) => (
                              <Chip key={index} label={tag} size="small" />
                            ))}
                          </Box>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No files in this folder yet.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    component={Link}
                    to={`/upload?folderId=${currentFolder._id}`}
                    sx={{ mt: 2 }}
                  >
                    Upload Files
                  </Button>
                </Box>
              )}
            </>
          ) : (
            // Project root view
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Project Contents
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    component={Link}
                    to={`/upload?projectId=${project._id}`}
                    sx={{ mr: 1 }}
                  >
                    Upload Files
                  </Button>
                </Box>
              </Box>
              
              {/* Folders */}
              {project.folders && project.folders.length > 0 ? (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Folders
                  </Typography>
                  <Grid container spacing={2}>
                    {project.folders.map((folder) => {
                      // Ensure folder is a complete object with _id
                      if (!folder || typeof folder === 'string') {
                        return null;
                      }
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={folder._id}>
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                              p: 2, 
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => handleFolderClick(folder)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                <FolderIcon color="primary" sx={{ mr: 1, flexShrink: 0 }} />
                                <Box sx={{ overflow: 'hidden' }}>
                                  <Typography variant="body1" noWrap>
                                    {folder.name}
                                  </Typography>
                                  {folder.files && folder.files.length > 0 && (
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                      {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', ml: 1 }}>
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleOpenEditFolderDialog(folder, e)}
                                    sx={{ mr: 0.5 }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleDeleteFolder(folder, e)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No folders in this project yet.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CreateNewFolderIcon />}
                    onClick={handleOpenFolderDialog}
                    sx={{ mt: 2 }}
                  >
                    Create Folder
                  </Button>
                </Box>
              )}
            </>
          )}
        </Paper>

        {/* Project Info */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Project Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(project.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Updated: {formatDate(project.updatedAt)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Total Folders: {project.folders ? project.folders.length : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Files: {project.folders ? project.folders.reduce((sum, folder) => 
                  sum + (folder.files ? folder.files.length : 0), 0) : 0}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Create Folder Dialog */}
        <Dialog open={openFolderDialog} onClose={handleCloseFolderDialog}>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Folder Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFolderDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateFolder} 
              variant="contained"
              disabled={!newFolderName.trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Folder Dialog */}
        <Dialog open={openEditFolderDialog} onClose={handleCloseEditFolderDialog}>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Folder Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditFolderDialog}>Cancel</Button>
            <Button 
              onClick={handleUpdateFolder} 
              variant="contained"
              disabled={!newFolderName.trim()}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default ProjectDetail; 