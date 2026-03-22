import express, { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import { validateDeviceRequest } from '../middleware/validation';
import { verifyToken, requireRole } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

// Get all devices
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const devices = await queries.getDevices();
    res.json({
      devices,
      total: devices.length,
    });
  })
);

// Get device details
router.get(
  '/:id',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const device = await queries.getDeviceById(parseInt(id));

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    res.json({ device });
  })
);

// Get device latest reading
router.get(
  '/:id/latest',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const reading = await queries.getLatestReading(parseInt(id));
    res.json({ reading });
  })
);

// Get device readings history
router.get(
  '/:id/readings',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { start_date, end_date, limit } = req.query;
    const readings = await queries.getMonitoringData({
      device_id: parseInt(id),
      start_date,
      end_date,
    });
    const limited = limit ? readings.slice(-parseInt(limit as string)) : readings;
    res.json({ readings: limited, total: limited.length });
  })
);

// Create device
router.post(
  '/',
  verifyToken,
  requireRole('admin'),
  validateDeviceRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, location, status } = req.body;

    const newDevice = await queries.createDevice({
      name,
      location,
      status: status || 'active',
    });

    res.status(201).json({
      message: 'Device created successfully',
      device: newDevice,
    });
  })
);

// Update device
router.put(
  '/:id',
  verifyToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const device = await queries.getDeviceById(parseInt(id));

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    const updated = await queries.updateDevice(parseInt(id), req.body);

    res.json({
      message: 'Device updated successfully',
      device: updated,
    });
  })
);

// Delete device
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const device = await queries.getDeviceById(parseInt(id));

    if (!device) {
      throw new AppError('Device not found', 404);
    }

    await queries.deleteDevice(parseInt(id));

    res.json({
      message: 'Device deleted successfully',
      device,
    });
  })
);

export default router;
