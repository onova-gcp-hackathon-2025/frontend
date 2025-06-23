// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Environment } from './env-types';
import { Common } from './common';

export const environment: Environment = {
  ...Common,
  apiToken: 'REPLACE WITH BREARER TOKEN',
  apiUrl: 'https://content-aiplatform.googleapis.com/v1/projects/hacker2025-team-12-dev/locations/us-central1/reasoningEngines/5741922399129960448:streamQuery',
  fetchMockGeminiApiUrl: 'http://localhost:4200/api',
};
