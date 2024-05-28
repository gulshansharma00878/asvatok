const jwt = require('jsonwebtoken');
function auth(req,res,next){
    const token =req.header("auth-token");
    if(!token)return res.status(401).send('access-denied');
    try{
      const verified = jwt.verified(token,process.env.TOKEN_SECRET);
    }catch(err){
       res.status(400).send('invalid-token');
    } 
} 