import { Button } from 'flowbite-react';
import { useStageImageUpload } from '../../hooks/useStageImageUpload';
import type { StageImageUploadProps } from './types';

export default function StageImageUpload({ stageId }: StageImageUploadProps) {
  const { getRootProps, getInputProps, open } = useStageImageUpload(stageId);

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button size="xs" color="light" onClick={open}>📷 Image</Button>
    </div>
  );
}
