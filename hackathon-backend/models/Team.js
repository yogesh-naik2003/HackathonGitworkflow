const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({

    teamName: {
        type: String,
        required: true,
        unique: true
    },

    members: {
        type: [String],
        required: true,
        // Removed unique: true from array. Application-level logic handles unique members across teams.
    },

    domain: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: false
    },

    repoUrl: {
        type: String,
        required: false, // repoUrl is populated by the worker after creation
        unique: true
    },

    score:{
        type:Number,
        default:0
    },

    status: {
        type: String,
        enum: ['Active', 'Eliminated', 'Winner'],
        default: 'Active'
    },

    currentRound: {
        type: Number,
        default: 1
    },

    eliminatedInRound: {
        type: Number,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Team", teamSchema);