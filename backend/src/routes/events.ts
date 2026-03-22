import { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import { verifyToken } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

// Get events
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, event_type, severity, limit } = req.query;
    const events = await queries.getDeviceEvents({
      device_id: device_id ? parseInt(device_id as string) : undefined,
      event_type: event_type as string,
      severity: severity as string,
      limit: limit ? parseInt(limit as string) : 100,
    });
    res.json({ events, total: events.length });
  })
);

// Create event
router.post(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, event_type, severity, description, metadata } = req.body;
    if (!device_id || !event_type) {
      throw new AppError('device_id and event_type are required', 400);
    }
    const event = await queries.createDeviceEvent({
      device_id,
      event_type,
      severity: severity || 'info',
      description,
      metadata,
    });
    res.status(201).json({ message: 'Event created', event });
  })
);

export default router;
