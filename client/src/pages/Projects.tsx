import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import { projectsAPI } from '../services/api';
import { Project } from '../types';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('updatedAt-desc');
  const [openDialog, setOpenDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  
  const filterAndSortProjects = React.useCallback(() => {
    let result = [...projects];
    
    // Apply search filter
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      result = result.filter(project => 
        project.name.toLowerCase().includes(lowercaseSearch) ||
        (project.description && project.description.toLowerCase().includes(lowercaseSearch))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const [field, direction] = sortBy.split('-');
      
      switch (field) {
        case 'name':
          return direction === 'asc' 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        case 'createdAt':
          return direction === 'asc' 
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updatedAt':
        default:
          return direction === 'asc' 
            ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
            : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    
    setFilteredProjects(result);
  }, [projects, searchTerm, sortBy]);
  
  useEffect(() => {
    fetchProjects();
  }, []);
  
  useEffect(() => {
    filterAndSortProjects();
  }, [filterAndSortProjects]);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getProjects();
      setProjects(data);
      setFilteredProjects(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This will permanently delete all data associated with this project.`)) {
      return;
    }
    
    try {
      await projectsAPI.deleteProject(projectId);
      // Refresh the projects list
      fetchProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      console.error('Error deleting project:', err);
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
  
  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 4,
            mt: 2,
            borderBottom: '2px solid #1976d2',
            paddingBottom: 2
          }}>
            <IconButton
              color="primary"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to Dashboard"
              size="large"
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 500, 
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <FolderIcon sx={{ mr: 1, fontSize: 32 }} />
              All Projects
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              New Project
            </Button>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              placeholder="Search projects..."
              variant="outlined"
              size="small"
              sx={{ width: 300 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl size="small" sx={{ width: 200 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as string)}
                displayEmpty
              >
                <MenuItem value="updatedAt-desc">Latest Update</MenuItem>
                <MenuItem value="updatedAt-asc">Oldest Update</MenuItem>
                <MenuItem value="createdAt-desc">Newest</MenuItem>
                <MenuItem value="createdAt-asc">Oldest</MenuItem>
                <MenuItem value="name-asc">Name (A-Z)</MenuItem>
                <MenuItem value="name-desc">Name (Z-A)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredProjects.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              {searchTerm ? (
                <Typography variant="body1" color="text.secondary">
                  No projects found matching "{searchTerm}".
                </Typography>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    No Projects Yet
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    Create your first project to get started.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenDialog}
                  >
                    Create New Project
                  </Button>
                </>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredProjects.map((project) => (
                <Grid item xs={12} sm={6} md={4} key={project._id}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FolderIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" noWrap sx={{ fontWeight: 500 }}>
                          {project.name}
                        </Typography>
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          height: '4.5em'
                        }}
                      >
                        {project.description || 'No description provided.'}
                      </Typography>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'text.secondary' }}>
                        <Typography variant="caption">
                          Created: {formatDate(project.createdAt)}
                        </Typography>
                        <Typography variant="caption">
                          Updated: {formatDate(project.updatedAt)}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button 
                        variant="outlined" 
                        fullWidth
                        onClick={() => navigate(`/projects/${project._id}`)}
                      >
                        Open
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        size="small"
                        onClick={() => navigate(`/projects/${project._id}/edit`)}
                      >
                        <EditIcon fontSize="small" />
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="small"
                        onClick={() => handleDeleteProject(project._id, project.name)}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

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
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              id="description"
              label="Description (optional)"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
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

export default Projects; 