const jwt= require('jsonwebtoken');
const bcrypt= require('bcryptjs');
const crypto= require('crypto');
const User= require('../user/user.model');
const {userRole} = require('../user/user.enum');

class AuthService{
    async register(data){

        const {nom,prenom,email,password, classe, filiere} = data;

        if(!nom || !prenom || !email || !password){
            throw new Error('Nom, Prenom, email et mot de passe sont requis');

        }

        const existingUser= await User.findOne({email});
         console.log('👤 Utilisateur existant:', existingUser ? 'Oui' : 'Non');

        if (existingUser) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }
        const hashedPassword= await bcrypt.hash(password, 10);
        const user= await User.create({
            nom,
            prenom,
            email,
            password: hashedPassword,
            role: userRole.student,
            classe: classe,
            filiere: filiere,
            isEmailVerified: false,
            twoFactorEnabled: false
        });

        return {
            success: true,
            user:{
                id:user._id,
                name: user.nom +" "+ user.prenom,
                email: user.email,
                role:user.role,
                classe: user.classe,
                filiere: user.filiere
            },
            message: "Le compte de l'utilisateur a été créé."
        }
        
    }
    async login(email, password){
        if(!email || !password){
            throw new Error('Email et mot de passe sont requis');
        }
        const user = await User.findOne({ email });
        if (!user) {
      throw new Error('Email ou mot de passe incorrect');

      
        }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Email ou mot de passe incorrect');
    }
    const token= this.generateToken(user._id);

      return {
            success: true,
            user:{
                id:user._id,
                name: user.nom +" "+ user.prenom,
                email: user.email,
                role:user.role,
                classe: user.classe,
                filiere: user.filiere
            },
            message: "Le compte de l'utilisateur a été créé.",
            token
        }
    }
    // GENERATE TOKEN
  generateToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
}