# OpenCage Geocoding API Setup

## Quick Setup

1. **Create a `.env` file** in the `frontend` directory (if it doesn't exist)

2. **Add your OpenCage API key** to the `.env` file:
   ```
   VITE_OPENCAGE_API_KEY=12fd00f289cb4f3aa770cc8f33226229
   ```

3. **Restart your development server** for the changes to take effect:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## How It Works

- The geocoding utility automatically detects and uses your OpenCage API key from the environment variable
- **Employee Attendance**: When employees punch in/out, their location will be converted to a readable address
- **Admin Attendance**: Admins will see the formatted addresses stored with attendance records
- **Fallback**: If OpenCage fails, it automatically falls back to Nominatim (free service)

## API Key Details

- **Your API Key**: `12fd00f289cb4f3aa770cc8f33226229`
- **Service**: OpenCage Geocoding API
- **Free Tier**: 2,500 requests per day
- **Sign up**: https://opencagedata.com/api

## Verification

After setting up, test by:
1. Go to Employee Attendance page
2. Click "Get Location" or punch in
3. You should see a formatted address like "123 Main Street, New York, NY, USA" instead of just coordinates

## Troubleshooting

- **Still seeing coordinates?**: Make sure you've restarted the dev server after adding the `.env` file
- **API key not working?**: Verify the key is correct and hasn't exceeded the daily limit
- **No address?**: The system will fall back to coordinates if geocoding fails

## Security Note

- Never commit your `.env` file to version control
- The `.env` file should already be in `.gitignore`
- Keep your API key secure and don't share it publicly

