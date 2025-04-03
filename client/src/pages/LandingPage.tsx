import React from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Grid, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  CardMedia,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import StorageIcon from '@mui/icons-material/Storage';
import DevicesIcon from '@mui/icons-material/Devices';
import SpeedIcon from '@mui/icons-material/Speed';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const features = [
    {
      title: 'Sheet Music Management',
      description: 'Organize and annotate your sheet music in one central location.',
      icon: <MusicNoteIcon fontSize="large" />
    },
    {
      title: 'MIDI Integration',
      description: 'Seamlessly work with MIDI files alongside your sheet music.',
      icon: <LibraryMusicIcon fontSize="large" />
    },
    {
      title: 'Audio Recording Storage',
      description: 'Store and organize your practice recordings and performances.',
      icon: <QueueMusicIcon fontSize="large" />
    },
    {
      title: 'Centralized Project Management',
      description: 'Keep all your musical assets organized by project.',
      icon: <StorageIcon fontSize="large" />
    },
    {
      title: 'Cross-Platform Access',
      description: 'Access your music projects from any device with a web browser.',
      icon: <DevicesIcon fontSize="large" />
    },
    {
      title: 'Streamlined Workflow',
      description: 'Increase productivity with our intuitive, all-in-one interface.',
      icon: <SpeedIcon fontSize="large" />
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
    }}>
      {/* Hero Section */}
      <Box 
        sx={{ 
          pt: { xs: 8, md: 12 }, 
          pb: { xs: 8, md: 12 },
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Typography 
            variant="h1" 
            component="h1" 
            sx={{ 
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 700,
              mb: 2
            }}
          >
            SyncNote
          </Typography>
          <Typography 
            variant="h2" 
            component="h2" 
            sx={{ 
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 400,
              mb: 4,
              maxWidth: '800px',
              mx: 'auto'
            }}
          >
            The All-in-One Platform for Musicians
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontSize: { xs: '1rem', md: '1.25rem' },
              mb: 6,
              maxWidth: '800px',
              mx: 'auto'
            }}
          >
            Streamline your creative workflow with our centralized system for managing sheet music, MIDI files, recordings, and practice notes.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              component={RouterLink} 
              to="/register" 
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: '#f50057', 
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: '#c51162'
                }
              }}
            >
              Get Started
            </Button>
            <Button 
              component={RouterLink} 
              to="/login" 
              variant="outlined" 
              size="large"
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Login
            </Button>
          </Box>
        </Container>
        
        {/* Decorative musical notes background */}
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          opacity: 0.1,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")'
        }} />
      </Box>

      {/* Problem Statement Section */}
      <Box sx={{ bgcolor: 'white', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            component="h2" 
            align="center"
            sx={{ 
              mb: 6,
              fontWeight: 600,
              color: '#1a237e'
            }}
          >
            The Challenge for Modern Musicians
          </Typography>
          
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
                  Today, musicians face significant challenges managing their creative assets across
                  multiple workflows without a central organisation tool.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
                  Existing solutions are usually specialised for specific tasks like sheet music annotation, 
                  MIDI recording, or audio playback alone.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
                  This forces musicians to use multiple platforms to manage their projects, resulting in 
                  inefficiencies, confusion, and a diverted focus from the creative process.
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '1.1rem' }}>
                  Over time, this disjointed approach can limit productivity and artistic expression.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={4} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ color: '#1a237e', fontWeight: 600 }}>
                  The Disjointed Workflow
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#f44336',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      1
                    </Box>
                    <Typography>Sheet music in one application</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#ff9800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      2
                    </Box>
                    <Typography>MIDI files in another program</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#4caf50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      3
                    </Box>
                    <Typography>Audio recordings in a separate DAW</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#9c27b0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      4
                    </Box>
                    <Typography>Practice notes in yet another tool</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Solution Section */}
      <Box sx={{ 
        py: { xs: 6, md: 10 },
        background: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)'
      }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            component="h2" 
            align="center"
            sx={{ 
              mb: 6,
              fontWeight: 600,
              color: '#1a237e'
            }}
          >
            Introducing SyncNote
          </Typography>
          
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
              <Paper 
                elevation={4} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  background: 'white',
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ color: '#1a237e', fontWeight: 600 }}>
                  The Integrated Solution
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#3f51b5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </Box>
                    <Typography>All your musical assets in one place</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#3f51b5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </Box>
                    <Typography>Seamless workflow between different file types</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#3f51b5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </Box>
                    <Typography>Organized project management system</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: '#3f51b5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </Box>
                    <Typography>Accessible from any device with a web browser</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
                  SyncNote is a web-based service that addresses these issues directly - a centralised,
                  web-based system for all aspects of musical project management.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
                  By combining tools to organise sheet music, manage MIDI files, store recordings and track 
                  practice notes into one easy-to-use interface, SyncNote eliminates the need for several 
                  disconnected tools.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem' }}>
                  This integration helps streamline workflows and frees musicians to concentrate
                  on their art. SyncNote is accessible, flexible and simple - an all-in-one solution for
                  modern musicians.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ bgcolor: 'white', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            component="h2" 
            align="center"
            sx={{ 
              mb: 6,
              fontWeight: 600,
              color: '#1a237e'
            }}
          >
            Key Features
          </Typography>
          
          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                    <Box sx={{ 
                      color: '#3f51b5', 
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Box sx={{ 
        py: { xs: 6, md: 8 },
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <Typography 
            variant="h3" 
            component="h2"
            sx={{ 
              mb: 3,
              fontWeight: 600
            }}
          >
            Ready to Streamline Your Musical Workflow?
          </Typography>
          <Typography 
            variant="h6" 
            component="p"
            sx={{ 
              mb: 4,
              fontWeight: 400,
              opacity: 0.9
            }}
          >
            Join SyncNote today and experience the difference an integrated music management platform can make.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              component={RouterLink} 
              to="/register" 
              variant="contained" 
              size="large"
              sx={{ 
                bgcolor: '#f50057', 
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: '#c51162'
                }
              }}
            >
              Sign Up Now
            </Button>
            <Button 
              component={RouterLink} 
              to="/login" 
              variant="outlined" 
              size="large"
              sx={{ 
                borderColor: 'white', 
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Login
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#0a1029', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                SyncNote
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                The all-in-one platform for musicians to manage their creative assets.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <RouterLink to="/login" style={{ color: 'white', opacity: 0.7, textDecoration: 'none' }}>
                  Login
                </RouterLink>
                <RouterLink to="/register" style={{ color: 'white', opacity: 0.7, textDecoration: 'none' }}>
                  Register
                </RouterLink>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Contact
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                support@syncnote.com
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant="body2" align="center" sx={{ opacity: 0.7 }}>
            © {new Date().getFullYear()} SyncNote. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage; 