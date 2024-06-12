# Project README

## Project Overview

This project is a Angular (With SSR) + Nestjs monorepo using Nx. It is a full-stack application that demonstrates how to structure and manage frontend and backend applications within a single Nx workspace.

## TODO
Feel free to contribute to this project by creating a pull request. 

- [ ] Check on how to build for bun runtime 
- [x] Pre rendering routes doesn't spin up the server, so the HTTP calls are not working (Made a build workaround npm script)      

## Other variants of this project
- Just Angular: https://github.com/cskiwi/angular-nestjs-starter
- With TypeORM and Postgres: TODO

## Directory Structure

The directory structure of this Nx monorepo is organized as follows:

### Apps

- **apps/app**: This is the main Angular application with SSR enabled.
- **apps/api**: This directory is used for running the backend server during development.

### Libsf

- **libs/backend/root**: This directory contains the entry point for the backend services. It includes necessary configurations and files to initialize and run the backend application.
- **libs/frontend/root**: This directory contains the entry point for the frontend services. It includes necessary configurations and files to initialize and run the frontend application.

## Getting Started
s

### Prerequisites

Ensure you have the following installed on your machine:

- Node.js (Node 20 is recommended, 22 doens't seem to build the SSG)
- Nx CLI

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Applications

To run the application:

```bash
 npm  start
```
This will start the development server and the application will be available at `http://localhost:4200`.


### Building the Applications

#### Build Frontend

To build the Angular application for production:

```bash
npm  run build
```

To run the Application:

```bash
node dist/apps/app/server/server.mjs 
```

### Testing

#### Running Unit Tests

To run unit tests:

```bash
nx run-many -t test
```

#### Running End-to-End Tests

To run end-to-end tests:

```bash
nx e2e app-e2e
```


## Bun
I really want bun to be supported, see https://github.com/nrwl/nx/issues/26053 for more information.
