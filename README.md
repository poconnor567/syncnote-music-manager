# SyncNote - Music Project Manager

SyncNote is a comprehensive web-based platform designed to streamline the workflow of musicians by providing a centralized system for managing sheet music, MIDI files, recordings, and practice notes.

## Features

- **Sheet Music Management**: Organize and annotate your sheet music in one central location
- **MIDI Integration**: Seamlessly work with MIDI files alongside your sheet music
- **Audio Recording Storage**: Store and organize your practice recordings and performances
- **Centralized Project Management**: Keep all your musical assets organized by project
- **Cross-Platform Access**: Access your music projects from any device with a web browser
- **Streamlined Workflow**: Increase productivity with our intuitive, all-in-one interface

## Tech Stack

- **Frontend**: React, TypeScript, Material-UI
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local file system (with cloud storage options planned for future)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/poconnor567/syncnote-music-manager.git
   cd syncnote-music-manager
   ```

2. Install dependencies
   ```
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up environment variables
   - Create a `.env` file in the server directory with the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/music-project-manager
     JWT_SECRET=your_jwt_secret_key_change_in_production
     NODE_ENV=development
     ```

4. Start the development server
   ```
   npm run dev
   ```

## Project Structure

- `/client` - React frontend
  - `/src` - Source code
    - `/components` - Reusable UI components
    - `/context` - React context providers
    - `/pages` - Page components
    - `/services` - API service functions
    - `/types` - TypeScript type definitions
- `/server` - Node.js backend
  - `/controllers` - Request handlers
  - `/middleware` - Express middleware
  - `/models` - MongoDB models
  - `/routes` - API routes
  - `/uploads` - File storage directory

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Special thanks to all musicians who provided feedback during the development process 