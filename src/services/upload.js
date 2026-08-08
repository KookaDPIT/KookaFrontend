import api from '../api';

/* Upload an image through the backend proxy to ImageKit.
   Returns { url, fileId, thumbnailUrl }. */
export async function uploadImage(file, folder = '/kooka') {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
