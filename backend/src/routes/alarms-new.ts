import express, { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import * as queries from '../db/queries';

const router = Router();

// Get alarms
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, severity, is_active } = req.query;
    
    const alarms = await queries.getAlarms({
      device_id: device_id ? parseInt(device_id as string) : undefined,
      severity,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    });

    const activeCount = alarms.filter((a: any) => a.is_active).length;

    res.json({
      alarms,
      total: alarms.length,
      active: activeCount,
    });
  })
);

// Get alarm details
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const alarm = await queries.getAlarmById(parseInt(id));

    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }

    res.json({ alarm });
  })
);

// Resolve alarm
router.patch(
  '/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolution_note } = req.body;

    const alarm = await queries.getAlarmById(parseInt(id));
    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }

    const resolved = await queries.resolveAlarm(parseInt(id), resolution_note);

    res.json({
      message: 'Alarm resolved',
      alarm: {
        ...alarm,
        ...resolved,
        resolved_at: new Date().toISOString(),
        resolution_note,
      },
    });
  })
);

export default router;
