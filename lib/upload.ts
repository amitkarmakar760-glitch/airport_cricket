import * as ImagePicker from 'expo-image-picker';
import {Platform} from 'react-native';
import {File} from 'expo-file-system';
import {firebaseEnabled} from './firebase';

// Free image/video hosting via Cloudinary (no Firebase Storage, no credit card).
// Set these two values as GitHub secrets (see README): they are baked in at build time.
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const cloudinaryReady = !!CLOUD_NAME && !!UPLOAD_PRESET && !/PASTE|^your[_-]/i.test(CLOUD_NAME + UPLOAD_PRESET);

async function uploadToCloudinary(uri: string, kind: 'image' | 'video', folder: string, mime: string, fileName: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob);
  } else {
    // Expo's fetch only accepts strings, Blobs or expo-file-system File objects
    // (the old {uri,type,name} trick throws "Unsupported FormDataPart implementation").
    form.append('file', new File(uri) as any);
  }
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'airport_cricket/' + folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${kind}/upload`, {method: 'POST', body: form});
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) throw Error(json?.error?.message || 'Upload failed. Check your internet and try again.');
  return json.secure_url as string;
}

export async function pickAndUpload(folder: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.75, allowsMultipleSelection: false});
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  if (!firebaseEnabled) return uri; // local-only mode: keep the phone's own file
  if (!cloudinaryReady) throw Error('Photo upload is not set up in this build (Cloudinary keys missing).');
  return uploadToCloudinary(uri, 'image', folder, 'image/jpeg', `${Date.now()}.jpg`);
}

// Any video can be picked, of any length: the Home screen player shows only
// the first BEST_SHOT_CLIP_SECONDS seconds, on a loop, without re-encoding the file.
export async function pickAndUploadVideo(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['videos'], allowsMultipleSelection: false});
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) throw Error('That video file is larger than 25 MB. Choose a shorter or lower-resolution video.');
  if (!firebaseEnabled) return asset.uri;
  if (!cloudinaryReady) throw Error('Video upload is not set up in this build (Cloudinary keys missing).');
  const ext = asset.mimeType === 'video/quicktime' ? 'mov' : 'mp4';
  return uploadToCloudinary(asset.uri, 'video', `best_shot/${userId}`, asset.mimeType || 'video/mp4', `${Date.now()}.${ext}`);
}
