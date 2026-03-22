import express, { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import { verifyToken, requireRole } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

// Get monitoring data
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, start_date, end_date } = req.query;
    
    const data = await queries.getMonitoringData({
      device_id: device_id ? parseInt(device_id as string) : undefined,
      start_date,
      end_date,
    });

    const total = data.length;
    const average = total > 0 
      ? (data.reduce((sum: number, r: any) => sum + r.sound_level, 0) / total).toFixed(2)
      : 0;

    res.json({
      data,
      total,
      average,
    });
  })
);

// Record monitoring entry
router.post(
  '/',
  verifyToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, sound_level, frequency_range } = req.body;

    if (!device_id || sound_level === undefined) {
      throw new AppError('Device ID and sound level are required', 400);
    }

    const newReading = await queries.recordMonitoringData({
      device_id,
      sound_level,
      frequency_range: frequency_range || '20-20kHz',
    });

    res.status(201).json({
      message: 'Monitoring data recorded',
      data: newReading,
    });
  })
);

export default router;
