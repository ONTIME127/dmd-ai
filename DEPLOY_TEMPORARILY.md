# DMD-AI temporary deployment

## Backend — Render
Create a Web Service from this repository.
- Runtime: Python 3
- Build: `pip install -r backend/requirements.txt`
- Start: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Environment variable: `DMD_AI_ALLOWED_ORIGINS=https://YOUR-VERCEL-SITE.vercel.app`

After deployment, verify:
- `https://YOUR-RENDER-SERVICE.onrender.com/api/health`
- `https://YOUR-RENDER-SERVICE.onrender.com/api/ml/dmd-molecular/info`

## Frontend — Vercel
Import the same repository.
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com`

Redeploy after setting VITE_API_URL.
Then return to Render and set DMD_AI_ALLOWED_ORIGINS to the exact Vercel production URL and redeploy/restart if needed.
