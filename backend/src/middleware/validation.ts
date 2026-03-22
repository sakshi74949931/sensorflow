import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return !!(password && password.length >= 6);
};

export const validateLoginRequest = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  if (!validateEmail(email)) {
    throw new AppError('Invalid email format', 400);
  }

  if (!validatePassword(password)) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  next();
};

export const validateRegisterRequest = (req: Request, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw new AppError('Email, password, and name are required', 400);
  }

  if (!validateEmail(email)) {
    throw new AppError('Invalid email format', 400);
  }

  if (!validatePassword(password)) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  if (name.length < 2) {
    throw new AppError('Name must be at least 2 characters', 400);
  }

  next();
};

export const validateDeviceRequest = (req: Request, res: Response, next: NextFunction) => {
  const { name, locationId, status } = req.body;

  if (!name) {
    throw new AppError('Device name is required', 400);
  }

  if (!locationId) {
    throw new AppError('Location ID is required', 400);
  }

  const validStatuses = ['active', 'inactive', 'maintenance', 'offline'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError('Invalid device status', 400);
  }

  next();
};
