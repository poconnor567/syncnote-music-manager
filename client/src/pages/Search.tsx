import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  Chip,
  ListItemButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Folder as FolderIcon,
  Description as FileIcon,
  MusicNote as MusicNoteIcon,
  AudioFile as AudioFileIcon,
  YouTube as YouTubeIcon,
  PictureAsPdf as PdfIcon,
  Category as CategoryIcon,
  Image as ImageIcon,
  DeleteSweep as DeleteSweepIcon
} from '@mui/icons-material';
import Layout from '../components/Layout/Layout';
import { projectsAPI, foldersAPI, filesAPI } from '../services/api';
import { Project, Folder, FileItem } from '../types';

interface SearchResult {
  projects: Project[];
  folders: {folder: Folder, projectId: string, projectName: string}[];
  files: {file: FileItem, folderId: string | null, folderName: string | null, projectId: string, projectName: string}[];
}

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
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult>({
    projects: [],
    folders: [],
    files: []
  });
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Check if there's a query parameter for search
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
      handleSearch(query);
    }
    
    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
    
    // Pre-fetch all projects for faster searching
    fetchAllProjects();
  }, [location.search]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce time
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearchOnly(debouncedSearchQuery);
    } else {
      // Clear results when search query is empty
      setSearchResults({
        projects: [],
        folders: [],
        files: []
      });
    }
  }, [debouncedSearchQuery]);

  const fetchAllProjects = async () => {
    try {
      const allProjects = await projectsAPI.getProjects();
      setProjects(allProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  // This function performs search without saving to recent searches
  const performSearchOnly = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({
        projects: [],
        folders: [],
        files: []
      });
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const results: SearchResult = {
        projects: [],
        folders: [],
        files: []
      };
      
      // Search projects (this is fast as it's just filtering an array in memory)
      results.projects = projects.filter(project => 
        project.name.toLowerCase().includes(query.toLowerCase()) || 
        (project.description && project.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      // For each project, search its folders and files
      for (const project of projects) {
        try {
          // Get detailed project info
          const detailedProject = await projectsAPI.getProjectById(project._id);
          
          // Search folders
          if (Array.isArray(detailedProject.folders)) {
            for (const folder of detailedProject.folders) {
              if (folder.name.toLowerCase().includes(query.toLowerCase())) {
                results.folders.push({
                  folder,
                  projectId: project._id,
                  projectName: project.name
                });
              }
              
              // Get folder details to search files
              try {
                const folderDetails = await foldersAPI.getFolderById(folder._id);
                
                // Search files in the folder
                if (Array.isArray(folderDetails.files)) {
                  const matchingFiles = folderDetails.files.filter(file => 
                    file.name.toLowerCase().includes(query.toLowerCase()) ||
                    (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
                  );
                  
                  // Add matching files to results
                  matchingFiles.forEach(file => {
                    results.files.push({
                      file,
                      folderId: folder._id,
                      folderName: folder.name,
                      projectId: project._id,
                      projectName: project.name
                    });
                  });
                }
              } catch (error) {
                console.error(`Error fetching folder ${folder._id}:`, error);
              }
            }
          }
          
          // Search root-level files
          if (Array.isArray(detailedProject.files)) {
            const matchingFiles = detailedProject.files.filter(file => 
              file.name.toLowerCase().includes(query.toLowerCase()) ||
              (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
            );
            
            // Add matching files to results
            matchingFiles.forEach(file => {
              results.files.push({
                file,
                folderId: null,
                folderName: null,
                projectId: project._id,
                projectName: project.name
              });
            });
          }
        } catch (error) {
          console.error(`Error searching project ${project._id}:`, error);
        }
      }
      
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // This function performs search AND saves to recent searches
  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) {
      setSearchResults({
        projects: [],
        folders: [],
        files: []
      });
      return;
    }
    
    // Save search to recent searches
    const newRecentSearches = [
      query,
      ...recentSearches.filter(s => s !== query)
    ].slice(0, 5); // Keep only the 5 most recent searches
    
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
    
    // Update URL with search query
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('q', query);
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    }, { replace: true });
    
    // Perform the actual search
    await performSearchOnly(query);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults({
      projects: [],
      folders: [],
      files: []
    });
    navigate('/search');
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'mp3':
        return <AudioFileIcon color="secondary" />;
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'midi':
        return <MusicNoteIcon color="primary" />;
      case 'youtube':
        return <YouTubeIcon style={{ color: 'red' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon color="success" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  const getTotalResults = () => {
    return searchResults.projects.length + searchResults.folders.length + searchResults.files.length;
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    handleSearch(query); // Use handleSearch to save this to recent searches
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, query: string) => {
    e.stopPropagation(); // Prevent the chip click handler from firing
    const newRecentSearches = recentSearches.filter(item => item !== query);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
  };

  const handleClearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ my: 2 }}>
          {/* Compressed header with smaller styling */}
          <Box 
            sx={{ 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <SearchIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Box>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  fontWeight: 600,
                  color: 'primary.main'
                }}
              >
                SyncNote Search
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
              >
                Find projects, folders, files or search by tags
              </Typography>
            </Box>
          </Box>

          {/* Search input with compact styling */}
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2,
            }}
          >
            <TextField
              fullWidth
              placeholder="Search for projects, folders, files, or by tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {searchQuery && (
                      <IconButton
                        aria-label="clear search"
                        onClick={handleClearSearch}
                        edge="end"
                        size="small"
                      >
                        <ClearIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
                sx: { 
                  py: 0.25,
                  borderRadius: 1.5,
                }
              }}
              variant="outlined"
              size="small"
              sx={{ mb: 1 }}
            />
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                {recentSearches.length > 0 && (
                  <>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        mr: 0.5, 
                        alignSelf: 'center',
                        fontWeight: 500
                      }}
                    >
                      Recent:
                    </Typography>
                    {recentSearches.map((query, index) => (
                      <Chip
                        key={index}
                        label={query}
                        size="small"
                        onClick={() => handleRecentSearchClick(query)}
                        onDelete={(e) => handleRemoveRecentSearch(e as React.MouseEvent, query)}
                        sx={{ 
                          fontSize: '0.7rem',
                          height: '24px',
                          borderRadius: 1,
                        }}
                      />
                    ))}
                    <IconButton 
                      size="small" 
                      onClick={handleClearAllRecentSearches} 
                      color="default" 
                      aria-label="clear all recent searches"
                      title="Clear all recent searches"
                      sx={{ 
                        ml: 0.5,
                        p: 0.5
                      }}
                    >
                      <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleSearch()}
                disabled={!searchQuery.trim() || isSearching}
                startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                sx={{ 
                  px: 2,
                  py: 0.5,
                  minHeight: '30px',
                  fontSize: '0.8rem',
                  borderRadius: 1,
                }}
                size="small"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </Box>
          </Paper>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                borderRadius: 1,
                py: 0.5
              }}
            >
              {error}
            </Alert>
          )}

          {searchQuery && !isSearching && (
            <Box sx={{ mb: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  mb: 1,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <SearchIcon fontSize="small" color="primary" />
                {getTotalResults()} results for "{searchQuery}"
              </Typography>
              
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="search result tabs"
                sx={{ 
                  mb: 2,
                  minHeight: '36px',
                  borderBottom: 1, 
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    minHeight: '36px',
                    px: 2,
                    py: 0.5,
                    fontSize: '0.8rem'
                  },
                }}
                TabIndicatorProps={{ 
                  sx: { 
                    height: 2,
                    borderRadius: '2px 2px 0 0' 
                  } 
                }}
              >
                <Tab 
                  label={`All (${getTotalResults()})`} 
                  id="search-tab-0"
                  aria-controls="search-tabpanel-0" 
                />
                <Tab 
                  label={`Projects (${searchResults.projects.length})`} 
                  id="search-tab-1"
                  aria-controls="search-tabpanel-1" 
                />
                <Tab 
                  label={`Folders (${searchResults.folders.length})`} 
                  id="search-tab-2"
                  aria-controls="search-tabpanel-2" 
                />
                <Tab 
                  label={`Files (${searchResults.files.length})`} 
                  id="search-tab-3"
                  aria-controls="search-tabpanel-3" 
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {getTotalResults() === 0 ? (
                  <Alert 
                    severity="info"
                    sx={{ 
                      borderRadius: 1,
                      py: 0.5
                    }}
                  >
                    No results found for "{searchQuery}". Try using different keywords.
                  </Alert>
                ) : (
                  <>
                    {/* Projects section */}
                    {searchResults.projects.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center' }}>
                          <FolderIcon sx={{ mr: 0.5, fontSize: 18 }} />
                          Projects
                        </Typography>
                        <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                          <List disablePadding dense>
                            {searchResults.projects.map((project, index) => (
                              <React.Fragment key={project._id}>
                                {index > 0 && <Divider />}
                                <ListItemButton
                                  onClick={() => navigate(`/projects/${project._id}`)}
                                  dense
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <FolderIcon color="primary" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={project.name}
                                    secondary={project.description || "No description"}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                    secondaryTypographyProps={{ variant: 'caption' }}
                                  />
                                </ListItemButton>
                              </React.Fragment>
                            ))}
                          </List>
                        </Paper>
                      </Box>
                    )}

                    {/* Folders section */}
                    {searchResults.folders.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon sx={{ mr: 0.5, fontSize: 18 }} />
                          Folders
                        </Typography>
                        <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                          <List disablePadding dense>
                            {searchResults.folders.map((item, index) => (
                              <React.Fragment key={item.folder._id}>
                                {index > 0 && <Divider />}
                                <ListItemButton
                                  onClick={() => navigate(`/projects/${item.projectId}?folder=${item.folder._id}`)}
                                  dense
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <FolderIcon color="primary" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={item.folder.name}
                                    secondary={`In project: ${item.projectName}`}
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                    secondaryTypographyProps={{ variant: 'caption' }}
                                  />
                                </ListItemButton>
                              </React.Fragment>
                            ))}
                          </List>
                        </Paper>
                      </Box>
                    )}

                    {/* Files section */}
                    {searchResults.files.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon sx={{ mr: 0.5, fontSize: 18 }} />
                          Files
                        </Typography>
                        <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                          <List disablePadding dense>
                            {searchResults.files.map((item, index) => (
                              <React.Fragment key={item.file._id}>
                                {index > 0 && <Divider />}
                                <ListItemButton
                                  onClick={() => 
                                    item.folderId 
                                      ? navigate(`/projects/${item.projectId}?folder=${item.folderId}`)
                                      : navigate(`/projects/${item.projectId}`)
                                  }
                                  dense
                                >
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    {getFileIcon(item.file.type)}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={item.file.name}
                                    secondary={
                                      <>
                                        <Typography variant="caption" component="span">
                                          {item.folderName 
                                            ? `In folder: ${item.folderName} (${item.projectName})`
                                            : `In project: ${item.projectName}`}
                                        </Typography>
                                      </>
                                    }
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                  />
                                </ListItemButton>
                              </React.Fragment>
                            ))}
                          </List>
                        </Paper>
                      </Box>
                    )}
                  </>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {searchResults.projects.length === 0 ? (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 1,
                      py: 0.5
                    }}
                  >
                    No projects found matching "{searchQuery}".
                  </Alert>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                    <List disablePadding dense>
                      {searchResults.projects.map((project, index) => (
                        <React.Fragment key={project._id}>
                          {index > 0 && <Divider />}
                          <ListItemButton
                            onClick={() => navigate(`/projects/${project._id}`)}
                            dense
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <FolderIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={project.name}
                              secondary={project.description || 'No description'}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItemButton>
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {searchResults.folders.length === 0 ? (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 1,
                      py: 0.5
                    }}
                  >
                    No folders found matching "{searchQuery}".
                  </Alert>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                    <List disablePadding dense>
                      {searchResults.folders.map((item, index) => (
                        <React.Fragment key={item.folder._id}>
                          {index > 0 && <Divider />}
                          <ListItemButton
                            onClick={() => navigate(`/projects/${item.projectId}?folder=${item.folder._id}`)}
                            dense
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <FolderIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={item.folder.name}
                              secondary={`In project: ${item.projectName}`}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItemButton>
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                {searchResults.files.length === 0 ? (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 1,
                      py: 0.5
                    }}
                  >
                    No files found matching "{searchQuery}".
                  </Alert>
                ) : (
                  <Paper variant="outlined" sx={{ borderRadius: 1 }}>
                    <List disablePadding dense>
                      {searchResults.files.map((item, index) => (
                        <React.Fragment key={item.file._id}>
                          {index > 0 && <Divider />}
                          <ListItemButton
                            onClick={() => 
                              item.folderId 
                                ? navigate(`/projects/${item.projectId}?folder=${item.folderId}`)
                                : navigate(`/projects/${item.projectId}`)
                            }
                            dense
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {getFileIcon(item.file.type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={item.file.name}
                              secondary={
                                <Typography variant="caption" component="span">
                                  {item.folderName 
                                    ? `In folder: ${item.folderName} (${item.projectName})`
                                    : `In project: ${item.projectName}`}
                                </Typography>
                              }
                              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                            />
                          </ListItemButton>
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                )}
              </TabPanel>
            </Box>
          )}

          {!searchQuery && !isSearching && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                borderRadius: 1,
              }}
            >
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                py: 1,
              }}>
                <SearchIcon sx={{ fontSize: 36, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'primary.main',
                      mb: 0.5 
                    }}
                  >
                    Search Your Workspace
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    Find projects, folders, files, or search by tags in SyncNote.
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block',
                      fontStyle: 'italic',
                      bgcolor: 'rgba(0, 0, 0, 0.03)',
                      p: 1,
                      borderRadius: 1,
                      borderLeft: '2px solid',
                      borderColor: 'primary.light'
                    }}
                  >
                    Try searching for project names, file types (like "mp3" or "pdf"), or specific tags.
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default Search; 