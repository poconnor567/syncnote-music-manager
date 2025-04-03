import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  YouTube as YouTubeIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import FileUpload from '../components/FileUpload/FileUpload';
import { filesAPI } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`upload-tabpanel-${index}`}
      aria-labelledby={`upload-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const UploadFiles: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeTags, setYoutubeTags] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  
  // Extract query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const projectIdParam = queryParams.get('projectId');
    const folderIdParam = queryParams.get('folderId');
    
    if (projectIdParam) {
      setProjectId(projectIdParam);
    }
    
    if (folderIdParam) {
      setFolderId(folderIdParam);
    }
  }, [location]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim() || !youtubeTitle.trim()) {
      setSubmitError('YouTube URL and title are required.');
      return;
    }
    
    // Basic validation for YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
      setSubmitError('Please enter a valid YouTube URL.');
      return;
    }

    // Log the URL that's being submitted
    console.log('Submitting YouTube URL:', youtubeUrl.trim());
    
    try {
      setSubmitError(null);
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      // Add YouTube video to folder or project
      if (folderId) {
        // When adding to a folder, we pass the folder ID as containerId
        // but we need to ensure the API call has the project ID too
        console.log('Adding YouTube to folder with URL:', youtubeUrl.trim());
        await filesAPI.addYouTubeVideo(folderId, {
          url: youtubeUrl.trim(),
          title: youtubeTitle.trim(),
          tags: youtubeTags.trim().split(',').map(tag => tag.trim()).filter(Boolean),
          projectId: projectId // Pass projectId separately for folder uploads
        });
      } else {
        // If no folder is selected, add to project root
        console.log('Adding YouTube to project root with URL:', youtubeUrl.trim());
        await filesAPI.addYouTubeVideo(projectId, {
          url: youtubeUrl.trim(),
          title: youtubeTitle.trim(),
          tags: youtubeTags.trim().split(',').map(tag => tag.trim()).filter(Boolean),
          isProjectRoot: true
        });
      }
      
      // Show success message and reset form
      setSubmitSuccess(true);
      setYoutubeUrl('');
      setYoutubeTitle('');
      setYoutubeTags('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error adding YouTube video:', error);
      setSubmitError(error.message || 'Failed to add YouTube video');
    }
  };
  
  const handleUploadComplete = (success: boolean) => {
    if (success) {
      // Nothing to do here, the FileUpload component handles its own success state
    }
  };
  
  const handleBack = () => {
    if (folderId && projectId) {
      navigate(`/projects/${projectId}?folder=${folderId}`);
    } else if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  };
  
  // If neither projectId nor folderId is provided, show error
  if (!projectId && !folderId) {
    return (
      <Layout>
        <Container maxWidth="md">
          <Alert severity="error" sx={{ mt: 4 }}>
            Missing project or folder ID. Please select a project or folder to upload files.
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => navigate('/projects')}>
              Go to Projects
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, mt: 2 }}>
          <IconButton 
            onClick={handleBack}
            color="primary"
            aria-label="back"
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Upload Content
          </Typography>
        </Box>
        
        <Paper elevation={2} sx={{ p: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            aria-label="upload tabs"
          >
            <Tab 
              icon={<CloudUploadIcon />} 
              label="Upload Files" 
              id="upload-tab-0"
              aria-controls="upload-tabpanel-0" 
            />
            <Tab 
              icon={<YouTubeIcon />} 
              label="Add YouTube Video" 
              id="upload-tab-1"
              aria-controls="upload-tabpanel-1" 
            />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            {folderId ? (
              <FileUpload 
                folderId={folderId}
                projectId={projectId || ''} 
                onUploadComplete={handleUploadComplete}
              />
            ) : (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Please select a folder to upload files. Files cannot be uploaded directly to a project root.
              </Alert>
            )}
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Add YouTube Video
            </Typography>
            
            {submitSuccess && (
              <Alert severity="success" sx={{ mb: 3 }}>
                YouTube video added successfully!
              </Alert>
            )}
            
            {submitError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {submitError}
              </Alert>
            )}
            
            <TextField
              label="YouTube URL"
              fullWidth
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              margin="normal"
              required
            />
            
            <TextField
              label="Title"
              fullWidth
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
              placeholder="Enter a title for this video"
              margin="normal"
              required
            />
            
            <TextField
              label="Tags (comma separated)"
              fullWidth
              value={youtubeTags}
              onChange={(e) => setYoutubeTags(e.target.value)}
              placeholder="tutorial, guitar, lesson"
              margin="normal"
            />
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<YouTubeIcon />}
                onClick={handleYoutubeSubmit}
                disabled={!youtubeUrl.trim() || !youtubeTitle.trim()}
                fullWidth
              >
                Add YouTube Video
              </Button>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Layout>
  );
};

export default UploadFiles; 