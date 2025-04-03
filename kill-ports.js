const { execSync } = require('child_process');
const os = require('os');

const ports = [3000, 5000];
const platform = os.platform();

console.log(`Checking for processes on ports ${ports.join(', ')}...`);

ports.forEach(port => {
  try {
    let command;

    if (platform === 'win32') {
      // Windows
      command = `netstat -ano | findstr :${port}`;
      try {
        const output = execSync(command, { encoding: 'utf8' });
        const lines = output.split('\n').filter(line => line.includes(`LISTENING`));
        
        if (lines.length > 0) {
          // Extract PID from the last column
          const processId = lines[0].trim().split(/\s+/).pop();
          console.log(`Found process on port ${port} with PID: ${processId}`);
          execSync(`taskkill /F /PID ${processId}`);
          console.log(`Killed process on port ${port}`);
        } else {
          console.log(`No process found on port ${port}`);
        }
      } catch (error) {
        console.log(`No process found on port ${port}`);
      }
    } else {
      // macOS, Linux, etc.
      try {
        // Get all PIDs using the port
        command = `lsof -ti:${port}`;
        const output = execSync(command, { encoding: 'utf8' }).trim();
        
        if (output) {
          // Split by newlines in case there are multiple PIDs
          const pids = output.split('\n');
          
          pids.forEach(pid => {
            pid = pid.trim();
            if (pid) {
              console.log(`Found process on port ${port} with PID: ${pid}`);
              try {
                execSync(`kill -9 ${pid}`);
                console.log(`Killed process on port ${port} (PID: ${pid})`);
              } catch (killError) {
                console.error(`Failed to kill process ${pid}: ${killError.message}`);
              }
            }
          });
        } else {
          console.log(`No process found on port ${port}`);
        }
      } catch (error) {
        console.log(`No process found on port ${port}`);
      }
    }
  } catch (error) {
    console.error(`Error handling port ${port}:`, error.message);
  }
});

// Double-check to make sure ports are clear
let allPortsClear = true;
for (const port of ports) {
  try {
    if (platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      if (output.includes('LISTENING')) {
        console.error(`Port ${port} is still in use after attempting to kill processes.`);
        allPortsClear = false;
      }
    } else {
      execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      console.error(`Port ${port} is still in use after attempting to kill processes.`);
      allPortsClear = false;
    }
  } catch (error) {
    // If lsof/netstat command fails, it means no process is using the port
    // This is actually what we want
  }
}

if (allPortsClear) {
  console.log('All specified ports have been cleared.');
  console.log('Waiting a moment for processes to fully terminate...');

  // Wait a moment for processes to fully terminate
  setTimeout(() => {
    console.log('Starting development servers...');
    try {
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
      console.error('Error starting development servers:', error.message);
    }
  }, 2000); // Increased wait time to 2 seconds
} else {
  console.error('Some ports are still in use. Please try again or manually kill the processes.');
} 