import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  LinearProgress,
  Chip,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { WebMidi, Input, Output, Note } from 'webmidi';
import { filesAPI } from '../../services/api';
import * as Tone from 'tone';

interface MidiRecorderProps {
  projectId: string;
  folderId: string;
  onRecordingComplete: (success: boolean, fileId?: string) => void;
}

// Define available instrument types
type InstrumentType = 'piano' | 'synth';

// Define instrument options
const instrumentOptions: {value: InstrumentType; label: string}[] = [
  { value: 'piano', label: 'Piano' },
  { value: 'synth', label: 'Synthesizer' }
];

const MidiRecorder: React.FC<MidiRecorderProps> = ({ projectId, folderId, onRecordingComplete }) => {
  // MIDI connection state
  const [midiEnabled, setMidiEnabled] = useState<boolean>(false);
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<Output[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [selectedOutput, setSelectedOutput] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedNotes, setRecordedNotes] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Save state
  const [fileName, setFileName] = useState<string>('New MIDI Recording');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentNoteIndexRef = useRef<number>(0);
  
  // Instrument settings
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('piano');
  
  // Synth reference for audio playback
  const synthRef = useRef<Tone.PolySynth | null>(null);
  
  // Function to create appropriate synth based on selected instrument
  const createSynth = (instrumentType: InstrumentType): Tone.PolySynth => {
    let instrument: Tone.PolySynth;
    
    switch (instrumentType) {
      case 'piano':
        // Create a piano-like sound using careful synthesis instead of samples
        // This avoids buffer loading errors
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { 
            type: "triangle8" // Rich harmonic content similar to piano
          },
          envelope: {
            attack: 0.005, // Very fast attack for piano-like responsiveness
            decay: 0.8,    // Longer decay for sustain
            sustain: 0.2,  // Lower sustain level for piano-like decay
            release: 3     // Long release for natural piano sound
          },
          volume: -6
        }).toDestination();
        
        // Add piano-like effects
        const pianoReverb = new Tone.Reverb({
          decay: 1.5,
          wet: 0.15
        }).toDestination();
        
        const pianoEQ = new Tone.EQ3({
          low: 0,
          mid: 3,
          high: -2
        }).toDestination();
        
        // Connect through the effects chain
        instrument.connect(pianoReverb);
        instrument.connect(pianoEQ);
        break;
        
      case 'synth':
      default:
        // Modern synthesizer sound
        instrument = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.5,
          detune: 0,
          oscillator: {
            type: "fatsawtooth",
            count: 3,
            spread: 20
          },
          envelope: {
            attack: 0.05,
            decay: 0.1,
            sustain: 0.9,
            release: 0.5
          },
          modulation: {
            type: "square"
          },
          modulationEnvelope: {
            attack: 0.5,
            decay: 0.2,
            sustain: 1,
            release: 0.5
          },
          volume: -10
        }).toDestination();
        
        // Synth-specific effects
        const phaser = new Tone.Phaser({
          frequency: 0.8,
          octaves: 5,
          baseFrequency: 800
        }).toDestination();
        
        const pingPong = new Tone.PingPongDelay({
          delayTime: 0.25,
          feedback: 0.2,
          wet: 0.15
        }).toDestination();
        
        // Connect through the effects chain
        instrument.connect(phaser);
        instrument.connect(pingPong);
        break;
    }
    
    return instrument;
  };
  
  // Update synth when instrument changes
  useEffect(() => {
    // Dispose of the existing synth
    if (synthRef.current) {
      synthRef.current.dispose();
    }
    
    // Create a new synth with the selected instrument
    synthRef.current = createSynth(selectedInstrument);
    
  }, [selectedInstrument]);
  
  // Initialize Web MIDI and Tone.js synth
  useEffect(() => {
    // Create the initial synth
    synthRef.current = createSynth(selectedInstrument);
    
    initializeMidi();
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      // Disconnect from MIDI inputs
      if (WebMidi.enabled) {
        WebMidi.disable();
      }
      // Dispose of the synth when component unmounts
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);
  
  const initializeMidi = async () => {
    try {
      setConnectionError(null);
      
      // Enable WebMidi
      await WebMidi.enable();
      setMidiEnabled(true);
      
      // Get available MIDI inputs and outputs
      const inputs = WebMidi.inputs;
      const outputs = WebMidi.outputs;
      setMidiInputs([...inputs]);
      setMidiOutputs([...outputs]);
      
      if (inputs.length > 0) {
        setSelectedInput(inputs[0].id);
      } else {
        setConnectionError('No MIDI inputs detected. Please connect a MIDI device and refresh.');
      }
      
      if (outputs.length > 0) {
        setSelectedOutput(outputs[0].id);
      }
      
      // Start Tone.js audio context
      await Tone.start();
      console.log("Tone.js audio context started");
    } catch (error: any) {
      console.error('WebMidi enable error:', error);
      setConnectionError(`Failed to enable WebMidi: ${error.message}`);
      setMidiEnabled(false);
    }
  };
  
  // Handle input device selection
  const handleInputChange = (event: SelectChangeEvent) => {
    const inputId = event.target.value;
    setSelectedInput(inputId);
  };
  
  // Handle output device selection
  const handleOutputChange = (event: SelectChangeEvent) => {
    const outputId = event.target.value;
    setSelectedOutput(outputId);
  };
  
  // Convert MIDI note number to frequency for Tone.js
  const midiToFrequency = (midiNote: number): number => {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  };
  
  // Convert MIDI note number to note name
  const midiToNoteName = (midiNote: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}${octave}`;
  };
  
  // Start recording
  const startRecording = () => {
    if (!selectedInput || !midiEnabled) {
      setConnectionError('No MIDI input selected. Please select a MIDI device.');
      return;
    }
    
    // Find the selected input
    const input = WebMidi.getInputById(selectedInput);
    if (!input) {
      setConnectionError('Selected MIDI input not found.');
      return;
    }
    
    // Clear previous recording
    setRecordedNotes([]);
    setRecordingTime(0);
    
    // Set up recording
    const startTime = Date.now();
    
    // Listen to note events
    input.addListener('noteon', e => {
      const noteData = {
        note: e.note.number,
        velocity: e.note.attack,
        timestamp: Date.now() - startTime,
        duration: 0, // Will be updated on noteoff
        type: 'noteon'
      };
      
      // Play the note through appropriate sound engine
      const noteName = midiToNoteName(e.note.number);
      const velocity = e.note.attack;
      
      // Always use Tone.js for these two instruments
      if (synthRef.current) {
        synthRef.current.triggerAttack(noteName, Tone.now(), velocity);
      }
      
      setRecordedNotes(prev => [...prev, noteData]);
    });
    
    input.addListener('noteoff', e => {
      const noteNumber = e.note.number;
      const noteName = midiToNoteName(noteNumber);
      const currentTime = Date.now() - startTime;
      
      // Release the note in Tone.js synth
      if (synthRef.current) {
        synthRef.current.triggerRelease(noteName);
      }
      
      // Find the corresponding noteon event and update its duration
      setRecordedNotes(prev => {
        // Find the most recent matching note that doesn't have a duration set
        const updatedNotes = [...prev];
        for (let i = updatedNotes.length - 1; i >= 0; i--) {
          if (updatedNotes[i].note === noteNumber && updatedNotes[i].type === 'noteon' && updatedNotes[i].duration === 0) {
            updatedNotes[i].duration = currentTime - updatedNotes[i].timestamp;
            break;
          }
        }
        return updatedNotes;
      });
    });
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    setIsRecording(true);
    setConnectionError(null);
  };
  
  // Stop recording
  const stopRecording = () => {
    // Find the selected input
    const input = WebMidi.getInputById(selectedInput);
    if (input) {
      // Remove all listeners
      input.removeListener();
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
  };
  
  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  };
  
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Save recording as MIDI file
  const saveRecording = async () => {
    if (recordedNotes.length === 0) {
      setSaveError('No MIDI data to save. Please record something first.');
      return;
    }
    
    if (!fileName.trim()) {
      setSaveError('Please enter a file name.');
      return;
    }
    
    try {
      setSaveError(null);
      setIsSaving(true);
      
      // Convert recorded notes to MIDI file format
      const midiData = convertNotesToMidiFile(recordedNotes);
      
      // Create a Blob from the MIDI data
      const midiBlob = new Blob([midiData], { type: 'audio/midi' });
      
      // Create a File object from the Blob
      const midiFile = new File([midiBlob], `${fileName.trim()}.mid`, { type: 'audio/midi' });
      
      // Upload the file
      const response = await filesAPI.uploadFile(folderId, midiFile, tags.join(','));
      
      console.log('MIDI file uploaded successfully:', response);
      
      setSaveSuccess(true);
      setFileName('New MIDI Recording');
      setTags([]);
      setRecordedNotes([]);
      
      // Notify parent component
      onRecordingComplete(true, response._id);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error('Error saving MIDI file:', error);
      setSaveError(error.message || 'Failed to save MIDI file');
      onRecordingComplete(false);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Convert recorded notes to a MIDI file
  const convertNotesToMidiFile = (notes: any[]): Uint8Array => {
    // This version creates a simpler MIDI file with absolute timestamps
    // Sort notes by timestamp to ensure proper order
    const sortedNotes = [...notes].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate total duration in seconds
    let maxEndTime = 0;
    sortedNotes.forEach(note => {
      if (note.type === 'noteon' && note.duration > 0) {
        const endTime = note.timestamp + note.duration;
        if (endTime > maxEndTime) {
          maxEndTime = endTime;
        }
      }
    });
    
    // Convert to seconds
    const durationSeconds = maxEndTime / 1000;
    console.log(`MIDI recording duration: ${durationSeconds.toFixed(2)} seconds`);
    
    // MIDI Constants
    const PPQ = 960; // Higher PPQ for more precise timing
    const TEMPO_BPM = 500; // Faster tempo gives more precise timing resolution
    
    // MIDI file header
    const header = [
      0x4d, 0x54, 0x68, 0x64, // MThd
      0x00, 0x00, 0x00, 0x06, // Header size (6 bytes)
      0x00, 0x01, // Format type (1)
      0x00, 0x02, // Number of tracks (2)
      (PPQ >> 8) & 0xFF, PPQ & 0xFF, // Division (PPQ ticks per quarter note)
    ];
    
    // Calculate microseconds per quarter note from BPM
    const microsecondsPerBeat = Math.round(60000000 / TEMPO_BPM);
    
    // Track 1: Tempo track
    const tempoTrackHeader = [
      0x4d, 0x54, 0x72, 0x6b, // MTrk
    ];
    
    const tempoTrackData = [
      // Delta time (0)
      0x00,
      
      // Tempo meta event
      0xFF, 0x51, 0x03,
      (microsecondsPerBeat >> 16) & 0xFF,
      (microsecondsPerBeat >> 8) & 0xFF,
      microsecondsPerBeat & 0xFF,
      
      // Time signature: 4/4
      0x00, // Delta time
      0xFF, 0x58, 0x04, // Time signature meta event
      0x04, // Numerator (4)
      0x02, // Denominator (4 = 2^2)
      0x18, // Clocks per metronome click
      0x08, // 32nd notes per quarter
      
      // End of track
      0x00, 0xFF, 0x2F, 0x00
    ];
    
    // Calculate tempo track size
    const tempoTrackSize = tempoTrackData.length;
    const tempoTrackSizeBytes = [
      (tempoTrackSize >> 24) & 0xFF,
      (tempoTrackSize >> 16) & 0xFF,
      (tempoTrackSize >> 8) & 0xFF,
      tempoTrackSize & 0xFF
    ];
    
    // Track 2: Note track
    const noteTrackHeader = [
      0x4d, 0x54, 0x72, 0x6b, // MTrk
    ];
    
    const noteTrackData: number[] = [];
    
    // Add track name
    noteTrackData.push(0x00); // Delta time
    noteTrackData.push(0xFF); // Meta event
    noteTrackData.push(0x03); // Track name
    const trackName = `Recorded MIDI - ${fileName}`;
    noteTrackData.push(trackName.length); // Length
    for (let i = 0; i < trackName.length; i++) {
      noteTrackData.push(trackName.charCodeAt(i));
    }
    
    // Using direct timestamps instead of delta times
    // Each note will have an absolute position and a duration
    // Process all note-on events first, followed by all note-off events
    
    // Convert milliseconds to ticks
    const msToTicks = (ms: number): number => {
      return Math.round((ms / 1000) * (PPQ * TEMPO_BPM / 60));
    };
    
    // Note on events
    let previousTick = 0;
    
    // Separate note on and note off events
    const noteOnEvents: Array<{tick: number, note: number, velocity: number}> = [];
    const noteOffEvents: Array<{tick: number, note: number}> = [];
    
    sortedNotes.forEach(note => {
      if (note.type === 'noteon' && note.duration > 0) {
        const onTick = msToTicks(note.timestamp);
        const offTick = msToTicks(note.timestamp + note.duration);
        
        noteOnEvents.push({
          tick: onTick,
          note: note.note,
          velocity: Math.floor(note.velocity * 127) || 64
        });
        
        noteOffEvents.push({
          tick: offTick,
          note: note.note
        });
      }
    });
    
    // Sort both arrays by tick time
    noteOnEvents.sort((a, b) => a.tick - b.tick);
    noteOffEvents.sort((a, b) => a.tick - b.tick);
    
    // Combine and sort all events by tick
    const allEvents = [
      ...noteOnEvents.map(e => ({...e, isNoteOn: true})),
      ...noteOffEvents.map(e => ({...e, isNoteOn: false, velocity: 0}))
    ].sort((a, b) => a.tick - b.tick);
    
    // Process events with delta time encoding
    for (let i = 0; i < allEvents.length; i++) {
      const event = allEvents[i];
      const currentTick = event.tick;
      
      // Calculate delta time from previous event
      const deltaTick = currentTick - previousTick;
      const deltaBytes = encodeVariableLength(deltaTick);
      noteTrackData.push(...deltaBytes);
      
      // Add note event
      if (event.isNoteOn) {
        // Note on
        noteTrackData.push(0x90); // Note on, channel 1
        noteTrackData.push(event.note);
        noteTrackData.push(event.velocity);
      } else {
        // Note off
        noteTrackData.push(0x80); // Note off, channel 1
        noteTrackData.push(event.note);
        noteTrackData.push(0x40); // Default release velocity
      }
      
      previousTick = currentTick;
    }
    
    // End of track
    noteTrackData.push(0x00); // Delta time
    noteTrackData.push(0xFF); // Meta event
    noteTrackData.push(0x2F); // End of track
    noteTrackData.push(0x00); // Length
    
    // Calculate note track size
    const noteTrackSize = noteTrackData.length;
    const noteTrackSizeBytes = [
      (noteTrackSize >> 24) & 0xFF,
      (noteTrackSize >> 16) & 0xFF,
      (noteTrackSize >> 8) & 0xFF,
      noteTrackSize & 0xFF
    ];
    
    // Combine all parts
    const midiFile = new Uint8Array([
      ...header,
      ...tempoTrackHeader,
      ...tempoTrackSizeBytes,
      ...tempoTrackData,
      ...noteTrackHeader,
      ...noteTrackSizeBytes,
      ...noteTrackData
    ]);
    
    return midiFile;
  };
  
  // Encode a number as variable-length quantity (MIDI standard)
  const encodeVariableLength = (value: number): number[] => {
    if (value < 0) value = 0;
    
    const bytes: number[] = [];
    let v = value;
    
    do {
      let b = v & 0x7F;
      v >>= 7;
      if (v > 0) b |= 0x80;
      bytes.push(b);
    } while (v > 0);
    
    return bytes;
  };
  
  // Play back the recorded MIDI
  const playMidiRecording = () => {
    if (recordedNotes.length === 0 || isPlaying) return;
    
    // Reset playback index
    currentNoteIndexRef.current = 0;
    
    // Stop any currently playing notes
    if (synthRef.current) {
      synthRef.current.releaseAll();
    }
    
    // Make sure Tone.js audio context is started
    Tone.start().then(() => {
      console.log("Tone.js context started for playback");
      
      // Sort notes by timestamp
      const sortedNotes = [...recordedNotes].sort((a, b) => a.timestamp - b.timestamp);
      
      // Start playback
      setIsPlaying(true);
      
      // Function to play the next note
      const playNextNote = () => {
        const idx = currentNoteIndexRef.current;
        
        if (idx >= sortedNotes.length) {
          // End of playback
          setIsPlaying(false);
          if (playbackTimerRef.current) {
            clearTimeout(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
          return;
        }
        
        const note = sortedNotes[idx];
        
        // Play the note using our synth
        if (note.type === 'noteon') {
          const noteName = midiToNoteName(note.note);
          const velocity = note.velocity || 0.7; // Default to medium velocity if not recorded
          const duration = note.duration / 1000; // Convert ms to seconds
          
          try {
            // Use Tone.js for playback
            if (synthRef.current) {
              if (duration > 0) {
                synthRef.current.triggerAttackRelease(
                  noteName,
                  duration,
                  Tone.now(),
                  velocity
                );
              } else {
                synthRef.current.triggerAttack(noteName, Tone.now(), velocity);
              }
            }
          } catch (err) {
            console.error("Error playing note:", err);
            // Continue with playback even if one note fails
          }
        }
        
        // Move to next note
        currentNoteIndexRef.current++;
        
        // Schedule next note
        const nextIdx = currentNoteIndexRef.current;
        if (nextIdx < sortedNotes.length) {
          const currentTimestamp = note.timestamp;
          const nextTimestamp = sortedNotes[nextIdx].timestamp;
          const delay = Math.max(1, nextTimestamp - currentTimestamp); // Ensure minimum 1ms delay
          
          playbackTimerRef.current = setTimeout(playNextNote, delay);
        } else {
          // End of playback after a short delay to let final notes ring out
          playbackTimerRef.current = setTimeout(() => {
            setIsPlaying(false);
          }, 500);
        }
      };
      
      // Start playback
      playNextNote();
    }).catch(err => {
      console.error("Failed to start Tone.js context:", err);
      setIsPlaying(false);
    });
  };
  
  // Stop playback
  const stopMidiPlayback = () => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    // Stop any playing notes on the synth
    if (synthRef.current) {
      synthRef.current.releaseAll();
    }
    
    // Stop any playing notes on MIDI output
    if (WebMidi.enabled && WebMidi.outputs.length > 0) {
      const output = WebMidi.outputs[0];
      // Send all notes off message on all 16 channels
      for (let channel = 1; channel <= 16; channel++) {
        output.sendAllNotesOff({ channels: channel });
      }
    }
    
    setIsPlaying(false);
  };
  
  // Delete current recording
  const deleteRecording = () => {
    // Confirm with the user before deleting
    if (window.confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      setRecordedNotes([]);
      setRecordingTime(0);
      
      // Stop playback if it's currently playing
      if (isPlaying) {
        stopMidiPlayback();
      }
    }
  };
  
  // Handle instrument change
  const handleInstrumentChange = (event: SelectChangeEvent) => {
    setSelectedInstrument(event.target.value as InstrumentType);
  };
  
  // Helper function to download a file
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
  
  // Generate and download an MP3 of the current recording
  const downloadAsMP3 = async () => {
    if (recordedNotes.length === 0) {
      setSaveError('No MIDI data to export. Please record something first.');
      return;
    }

    try {
      // Show loading status
      setIsSaving(true);
      
      // Create an offline Tone.js context for rendering
      // Make sure it's long enough to contain all notes plus some extra time for reverb tails
      const recordingLengthSeconds = (recordingTime + 3); // Add extra seconds for reverb tail
      const offlineContext = new Tone.OfflineContext(2, recordingLengthSeconds, 44100);
      
      // Access the destination of the offline context
      const destination = offlineContext.destination;
      
      // Create a synth using the current instrument settings
      let offlineSynth: Tone.PolySynth<Tone.Synth<Tone.SynthOptions> | Tone.AMSynth>;
      
      if (selectedInstrument === 'piano') {
        // Create the piano synth 
        offlineSynth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { 
            type: "triangle8"
          },
          envelope: {
            attack: 0.005,
            decay: 0.8,
            sustain: 0.2,
            release: 3
          },
          volume: -6
        });
        
        // Force connection to the offline context
        (offlineSynth as any).context = offlineContext;
        (offlineSynth as any).output.context = offlineContext;
        
        // Create effects
        const pianoEQ = new Tone.EQ3({
          low: 0,
          mid: 3,
          high: -2
        });
        
        const pianoReverb = new Tone.Reverb({
          decay: 1.5,
          wet: 0.15
        });
        
        // Force connection to the offline context
        (pianoEQ as any).context = offlineContext;
        (pianoEQ as any).output.context = offlineContext;
        (pianoReverb as any).context = offlineContext;
        (pianoReverb as any).output.context = offlineContext;
        
        // Manually connect the chain in the offline context
        offlineSynth.connect(pianoEQ);
        pianoEQ.connect(pianoReverb);
        pianoReverb.connect(destination);
      } else {
        // Synth
        offlineSynth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.5,
          oscillator: {
            type: "fatsawtooth",
            count: 3,
            spread: 20
          },
          envelope: {
            attack: 0.05,
            decay: 0.1,
            sustain: 0.9,
            release: 0.5
          },
          volume: -10
        });
        
        // Force connection to the offline context
        (offlineSynth as any).context = offlineContext;
        (offlineSynth as any).output.context = offlineContext;
        
        // Create effects
        const phaser = new Tone.Phaser({
          frequency: 0.8,
          octaves: 5,
          baseFrequency: 800
        });
        
        const pingPong = new Tone.PingPongDelay({
          delayTime: 0.25,
          feedback: 0.2,
          wet: 0.15
        });
        
        // Force connection to the offline context
        (phaser as any).context = offlineContext;
        (phaser as any).output.context = offlineContext;
        (pingPong as any).context = offlineContext;
        (pingPong as any).output.context = offlineContext;
        
        // Manually connect the chain
        offlineSynth.connect(phaser);
        phaser.connect(pingPong);
        pingPong.connect(destination);
      }

      // Sort notes by timestamp
      const sortedNotes = [...recordedNotes].sort((a, b) => a.timestamp - b.timestamp);
      
      // Schedule all notes in the offline context
      sortedNotes.forEach(note => {
        if (note.type === 'noteon' && note.duration > 0) {
          const noteName = midiToNoteName(note.note);
          const velocity = note.velocity || 0.7;
          const startTime = note.timestamp / 1000; // convert ms to seconds
          const duration = note.duration / 1000; // convert ms to seconds
          
          offlineSynth.triggerAttackRelease(
            noteName,
            duration,
            startTime,
            velocity
          );
        }
      });

      // Render the audio
      console.log("Starting audio rendering...");
      setSaveError("Rendering audio... Please wait.");
      
      // Add a short delay to allow the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const renderedBuffer = await offlineContext.render();
        console.log("Audio rendering complete!");
        setSaveError(null);
        
        // Convert the AudioBuffer to a WAV blob
        // Ensure we get both channels for stereo output
        const leftChannel = renderedBuffer.getChannelData(0);
        const rightChannel = renderedBuffer.getChannelData(1);
        const interleaved = new Float32Array(leftChannel.length * 2);
        
        // Interleave the two channels
        for (let i = 0; i < leftChannel.length; i++) {
          interleaved[i * 2] = leftChannel[i];
          interleaved[i * 2 + 1] = rightChannel[i];
        }
        
        const sampleRate = renderedBuffer.sampleRate;
        
        // Create a WAV file
        const wavBlob = new Blob([createWaveFile(interleaved, sampleRate, 2)], { type: 'audio/wav' });
        
        // Download the file
        downloadBlob(wavBlob, `${fileName.trim() || 'MIDI Recording'}.wav`);
      } catch (renderError) {
        console.error("Error during audio rendering:", renderError);
        // Fallback to a simpler approach - just use the main synth
        setSaveError("Audio rendering failed. Trying simpler approach...");
        
        // Use a simplified offline rendering approach
        const fallbackRendering = async () => {
          // Create a simpler offline context
          const simpleContext = new Tone.OfflineContext(1, recordingLengthSeconds, 44100);
          const simpleSynth = new Tone.PolySynth(Tone.Synth);
          
          // Force context
          (simpleSynth as any).context = simpleContext;
          (simpleSynth as any).output.context = simpleContext;
          simpleSynth.connect(simpleContext.destination);
          
          // Schedule notes
          sortedNotes.forEach(note => {
            if (note.type === 'noteon' && note.duration > 0) {
              const noteName = midiToNoteName(note.note);
              const velocity = note.velocity || 0.7;
              const startTime = note.timestamp / 1000;
              const duration = note.duration / 1000;
              
              simpleSynth.triggerAttackRelease(
                noteName,
                duration,
                startTime,
                velocity
              );
            }
          });
          
          // Render simple audio
          const simpleBuffer = await simpleContext.render();
          const monoData = simpleBuffer.getChannelData(0);
          const wavBlob = new Blob([createWaveFile(monoData, simpleBuffer.sampleRate, 1)], { type: 'audio/wav' });
          downloadBlob(wavBlob, `${fileName.trim() || 'MIDI Recording'}.wav`);
          setSaveError(null);
        };
        
        await fallbackRendering();
      }
      
      // Reset status
      setIsSaving(false);
      
    } catch (error: any) {
      console.error('Error exporting audio:', error);
      setSaveError(error.message || 'Failed to export audio file');
      setIsSaving(false);
    }
  };
  
  // Create a basic WAV file from audio data
  // Updated to support stereo
  const createWaveFile = (audioData: Float32Array, sampleRate: number, numChannels: number = 1): ArrayBuffer => {
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
  
  return (
    <Paper sx={{ 
      p: 2, 
      mb: 2, 
      borderRadius: 2,
      boxShadow: 2,
      background: 'linear-gradient(to right bottom, #ffffff, #fafafa)',
    }}>
      <Typography variant="h6" sx={{ 
        display: 'flex', 
        alignItems: 'center',
        color: '#1976d2',
        borderBottom: '1px solid #e0e0e0',
        pb: 1,
        mb: 2
      }}>
        <MusicNoteIcon sx={{ mr: 1, fontSize: '1.2rem', color: '#1976d2' }} />
        MIDI Recorder
      </Typography>
      
      {/* MIDI Connection and Instrument Selection - Combined in one row */}
      <Box sx={{ mb: 2 }}>
        {connectionError && (
          <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: '0.85rem' }}>
            {connectionError}
          </Alert>
        )}
        
        <Grid container spacing={1} alignItems="center">
          {/* MIDI Input with refresh icon */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="midi-input-label">MIDI Input</InputLabel>
              <Select
                labelId="midi-input-label"
                value={selectedInput}
                label="MIDI Input"
                onChange={handleInputChange}
                disabled={!midiEnabled || isRecording}
                endAdornment={
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      initializeMidi();
                    }}
                    disabled={isRecording}
                    sx={{ 
                      mr: 2,
                      color: !isRecording ? 'primary.main' : 'text.disabled' 
                    }}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                }
              >
                {midiInputs.length === 0 ? (
                  <MenuItem value="" disabled>
                    No MIDI devices detected
                  </MenuItem>
                ) : (
                  midiInputs.map((input) => (
                    <MenuItem key={input.id} value={input.id}>
                      {input.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
          
          {/* Instrument Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel id="instrument-select-label">Instrument</InputLabel>
              <Select
                labelId="instrument-select-label"
                value={selectedInstrument}
                label="Instrument"
                onChange={handleInstrumentChange}
                disabled={isRecording}
              >
                {instrumentOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      {/* Recording Controls - Compact row */}
      <Box sx={{ 
        mb: 2,
        p: 1.5,
        backgroundColor: '#fafafa',
        borderRadius: 1,
        border: '1px solid #eee'
      }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={8} sm={6}>
            {isRecording ? (
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<StopIcon />}
                onClick={stopRecording}
                size="small"
                sx={{ height: '40px' }}
              >
                Stop Recording
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<MicIcon />}
                onClick={startRecording}
                disabled={!midiEnabled || !selectedInput}
                size="small"
                sx={{ height: '40px' }}
              >
                Start Recording
              </Button>
            )}
          </Grid>
          <Grid item xs={4} sm={3}>
            <Box sx={{ 
              p: 1, 
              textAlign: 'center',
              border: '1px dashed #ccc',
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.8)',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isRecording ? (
                <Typography variant="body2" color="error" fontWeight="medium">
                  {formatTime(recordingTime)}
                </Typography>
              ) : recordedNotes.length > 0 ? (
                <Typography variant="body2" fontWeight="medium">
                  {formatTime(recordingTime)}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Ready
                </Typography>
              )}
            </Box>
          </Grid>
          
          {/* Playback controls inline */}
          {recordedNotes.length > 0 && !isRecording && (
            <>
              <Grid item xs={4} sm={1.5}>
                <Button
                  variant="outlined"
                  startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                  onClick={isPlaying ? stopMidiPlayback : playMidiRecording}
                  size="small"
                  sx={{ height: '40px' }}
                  fullWidth
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </Button>
              </Grid>
              
              <Grid item xs={4} sm={1.5}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={downloadAsMP3}
                  disabled={isSaving}
                  size="small"
                  sx={{ height: '40px' }}
                  fullWidth
                  title="Download as audio file"
                >
                  Export
                </Button>
              </Grid>
              
              <Grid item xs={4} sm={1.5}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={deleteRecording}
                  size="small"
                  sx={{ height: '40px' }}
                  fullWidth
                >
                  Delete
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Box>
      
      {/* Save Recording Section - Compact design */}
      {recordedNotes.length > 0 && !isRecording && (
        <Box sx={{
          p: 1.5,
          backgroundColor: '#f8f8f8',
          borderRadius: 1,
          border: '1px solid #eee'
        }}>
          {saveError && (
            <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: '0.85rem' }}>
              {saveError}
            </Alert>
          )}
          
          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 1, py: 0.5, fontSize: '0.85rem' }}>
              MIDI recording saved successfully!
            </Alert>
          )}
          
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="File Name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                fullWidth
                margin="dense"
                required
                error={!fileName.trim()}
                size="small"
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Add Tags (press Enter)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                fullWidth
                margin="dense"
                disabled={isSaving}
                size="small"
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={addTag}
                      disabled={!tagInput.trim() || isSaving}
                      size="small"
                    >
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />
            </Grid>
            
            {/* Tags display more compact */}
            {tags.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 0.5 }}>
                  {tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                      disabled={isSaving}
                      size="small"
                      sx={{ borderRadius: '4px' }}
                    />
                  ))}
                </Box>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={saveRecording}
                disabled={isSaving || !fileName.trim()}
                fullWidth
                size="small"
                sx={{ height: '40px', mt: 0.5 }}
              >
                {isSaving ? 'Saving...' : 'Save Recording'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default MidiRecorder; 