import { Request, Response, NextFunction } from 'express';

export const checkAdmin = (userId: number, res:Response) => {
    const adminId = [1,2,5]

    const found = adminId.find((element) => element === userId);
         if (!found) {
           return res.status(403).json({
             success: false,
             message: 'Unauthorized: Admin access required',
           });
         }
};

export const checkAdminNew = (userId: number, res:Response) => {
  const adminId = [1,2,5]

  const found = adminId.find((element) => element === userId);
       if (found) {
          return true
       }else{
        return false
       }
};

