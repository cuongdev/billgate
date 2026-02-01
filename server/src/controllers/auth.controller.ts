import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const GoogleLoginSchema = z.object({
  idToken: z.string().min(1, 'ID Token is required')
});

export const loginWithFirebase = async (req: Request, res: Response) => {
  try {
    const { idToken } = GoogleLoginSchema.parse(req.body);

    const result = await AuthService.loginWithFirebase(idToken);

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Firebase Login Error:', error.message);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}