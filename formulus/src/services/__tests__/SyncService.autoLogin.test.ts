/**
 * @format
 */

// Mock all native modules BEFORE any imports
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
  },
}));
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/test/path',
  exists: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));
jest.mock(
  '../../database/DatabaseService',
  () => ({
    databaseService: {
      getLocalRepo: jest.fn(),
    },
  }),
  {virtual: true},
);
jest.mock('../../services/ClientIdService', () => ({
  clientIdService: {
    getClientId: jest.fn().mockResolvedValue('test-client-id'),
  },
}));
jest.mock('../../api/synkronus', () => ({
  synkronusApi: {
    syncObservations: jest.fn(),
    getManifest: jest.fn(),
    downloadFormSpecs: jest.fn(),
    downloadAppFiles: jest.fn(),
    removeAppBundleFiles: jest.fn(),
    clearTokenCache: jest.fn(),
  },
}));
jest.mock('../../api/synkronus/Auth', () => ({
  autoLogin: jest.fn(),
  isUnauthorizedError: jest.fn(),
}));
jest.mock('../NotificationService', () => ({
  notificationService: {
    showSyncProgress: jest.fn().mockResolvedValue(undefined),
    showSyncComplete: jest.fn().mockResolvedValue(undefined),
    clearAllSyncNotifications: jest.fn().mockResolvedValue(undefined),
    showSyncCanceled: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../FormService', () => ({
  FormService: {
    getInstance: jest.fn().mockResolvedValue({
      invalidateCache: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import {jest, describe, test, expect, beforeEach} from '@jest/globals';
import {SyncService} from '../SyncService';
import {synkronusApi} from '../../api/synkronus';
import {autoLogin, isUnauthorizedError} from '../../api/synkronus/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('SyncService - Auto-Login Integration', () => {
  let syncService: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get a fresh instance for each test
    syncService = SyncService.getInstance();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('0');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('withAutoLoginRetry - syncObservations', () => {
    test('should retry syncObservations after auto-login on 401 error', async () => {
      const mockUserInfo = {username: 'testuser', role: 'read-write' as const};
      const mockFinalVersion = 123;

      // First call fails with 401, second succeeds
      (synkronusApi.syncObservations as jest.Mock)
        .mockRejectedValueOnce({
          response: {status: 401},
          message: 'Unauthorized',
        })
        .mockResolvedValueOnce(mockFinalVersion);

      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockResolvedValue(mockUserInfo);
      (synkronusApi.clearTokenCache as jest.Mock).mockReturnValue(undefined);

      const result = await syncService.syncObservations(false);

      expect(isUnauthorizedError).toHaveBeenCalled();
      expect(autoLogin).toHaveBeenCalledTimes(1);
      expect(synkronusApi.clearTokenCache).toHaveBeenCalled();
      expect(synkronusApi.syncObservations).toHaveBeenCalledTimes(2);
      expect(result).toBe(mockFinalVersion);
    });

    test('should throw error if auto-login fails', async () => {
      const error401 = {response: {status: 401}, message: 'Unauthorized'};

      (synkronusApi.syncObservations as jest.Mock).mockRejectedValue(error401);
      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      await expect(syncService.syncObservations(false)).rejects.toThrow(
        'Authentication failed: Invalid credentials',
      );

      expect(autoLogin).toHaveBeenCalledTimes(1);
      expect(synkronusApi.syncObservations).toHaveBeenCalledTimes(1);
    });

    test('should throw error if no credentials available', async () => {
      const error401 = {response: {status: 401}, message: 'Unauthorized'};

      (synkronusApi.syncObservations as jest.Mock).mockRejectedValue(error401);
      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockResolvedValue(null);

      await expect(syncService.syncObservations(false)).rejects.toThrow(
        'No stored credentials found. Please login manually in Settings.',
      );

      expect(autoLogin).toHaveBeenCalledTimes(1);
    });

    test('should prevent infinite retry loops', async () => {
      const error401 = {response: {status: 401}, message: 'Unauthorized'};
      const mockUserInfo = {username: 'testuser', role: 'read-write' as const};

      // Both calls fail with 401
      (synkronusApi.syncObservations as jest.Mock).mockRejectedValue(error401);
      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockResolvedValue(mockUserInfo);
      (synkronusApi.clearTokenCache as jest.Mock).mockReturnValue(undefined);

      await expect(syncService.syncObservations(false)).rejects.toThrow(
        'Authentication failed after auto-login. Please login manually in Settings.',
      );

      // Should only retry once, then stop
      expect(autoLogin).toHaveBeenCalledTimes(1);
      expect(synkronusApi.syncObservations).toHaveBeenCalledTimes(2);
    });

    test('should pass through non-401 errors without retry', async () => {
      const error404 = {response: {status: 404}, message: 'Not Found'};

      (synkronusApi.syncObservations as jest.Mock).mockRejectedValue(error404);
      (isUnauthorizedError as jest.Mock).mockReturnValue(false);

      await expect(syncService.syncObservations(false)).rejects.toEqual(
        error404,
      );

      expect(autoLogin).not.toHaveBeenCalled();
      expect(synkronusApi.syncObservations).toHaveBeenCalledTimes(1);
    });
  });

  describe('withAutoLoginRetry - updateAppBundle', () => {
    test('should retry getManifest after auto-login on 401 error', async () => {
      const mockUserInfo = {username: 'testuser', role: 'read-write' as const};
      const mockManifest = {version: '1.0.0', files: []};

      // First getManifest fails with 401, retry succeeds, then downloadAppBundle calls it again
      (synkronusApi.getManifest as jest.Mock)
        .mockRejectedValueOnce({
          response: {status: 401},
          message: 'Unauthorized',
        })
        .mockResolvedValue(mockManifest); // All subsequent calls succeed

      (synkronusApi.removeAppBundleFiles as jest.Mock).mockResolvedValue(
        undefined,
      );
      (synkronusApi.downloadFormSpecs as jest.Mock).mockResolvedValue([]);
      (synkronusApi.downloadAppFiles as jest.Mock).mockResolvedValue([]);

      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockResolvedValue(mockUserInfo);
      (synkronusApi.clearTokenCache as jest.Mock).mockReturnValue(undefined);

      await syncService.updateAppBundle();

      expect(autoLogin).toHaveBeenCalledTimes(1);
      // updateAppBundle calls getManifest twice: once at start, once in downloadAppBundle
      // First call fails (401), retry succeeds (call 2), downloadAppBundle calls it (call 3)
      expect(synkronusApi.getManifest).toHaveBeenCalledTimes(3);
    });

    test('should retry downloadFormSpecs after auto-login on 401 error', async () => {
      const mockUserInfo = {username: 'testuser', role: 'read-write' as const};
      const mockManifest = {version: '1.0.0', files: []};

      (synkronusApi.getManifest as jest.Mock).mockResolvedValue(mockManifest);
      (synkronusApi.removeAppBundleFiles as jest.Mock).mockResolvedValue(
        undefined,
      );

      // downloadFormSpecs fails with 401, then succeeds
      (synkronusApi.downloadFormSpecs as jest.Mock)
        .mockRejectedValueOnce({
          response: {status: 401},
          message: 'Unauthorized',
        })
        .mockResolvedValueOnce([]);

      (synkronusApi.downloadAppFiles as jest.Mock).mockResolvedValue([]);

      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockResolvedValue(mockUserInfo);
      (synkronusApi.clearTokenCache as jest.Mock).mockReturnValue(undefined);

      await syncService.updateAppBundle();

      expect(autoLogin).toHaveBeenCalledTimes(1);
      expect(synkronusApi.downloadFormSpecs).toHaveBeenCalledTimes(2);
    });
  });

  describe('withAutoLoginRetry - checkForUpdates', () => {
    test('should retry getManifest after auto-login on 401 error', async () => {
      const mockUserInfo = {username: 'testuser', role: 'read-write' as const};
      const mockManifest = {version: '1.0.0', files: []};

      (synkronusApi.getManifest as jest.Mock)
        .mockRejectedValueOnce({
          response: {status: 401},
          message: 'Unauthorized',
        })
        .mockResolvedValueOnce(mockManifest);

      (isUnauthorizedError as jest.Mock).mockReturnValue(true);
      (autoLogin as jest.Mock).mockResolvedValue(mockUserInfo);
      (synkronusApi.clearTokenCache as jest.Mock).mockReturnValue(undefined);

      const result = await syncService.checkForUpdates();

      expect(autoLogin).toHaveBeenCalledTimes(1);
      expect(synkronusApi.getManifest).toHaveBeenCalledTimes(2);
      expect(result).toBe(true); // Update available (version changed from '0')
    });
  });
});
