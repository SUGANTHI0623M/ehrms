# Face verification (selfie vs profile photo)

Used by `POST /api/auth/verify-face` to compare the check-in selfie with the user's profile photo.

## Setup

```bash
cd face_verify
pip install -r requirements.txt
```

Requires Python 3.7+ and `face_recognition` (and its dependencies, e.g. dlib).

## Usage

The backend calls:

```bash
python3 face_verify.py <path_to_selfie> <path_to_profile_photo>
```

Output (JSON to stdout): `{"match": true|false, "error": null|str}`

## Optional

- If Python or `face_recognition` is not available, the API returns `match: false` with an explanatory message.
