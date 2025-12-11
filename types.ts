export type AppMode = 'MEMBERSHIP' | 'EMPLOYEE';

export type EmployeeAction = 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';

export interface AuditLogEntry {
  id: string;
  organizationId?: string; // Multi-tenant support
  timestamp: string;
  action: string;
  details: string;
  adminUser?: string;
}

export interface TimeLog {
  id: string;
  organizationId?: string; // Multi-tenant support
  memberId: string;
  action: EmployeeAction;
  timestamp: string;
  isEdited?: boolean;
  originalTimestamp?: string;
}

export interface Member {
  id: string;
  organizationId?: string; // Multi-tenant support
  memberNumber: string; // New Primary Key for check-in
  name: string;
  phoneNumber: string; 
  email?: string;
  address?: string;
  department?: string; // For Employee Mode
  expirationDate: string; // ISO Date string
  hasWaiver: boolean;
  waiverSignature?: string; // Base64 string
  lastCheckIn?: string;
  joinedDate: string;
  status: 'ACTIVE' | 'ARCHIVED';
  // Employee Mode specific fields
  lastAction?: EmployeeAction;
  lastActionTime?: string;
  // History
  auditLogs?: AuditLogEntry[];
}

export interface Organization {
  id: string;
  name: string;
  stripeCustomerId?: string;
  subscriptionStatus: 'active' | 'trial' | 'past_due' | 'canceled';
}

export interface AppSettings {
    waiverText: string;
    waiverImage?: string; // Base64 of the uploaded waiver document
    departments: string[];
}

export enum CheckInStatus {
  IDLE = 'IDLE',
  SUCCESS = 'SUCCESS', // Green Screen
  EXPIRED = 'EXPIRED', // Red Screen
  NOT_FOUND = 'NOT_FOUND', // Yellow/Warning
  NO_WAIVER = 'NO_WAIVER', // Orange
  EMPLOYEE_ACTION = 'EMPLOYEE_ACTION' // Intermediate state to show controls
}

export interface CheckInResult {
  status: CheckInStatus;
  member?: Member;
  message?: string;
  title?: string;
}

export type ViewMode = 'KIOSK' | 'ADMIN' | 'WAIVER';