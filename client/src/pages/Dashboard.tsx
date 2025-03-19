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
  Edit as EditIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
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
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  
  // Project statistics
  const totalProjects = projects.length;
  const totalFiles = projects.reduce((acc, project) => {
    const folderFiles = project.folders?.reduce((sum, folder) => sum + (folder.files?.length || 0), 0) || 0;
    return acc + folderFiles;
  }, 0);
  const totalFolders = projects.reduce((acc, project) => acc + (project.folders?.length || 0), 0);

  useEffect(() => {
    fetchProjects();
    // In a real implementation, you would fetch recent files from the API
    setRecentFiles([]);
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getProjects();
      setProjects(data);
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
                Recent Projects
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
              <Typography variant="h6" gutterBottom>
                Statistics
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Projects" 
                    secondary={totalProjects} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PdfIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Total Files" 
                    secondary={totalFiles} 
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>

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
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
          All Projects
        </Typography>
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
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project._id}>
                <Card>
                  <CardContent>
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
                        label={`${project.folders?.reduce((sum, folder) => sum + (folder.files?.length || 0), 0) || 0} files`} 
                        sx={{ mb: 1 }} 
                      />
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
              </Grid>
            ))}
          </Grid>
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