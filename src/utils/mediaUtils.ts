export const getMediaType = (fileType?: string, fileUrl?: string): 'audio' | 'video' | 'unknown' => {
  if (!fileType && !fileUrl) return 'unknown';

  const type = (fileType || '').toLowerCase();
  const url = (fileUrl || '').toLowerCase();

  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'mpeg', 'mpg', 'm4v', '3gp'];
  const audioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'aiff'];

  if (videoExtensions.some(ext => type.includes(ext) || url.includes(`.${ext}`))) {
    return 'video';
  }

  if (audioExtensions.some(ext => type.includes(ext) || url.includes(`.${ext}`))) {
    return 'audio';
  }

  if (type.startsWith('video') || url.includes('video')) {
    return 'video';
  }

  if (type.startsWith('audio') || url.includes('audio')) {
    return 'audio';
  }

  return 'unknown';
};

export const resolveMediaType = (
  fileType?: string,
  fileUrl?: string,
  uploadTypeName?: string
): 'audio' | 'video' | 'unknown' => {
  const normalizedUploadType = (uploadTypeName || '')
    .replace(/_/g, ' ')
    .toLowerCase();

  if (
    normalizedUploadType.includes('audio') ||
    normalizedUploadType.includes('mp3') ||
    normalizedUploadType.includes('wav') ||
    normalizedUploadType.includes('m4a')
  ) {
    return 'audio';
  }

  if (
    normalizedUploadType.includes('video') ||
    normalizedUploadType.includes('mp4') ||
    normalizedUploadType.includes('mov') ||
    normalizedUploadType.includes('avi')
  ) {
    return 'video';
  }

  return getMediaType(fileType, fileUrl);
};

export const getMediaTypeLabel = (
  fileType?: string,
  fileUrl?: string,
  uploadTypeName?: string
): string => {
  const mediaType = resolveMediaType(fileType, fileUrl, uploadTypeName);
  return mediaType === 'video' ? 'Video' : mediaType === 'audio' ? 'Audio' : 'Unknown';
};

export const getMediaTypeIcon = (fileType?: string, fileUrl?: string) => {
  const mediaType = getMediaType(fileType, fileUrl);
  return mediaType;
};
