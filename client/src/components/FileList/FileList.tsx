import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Visibility as VisibilityIcon,
  EditOutlined as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Sort as SortIcon,
  PictureAsPdf as PdfIcon,
  AudioFile as AudioFileIcon,
  MusicNote as MusicNoteIcon,
  Image as ImageIcon,
  YouTube as YouTubeIcon,
  Description as FileIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { FileItem } from '../../types';
import FilePreviewModal from './FilePreviewModal';
import { filesAPI } from '../../services/api';

interface FileListProps {
  files: FileItem[];
  onFileClick?: (file: FileItem) => void;
  onFileDelete?: (fileId: string) => void;
  onFileDownload?: (file: FileItem) => void;
  folderId?: string;
  projectId?: string;
  onFileMoved?: () => void;
  availableFolders?: { _id: string; name: string }[];
}

const FileList: React.FC<FileListProps> = ({
  files,
  onFileClick,
  onFileDelete,
  onFileDownload,
  folderId,
  projectId,
  onFileMoved,
  availableFolders = []
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>(files);
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editFileOpen, setEditFileOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editFileTags, setEditFileTags] = useState('');
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Update filteredFiles when props.files changes
  useEffect(() => {
    setFilteredFiles(files);
  }, [files]);
  
  // Apply search, filter, and sort
  useEffect(() => {
    let result = [...files];
    
    // Search filter
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(term) || 
        file.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Type filter
    if (filterType !== 'all') {
      result = result.filter(file => file.type === filterType);
    }
    
    // Sort - update to handle direction
    const [sortField, sortDirection = 'desc'] = sortBy.split('-');
    
    if (sortField === 'name') {
      result.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (sortField === 'date') {
      result.sort((a, b) => {
        const dateA = new Date(a.uploadDate || a.createdAt).getTime();
        const dateB = new Date(b.uploadDate || b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortField === 'type') {
      result.sort((a, b) => {
        const typeComparison = a.type.localeCompare(b.type);
        return sortDirection === 'asc' ? typeComparison : -typeComparison;
      });
    } else if (sortField === 'size') {
      result.sort((a, b) => {
        // Handle YouTube videos which might not have size
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        return sortDirection === 'asc' ? sizeA - sizeB : sizeB - sizeA;
      });
    }
    
    setFilteredFiles(result);
  }, [files, searchQuery, filterType, sortBy]);
  
  const handleDownload = async (file: FileItem) => {
    if (onFileDownload) {
      onFileDownload(file);
    } else {
      try {
        // Handle YouTube videos differently - they should open in a new tab
        if (file.type === 'youtube') {
          window.open(file.path, '_blank', 'noopener,noreferrer');
          return;
        }
        
        // For regular files, create a link element and trigger a download with authentication
        const token = localStorage.getItem('token');
        // Create a hidden anchor element to initiate the download
        const link = document.createElement('a');
        link.href = `http://localhost:5000/api/files/${file._id}/download`;
        // Set Authorization header by making it part of the URL (workaround for direct downloads)
        if (token) {
          // Append the token as a query parameter
          link.href += `?token=${token}`;
        }
        link.target = '_blank';
        // Append link to the body, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading file:', error);
      }
    }
  };
  
  const handleDelete = async (fileId: string) => {
    if (onFileDelete) {
      try {
        await onFileDelete(fileId);
        setSnackbar({
          open: true,
          message: 'File deleted successfully',
          severity: 'success'
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Failed to delete file',
          severity: 'error'
        });
      }
    }
  };
  
  const handleSortOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setSortAnchorEl(event.currentTarget);
  };
  
  const handleSortClose = () => {
    setSortAnchorEl(null);
  };
  
  const handleFilterOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  
  const handleSortChange = (newSortValue: string) => {
    setSortBy(newSortValue);
    handleSortClose();
  };
  
  const handleFilterChange = (filter: string) => {
    setFilterType(filter);
    handleFilterClose();
  };
  
  const handlePreview = (file: FileItem) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };
  
  const handleClosePreview = () => {
    setPreviewOpen(false);
  };
  
  const handleEditClick = (file: FileItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    setEditingFile(file);
    setEditFileName(file.name);
    setEditFileTags(file.tags?.join(', ') || '');
    setEditError(null);
    setEditFileOpen(true);
  };
  
  const handleEditSave = async () => {
    if (!editingFile) return;
    
    // Basic validation
    if (!editFileName.trim()) {
      setEditError('File name is required');
      return;
    }
    
    try {
      setIsEditSaving(true);
      setEditError(null);
      
      // Process tags - convert from comma-separated string to array
      const tagsArray = editFileTags
        ? editFileTags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
        : [];

      console.log('Saving file with tags:', tagsArray);

      // Call API to update file
      const response = await filesAPI.updateFile(editingFile._id, {
        name: editFileName.trim(),
        tags: tagsArray  // Send as array
      });
      
      console.log('Update file response:', response);
      
      // Update the file locally to avoid a full refresh
      const updatedFiles = filteredFiles.map(file => {
        if (file._id === editingFile._id) {
          return {
            ...file,
            name: editFileName.trim(),
            tags: tagsArray
          };
        }
        return file;
      });
      
      setFilteredFiles(updatedFiles);
      
      // Close the dialog
      setEditFileOpen(false);
      setEditingFile(null);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'File updated successfully',
        severity: 'success'
      });
      
    } catch (error: any) {
      console.error('Error updating file:', error);
      setEditError(error.message || 'Failed to update file');
    } finally {
      setIsEditSaving(false);
    }
  };
  
  const handleEditCancel = () => {
    setEditFileOpen(false);
    setEditingFile(null);
    setEditError(null);
  };
  
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'midi':
        return <MusicNoteIcon color="primary" />;
      case 'mp3':
        return <AudioFileIcon color="secondary" />;
      case 'image':
        return <ImageIcon color="success" />;
      case 'youtube':
        return <YouTubeIcon color="error" />;
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
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  /**
   * Directly handle opening a YouTube video file
   * @param file The YouTube file object
   * @param e Optional mouse event
   */
  const openYouTubeVideo = (file: FileItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    console.log('Opening YouTube file:', file.name);
    
    // Get the URL from the file object
    let youtubeUrl = file.path;
    
    // Handle broken case where path is undefined or empty
    if (!youtubeUrl || youtubeUrl === 'undefined') {
      console.warn('YouTube URL is missing in file.path');
      
      // Use the file name as a search term as fallback
      console.log('Falling back to search using file name:', file.name);
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(file.name)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Ensure URL has protocol
    if (!youtubeUrl.startsWith('http://') && !youtubeUrl.startsWith('https://')) {
      youtubeUrl = 'https://' + youtubeUrl;
    }
    
    console.log('Opening YouTube URL:', youtubeUrl);
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  };

  // Add the handleCloseSnackbar function inside the component
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      {/* Header with search, filters and view toggle in a single row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {/* Search field with compact styling */}
        <TextField
          placeholder="Search files..."
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1, mr: 2, maxWidth: { xs: '100%', sm: '60%', md: '50%' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        {/* Controls group - aligned right */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Tooltip title="Filter">
            <IconButton onClick={handleFilterOpen} size="small" sx={{ mx: 0.5 }}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Sort">
            <IconButton onClick={handleSortOpen} size="small" sx={{ mx: 0.5 }}>
              <SortIcon />
            </IconButton>
          </Tooltip>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{ ml: 1 }}
          >
            <ToggleButton value="grid">
              <GridViewIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="list">
              <ListViewIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      {/* Files section */}
      <Box>
        {filteredFiles.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {searchQuery || filterType !== 'all'
                ? 'No files match your search or filter criteria.'
                : 'No files found in this location.'}
            </Typography>
          </Paper>
        ) : viewMode === 'grid' ? (
          <Grid container spacing={2}>
            {filteredFiles.map((file) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={file._id}>
                <Card 
                  sx={{ 
                    transition: 'transform 0.2s', 
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                    position: 'relative',
                    cursor: onFileClick ? 'pointer' : 'default'
                  }}
                  onClick={() => onFileClick && onFileClick(file)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getFileIcon(file.type)}
                      <Typography variant="subtitle1" sx={{ ml: 1, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {file.type === 'youtube' ? 'YouTube Video' : file.type.toUpperCase()}
                      {file.type !== 'youtube' && ` • ${formatFileSize(file.size)}`}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      Uploaded: {formatDate(file.uploadDate || file.createdAt)}
                    </Typography>
                    
                    {file.tags && file.tags.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {file.tags.map((tag, idx) => (
                          <Chip 
                            key={idx} 
                            label={tag} 
                            size="small" 
                            sx={{ fontSize: '0.7rem' }} 
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    {file.type === 'youtube' ? (
                      <Tooltip title="Open in YouTube">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            openYouTubeVideo(file, e);
                          }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <>
                        <Tooltip title="Preview">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(file);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(file, e);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file._id);
                        }}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {filteredFiles.map((file) => (
              <ListItem
                key={file._id}
                secondaryAction={
                  <Box>
                    {file.type === 'youtube' ? (
                      <Tooltip title="Open in YouTube">
                        <IconButton 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            openYouTubeVideo(file, e);
                          }}
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <>
                        <Tooltip title="Preview">
                          <IconButton 
                            edge="end" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(file);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton 
                            edge="end" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file);
                            }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Edit">
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(file, e);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file._id);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                disablePadding
                sx={{ 
                  mb: 1, 
                  transition: 'background-color 0.2s',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemButton onClick={() => onFileClick && onFileClick(file)}>
                  <ListItemIcon>
                    {getFileIcon(file.type)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={file.name} 
                    secondary={
                      <React.Fragment>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {file.type === 'youtube' ? 'YouTube Video' : file.type.toUpperCase()}
                          {file.type !== 'youtube' && ` • ${formatFileSize(file.size)}`}
                        </Typography>
                        {" — "}
                        {formatDate(file.uploadDate || file.createdAt)}
                        {file.tags && file.tags.length > 0 && (
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {file.tags.map((tag, idx) => (
                              <Chip 
                                key={idx} 
                                label={tag} 
                                size="small" 
                                sx={{ fontSize: '0.7rem' }} 
                              />
                            ))}
                          </Box>
                        )}
                      </React.Fragment>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      
      {/* Sort Menu - Update menu items to match parent component options */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleSortClose}
      >
        <MenuItem onClick={() => handleSortChange('date-desc')} selected={sortBy === 'date-desc'}>
          Newest
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('date-asc')} selected={sortBy === 'date-asc'}>
          Oldest
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('name-asc')} selected={sortBy === 'name-asc'}>
          Name (A-Z)
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('name-desc')} selected={sortBy === 'name-desc'}>
          Name (Z-A)
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('type-asc')} selected={sortBy === 'type-asc'}>
          Type
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('size-desc')} selected={sortBy === 'size-desc'}>
          Size (Large to Small)
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('size-asc')} selected={sortBy === 'size-asc'}>
          Size (Small to Large)
        </MenuItem>
      </Menu>
      
      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
      >
        <MenuItem onClick={() => handleFilterChange('all')} selected={filterType === 'all'}>
          All Files
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('pdf')} selected={filterType === 'pdf'}>
          PDF Files
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('midi')} selected={filterType === 'midi'}>
          MIDI Files
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('mp3')} selected={filterType === 'mp3'}>
          MP3 Files
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('image')} selected={filterType === 'image'}>
          Image Files
        </MenuItem>
        <MenuItem onClick={() => handleFilterChange('youtube')} selected={filterType === 'youtube'}>
          YouTube Videos
        </MenuItem>
      </Menu>
      
      {/* File Preview Modal */}
      <FilePreviewModal
        open={previewOpen}
        file={selectedFile}
        onClose={handleClosePreview}
        onDownload={handleDownload}
      />
      
      {/* Edit File Dialog */}
      <Dialog open={editFileOpen} onClose={handleEditCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Edit File {editingFile?.type === 'youtube' ? '(YouTube)' : ''}</DialogTitle>
        <DialogContent>
          {editError && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {editError}
            </Typography>
          )}
          
          <TextField
            label="File Name"
            fullWidth
            value={editFileName}
            onChange={(e) => setEditFileName(e.target.value)}
            margin="normal"
            required
            error={!editFileName.trim()}
            helperText={!editFileName.trim() ? "File name is required" : ""}
            disabled={isEditSaving}
          />
          
          <TextField
            label="Tags (comma separated)"
            fullWidth
            value={editFileTags}
            onChange={(e) => setEditFileTags(e.target.value)}
            margin="normal"
            placeholder="tutorial, guitar, lesson"
            helperText="Separate tags with commas"
            disabled={isEditSaving}
          />
          
          {editingFile?.type === 'youtube' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                YouTube URL: {editingFile.path || 'Not available'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel} disabled={isEditSaving}>Cancel</Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            color="primary"
            disabled={isEditSaving || !editFileName.trim()}
          >
            {isEditSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileList; 