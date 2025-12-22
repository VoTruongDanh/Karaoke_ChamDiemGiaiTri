'use client';

/**
 * Hook for managing browser permissions (microphone, camera, etc.)
 * Auto-requests permissions when needed
 */

import { useState, useCallback, useEffect } from 'react';

export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

export interface PermissionsState {
  microphone: PermissionStatus;
  camera: PermissionStatus;
}

export interface UsePermissionsReturn {
  /** Current permissions state */
  permissions: PermissionsState;
  /** Request microphone permission */
  requestMicrophone: () => Promise<boolean>;
  /** Request camera permission */
  requestCamera: () => Promise<boolean>;
  /** Request all permissions */
  requestAll: () => Promise<{ microphone: boolean; camera: boolean }>;
  /** Check if microphone is ready */
  isMicrophoneReady: boolean;
  /** Check if camera is ready */
  isCameraReady: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook for managing browser permissions
 */
export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<PermissionsState>({
    microphone: 'idle',
    camera: 'idle',
  });
  const [error, setError] = useState<string | null>(null);

  // Check existing permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      if (typeof navigator === 'undefined' || !navigator.permissions) return;

      try {
        // Check microphone permission
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissions(prev => ({
          ...prev,
          microphone: micPermission.state === 'granted' ? 'granted' : 
                      micPermission.state === 'denied' ? 'denied' : 'idle',
        }));

        // Listen for changes
        micPermission.onchange = () => {
          setPermissions(prev => ({
            ...prev,
            microphone: micPermission.state === 'granted' ? 'granted' : 
                        micPermission.state === 'denied' ? 'denied' : 'idle',
          }));
        };
      } catch {
        // Permission API not supported for this permission
      }

      try {
        // Check camera permission
        const camPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissions(prev => ({
          ...prev,
          camera: camPermission.state === 'granted' ? 'granted' : 
                  camPermission.state === 'denied' ? 'denied' : 'idle',
        }));

        camPermission.onchange = () => {
          setPermissions(prev => ({
            ...prev,
            camera: camPermission.state === 'granted' ? 'granted' : 
                    camPermission.state === 'denied' ? 'denied' : 'idle',
          }));
        };
      } catch {
        // Permission API not supported for this permission
      }
    };

    checkPermissions();
  }, []);

  /**
   * Request microphone permission
   */
  const requestMicrophone = useCallback(async (): Promise<boolean> => {
    if (permissions.microphone === 'granted') return true;
    if (permissions.microphone === 'requesting') return false;

    setPermissions(prev => ({ ...prev, microphone: 'requesting' }));
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissions(prev => ({ ...prev, microphone: 'denied' }));
          setError('Quyền truy cập microphone bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.');
        } else if (err.name === 'NotFoundError') {
          setPermissions(prev => ({ ...prev, microphone: 'error' }));
          setError('Không tìm thấy microphone. Vui lòng kết nối microphone.');
        } else {
          setPermissions(prev => ({ ...prev, microphone: 'error' }));
          setError(`Lỗi microphone: ${err.message}`);
        }
      } else {
        setPermissions(prev => ({ ...prev, microphone: 'error' }));
        setError('Lỗi không xác định khi truy cập microphone.');
      }
      return false;
    }
  }, [permissions.microphone]);

  /**
   * Request camera permission
   */
  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (permissions.camera === 'granted') return true;
    if (permissions.camera === 'requesting') return false;

    setPermissions(prev => ({ ...prev, camera: 'requesting' }));
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setPermissions(prev => ({ ...prev, camera: 'granted' }));
      return true;
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissions(prev => ({ ...prev, camera: 'denied' }));
          setError('Quyền truy cập camera bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.');
        } else if (err.name === 'NotFoundError') {
          setPermissions(prev => ({ ...prev, camera: 'error' }));
          setError('Không tìm thấy camera.');
        } else {
          setPermissions(prev => ({ ...prev, camera: 'error' }));
          setError(`Lỗi camera: ${err.message}`);
        }
      } else {
        setPermissions(prev => ({ ...prev, camera: 'error' }));
        setError('Lỗi không xác định khi truy cập camera.');
      }
      return false;
    }
  }, [permissions.camera]);

  /**
   * Request all permissions
   */
  const requestAll = useCallback(async () => {
    const [microphone, camera] = await Promise.all([
      requestMicrophone(),
      requestCamera(),
    ]);
    return { microphone, camera };
  }, [requestMicrophone, requestCamera]);

  return {
    permissions,
    requestMicrophone,
    requestCamera,
    requestAll,
    isMicrophoneReady: permissions.microphone === 'granted',
    isCameraReady: permissions.camera === 'granted',
    error,
  };
}

export default usePermissions;
