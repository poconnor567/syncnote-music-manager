import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { User, Project, Folder, FileItem } from '../types';

// Define response types
interface AuthResponse {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  token: string;
  createdAt?: string;
  updatedAt?: string;
}

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (401), but don't redirect for login/register endpoints
    if (error.response && 
        error.response.status === 401 && 
        !error.config.url.includes('/auth/login') && 
        !error.config.url.includes('/auth/register')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic request function
const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await api(config);
    return response.data;
  } catch (error: any) {
    console.error(`API Error: ${config.method} ${config.url}`, error);
    
    // Handle API errors with response
    if (error.response) {
      console.error('API Error Response Status:', error.response.status);
      console.error('API Error Response Data:', error.response.data);
      
      const errorData = error.response.data;
      let errorMessage = `Request failed with status ${error.response.status}`;
      
      // Extract error message from response data
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      console.error('Throwing error with message:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // For network errors or other issues
    console.error('Network or other error:', error.message);
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

// Auth API
export const authAPI = {
  register: (userData: { username: string; email: string; password: string }) =>
    request<AuthResponse>({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    }),

  login: (credentials: { email: string; password: string }) =>
    request<AuthResponse>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    }),

  getCurrentUser: () =>
    request<User>({
      method: 'GET',
      url: '/auth/me',
    }),
    
  updateProfile: (userData: { username?: string; email?: string }) =>
    request<User>({
      method: 'PUT',
      url: '/auth/update-profile',
      data: userData,
    }),
    
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>({
      method: 'PUT',
      url: '/auth/change-password',
      data: passwordData,
    }),
    
  deleteAccount: (password: string) =>
    request<{ message: string }>({
      method: 'DELETE',
      url: '/auth/delete-account',
      data: { password },
    }),
};

// Projects API
export const projectsAPI = {
  getProjects: () =>
    request<Project[]>({
      method: 'GET',
      url: '/projects',
    }),

  getProjectById: (id: string) =>
    request<Project>({
      method: 'GET',
      url: `/projects/${id}`,
    }),

  createProject: (projectData: { name: string; description?: string }) =>
    request<Project>({
      method: 'POST',
      url: '/projects',
      data: projectData,
    }),

  updateProject: (id: string, projectData: { name?: string; description?: string }) =>
    request<Project>({
      method: 'PUT',
      url: `/projects/${id}`,
      data: projectData,
    }),

  deleteProject: (id: string) =>
    request<{ message: string }>({
      method: 'DELETE',
      url: `/projects/${id}`,
    }),
};

// Folders API
export const foldersAPI = {
  getFolders: (projectId: string) =>
    request<Folder[]>({
      method: 'GET',
      url: `/projects/${projectId}/folders`,
    }),

  // Alias for getFolders to make it clearer in the Record component
  getFoldersByProject: (projectId: string) => 
    request<Folder[]>({
      method: 'GET',
      url: `/projects/${projectId}/folders`,
    }),

  getFolderById: (id: string) =>
    request<Folder>({
      method: 'GET',
      url: `/folders/${id}`,
    }),

  createFolder: (projectId: string, folderData: { name: string; parentId?: string }) =>
    request<Folder>({
      method: 'POST',
      url: `/projects/${projectId}/folders`,
      data: folderData,
    }),

  updateFolder: (id: string, folderData: { name: string }) =>
    request<Folder>({
      method: 'PUT',
      url: `/folders/${id}`,
      data: folderData,
    }),

  deleteFolder: (id: string) =>
    request<{ message: string }>({
      method: 'DELETE',
      url: `/folders/${id}`,
    }),
};

// Files API
export const filesAPI = {
  uploadFile: (folderId: string, file: globalThis.File, tags?: string) => {
    console.log(`Preparing to upload file: ${file.name} (${file.size} bytes, type: ${file.type}) to folder: ${folderId}`);
    
    const formData = new FormData();
    formData.append('file', file);
    if (tags) {
      formData.append('tags', tags);
    }

    console.log(`Making upload request to /files/upload/${folderId}`);
    
    return request<FileItem>({
      method: 'POST',
      url: `/files/upload/${folderId}`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFileById: (id: string) =>
    request<FileItem>({
      method: 'GET',
      url: `/files/${id}`,
    }),

  updateFile: (id: string, fileData: { name?: string; tags?: string[] | string }) => {
    console.log('Updating file:', id, fileData);
    
    // Ensure tags is always an array before sending to the server
    const normalizedData = { ...fileData };
    
    if (normalizedData.tags && typeof normalizedData.tags === 'string') {
      normalizedData.tags = normalizedData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
    }
    
    return request({
      url: `/files/${id}`,
      method: 'PUT',
      data: normalizedData
    });
  },

  deleteFile: (id: string) =>
    request<{ message: string }>({
      method: 'DELETE',
      url: `/files/${id}`,
    }),

  searchFiles: (params: { query?: string; type?: string; tags?: string }) =>
    request<FileItem[]>({
      method: 'GET',
      url: '/files/search',
      params,
    }),

  associateMidi: (midiFileId: string, data: { sheetMusicId: string; startPosition?: number; endPosition?: number }) =>
    request<FileItem>({
      method: 'POST',
      url: `/files/${midiFileId}/associate`,
      data,
    }),
    
  addYouTubeVideo: (containerId: string, data: { 
    url: string; 
    title: string; 
    tags?: string[];
    isProjectRoot?: boolean;
    projectId?: string;
  }) => {
    console.log('API addYouTubeVideo - Input data:', { containerId, ...data });
    
    // Ensure URL has https:// protocol prefix
    let youtubeUrl = data.url.trim();
    if (!youtubeUrl.startsWith('http://') && !youtubeUrl.startsWith('https://')) {
      youtubeUrl = 'https://' + youtubeUrl;
    }
    
    const requestData = {
      url: youtubeUrl, // Use the normalized URL with protocol
      name: data.title,
      tags: data.tags,
      projectId: data.isProjectRoot ? containerId : data.projectId,
      folderId: !data.isProjectRoot ? containerId : undefined
    };
    
    console.log('API addYouTubeVideo - Request data being sent:', requestData);
    
    return request<FileItem>({
      method: 'POST',
      url: `/files/youtube`,
      data: requestData,
    });
  },

  moveFile: (fileId: string, targetFolderId: string) => {
    console.log(`API call to move file ${fileId} to folder ${targetFolderId}`);
    return request<{message: string; file: FileItem}>({
      method: 'PUT',
      url: `/files/${fileId}/move`,
      data: { targetFolderId }
    });
  },
};

export default api; 