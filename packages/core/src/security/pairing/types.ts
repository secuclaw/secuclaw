export enum PairingStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

export interface DeviceInfo {
  id: string;
  name: string;
  fingerprint: string;
  createdAt: number;
}

export interface PairingSession {
  id: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  status: PairingStatus;
  attempts: number;
  maxAttempts: number;
  deviceName?: string;
}

export interface DeviceCertificate {
  id: string;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
  revoked: boolean;
}
