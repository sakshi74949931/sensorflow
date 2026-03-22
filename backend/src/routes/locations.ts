import { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import { verifyToken, requireRole } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

// Get all locations
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const locations = await queries.getLocations();
    res.json({ locations, total: locations.length });
  })
);

// Get location by id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const location = await queries.getLocationById(parseInt(req.params.id));
    if (!location) throw new AppError('Location not found', 404);
    res.json({ location });
  })
);

// Create location
router.post(
  '/',
  verifyToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, address, latitude, longitude, type } = req.body;
    if (!name) throw new AppError('Location name is required', 400);
    const location = await queries.createLocation({ name, address, latitude, longitude, type });
    res.status(201).json({ message: 'Location created', location });
  })
);

// Update location
router.patch(
  '/:id',
  verifyToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const existing = await queries.getLocationById(id);
    if (!existing) throw new AppError('Location not found', 404);
    const updated = await queries.updateLocation(id, req.body);
    res.json({ message: 'Location updated', location: updated });
  })
);

// Delete location
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const existing = await queries.getLocationById(id);
    if (!existing) throw new AppError('Location not found', 404);
    await queries.deleteLocation(id);
    res.json({ message: 'Location deleted' });
  })
);

export default router;
