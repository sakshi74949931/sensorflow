import express, { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppError, asyncHandler } from '../utils/errors';
import { validateLoginRequest, validateRegisterRequest } from '../middleware/validation';
import { verifyToken } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sound_sense_flow_secure_key_xK9mP2qR';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Login endpoint
router.post(
  '/login',
  validateLoginRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await queries.getUserByEmail(email);

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const payload = { id: user.id, email: user.email, role: user.role || 'user' };
    const options: Record<string, string> = { expiresIn: JWT_EXPIRE as string };
    const token = jwt.sign(payload, JWT_SECRET as string, options);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  })
);

// Register endpoint
router.post(
  '/register',
  validateRegisterRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    const existingUser = await queries.getUserByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Hash password (in production)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await queries.createUser({
      email,
      password: hashedPassword,
      name,
      role: 'user',
    });

    // Generate JWT token
    const payload = { id: newUser.id, email: newUser.email, role: newUser.role || 'user' };
    const options: Record<string, string> = { expiresIn: JWT_EXPIRE as string };
    const token = jwt.sign(payload, JWT_SECRET as string, options);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  })
);

// Get current user (protected)
router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await queries.getUserByEmail(req.user.email);

    res.json({
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        role: user?.role,
      },
    });
  })
);

// Logout (client should discard token; server-side can blacklist in production)
router.post('/logout', verifyToken, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// Refresh token
router.post(
  '/refresh',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    const payload = { id: req.user.id, email: req.user.email, role: req.user.role };
    const options: Record<string, string> = { expiresIn: JWT_EXPIRE as string };
    const token = jwt.sign(payload, JWT_SECRET as string, options);
    res.json({ token });
  })
);

export default router;
