import React, { createContext, useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { apiClient } from './ApiService';
import { NotificationService } from './NotificationService';

const BACKGROUND_DOWNLOAD_TASK = 'background-download-task';

// Register background task
TaskManager.defineTask(BACKGROUND_DOWNLOAD_TASK, async () => {
  try {
    // Process download queue
    const response = await apiClient.get('/api/downloads/list');
    const activeDownloads = response.data.downloads.filter(
      (d) => d.status === 'downloading'
    );

    // Continue downloads
    for (const download of activeDownloads) {
      // Download logic handled by backend
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  const [downloads, setDownloads] = useState([]);
  const [isBackgroundEnabled, setIsBackgroundEnabled] = useState(false);

  useEffect(() => {
    registerBackgroundFetch();
    loadDownloads();
  }, []);

  const registerBackgroundFetch = async () => {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_DOWNLOAD_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      setIsBackgroundEnabled(true);
    } catch (error) {
      console.error('Background fetch registration error:', error);
    }
  };

  const loadDownloads = async () => {
    try {
      const response = await apiClient.get('/api/downloads/list');
      if (response.data.success) {
        setDownloads(response.data.downloads);
      }
    } catch (error) {
      console.error('Load downloads error:', error);
    }
  };

  const addDownload = async (url, filename, options = {}) => {
    try {
      const response = await apiClient.post('/api/downloads/add', {
        url,
        filename,
        destination: FileSystem.documentDirectory + 'downloads/',
        ...options,
      });

      if (response.data.success) {
        await loadDownloads();
        await NotificationService.sendNotification(
          'Download Added',
          `${filename} added to queue`
        );
        return { success: true, taskId: response.data.task_id };
      }

      return { success: false, error: response.data.detail };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const pauseDownload = async (taskId) => {
    try {
      const response = await apiClient.post(`/api/downloads/${taskId}/pause`);
      if (response.data.success) {
        await loadDownloads();
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resumeDownload = async (taskId) => {
    try {
      const response = await apiClient.post(`/api/downloads/${taskId}/resume`);
      if (response.data.success) {
        await loadDownloads();
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const cancelDownload = async (taskId) => {
    try {
      const response = await apiClient.post(`/api/downloads/${taskId}/cancel`);
      if (response.data.success) {
        await loadDownloads();
      }
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        isBackgroundEnabled,
        loadDownloads,
        addDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = () => useContext(DownloadContext);
