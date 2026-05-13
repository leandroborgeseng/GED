export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

export type UserSignaturePolicy = 'SIMPLES' | 'ICP_A1';

export type AuthUserDto = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  organizationId?: string | null;
  departmentId?: string | null;
  unitId?: string | null;
  signaturePolicy?: UserSignaturePolicy;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
};

export type PaperlessDocumentListItem = {
  id: number;
  label?: string;
  description?: string;
  datetime_created?: string;
  file_latest?: { id: number; filename: string; size: number; mimetype?: string };
  document_type?: { id: number; label: string };
};

export type DashboardSummary = {
  documentCount: number;
  recentDocuments: PaperlessDocumentListItem[];
  userCount: number;
  storage: { configured: boolean; bucketOk?: boolean };
  recentActivity: unknown[];
  workflowPending: number;
  ocrProcessed: number;
};

export type PaeProcessListItem = {
  id: string;
  number: string;
  year: number;
  subject: string;
  status: string;
  interestedParty?: string | null;
  confidentiality?: string;
  processType?: { name: string; code: string };
  currentUnit?: { name: string; code: string } | null;
};
