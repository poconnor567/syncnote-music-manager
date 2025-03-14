# Music Project Manager

A web application for managing music projects, including sheet music, MIDI files, and audio recordings. This application allows users to organize their musical projects in folders, upload various file types, and associate MIDI recordings with sheet music.

## Features

### User Management and Authentication
- User registration and login with secure authentication
- Password updates and account management
- Admin functionality for user management

### Project and File Management
- Create and organize musical projects
- Create folder hierarchies for organizing content
- Upload various file types (PDF sheet music, MIDI files, MP3 audio)
- Rename, delete, and manage files and folders
- Drag-and-drop file organization

### MIDI Integration
- Record MIDI tracks using connected MIDI devices
- Associate MIDI recordings with specific sections of sheet music
- Playback MIDI tracks alongside sheet music

### Search and Cloud Storage
- Search functionality by file name, tags, or type
- Advanced filtering options
- Cloud synchronization across devices

## Tech Stack

- **Frontend**: React with TypeScript, Material UI
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Storage**: Local file system with cloud sync capabilities

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd music-project-manager
   ```

2. Install dependencies
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables
   - Create a `.env` file in the server directory with the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/music-project-manager
     JWT_SECRET=your_jwt_secret_key_change_in_production
     NODE_ENV=development
     ```

4. Start the development servers
   ```
   # Start the backend server
   cd server
   npm run dev

   # In a separate terminal, start the frontend
   cd client
   npm start
   ```

5. Access the application
   - Backend API: http://localhost:5000
   - Frontend: http://localhost:3000

## Project Structure

```
music-project-manager/
├── client/                 # React frontend
│   ├── public/             # Static files
│   └── src/                # React source code
│       ├── components/     # UI components
│       ├── pages/          # Page components
│       ├── services/       # API services
│       └── context/        # React context providers
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   └── uploads/            # Uploaded files storage
└── README.md               # Project documentation
```

## License

This project is licensed under the MIT License. 