const mongoose= require('mongoose');
const bcrypt= require('bcryptjs');

const {role, userRole, userClasse} = require('./user.enum');

const userSchema = new mongoose.Schema(
    {
        nom:{
            type: String,
            required: [true, 'Le nom est requis'],
            trim: true,
            maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères.']
        },
        prenom: {
            type: String,
            required: [true, 'Le nom est requis.'],
            trim: true,
            maxlength: [50, 'Le prenom ne peut pas dépasser 50 caractères.']
        },
        email: {
            type: String,
            required: [true, 'L\' email est requis.'],
            unique: true,
            lowercase: true,
            trim:true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Veuillez fournir un email valide'
            ]
        },
        role: {
            type: String,
            enum: Object.values(userRole),
            default: userRole.student
        },
        classe: {
            type: String,
            enum: Object.values(userClasse)
        },
        filiere: String
        ,
        lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
   emailNotifications: {
    type: Boolean,
    default: true
  },
  pushNotifications: {
    type: Boolean,
    default: true
  },twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorCode: {
    type: String,
    select: false
  },
  twoFactorCodeExpires: {
    type: Date,
    select: false
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },},
  {
    timestamps: true
  }
);

module.exports= mongoose.model('User', userSchema);