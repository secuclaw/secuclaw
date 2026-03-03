import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSecurityData, useAttackSimulation, useDefenseAnalysis, useComplianceAudit } from '../useSecurityData';
import { createMockApiClient, createMockSecurityData } from '../../test-utils/mocks';

vi.mock('../../api/client', () => ({
  getApiClient: () => createMockApiClient(),
}));

describe('useSecurityData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch security data on mount', async () => {
    const { result } = renderHook(() => useSecurityData(false));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should refresh data when refresh is called', async () => {
    const { result } = renderHook(() => useSecurityData(false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refresh();

    expect(result.current.metrics).not.toBeNull();
  });
});

describe('useAttackSimulation', () => {
  it('should run attack simulation', async () => {
    const { result } = renderHook(() => useAttackSimulation());

    const attackResult = await result.current.runAttack('192.168.1.1', 'network');

    expect(attackResult).not.toBeNull();
    expect(attackResult?.target).toBe('192.168.1.1');
    expect(attackResult?.attackType).toBe('network');
  });

  it('should track attack history', async () => {
    const { result } = renderHook(() => useAttackSimulation());

    await result.current.runAttack('192.168.1.1', 'network');
    await result.current.runAttack('10.0.0.1', 'web');

    expect(result.current.history.length).toBeGreaterThanOrEqual(2);
  });
});

describe('useDefenseAnalysis', () => {
  it('should run defense analysis', async () => {
    const { result } = renderHook(() => useDefenseAnalysis());

    const defenseResult = await result.current.runDefense('192.168.1.1', 'vulnerability');

    expect(defenseResult).not.toBeNull();
    expect(defenseResult?.target).toBe('192.168.1.1');
    expect(defenseResult?.scanType).toBe('vulnerability');
  });
});

describe('useComplianceAudit', () => {
  it('should run compliance audit', async () => {
    const { result } = renderHook(() => useComplianceAudit());

    const auditResult = await result.current.runAudit('ISO27001');

    expect(auditResult).not.toBeNull();
    expect(auditResult?.framework).toBe('ISO27001');
  });

  it('should track audit history', async () => {
    const { result } = renderHook(() => useComplianceAudit());

    await result.current.runAudit('ISO27001');
    await result.current.runAudit('SOC2');

    expect(result.current.history.length).toBeGreaterThanOrEqual(2);
  });
});
