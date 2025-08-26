import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧪 Starting global test setup...');
  
  // Wait for services to be ready
  const maxRetries = 30;
  const retryDelay = 2000;
  
  // Check if frontend is ready
  console.log('⏳ Waiting for frontend server...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:4000');
      if (response.ok) {
        console.log('✅ Frontend server is ready');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Frontend server failed to start');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // Check if backend API is ready
  console.log('⏳ Waiting for backend API...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        console.log('✅ Backend API is ready');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        console.log('⚠️  Backend API not ready, tests may fail');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  console.log('✅ Global setup completed');
}

export default globalSetup;