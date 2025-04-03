import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Divider,
  Button,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  MusicNote as MusicNoteIcon,
  AudioFile as AudioFileIcon,
  Image as ImageIcon,
  YouTube as YouTubeIcon,
  Description as FileIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { FileItem } from '../../types';
import * as Tone from 'tone';
// @ts-ignore - LameJS doesn't have TypeScript definitions
import lamejs from 'lamejs';
// @ts-ignore - Import the Midi parser
import { Midi } from '@tonejs/midi';
import { filesAPI } from '../../services/api';

// Define interfaces for MIDI parser types
interface MidiNote {
  name: string;
  time: number;
  duration: number;
  velocity: number;
}

interface MidiInstrument {
  number: number;
  name: string;
}

interface MidiTrack {
  notes: MidiNote[];
  instrument: MidiInstrument;
}

// Helper function to download a blob as a file
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Helper function to generate a URL for a file
const getFileUrl = (fileId: string, isPreview: boolean = true): string => {
  // Create the URL based on the file ID and whether it's for preview or download
  const endpoint = isPreview ? 'preview' : 'download';
  const token = localStorage.getItem('token');
  let url = `http://localhost:5000/api/files/${fileId}/${endpoint}`;
  
  if (token) {
    url += `?token=${token}`;
  }
  
  return url;
};

