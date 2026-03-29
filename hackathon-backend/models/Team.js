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
        unique: true
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
        required: true,
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