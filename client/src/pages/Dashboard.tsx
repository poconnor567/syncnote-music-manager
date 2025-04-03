import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Folder as FolderIcon, 
  MusicNote as MusicNoteIcon,
  AudioFile as AudioFileIcon,
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  Mic as MicIcon,
  BarChart as BarChartIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  YouTube as YouTubeIcon,
  Storage as StorageIcon,
  InfoOutlined as InfoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { projectsAPI, foldersAPI } from '../services/api';
import { Project, Folder, FileItem } from '../types';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { state: authState } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStatsDialog, setOpenStatsDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  
  // Statistics state
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalFolders: 0,
    totalFiles: 0,
    fileTypes: {} as Record<string, number>,
    totalStorage: 0
  });
  
  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchProjects();
    // In a real implementation, you would fetch recent files from the API
    setRecentFiles([]);
  }, []);
  
  useEffect(() => {
    // Calculate statistics whenever projects change
    if (projects.length > 0) {
      calculateStats();
    }
  }, [projects]);
  
  const calculateStats = async () => {
    // Calculate basic project stats
    const projectCount = projects.length;
    let totalFiles = 0;
    let totalFolders = 0;
    let totalStorage = 0;
    const fileTypes: Record<string, number> = {};
    
    try {
      // Process each project
      for (const project of projects) {
        // Get detailed project info with populated folders
        const detailedProject = await projectsAPI.getProjectById(project._id);
        
        // Count root-level folders 
        const folderCount = Array.isArray(detailedProject.folders) ? detailedProject.folders.length : 0;
        totalFolders += folderCount;
        
        // Count root-level files if they exist
        if (Array.isArray(detailedProject.files)) {
          totalFiles += detailedProject.files.length;
          
          // Add file sizes and categorize by type
          detailedProject.files.forEach(file => {
            if (file && typeof file === 'object') {
              // Add to storage
              totalStorage += file.size || 0;
              
              // Count by file type
              const fileType = file.type || 'other';
              fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
            }
          });
        }
        
        // Process each folder to count files
        if (Array.isArray(detailedProject.folders)) {
          for (const folder of detailedProject.folders) {
            if (folder && typeof folder === 'object') {
              // Get detailed folder info
              try {
                const detailedFolder = await foldersAPI.getFolderById(folder._id);
                
                // Count files in this folder
                if (Array.isArray(detailedFolder.files)) {
                  totalFiles += detailedFolder.files.length;
                  
                  // Add file sizes and categorize by type
                  detailedFolder.files.forEach(file => {
                    if (file && typeof file === 'object') {
                      // Add to storage
                      totalStorage += file.size || 0;
                      
                      // Count by file type
                      const fileType = file.type || 'other';
                      fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
                    }
                  });
                }
                
                // Count subfolders (for future reference)
                if (Array.isArray(detailedFolder.subfolders)) {
                  totalFolders += detailedFolder.subfolders.length;
                }
              } catch (error) {
                console.error(`Error fetching folder ${folder._id}:`, error);
              }
            }
          }
        }
      }
      
      // Update the stats state
      setStats({
        totalProjects: projectCount,
        totalFolders,
        totalFiles,
        fileTypes,
        totalStorage
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Fetch all projects
      const data = await projectsAPI.getProjects();
      
      // Sort projects by updatedAt date (most recent first)
      const sortedProjects = [...data].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setProjects(sortedProjects);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewProjectName('');
    setNewProjectDescription('');
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return;
    }

    try {
      await projectsAPI.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
      handleCloseDialog();
      fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this project? This will permanently delete all folders and files in this project.')) {
      return;
    }

    try {
      await projectsAPI.deleteProject(projectId);
      // Refresh the project list
      fetchProjects();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      console.error('Error deleting project:', err);
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
        return <FolderIcon color="action" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Function to handle opening and closing stats dialog
  const handleOpenStatsDialog = () => {
    setOpenStatsDialog(true);
  };

  const handleCloseStatsDialog = () => {
    setOpenStatsDialog(false);
  };

  if (loading) {
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

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          mt: 2,
          borderBottom: '2px solid #1976d2',
          paddingBottom: 2
        }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 500, 
              fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              color: '#1976d2',
              letterSpacing: '0.7px'
            }}
          >
            {authState.user?.username || 'Musician'}'s Workstation
          </Typography>
          <Box>
            <Tooltip title="Refresh Dashboard">
              <IconButton onClick={fetchProjects} sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              New Project
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Recently Updated Projects
              </Typography>
              {projects.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="textSecondary">
                    No projects yet. Create your first music project to get started.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                    sx={{ mt: 2 }}
                  >
                    Create Project
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {projects.slice(0, 3).map((project) => (
                    <Grid item xs={12} sm={4} key={project._id}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <FolderIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" noWrap>
                              {project.name}
                            </Typography>
                          </Box>
                          {project.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              height: 40, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {project.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Last updated: {formatDate(project.updatedAt)}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            component={Link} 
                            to={`/projects/${project._id}`}
                          >
                            Open
                          </Button>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small"
                              component={Link}
                              to={`/projects/${project._id}/edit`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small"
                              onClick={(e) => handleDeleteProject(project._id, e)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              {projects.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  <Button component={Link} to="/projects">
                    View All Projects
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Statistics
                </Typography>
                {stats.totalFiles > 0 && (
                  <Button 
                    size="small" 
                    startIcon={<InfoIcon />} 
                    onClick={handleOpenStatsDialog}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    File Breakdown
                  </Button>
                )}
              </Box>
              
              {/* Modern statistics cards */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ 
                    bgcolor: 'rgba(25, 118, 210, 0.08)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <FolderIcon color="primary" sx={{ fontSize: 28, mb: 0.5 }} />
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>{stats.totalProjects}</Typography>
                    <Typography variant="body2" color="text.secondary">Projects</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ 
                    bgcolor: 'rgba(156, 39, 176, 0.08)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <Box sx={{ position: 'relative', height: 28, width: 28, mb: 0.5 }}>
                      <FolderIcon color="secondary" sx={{ fontSize: 28 }} />
                      <FolderIcon fontSize="small" sx={{ position: 'absolute', bottom: -2, right: -5, opacity: 0.7 }} />
                    </Box>
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>{stats.totalFolders}</Typography>
                    <Typography variant="body2" color="text.secondary">Folders</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ 
                    bgcolor: 'rgba(76, 175, 80, 0.08)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <AudioFileIcon color="success" sx={{ fontSize: 28, mb: 0.5 }} />
                    <Typography variant="h6" sx={{ lineHeight: 1 }}>{stats.totalFiles}</Typography>
                    <Typography variant="body2" color="text.secondary">Files</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ 
                    bgcolor: 'rgba(255, 152, 0, 0.08)', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center', 
                  }}>
                    <StorageIcon color="warning" sx={{ fontSize: 28, mb: 0.5 }} />
                    <Typography variant="h6" sx={{ lineHeight: 1, fontSize: '1.1rem' }}>{formatFileSize(stats.totalStorage)}</Typography>
                    <Typography variant="body2" color="text.secondary">Storage</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* File Type Breakdown Dialog */}
        <Dialog 
          open={openStatsDialog} 
          onClose={handleCloseStatsDialog}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">File Type Breakdown</Typography>
              <IconButton size="small" onClick={handleCloseStatsDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {/* Audio Files */}
            {stats.fileTypes['mp3'] > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  bgcolor: 'rgba(156, 39, 176, 0.08)', 
                  p: 1,
                  mr: 2,
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 40,
                  height: 40
                }}>
                  <AudioFileIcon sx={{ color: '#9c27b0' }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    Audio Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.fileTypes['mp3']} files
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* MIDI Files */}
            {stats.fileTypes['midi'] > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.08)', 
                  p: 1,
                  mr: 2,
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 40,
                  height: 40
                }}>
                  <MusicNoteIcon sx={{ color: '#1976d2' }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    MIDI Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.fileTypes['midi']} files
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* PDF Documents */}
            {stats.fileTypes['pdf'] > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  bgcolor: 'rgba(244, 67, 54, 0.08)', 
                  p: 1,
                  mr: 2,
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 40,
                  height: 40
                }}>
                  <PdfIcon sx={{ color: '#f44336' }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    PDF Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.fileTypes['pdf']} files
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* YouTube Videos */}
            {stats.fileTypes['youtube'] > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  bgcolor: 'rgba(255, 0, 0, 0.08)', 
                  p: 1,
                  mr: 2,
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 40,
                  height: 40
                }}>
                  <YouTubeIcon sx={{ color: '#ff0000' }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    YouTube Videos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stats.fileTypes['youtube']} files
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Storage usage summary */}
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'rgba(255, 152, 0, 0.08)', 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}>
              <StorageIcon sx={{ color: '#ff9800', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Total Storage Used</Typography>
                <Typography variant="h6">{formatFileSize(stats.totalStorage)}</Typography>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Quick Actions Section */}
        <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
                sx={{ py: 1 }}
              >
                New Project
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<PdfIcon />}
                component={Link}
                to="/upload"
                sx={{ py: 1 }}
              >
                Upload Files
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<MicIcon />}
                component={Link}
                to="/record"
                sx={{ py: 1 }}
              >
                Record MIDI
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<SearchIcon />}
                component={Link}
                to="/search"
                sx={{ py: 1 }}
              >
                Search Files
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* MIDI Integration Section */}
        <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            MIDI Integration
          </Typography>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <MusicNoteIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="body1" paragraph>
              Connect your MIDI device to record and associate tracks with your sheet music.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<MicIcon />}
              component={Link}
              to="/record"
            >
              Start Recording
            </Button>
          </Box>
        </Paper>

        {/* All Projects Section */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mt: 4, 
          mb: 2 
        }}>
          <Typography variant="h5" component="h2">
            All Projects
          </Typography>
          {projects.length > 0 && (
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              size="small"
            >
              New Project
            </Button>
          )}
        </Box>
        
        {projects.length === 0 ? (
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary" paragraph>
              No projects yet. Create your first music project to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Create Project
            </Button>
          </Paper>
        ) : (
          <Box 
            sx={{ 
              overflowX: 'auto',
              display: 'flex',
              pb: 2, // Add padding at the bottom for scrollbar
              mb: 4,
              '::-webkit-scrollbar': {
                height: 8,
              },
              '::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: 4
              },
              '::-webkit-scrollbar-thumb': {
                backgroundColor: 'primary.light',
                borderRadius: 4
              }
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, minWidth: 'max-content', px: 0.5, py: 0.5 }}>
              {projects.map((project) => (
                <Card 
                  key={project._id} 
                  sx={{ 
                    width: 280, 
                    flexShrink: 0,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <FolderIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div" noWrap>
                        {project.name}
                      </Typography>
                    </Box>
                    {project.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        height: 60, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {project.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1 }}>
                      <Chip 
                        size="small" 
                        icon={<FolderIcon />} 
                        label={`${project.folders?.length || 0} folders`} 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                      <Chip 
                        size="small" 
                        icon={<PdfIcon />} 
                        label={`${project.folders?.reduce((sum, folder) => {
                          if (typeof folder === 'object' && folder !== null) {
                            return sum + (folder.files?.length || 0);
                          }
                          return sum;
                        }, 0) || 0} files`} 
                        sx={{ mb: 1 }} 
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Last updated: {formatDate(project.updatedAt)}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      component={Link} 
                      to={`/projects/${project._id}`}
                    >
                      Open
                    </Button>
                    <Button 
                      size="small" 
                      component={Link} 
                      to={`/projects/${project._id}/edit`}
                    >
                      Edit
                    </Button>
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteProject(project._id, e)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Create Project Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Project Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <TextField
              margin="dense"
              id="description"
              label="Description (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleCreateProject} 
              variant="contained"
              disabled={!newProjectName.trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Dashboard; 