// Extract YouTube video ID from various YouTube URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  // Match patterns like:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://youtube.com/shorts/VIDEO_ID
  // - https://youtube.com/embed/VIDEO_ID
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&/]+)/i,
    /(?:youtube\.com\/watch\?.*v=)([^?&/]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

interface FilePreviewModalProps {
  open: boolean;
  file: FileItem | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open,
  file,
  onClose,
  onDownload
}) => {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [midiData, setMidiData] = useState<ArrayBuffer | null>(null);
  const [exportStatus, setExportStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null
  });
  // State for tracking if the audio has been generated (used for enabling "Save to Project" button)
  const [audioGenerated, setAudioGenerated] = useState<Blob | null>(null);

  // Function to export MIDI as MP3 audio
  const exportMidiAsAudio = async () => {
    if (!file || file.type !== 'midi' || !midiData) {
      setExportStatus({ loading: false, error: 'No valid MIDI file selected' });
      return;
    }

    try {
      setExportStatus({ loading: true, error: null });
      
      // Parse the MIDI file using @tonejs/midi
      const midi = new Midi(new Uint8Array(midiData));
      
      // Log important MIDI data for debugging
      console.log('MIDI File Information:', {
        name: midi.name,
        durationTicks: midi.durationTicks,
        duration: midi.duration,
        ppq: midi.header.ppq,
        tracks: midi.tracks.map(t => ({
          name: t.name,
          channel: t.channel,
          noteCount: t.notes.length,
          firstNote: t.notes.length > 0 ? t.notes[0] : null,
          lastNote: t.notes.length > 0 ? t.notes[t.notes.length - 1] : null
        }))
      });
      
      // Check if there are any notes to process
      let totalNotes = 0;
      midi.tracks.forEach(track => {
        totalNotes += track.notes.length;
      });
      
      if (totalNotes === 0) {
        setExportStatus({ loading: false, error: 'No notes found in MIDI file' });
        return;
      }
      
      setExportStatus({ loading: true, error: `Processing ${totalNotes} notes...` });
      
      // Calculate a proper duration - find the end of the last note
      let maxEndTime = 0;
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          const endTime = note.time + note.duration;
          if (endTime > maxEndTime) {
            maxEndTime = endTime;
          }
        });
      });
      
      // Add a little buffer (3 seconds) for reverb tail
      const audioDuration = maxEndTime + 3;
      console.log(`Creating audio with duration: ${audioDuration.toFixed(2)} seconds`);
      
      // IMPORTANT FIX: Create a completely new offline context with proper setup
      Tone.setContext(new Tone.Context());
      const offlineContext = new Tone.OfflineContext(2, audioDuration, 44100);
      Tone.setContext(offlineContext);
      
      // Create a synth and effects connected to the offline context
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { 
          type: "triangle8" 
        },
        envelope: {
          attack: 0.005,
          decay: 0.3,
          sustain: 0.2,
          release: 0.8
        }
      }).toDestination();
      
      // Add some light reverb (automatically connected to destination)
      const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.2
      }).toDestination();
      
      synth.connect(reverb);
      
      // Schedule all notes on the synth
      let notesScheduled = 0;
      
      // Process each track
      setExportStatus({ loading: true, error: 'Scheduling notes...' });
      midi.tracks.forEach(track => {
        // Schedule each note
        track.notes.forEach(note => {
          // Only process notes with reasonable timing
          if (note.time >= 0 && note.time < 300 && note.duration > 0) {
            try {
              synth.triggerAttackRelease(
                note.name,              // Note name (e.g., "C4")
                note.duration,          // Duration in seconds
                note.time,              // Start time in seconds
                note.velocity           // Velocity (0-1)
              );
              notesScheduled++;
            } catch (noteError) {
              console.warn('Error scheduling note:', note, noteError);
            }
          }
        });
      });
      
      console.log(`Scheduled ${notesScheduled} notes for playback`);
      
      // If we couldn't schedule any notes, return an error
      if (notesScheduled === 0) {
        setExportStatus({ loading: false, error: 'Could not process any notes in the MIDI file' });
        return;
      }
      
      // Render the audio
      setExportStatus({ loading: true, error: 'Rendering audio...' });
      
      try {
        // Perform the actual audio rendering
        const renderedBuffer = await offlineContext.render();
        console.log('Audio rendering complete!');
        
        // Convert to WAV format (simpler than MP3)
        setExportStatus({ loading: true, error: 'Creating audio file...' });
        
        // Get audio data from the buffer
        const leftChannel = renderedBuffer.getChannelData(0);
        const rightChannel = renderedBuffer.getChannelData(1);
        
        // Interleave the channels for WAV format
        const interleaved = new Float32Array(leftChannel.length * 2);
        
        // Interleave the two channels
        for (let i = 0; i < leftChannel.length; i++) {
          interleaved[i * 2] = leftChannel[i];
          interleaved[i * 2 + 1] = rightChannel[i];
        }
        
        // Create a WAV file (easier than dealing with MP3 encoding issues)
        const wavBlob = new Blob([createWaveFile(interleaved, renderedBuffer.sampleRate, 2)], { type: 'audio/wav' });
        
        // Store the generated WAV blob for potential saving to project
        setAudioGenerated(wavBlob);
        
        // Generate filename and download
        const exportFilename = file.name.replace(/\.midi?$/i, '') || 'exported-midi';
        downloadBlob(wavBlob, `${exportFilename}.wav`);
        
        setExportStatus({ loading: false, error: null });
        
      } catch (renderError: any) {
        console.error('Error during audio rendering:', renderError);
        setExportStatus({ 
          loading: false, 
          error: `Render failed: ${renderError.message || 'Unknown error'}` 
        });
      }
    } catch (error: any) {
      console.error('Error exporting audio:', error);
      setExportStatus({ 
        loading: false, 
        error: `Export failed: ${error.message || 'Unknown error'}` 
      });
    }
  };

  // Helper to create a WAV file from audio data
  const createWaveFile = (audioData: Float32Array, sampleRate: number, numChannels: number = 2): ArrayBuffer => {
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    floatTo16BitPCM(view, 44, audioData);
    
    return buffer;
  };

  // Helper for WAV creation
  const writeString = (dataView: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      dataView.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // Helper for WAV creation - convert float audio data to 16-bit PCM
  const floatTo16BitPCM = (dataView: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      dataView.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  // New function to save the audio file to the project
  const saveAudioToProject = async () => {
    if (!file || !audioGenerated) {
      setExportStatus({ loading: false, error: 'No audio generated to save' });
      return;
    }

    try {
      setExportStatus({ loading: true, error: 'Preparing to save...' });
      
      // Generate a filename from the original MIDI file name
      const exportFilename = `${file.name.replace(/\.midi?$/i, '')}.wav` || 'exported-midi.wav';
      console.log(`Creating WAV file with name: ${exportFilename}`);
      
      // Create a File object from the Blob
      const wavFile = new File([audioGenerated], exportFilename, { type: 'audio/wav' });
      console.log(`File created with size: ${wavFile.size} bytes`);
      
      // Get folder ID with fallbacks - MODIFIED FOR BETTER DEBUGGING
      console.log('Full file details:', file);
      console.log('File ID:', file._id);
      console.log('Project reference:', file.project);
      console.log('Folder reference:', file.folder);
      
      let targetFolderId = null;
      
      // Check if folder ID exists directly on the file
      if (file.folder) {
        if (typeof file.folder === 'string') {
          targetFolderId = file.folder;
          console.log(`Using direct folder ID: ${targetFolderId}`);
        } else if (typeof file.folder === 'object' && file.folder._id) {
          // Handle case where folder might be populated as an object
          targetFolderId = file.folder._id;
          console.log(`Using folder ID from object: ${targetFolderId}`);
        }
      }
      
      // NEW: If we have file ID but no folder info, try to fetch complete file data
      if (!targetFolderId && file._id) {
        try {
          console.log('Fetching complete file details from server');
          const refreshedFile = await filesAPI.getFileById(file._id);
          console.log('Got refreshed file details:', refreshedFile);
          
          if (refreshedFile.folder) {
            if (typeof refreshedFile.folder === 'string') {
              targetFolderId = refreshedFile.folder;
              console.log(`Using refreshed folder ID: ${targetFolderId}`);
            } else if (typeof refreshedFile.folder === 'object' && refreshedFile.folder._id) {
              targetFolderId = refreshedFile.folder._id;
              console.log(`Using refreshed folder ID from object: ${targetFolderId}`);
            }
          }
        } catch (error) {
          console.error('Error fetching complete file details:', error);
        }
      }
      
      // If still no folder ID, try to get it from the project
      if (!targetFolderId && file.project) {
        let projectId = null;
        
        if (typeof file.project === 'string') {
          projectId = file.project;
        } else if (typeof file.project === 'object' && file.project._id) {
          projectId = file.project._id;
        }
        
        if (projectId) {
          console.log(`No folder ID found, using project root folder. Project ID: ${projectId}`);
          setExportStatus({ loading: true, error: 'No direct folder found, saving to project root...' });
          
          // Attempt to use the project root as the target folder
          try {
            const response = await filesAPI.uploadFile(projectId, wavFile);
            setExportStatus({ loading: false, error: null });
            console.log('Audio file saved to project root:', response);
            alert(`Audio file "${exportFilename}" saved to project root successfully!`);
            setAudioGenerated(null);
            return;
          } catch (projectError: any) {
            console.error('Error saving to project root:', projectError);
            // Continue to next fallback option
          }
        }
      }
      
      if (!targetFolderId) {
        console.error('No valid folder ID or project ID found:', file);
        
        // FALLBACK: If we can't save to project, at least download it locally
        downloadBlob(audioGenerated, exportFilename);
        throw new Error('Could not determine where to save the file. The audio file has been downloaded to your device instead. You can manually upload it to your project.');
      }
      
      console.log(`Uploading to folder ID: ${targetFolderId}`);
      
      // Upload the file to the determined folder
      const response = await filesAPI.uploadFile(targetFolderId, wavFile);
      
      setExportStatus({ loading: false, error: null });
      console.log('Audio file saved to project:', response);
      
      // Show success message
      alert(`Audio file "${exportFilename}" saved to project successfully!`);
      
      // Clear the audioGenerated state to reset the UI
      setAudioGenerated(null);
    } catch (error: any) {
      console.error('Error saving audio to project:', error);
      setExportStatus({ 
        loading: false, 
        error: `Save failed: ${error.message || 'Unknown error'}` 
      });
    }
  };

  useEffect(() => {
    if (file && open) {
      setLoading(true);
      
      let url = '';
      
      // For YouTube videos, we'll just use the path field directly
      if (file.type === 'youtube' && file.path) {
        url = file.path;
        setPreviewUrl(url);
        setLoading(false);
      } else if (file._id) {
        // For other files, create a preview URL
        url = getFileUrl(file._id, true);
        setPreviewUrl(url);
        
        // If it's a MIDI file, also fetch the binary data
        if (file.type === 'midi') {
          fetch(url)
            .then(response => response.arrayBuffer())
            .then(data => {
              setMidiData(data);
              setLoading(false);
            })
            .catch(error => {
              console.error("Error fetching MIDI data:", error);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  }, [file, open]);

  const renderPreview = () => {
    if (!file) return null;

    switch (file.type) {
      case 'pdf':
        return (
          <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', overflow: 'hidden' }}>
            <iframe 
              src={previewUrl || ''}
              title={file.name}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </Box>
        );
      
      case 'mp3':
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <AudioFileIcon style={{ fontSize: 80 }} color="secondary" />
            </Box>
            <Typography variant="h6" gutterBottom>{file.name}</Typography>
            <Box sx={{ width: '100%', mt: 2 }}>
              <audio controls style={{ width: '100%' }} autoPlay>
                <source src={previewUrl || ''} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </Box>
          </Box>
        );
      
      case 'image':
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              p: 2,
              height: 'calc(100vh - 200px)',
              overflow: 'auto',
              position: 'relative'
            }}
          >
            <img 
              src={previewUrl || ''} 
              alt={file.name}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                display: 'block',
                margin: 'auto' 
              }} 
            />
          </Box>
        );
      
      case 'youtube':
        if (!file.path) {
          return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="error">
                YouTube URL is missing or invalid.
              </Typography>
            </Box>
          );
        }
        
        // Try to extract the video ID
        const videoId = extractYouTubeVideoId(file.path);
        if (!videoId) {
          return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body1" color="error">
                Could not extract video ID from URL: {file.path}
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                href={file.path}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 2 }}
              >
                Open URL Directly
              </Button>
            </Box>
          );
        }
        
        return (
          <Box 
            sx={{ 
              p: 2,
              height: 'calc(100vh - 200px)'
            }}
          >
            <Typography variant="h6" gutterBottom>{file.name}</Typography>
            <Box 
              sx={{ 
                position: 'relative',
                paddingTop: '56.25%', // 16:9 aspect ratio
                width: '100%',
                height: 0,
                overflow: 'hidden'
              }}
            >
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                src={`https://www.youtube.com/embed/${videoId}`}
                title={file.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          </Box>
        );
      
      case 'midi':
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <MusicNoteIcon style={{ fontSize: 80 }} color="primary" />
            </Box>
            <Typography variant="h6" gutterBottom>{file.name}</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              MIDI file - {(file.size / 1024).toFixed(2)} KB
            </Typography>
            
            {exportStatus.error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {exportStatus.error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                startIcon={<DownloadIcon />}
                onClick={() => file && onDownload(file)}
              >
                Download MIDI
              </Button>
              
              <Button 
                variant="contained" 
                color="secondary"
                startIcon={<AudioFileIcon />}
                onClick={exportMidiAsAudio}
                disabled={exportStatus.loading || !midiData}
              >
                {exportStatus.loading ? 'Processing...' : 'Export as Audio'}
              </Button>

              {audioGenerated && (
                <Button 
                  variant="contained" 
                  color="success"
                  startIcon={<SaveIcon />}
                  onClick={saveAudioToProject}
                  disabled={exportStatus.loading}
                >
                  Save Audio to Project
                </Button>
              )}
            </Box>
          </Box>
        );
      
      default:
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '300px'
            }}
          >
            <FileIcon style={{ fontSize: 80 }} color="action" />
            <Typography sx={{ mt: 2 }}>
              This file type cannot be previewed. Please download the file to view it.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<DownloadIcon />}
              onClick={() => file && onDownload(file)}
              sx={{ mt: 2 }}
            >
              Download
            </Button>
          </Box>
        );
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <PdfIcon color="error" fontSize="large" />;
      case 'midi':
        return <MusicNoteIcon color="primary" fontSize="large" />;
      case 'mp3':
        return <AudioFileIcon color="secondary" fontSize="large" />;
      case 'image':
        return <ImageIcon color="success" fontSize="large" />;
      case 'youtube':
        return <YouTubeIcon color="error" fontSize="large" />;
      default:
        return <FileIcon color="action" fontSize="large" />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh'
        } 
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {file && getFileIcon(file.type)}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {file?.name || 'File Preview'}
          </Typography>
        </Box>
          <IconButton onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '300px'
            }}
          >
            <CircularProgress />
          </Box>
        ) : file ? (
          renderPreview()
        ) : (
          <Typography variant="body1" sx={{ p: 2 }}>No file selected</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal; 