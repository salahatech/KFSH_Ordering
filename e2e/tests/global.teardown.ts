import { test as teardown } from '@playwright/test';
import fs from 'fs';
import path from 'path';

teardown('generate test summary', async () => {
  const artifactsDir = 'e2e/artifacts';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const summary = {
    timestamp,
    testRun: process.env.CI ? 'ci' : 'local',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5000',
    completedAt: new Date().toISOString(),
  };
  
  const summaryPath = path.join(artifactsDir, `summary-${timestamp}.json`);
  
  try {
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`Test summary written to ${summaryPath}`);
  } catch (error) {
    console.warn('Could not write test summary:', error);
  }
});
