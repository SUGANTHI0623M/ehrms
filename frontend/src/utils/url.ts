export const getFileUrl = (path: string | undefined | null) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) return path;

    // Normalize slashes for Windows paths and remove potential double slashes
    const cleanPath = path.replace(/\\/g, "/").replace(/\/+/g, "/");
    const finalPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;

    // Check if running on localhost
    const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.port === '5173'); // Extra safety for Vite local port

    if (isLocal) {
        // Assume backend is on port 8000 for local dev
        return `http://localhost:8000${finalPath}`;
    }

    // For production, use VITE_API_URL
    let baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

    // Strip /api if it's included in baseUrl, as uploads are usually at root /uploads
    if (baseUrl.endsWith("/api")) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }

    return `${baseUrl}${finalPath}`;
};
