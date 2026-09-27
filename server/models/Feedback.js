/**
 * Feedback Model — Stores route feedback in MongoDB
 */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    safety: { type: Number, required: true, min: 1, max: 5 },
    condition: { type: Number, required: true, min: 1, max: 5 },
    accessibility: { type: Number, required: true, min: 1, max: 5 },
    websiteRating: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String, default: '' },
    startName: { type: String, default: '' },
    startLat: { type: Number },
    startLng: { type: Number },
    endName: { type: String, default: '' },
    endLat: { type: Number },
    endLng: { type: Number },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, default: 'anonymous' },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
