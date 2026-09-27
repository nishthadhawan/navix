/**
 * User Model — MongoDB Schema for NaviX users
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    savedRoutes: [{
        startName: String,
        endName: String,
        startCoords: String,   // "lat,lon"
        endCoords: String,     // "lat,lon"
        profile: String,       // e.g. "driving-car"
        distance: Number,      // meters
        duration: Number,      // seconds
        savedAt: { type: Date, default: Date.now },
    }],
    emergencyContact: {
        name: { type: String, default: '' },
        phone: { type: String, default: '' },
        shakeEnabled: { type: Boolean, default: false },
    },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
