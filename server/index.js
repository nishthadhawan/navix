/**
 * Safe Route App - Express Server Entry Point
 * Configures CORS, JSON parsing, Socket.IO, and mounts API routes
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const LiveSession = require('./models/LiveSession');
const routeRouter = require('./routes/route');
const nearbyRouter = require('./routes/nearby');
const feedbackRouter = require('./routes/feedback');
const safetyRouter = require('./routes/safety');
const autocompleteRouter = require('./routes/autocomplete');
const chatRouter = require('./routes/chat');
const authRouter = require('./routes/auth');
const savedRoutesRouter = require('./routes/savedRoutes');
const adminRouter = require('./routes/admin');
const liveRouter = require('./routes/live');
const emergencyRouter = require('./routes/emergency');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// --- CORS Origins ---
const CORS_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://navix-frontend.onrender.com'
];

// --- Middleware ---
app.use(cors({
    origin: CORS_ORIGINS,
    credentials: true
}));
app.use(express.json());

// --- Socket.IO ---
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Viewer joins a tracking session room
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        console.log(`👁️ Viewer ${socket.id} joined session: ${sessionId}`);
    });

    // Navigator sends location updates
    socket.on('location-update', async (data) => {
        const { sessionId, lat, lng } = data;
        if (!sessionId || lat == null || lng == null) return;

        // Broadcast to all viewers in this session room
        socket.to(sessionId).emit('location-update', {
            lat,
            lng,
            timestamp: new Date().toISOString(),
        });

        // Persist last known location (fire-and-forget)
        LiveSession.updateOne(
            { sessionId, isActive: true },
            { lastLocation: { lat, lng, timestamp: new Date() } }
        ).catch(() => {});
    });

    // Navigator stops sharing
    socket.on('session-ended', (sessionId) => {
        io.to(sessionId).emit('session-ended');
        console.log(`⏹️ Session ended broadcast: ${sessionId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// --- API Routes ---
app.use('/api', routeRouter);
app.use('/api', nearbyRouter);
app.use('/api', feedbackRouter);
app.use('/api', safetyRouter);
app.use('/api', autocompleteRouter);
app.use('/api', chatRouter);
app.use('/api', authRouter);
app.use('/api', savedRoutesRouter);
app.use('/api', adminRouter);
app.use('/api', liveRouter);
app.use('/api', emergencyRouter);

// --- Health check endpoint ---
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Connect MongoDB & Start server ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        server.listen(PORT, () => {
            console.log(`\n🚀 Safe Route Server running on http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   API:    POST http://localhost:${PORT}/api/route`);
            console.log(`   Socket: ws://localhost:${PORT}\n`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });
