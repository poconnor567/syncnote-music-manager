import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  TextField,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  AudioFile as AudioFileIcon,
  PictureAsPdf as PdfIcon,
  MusicNote as MusicNoteIcon,
  Image as ImageIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { filesAPI } from '../../services/api';

interface FileUploadProps {
  folderId: string;
  projectId: string;
  onUploadComplete: (success: boolean) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ folderId, projectId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(prevFiles => [...prevFiles, ...filesArray]);
    }
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('audio/mpeg') || fileType.includes('audio/mp3')) {
      return <AudioFileIcon color="secondary" />;
    } else if (fileType.includes('application/pdf')) {
      return <PdfIcon color="error" />;
    } else if (fileType.includes('audio/midi')) {
      return <MusicNoteIcon color="primary" />;
    } else if (fileType.includes('image/')) {
      return <ImageIcon color="success" />;
    } else {
      return <CloudUploadIcon color="action" />;
    }
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }
    
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      // Calculate progress increment per file
      const progressIncrement = 100 / selectedFiles.length;
      
      // Upload each file sequentially
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Check file type
        const validTypes = [
          'audio/mpeg', 'audio/mp3', 
          'application/pdf', 
          'audio/midi', 'audio/x-midi',
          'image/jpeg', 'image/png', 'image/gif'
        ];
        
        if (!validTypes.some(type => file.type.includes(type))) {
          setError(`File "${file.name}" is not a supported type. Please upload MP3, PDF, MIDI, or image files.`);
          setUploading(false);
          return;
        }
        
        await filesAPI.uploadFile(folderId, file, tags.join(','));
        
        // Update progress after each file
        setProgress((i + 1) * progressIncrement);
      }
      
      // Reset form after successful upload
      setSelectedFiles([]);
      setTags([]);
      setUploadSuccess(true);
      onUploadComplete(true);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload file(s)');
      onUploadComplete(false);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Files
      </Typography>
      
      {uploadSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Files uploaded successfully!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".mp3,audio/mpeg,application/pdf,.pdf,audio/midi,.midi,.mid,image/jpeg,image/png,image/gif,.jpg,.jpeg,.png,.gif"
        />
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          fullWidth
        >
          Select Files
        </Button>
      </Box>
      
      {selectedFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Files:
          </Typography>
          <Grid container spacing={1}>
            {selectedFiles.map((file, index) => (
              <Grid item xs={12} key={index}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getFileIcon(file.type)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFile(index)}
                    disabled={uploading}
                  >
                    <CloseIcon fontSize="small" />
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Tags (Optional):
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <TextField
            size="small"
            placeholder="Add tags (e.g., vocals, verse)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            disabled={uploading}
            sx={{ flexGrow: 1, mr: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddTag}
            disabled={uploading || !tagInput.trim()}
          >
            Add
          </Button>
        </Box>
        
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                disabled={uploading}
                size="small"
              />
            ))}
          </Box>
        )}
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          fullWidth
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
      </Box>
      
      {uploading && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" align="center" sx={{ mt: 1 }}>
            {Math.round(progress)}% Complete
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FileUpload; 