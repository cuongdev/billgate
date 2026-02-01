import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { AUTH_CONFIG } from '../config/auth';
import { v4 as uuidv4 } from 'uuid';
import { firebaseAuth } from '../config/firebase';

export class AuthService {
  static async verifyFirebaseToken(idToken: string) {
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(idToken);
      if (!decodedToken.uid || !decodedToken.email) {
        throw new Error('Token missing mandatory claims (uid, email)');
      }

      return decodedToken;
    } catch (error) {
      console.error('[AuthService] Firebase Token Verification Failed:', error);
      throw new Error('Invalid Firebase ID Token');
    }
  }

  static async loginWithFirebase(idToken: string) {
    const payload = await this.verifyFirebaseToken(idToken);

    let user = await User.findOne({ where: { firebaseUid: payload.uid } });

    if (!user) {
      const existingUser = await User.findOne({ where: { email: payload.email } });
      if (existingUser) {
        user = existingUser;
        await user.update({ firebaseUid: payload.uid });
      } else {
        user = await User.create({
          id: uuidv4(),
          firebaseUid: payload.uid,
          email: payload.email!,
          name: payload.name || payload.email?.split('@')[0],
          picture: payload.picture,
          tokenVersion: 1
        });
      }
    } else {
      if (user.email !== payload.email || user.picture !== payload.picture || user.name !== payload.name) {
        await user.update({
          email: payload.email!,
          name: payload.name || user.name,
          picture: payload.picture
        });
      }
    }

    const token = this.generateAccessToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      token
    };
  }

  /**
   * Generates a signed JWT Access Token.
   */
  static generateAccessToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tv: user.tokenVersion // For invalidation
      },
      AUTH_CONFIG.JWT_SECRET,
      {
        expiresIn: AUTH_CONFIG.JWT_EXPIRES_IN,
        issuer: AUTH_CONFIG.JWT_ISSUER,
        audience: AUTH_CONFIG.JWT_AUDIENCE,
      } as jwt.SignOptions
    );
  }

  /**
   * Verifies an Access Token.
   */
  static verifyAccessToken(token: string) {
    try {
      return jwt.verify(token, AUTH_CONFIG.JWT_SECRET, {
        issuer: AUTH_CONFIG.JWT_ISSUER,
        audience: AUTH_CONFIG.JWT_AUDIENCE
      }) as jwt.JwtPayload;
    } catch (error) {
      throw new Error('Invalid Access Token');
    }
  }
}
