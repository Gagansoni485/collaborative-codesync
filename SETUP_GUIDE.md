# CodeSync Setup Guide

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env` file:

```env
# Required - MongoDB
MONGO_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/coderoom
JWT_SECRET=your_random_secret_key_here

# Required - AI Assistant
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - Code Execution for Python/Java/C++
JDOODLE_CLIENT_ID=your_client_id
JDOODLE_CLIENT_SECRET=your_client_secret

# Server Config
PORT=1600
MAX_ROOM_MEMBERS=4
```

### 3. Get API Keys

#### MongoDB (Required)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace `<password>` with your database password

#### Gemini API (Required for AI)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to your `.env` file

#### JDoodle API (Optional - for Python/Java/C++)
1. Go to [JDoodle Compiler API](https://www.jdoodle.com/compiler-api)
2. Sign up for free tier (200 requests/day)
3. Get your Client ID and Client Secret
4. Add to `.env` file

**Note:** JavaScript execution works without JDoodle API!

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
node index.mjs
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open in Browser

Navigate to: `http://localhost:5173`

## Features Overview

### Code Execution
- ✅ **JavaScript** - Works immediately (local Node.js)
- ⚙️ **Python/Java/C++** - Requires JDoodle API setup

### AI Assistant
- Requires Gemini API key
- Free tier: 60 requests per minute
- Alternative: NVIDIA API (configure in `.env`)

### Collaboration
- Real-time code editing with Yjs
- Live cursors and selections
- Instant sync across all users
- Room-based system (max 4 users per room by default)

## Troubleshooting

### Code Execution Errors

**JavaScript not working:**
- Check if Node.js is installed: `node --version`
- Ensure backend is running on port 1600

**Python/Java/C++ not working:**
- Verify JDoodle credentials in `.env`
- Check free tier limits (200 requests/day)
- Error message will guide you to get API credentials

### AI Assistant Errors

**"AI request failed":**
- Check Gemini API key in `.env`
- Verify API key is active at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check rate limits (60 requests/minute on free tier)

### Connection Issues

**"WebSocket connection failed":**
- Ensure backend is running on port 1600
- Check firewall settings
- Verify CORS configuration in `backend/index.mjs`

**"Cannot connect to MongoDB":**
- Verify MongoDB connection string
- Check network access in MongoDB Atlas
- Ensure IP address is whitelisted

### Room Issues

**"Room is full":**
- Default limit is 4 users per room
- Change `MAX_ROOM_MEMBERS` in `.env` to increase

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGO_URI` | ✅ Yes | - | MongoDB connection string |
| `JWT_SECRET` | ✅ Yes | - | Secret key for JWT tokens |
| `GEMINI_API_KEY` | ✅ Yes | - | Google Gemini API key for AI |
| `PORT` | No | 1600 | Backend server port |
| `MAX_ROOM_MEMBERS` | No | 4 | Maximum users per room |
| `JDOODLE_CLIENT_ID` | No | - | JDoodle API client ID |
| `JDOODLE_CLIENT_SECRET` | No | - | JDoodle API client secret |
| `AI_PROVIDER` | No | gemini | AI provider (gemini/nvidia) |
| `NVIDIA_API_KEY` | No | - | NVIDIA API key (if using NVIDIA) |
| `NVIDIA_MODEL_ID` | No | - | NVIDIA model ID (if using NVIDIA) |

## Production Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in platform dashboard
2. Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
3. Update CORS origins in `backend/index.mjs`

### Frontend Deployment (Vercel/Netlify)

1. Update `SOCKET_URL` in frontend code to your backend URL
2. Build: `npm run build`
3. Deploy `dist` folder

## Support

For issues or questions:
1. Check this guide first
2. Review error messages in browser console
3. Check backend logs
4. Verify all API keys are correct

## Next Steps

- Customize the theme in `frontend/tailwind.config.ts`
- Add more languages in `backend/index.mjs`
- Increase room member limits
- Add custom AI prompts
- Implement file upload/download

Happy Coding! 🚀
