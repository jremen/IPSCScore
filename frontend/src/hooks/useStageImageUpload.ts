import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStageStore } from '../stores/stageStore';

export function useStageImageUpload(stageId: string) {
  const uploadImage = useStageStore((s) => s.uploadImage);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      await uploadImage(stageId, acceptedFiles[0]);
    },
    [stageId, uploadImage],
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [] },
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    noKeyboard: true,
  });

  return { getRootProps, getInputProps, open };
}
