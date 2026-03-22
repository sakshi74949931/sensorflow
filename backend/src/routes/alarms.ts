import express, { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import { verifyToken, requireRole } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

// Get alarms
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, severity, status } = req.query;

    const alarms = await queries.getAlarms({
      device_id: device_id ? parseInt(device_id as string) : undefined,
      severity: severity as string,
      status: status as string,
    });

    res.json({
      alarms,
      total: alarms.length,
      active: alarms.filter((a: any) => a.status === 'active').length,
    });
  })
);

// Get alarm details
router.get(
  '/:id',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const alarm = await queries.getAlarmById(parseInt(id));

    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }

    res.json({ alarm });
  })
);

// Acknowledge alarm
router.patch(
  '/:id/acknowledge',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const alarm = await queries.getAlarmById(parseInt(id));
    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }
    const acknowledged = await queries.acknowledgeAlarm(parseInt(id), req.user?.email || 'unknown');
    res.json({ message: 'Alarm acknowledged', alarm: acknowledged });
  })
);

// Resolve alarm
router.patch(
  '/:id/resolve',
  verifyToken,
  requireRole('admin', 'authority'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { resolution_note } = req.body;

    const alarm = await queries.getAlarmById(parseInt(id));
    if (!alarm) {
      throw new AppError('Alarm not found', 404);
    }

    const resolved = await queries.resolveAlarm(parseInt(id), resolution_note || 'Resolved');

    res.json({
      message: 'Alarm resolved',
      alarm: {
        ...resolved,
        resolved_at: new Date().toISOString(),
      },
    });
  })
);

export default router;
