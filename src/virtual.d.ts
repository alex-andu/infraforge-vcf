/// <reference types="vite/client" />
declare module 'virtual:ifc/meta' {
  type Loader = () => Promise<{ default: any }>;
  export const meta: unknown;
  export const lessonLoaders: Record<string, Loader>;
  export const labLoaders: Record<string, Loader>;
  export const incidentLoaders: Record<string, Loader>;
  export const scenarioLoaders: Record<string, Loader>;
  export const diagramLoaders: Record<string, Loader>;
  export const loadQuestions: Loader;
  export const loadHomelab: Loader;
  export const loadSearchDocs: Loader;
}
