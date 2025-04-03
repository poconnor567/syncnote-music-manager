import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  Link as MuiLink
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const { state, login, clearError } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/dashboard');
    }
  }, [state.isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // Only clear auth errors if this is a new submission, not when there's an error
    if (!state.error) {
      clearError();
    }

    // Validate form
    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
      // If login is successful, the useEffect will handle redirection
    } catch (error: any) {
      console.error('Login error:', error);
      // Don't clear the form - keep values so user can try again
    }
  };

  // Add a useEffect to log state changes for debugging
  useEffect(() => {
    if (state.error) {
      console.log('Auth state has error:', state.error);
    }
  }, [state.error]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Login
          </Typography>
          
          {state.error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                fontWeight: 'bold',
                backgroundColor: '#ffebee',
                border: '1px solid #f44336'
              }}
            >
              {state.error}
            </Alert>
          )}
          
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!state.error}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!state.error}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={state.loading}
            >
              {state.loading ? 'Logging in...' : 'Login'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <MuiLink component={Link} to="/register">
                  Register here
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 