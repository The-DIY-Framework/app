import * as faceapi from 'face-api.js';

export interface DIDVoice {
  id: string;
  name: string;
  gender: string;
  languages: DIDLanguage[];
  access: string;
  provider: string;
  styles: string[];
}

export interface DIDLanguage {
  locale: string;
  language: string;
}

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = 'dmlpeujlz';
  const uploadPreset = 'diy_imgs';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('cloud_name', cloudName);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  if (result.secure_url) {
    return result.secure_url;
  }
  throw new Error('No URL returned from Cloudinary');
};

export const createImage = async (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};