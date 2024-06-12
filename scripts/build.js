const { spawn } = require('child_process');
const fs = require('fs');

// Function to run a shell command and return the process immediately
function runCommand(command, args = [], options = {}) {
  const process = spawn(command, args, options);

  process.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  process.stderr.on('data', (data) => {
    console.error(data.toString());
  });
  return process;
}

// Function to run a shell command and wait for it to complete
function runCommandAndWait(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = runCommand(command, args);

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(`Command failed with code ${code}`);
      }
    });

    process.on('error', (error) => {
      reject(`Command failed with error ${error}`);
    });
  });
}

// Function to wait for the server to be ready
function waitForServer(port) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        console.log('Checking server status...');
        const response = await fetch(`http://localhost:${port}/api/routes`);
        if (response.ok) {
          clearInterval(interval);
          resolve();
        }
      } catch (error) {
        // Server is not ready yet
      }
    }, 1000);
  });
}

// Function to make a GET request and save the response to a file
async function getAndSaveRoutes(port, filePath) {
  try {
    const response = await fetch(`http://localhost:${port}/api/routes`);
    if (!response.ok) {
      throw new Error(`Failed to fetch routes: ${response.statusText}`);
    }
    const data = await response.text();
    fs.writeFileSync(filePath, data);
  } catch (error) {
    throw new Error(`GET request failed: ${error}`);
  }
}

// Main function to run the tasks
async function main() {
  const port = process.env.PORT || 5000;
  if (!port) {
    console.error('Environment variable PORT is not set');
    process.exit(1);
  }

  try {
    // use sqlite in memory database for testing
    process.env.DB_TYPE = process.env.DB_TYPE || 'sqlite';
    process.env.DB_DATABASE = process.env.DB_DATABASE || ':memory:';
    process.env.DB_SYNCHRONIZE = process.env.DB_SYNCHRONIZE || 'true';

    console.log('Build server...');
    await runCommandAndWait('nx', ['build', 'api']);

    console.log('Server build completed. Starting server...');
    const apiProcess = runCommand('node', ['dist/apps/api/main.js']);

    console.log(
      `Waiting for server ${apiProcess.pid} to be ready on port ${port}...`,
    );
    await waitForServer(port);
    process.env.BASE_URL = `http://localhost:${port}`;

    console.log('Server is ready. Fetching routes...');
    await getAndSaveRoutes(port, 'routes.txt');

    console.log('Routes saved to routes.txt');

    console.log('Building app...');
    await runCommandAndWait(`nx`, ['build', 'app']);
    console.log('App build completed');

    console.log('Stopping server...');
    apiProcess.kill('SIGINT');

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
