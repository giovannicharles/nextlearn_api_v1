// src/modules/document/document.model.js
const mongoose = require('mongoose');

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2', 'I1', 'I2', 'I3', 'I4', 'I5'];

const LEVEL_LABELS = {
    L1: 'Licence 1',
    L2: 'Licence 2',
    L3: 'Licence 3',
    M1: 'Master 1',
    M2: 'Master 2',
    I1: 'Inge 1',
    I2: 'Inge 2',
    I3: 'Inge 3',
    I4: 'Inge 4',
    I5: 'Inge 5',
};

const documentSchema = new mongoose.Schema({
    title: {
        type:     String,
        required: true,
        trim:     true,
    },
    type: {
        type:      String,
        required:  true,
        enum:      ['cours', 'td', 'tp', 'synthese', 'epreuve', 'projet'],
        lowercase: true,
    },
    subject: {
        type:     String,
        required: true,
        trim:     true,
    },
    level: {
        type:      String,
        required:  true,
        enum:      LEVELS,
        uppercase: true,
    },
    year: {
        type:     String,
        required: true,
    },
    semester: {
        type:    String,
        enum:    ['S1', 'S2', null],
        default: null,
    },
    author:      { type: String, trim: true },
    description: { type: String, maxlength: 1000 },
    tags:        [String],
    fileUrl:     String,
    storagePath: String,
    visibility: {
        type:    String,
        enum:    ['public', 'private'],
        default: 'public',
    },
    createdBy: String,
}, {
    timestamps: true,
});

documentSchema.index({ level: 1, subject: 1, type: 1 });
documentSchema.index({ subject: 1, semester: 1, type: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ year: -1 });

// Éviter l'erreur "Cannot overwrite model once compiled"
const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);

module.exports = Document;
module.exports.LEVELS       = LEVELS;
module.exports.LEVEL_LABELS = LEVEL_LABELS;