const { execSync } = require('child_process');
const os = require('os');

const platform = os.platform();

console.log('Killing all Node.js processes...');

try {
  if (platform === 'win32') {
    // Windows - kill all node processes
    try {
      execSync('taskkill /F /IM node.exe', { stdio: 'inherit' });
      console.log('Killed all Node.js processes');
    } catch (error) {
      console.log('No Node.js processes found to kill');
    }
  } else {
    // macOS, Linux, etc.
    try {
      // Find all node processes except this one
      const currentPid = process.pid;
      console.log(`Current process PID: ${currentPid} (will not kill this one)`);
      
      const output = execSync('pgrep node', { encoding: 'utf8' }).trim();
      
      if (output) {
        const pids = output.split('\n');
        
        pids.forEach(pid => {
          pid = pid.trim();
          if (pid && pid !== currentPid.toString()) {
            console.log(`Killing Node.js process with PID: ${pid}`);
            try {
              execSync(`kill -9 ${pid}`);
            } catch (killError) {
              console.error(`Failed to kill process ${pid}: ${killError.message}`);
            }
          }
        });
        console.log('Killed all other Node.js processes');
      } else {
        console.log('No other Node.js processes found to kill');
      }
    } catch (error) {
      console.log('No Node.js processes found to kill');
    }
  }
} catch (error) {
  console.error('Error killing Node.js processes:', error.message);
}

console.log('Waiting for processes to fully terminate...');

// Wait a moment for processes to fully terminate
setTimeout(() => {
  console.log('Starting development servers...');
  try {
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error starting development servers:', error.message);
  }
}, 3000); // Wait 3 seconds 