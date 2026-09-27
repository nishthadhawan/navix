/**
 * LiveSession Model — MongoDB Schema for live location sharing sessions
 * Sessions auto-expire after 4 hours via TTL index
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const liveSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(4).toString('hex'), // 8-char hex
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    startName: String,
    endName: String,
    routeGeometry: Object, // GeoJSON geometry for the route line
    distance: Number,
    duration: Number,
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLocation: {
        lat: Number,
        lng: Number,
        timestamp: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 14400, // TTL: auto-delete after 4 hours (14400 seconds)
    },
});

module.exports = mongoose.model('LiveSession', liveSessionSchema);
