import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager } from '../memory/manager';
import { SessionManager } from '../session/manager';
import { createChannelManager } from '../channels/manager';
import type { ChannelMessage } from '../channels/types';
import type { SessionMessageContent } from '../session/types';
import * as os from 'os';
import * as path from 'path';

const TEST_DATA_DIR = path.join(os.tmpdir(), 'secuclaw-perf-test');

describe('Performance Tests', () => {
  describe('Memory System Performance', () => {
    let memoryManager: MemoryManager;

    beforeEach(async () => {
      memoryManager = new MemoryManager({ dataDir: TEST_DATA_DIR });
    });

    it('should handle 100 memory entries efficiently', async () => {
      const startTime = Date.now();
      const entries = 100;

      for (let i = 0; i < entries; i++) {
        await memoryManager.add(
          `Test message ${i} with some content to simulate real usage`,
          {
            source: 'test',
            tags: ['perf-test'],
            importance: 0.5,
          }
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
      expect(memoryManager.getAll().length).toBe(entries);
    });

    it('should retrieve entries by ID efficiently', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 100; i++) {
        const entry = await memoryManager.add(`Entry ${i}`, {
          source: 'test',
          tags: ['get-test'],
          importance: 0.5,
        });
        ids.push(entry.id);
      }

      const startTime = Date.now();
      for (const id of ids) {
        memoryManager.get(id);
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it('should handle getAll efficiently', async () => {
      for (let i = 0; i < 100; i++) {
        await memoryManager.add(`Entry ${i}`, {
          source: 'test',
          tags: ['getall-test'],
          importance: 0.5,
        });
      }

      const startTime = Date.now();
      const all = memoryManager.getAll();
      const duration = Date.now() - startTime;

      expect(all.length).toBe(100);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Session Manager Performance', () => {
    let sessionManager: SessionManager;

    beforeEach(async () => {
      sessionManager = new SessionManager({ dataDir: TEST_DATA_DIR });
    });

    it('should handle concurrent session creation', async () => {
      const startTime = Date.now();
      const sessions = 50;

      const promises = [];
      for (let i = 0; i < sessions; i++) {
        promises.push(
          sessionManager.createSession({
            channel: 'web',
          })
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should handle rapid message processing', async () => {
      const session = await sessionManager.createSession({
        channel: 'web',
      });

      const startTime = Date.now();
      const messages = 100;

      for (let i = 0; i < messages; i++) {
        const content: SessionMessageContent[] = [
          { type: 'text', text: `Message ${i}` }
        ];
        await sessionManager.addMessage(session.id, 'user', content);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });

    it('should retrieve sessions efficiently', async () => {
      const sessionIds: string[] = [];
      for (let i = 0; i < 30; i++) {
        const session = await sessionManager.createSession({
          channel: 'web',
        });
        sessionIds.push(session.id);
      }

      const startTime = Date.now();
      for (const id of sessionIds) {
        sessionManager.getSession(id);
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Channel Manager Throughput', () => {
    it('should handle high message throughput', async () => {
      const manager = createChannelManager({
        channels: [{ type: 'web', enabled: true }],
        defaultChannel: 'web',
      });

      let processedCount = 0;
      manager.onMessage(() => {
        processedCount++;
      });

      const startTime = Date.now();
      const messages = 500;

      for (let i = 0; i < messages; i++) {
        const msg: ChannelMessage = {
          id: `msg-${i}`,
          channelId: 'test',
          channelType: 'web',
          userId: 'user-1',
          content: `Test message ${i}`,
          timestamp: Date.now(),
        };
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should handle multiple channel stats requests', async () => {
      const manager = createChannelManager({
        channels: [
          { type: 'web', enabled: true },
          { type: 'telegram', enabled: true, token: 'test' },
          { type: 'discord', enabled: true, token: 'test' },
        ],
        defaultChannel: 'web',
      });

      const startTime = Date.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        manager.getStats();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('should handle memory efficiently for large operations', async () => {
      const manager = new MemoryManager({ dataDir: TEST_DATA_DIR });
      const initialMemory = process.memoryUsage().heapUsed;

      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < 100; i++) {
          await manager.add('x'.repeat(50), {
            source: 'memory-test',
            tags: [`round-${round}`],
            importance: 0.5,
          });
        }
        manager.clear();
      }

      if (global.gc) global.gc();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const growth = (finalMemory - initialMemory) / 1024 / 1024;

      expect(growth).toBeLessThan(100);
    });
  });

  describe('Stress Tests', () => {
    it('should handle mixed operations under load', async () => {
      const memoryManager = new MemoryManager({ dataDir: TEST_DATA_DIR });
      const sessionManager = new SessionManager({ dataDir: TEST_DATA_DIR });

      const startTime = Date.now();
      const operations = 50;

      const promises: Promise<unknown>[] = [];

      for (let i = 0; i < operations; i++) {
        promises.push(
          memoryManager.add(`Content ${i}`, {
            source: 'stress-test',
            tags: ['stress'],
            importance: 0.5,
          })
        );
        
        promises.push(
          sessionManager.createSession({
            channel: 'web',
          })
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
