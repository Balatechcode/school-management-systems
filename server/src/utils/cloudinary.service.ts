/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { v2 as cloudinary } from 'cloudinary';
import { ENV } from '../config/env.js';

if (ENV.isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('✅ Cloudinary initialized with cloud_name:', ENV.CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('ℹ️ Cloudinary credentials not configured in .env. Storage fallback simulator active.');
}

export interface UploadResult {
  url: string;
  public_id: string;
}

export class CloudinaryService {
  /**
   * Upload an image (e.g. student photo) to Cloudinary
   */
  async uploadImage(
    fileBuffer: Buffer,
    folder = 'school-management/students'
  ): Promise<UploadResult> {
    if (ENV.isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Upload failed with no result'));
            }
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        uploadStream.end(fileBuffer);
      });
    }

    // Fallback Simulator: Data URL or simulated cloud storage asset
    const base64 = fileBuffer.toString('base64');
    const fakeId = `demo_photo_${Date.now()}`;
    return {
      url: `data:image/jpeg;base64,${base64}`,
      public_id: fakeId,
    };
  }

  /**
   * Upload a verification document (PDF, PNG, etc.) to Cloudinary
   */
  async uploadDocument(
    fileBuffer: Buffer,
    originalFilename: string,
    folder = 'school-management/student-documents'
  ): Promise<UploadResult> {
    if (ENV.isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            public_id: `${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Document upload failed'));
            }
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        uploadStream.end(fileBuffer);
      });
    }

    // Fallback Simulator
    const fakeId = `doc_${Date.now()}_${originalFilename}`;
    const base64 = fileBuffer.toString('base64');
    return {
      url: `data:application/octet-stream;base64,${base64}`,
      public_id: fakeId,
    };
  }

  /**
   * Delete an asset from Cloudinary
   */
  async deleteAsset(publicId: string, resourceType: 'image' | 'raw' | 'auto' = 'image'): Promise<void> {
    if (ENV.isCloudinaryConfigured()) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      } catch (err) {
        console.warn(`Failed to destroy Cloudinary asset ${publicId}:`, err);
      }
    }
  }
}

export const cloudinaryService = new CloudinaryService();
