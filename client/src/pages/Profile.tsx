import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Grid, TextField, Button, Alert, 
  CircularProgress, Divider, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Profile: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Account deletion dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  useEffect(() => {
    // Get current user data
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await authAPI.getCurrentUser();
        setFormData({
          username: userData.username || '',
          email: userData.email || '',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
    
    if (state.isAuthenticated) {
      fetchUserData();
    }
  }, [state.isAuthenticated]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Call the API to update the profile
      const updatedUser = await authAPI.updateProfile({
        username: formData.username,
        email: formData.email
      });
      
      // Update local storage with new user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedStoredUser = {
        ...storedUser,
        username: updatedUser.username,
        email: updatedUser.email
      };
      localStorage.setItem('user', JSON.stringify(updatedStoredUser));
      
      setSuccess('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    
    try {
      // Call the API to change the password
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordSuccess('Password changed successfully');
      
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
      console.error('Password change error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Open the delete account dialog
  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
    setDeletePassword('');
    setDeleteError(null);
  };
  
  // Close the delete account dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletePassword('');
    setDeleteError(null);
  };
  
  // Handle delete password input change
  const handleDeletePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeletePassword(e.target.value);
  };
  
  // Handle account deletion with password confirmation
  const handleAccountDelete = async () => {
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }
    
    setLoading(true);
    setDeleteError(null);
    
    try {
      // Call the API to delete the account
      await authAPI.deleteAccount(deletePassword);
      
      // Log the user out and redirect to home page
      logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      console.error('Account deletion error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 500 }}>
            Profile Settings
          </Typography>
          <Divider sx={{ mb: 4 }} />
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          <Grid container spacing={4}>
            {/* Profile Information */}
            <Grid item xs={12} md={6}>
              <Box component="form" onSubmit={handleProfileUpdate} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                />
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ mt: 3 }}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </Box>
            </Grid>
            
            {/* Password Change */}
            <Grid item xs={12} md={6}>
              <Box component="form" onSubmit={handlePasswordUpdate}>
                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
                
                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {passwordError}
                  </Alert>
                )}
                
                {passwordSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {passwordSuccess}
                  </Alert>
                )}
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
                
                <TextField
                  fullWidth
                  margin="normal"
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  error={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== ''}
                  helperText={passwordData.newPassword !== passwordData.confirmPassword && passwordData.confirmPassword !== '' ? 'Passwords don\'t match' : ''}
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ mt: 3 }}
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  Change Password
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {/* Danger Zone */}
          <Box sx={{ mt: 6, p: 3, bgcolor: '#ffebee', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom color="error">
              Danger Zone
            </Typography>
            <Typography variant="body2" gutterBottom>
              Deleting your account will permanently remove all your data, including projects, folders, and files.
              This action cannot be undone.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={openDeleteDialog}
              sx={{ mt: 2 }}
            >
              Delete Account
            </Button>
          </Box>
          
          {/* Delete Account Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={closeDeleteDialog}
            aria-labelledby="delete-account-dialog-title"
            aria-describedby="delete-account-dialog-description"
          >
            <DialogTitle id="delete-account-dialog-title" color="error">
              Delete Account Confirmation
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="delete-account-dialog-description" gutterBottom>
                This action will permanently delete your account and all associated data.
                This cannot be undone. Please enter your password to confirm.
              </DialogContentText>
              
              {deleteError && (
                <Alert severity="error" sx={{ my: 2 }}>
                  {deleteError}
                </Alert>
              )}
              
              <TextField
                fullWidth
                margin="normal"
                label="Password"
                type="password"
                value={deletePassword}
                onChange={handleDeletePasswordChange}
                autoFocus
                required
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDeleteDialog} color="primary">
                Cancel
              </Button>
              <Button 
                onClick={handleAccountDelete} 
                color="error" 
                disabled={loading || !deletePassword}
              >
                {loading ? 'Deleting...' : 'Delete My Account'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </Layout>
  );
};

export default Profile; 