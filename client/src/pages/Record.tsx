import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

import Layout from '../components/Layout';
import MidiRecorder from '../components/MidiRecorder/MidiRecorder';
import { projectsAPI, foldersAPI } from '../services/api';
import { Project, Folder } from '../types';

const Record: React.FC = () => {
  const navigate = useNavigate();
  
  // Project and folder selection state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFolderLoading, setIsFolderLoading] = useState<boolean>(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Recording state
  const [isRecorderReady, setIsRecorderReady] = useState<boolean>(false);
  const [recordingCompleted, setRecordingCompleted] = useState<boolean>(false);
  const [recordedFileId, setRecordedFileId] = useState<string | null>(null);
  
  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);
  
  // Fetch folders when a project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchFolders(selectedProject);
    } else {
      setFolders([]);
      setSelectedFolder('');
    }
  }, [selectedProject]);
  
  // Update recorder ready state
  useEffect(() => {
    setIsRecorderReady(Boolean(selectedProject && selectedFolder));
  }, [selectedProject, selectedFolder]);
  
  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await projectsAPI.getProjects();
      setProjects(response);
      
      // If there's only one project, select it automatically
      if (response.length === 1) {
        setSelectedProject(response[0]._id);
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchFolders = async (projectId: string) => {
    setIsFolderLoading(true);
    setError(null);
    
    try {
      const response = await foldersAPI.getFoldersByProject(projectId);
      
      // Filter out empty string folders (shouldn't happen, but just in case)
      const validFolders = response.filter(folder => folder._id);
      setFolders(validFolders);
      
      // If there's only one folder, select it automatically
      if (validFolders.length === 1) {
        setSelectedFolder(validFolders[0]._id);
      }
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      setError('Failed to load folders. Please try again.');
    } finally {
      setIsFolderLoading(false);
    }
  };
  
  const handleProjectChange = (event: SelectChangeEvent) => {
    setSelectedProject(event.target.value);
    setSelectedFolder(''); // Reset folder selection when project changes
  };
  
  const handleFolderChange = (event: SelectChangeEvent) => {
    setSelectedFolder(event.target.value);
  };
  
  const handleRecordingComplete = (success: boolean, fileId?: string) => {
    setRecordingCompleted(success);
    if (fileId) {
      setRecordedFileId(fileId);
    }
  };
  
  const navigateToProject = () => {
    if (selectedProject) {
      navigate(`/projects/${selectedProject}`);
    } else {
      navigate('/dashboard');
    }
  };
  
  const navigateToRecord = () => {
    // Reset the recorder state to start a new recording
    setRecordingCompleted(false);
    setRecordedFileId(null);
  };
  
  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            <MusicNoteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            MIDI Recorder
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Connect your MIDI keyboard to record and save MIDI files directly to your projects.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {recordingCompleted && (
            <Alert severity="success" sx={{ mb: 3 }}>
              MIDI recording saved successfully!{' '}
              <Button 
                color="inherit" 
                size="small" 
                onClick={navigateToProject}
              >
                View in Project
              </Button>
            </Alert>
          )}
          
          {/* Project and Folder Selection */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Project and Folder
            </Typography>
            
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="project-select-label">Project</InputLabel>
                  <Select
                    labelId="project-select-label"
                    value={selectedProject}
                    label="Project"
                    onChange={handleProjectChange}
                    disabled={isLoading}
                  >
                    {projects.length === 0 ? (
                      <MenuItem value="" disabled>
                        No projects available
                      </MenuItem>
                    ) : (
                      projects.map((project) => (
                        <MenuItem key={project._id} value={project._id}>
                          {project.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel id="folder-select-label">Folder</InputLabel>
                  <Select
                    labelId="folder-select-label"
                    value={selectedFolder}
                    label="Folder"
                    onChange={handleFolderChange}
                    disabled={!selectedProject || isFolderLoading}
                  >
                    {isFolderLoading ? (
                      <MenuItem value="" disabled>
                        Loading folders...
                      </MenuItem>
                    ) : folders.length === 0 ? (
                      <MenuItem value="" disabled>
                        No folders available in this project
                      </MenuItem>
                    ) : (
                      folders.map((folder) => (
                        <MenuItem key={folder._id} value={folder._id}>
                          {folder.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Paper>
          
          {/* MIDI Recorder Component */}
          {isRecorderReady && (
            <MidiRecorder
              projectId={selectedProject}
              folderId={selectedFolder}
              onRecordingComplete={handleRecordingComplete}
            />
          )}
          
          {!isRecorderReady && !isLoading && (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Please select a project and folder to begin recording.
              </Typography>
            </Paper>
          )}
          
          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
            
            {recordingCompleted && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<MusicNoteIcon />}
                onClick={navigateToRecord}
              >
                Record Another
              </Button>
            )}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default Record; 