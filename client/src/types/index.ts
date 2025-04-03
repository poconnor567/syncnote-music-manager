// User types
export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Project types
export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string | User;
  folders: Folder[];
  files?: FileItem[];
  createdAt: string;
  updatedAt: string;
}

// Folder types
export interface Folder {
  _id: string;
  name: string;
  project: string | Project;
  parent: string | Folder | null;
  files: FileItem[];
  subfolders: Folder[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
}

// File types
export interface FileItem {
  _id: string;
  name: string;
  originalName: string;
  path: string;
  type: 'pdf' | 'midi' | 'mp3' | 'wav' | 'image' | 'youtube' | 'other';
  size: number;
  folder: string | Folder;
  project: string | Project;
  uploadedBy: string | User;
  midiAssociations: MidiAssociation[];
  tags: string[];
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MidiAssociation {
  sheetMusicFile: string | FileItem;
  startPosition: number;
  endPosition: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ErrorResponse {
  message: string;
  error?: string;
} 