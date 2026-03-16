// const { Suspense } = require('react');
const authservice= require('./auth.service');

/**
 * POST /api/auth/register
 */

exports.register = async (req,res) =>{
    try{
        const result= await authservice.register(req.body);
        res.satus(201).json(result);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

exports.login= async (req, res) => {
    try {
        const {email, password} = req.body;
        const result= await authservice.login(email, password);

        res.json(result);
    } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
}