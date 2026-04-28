// src/modules/activity/activity.model.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    action: {
        type: String, required: true,
        enum: [
            'USER_CREATED','USER_UPDATED','USER_DELETED','USER_BLOCKED','USER_UNBLOCKED',
            'DOCUMENT_CREATED','DOCUMENT_UPDATED','DOCUMENT_DELETED',
            'ADMIN_LOGIN','ADMIN_LOGOUT','ROLE_CHANGED','PASSWORD_RESET_SENT',
        ]
    },
    targetType:  { type: String, enum: ['user','document','auth','system'], required: true },
    targetId:    { type: String, default: null },
    targetName:  { type: String, default: null },
    performedBy: {
        id:    { type: String, required: true },
        name:  { type: String, required: true },
        email: { type: String, required: true },
        role:  { type: String, required: true },
    },
    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
}, { timestamps: true });

activitySchema.index({ createdAt: -1 });
activitySchema.index({ 'performedBy.id': 1 });
activitySchema.index({ action: 1 });
activitySchema.index({ targetType: 1 });

module.exports = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
