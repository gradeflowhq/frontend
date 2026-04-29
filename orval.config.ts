import { defineConfig } from 'orval';

const openApiTarget = process.env.OPENAPI_URL || 'http://localhost:8000/openapi.json';

export default defineConfig({
  gradeflow: {
    input: { target: openApiTarget },
    output: {
      target: 'src/api/gradeflowClient.ts',
      schemas: 'src/api/models',
      client: 'axios',
      prettier: true,
    },
  },
});