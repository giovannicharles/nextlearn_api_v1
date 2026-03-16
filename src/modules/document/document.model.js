const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    year: String,
    semester: String,
    author: String,
    description: {
        type: String,
        maxlength: 1000
    },
    tags: [String],
    fileUrl: String,
    storagePath: String,
    visibility: {
        type: String,
        default: 'public'
    },
    createdBy: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index pour améliorer les performances des recherches
documentSchema.index({ subject: 1, semester: 1, type: 1 });
documentSchema.index({ tags: 1 });

module.exports = mongoose.model('Document', documentSchema);