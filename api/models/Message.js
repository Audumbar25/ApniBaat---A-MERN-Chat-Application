const { text } = require('express');
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.SchemaTypes.ObjectId, ref: 'User' },
    text: String,
    file: String,
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const MessageModel = mongoose.model('Message', MessageSchema);

module.exports = MessageModel;