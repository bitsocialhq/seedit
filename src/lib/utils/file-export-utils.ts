import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ExportFileOptions {
  content: string;
  fileName: string;
  mimeType?: string;
}

/**
 * Cross-platform file export utility that works on both web and mobile platforms
 */
export const exportFile = async ({ content, fileName, mimeType = 'application/json' }: ExportFileOptions): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Mobile platform: Use Capacitor Filesystem and Share APIs
      await exportFileOnMobile({ content, fileName, mimeType });
    } else {
      // Web platform: Use browser download APIs
      await exportFileOnWeb({ content, fileName, mimeType });
    }
  } catch (error) {
    console.error('File export failed:', error);
    throw error;
  }
};

/**
 * Export file on mobile platforms using Capacitor APIs
 */
const exportFileOnMobile = async ({ content, fileName }: ExportFileOptions): Promise<void> => {
  try {
    let result;
    let writeError;

    // Try multiple directories until one works
    const directoriesToTry = [Directory.External, Directory.Cache];

    for (const directory of directoriesToTry) {
      try {
        result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: directory,
          encoding: Encoding.UTF8,
        });

        console.log(`File written successfully to ${directory}:`, result.uri);
        writeError = null;
        break;
      } catch (error) {
        console.log(`Failed to write to ${directory}:`, error);
        writeError = error;
        continue;
      }
    }

    // If all directories failed, throw the last error
    if (writeError || !result) {
      throw writeError || new Error('All directories failed');
    }

    // Now share the file - only call this ONCE!
    await Share.share({
      title: 'Save Account Backup',
      text: `Save your account backup: ${fileName}`,
      url: result.uri,
      dialogTitle: 'Save your account backup file',
    });
  } catch (error) {
    console.error('Mobile file export failed:', error);

    // If the user canceled the share dialog, don't show an error
    if (error instanceof Error && error.message.includes('canceled')) {
      return;
    }

    throw new Error(`Failed to export file on mobile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Export file on web platforms using browser download APIs
 */
const exportFileOnWeb = async ({ content, fileName, mimeType }: ExportFileOptions): Promise<void> => {
  try {
    // Create a Blob from the content
    const blob = new Blob([content], { type: mimeType });

    // Create a URL for the Blob
    const fileUrl = URL.createObjectURL(blob);

    // Create a temporary download link
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;

    // Append the link, trigger the download, then remove the link
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the Blob URL
    URL.revokeObjectURL(fileUrl);
  } catch (error) {
    console.error('Web file export failed:', error);
    throw new Error(`Failed to export file on web: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if the current platform supports file exports
 */
export const isFileExportSupported = (): boolean => {
  if (Capacitor.isNativePlatform()) {
    // On mobile, check if Filesystem and Share plugins are available
    return true; // We know they're installed
  } else {
    // On web, check if browser APIs are available
    return typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined';
  }
};
