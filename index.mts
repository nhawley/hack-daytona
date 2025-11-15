import dotenv from 'dotenv';
import { Daytona } from '@daytonaio/sdk';

dotenv.config();

// Initialize the Daytona client
const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });

// Create the Sandbox instance
const sandbox = await daytona.create({
  language: 'typescript',
  name: 'auot-broker',

});

// Run the code securely inside the Sandbox
const response = await sandbox.process.codeRun('console.log("Hello World from code!")')
console.log(response.result);

// Clean up
await sandbox.delete()