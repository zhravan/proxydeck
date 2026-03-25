export type InfrastructureServer = {
  id: string;
  provider: string;
  region: string | null;
  name: string;
  role: string | null;
  environment: string | null;
  notes: string | null;
  consoleUrl: string | null;
  runbookUrl: string | null;
  tags: string[];
  linkedDomainIds: string[];
  createdAt: string;
  updatedAt: string;
};
