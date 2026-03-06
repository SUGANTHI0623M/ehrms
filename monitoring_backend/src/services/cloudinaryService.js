const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload screenshot to Cloudinary
 * Folder: tenantId/employeeId/YYYY/MM/DD
 * Public ID: timestamp_hash
 */
exports.uploadScreenshot = async (buffer, { tenantId, employeeId, timestamp }) => {
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const folder = `${tenantId}/${employeeId}/${y}/${m}/${d}`;
    const publicId = `${Date.now()}_${Buffer.from(Math.random().toString()).toString('base64').slice(0, 8)}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Generate signed URL for secure access
 */
exports.getSignedUrl = (publicId, expiresIn = 3600) => {
    return cloudinary.url(publicId, {
        sign_url: true,
        secure: true,
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + expiresIn
    });
};
