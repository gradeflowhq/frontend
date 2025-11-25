import { defineConfig } from 'orval';

export default defineConfig({
  gradeflow: {
    input: { target: 'http://localhost:8000/openapi.json' }, // adjust backend URL
    output: {
      target: 'src/api/gradeflowClient.ts',
      schemas: 'src/api/models',
      client: 'axios',
      prettier: true,
    },
  },
});