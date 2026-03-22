import express, { Router, Request, Response } from 'express';
import { AppError, asyncHandler } from '../utils/errors';
import { verifyToken, requireRole } from '../middleware/authorization';
import * as queries from '../db/queries';

const router = Router();

// Get reports
router.get(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { report_type } = req.query;

    const reports = await queries.getReports({
      report_type: report_type as string,
    });

    res.json({
      reports,
      total: reports.length,
    });
  })
);

// Get report details
router.get(
  '/:id',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const report = await queries.getReports({ id: parseInt(id) });

    if (!report || report.length === 0) {
      throw new AppError('Report not found', 404);
    }

    res.json({ report: report[0] });
  })
);

// Hourly aggregated report
router.get(
  '/hourly',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, location_id, date } = req.query;
    const data = await queries.getHourlyReport({
      device_id: device_id ? parseInt(device_id as string) : undefined,
      location_id: location_id ? parseInt(location_id as string) : undefined,
      date: date as string,
    });
    res.json({ data, total: data.length });
  })
);

// Daily aggregated report
router.get(
  '/daily',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { device_id, location_id, start_date, end_date } = req.query;
    const data = await queries.getDailyReport({
      device_id: device_id ? parseInt(device_id as string) : undefined,
      location_id: location_id ? parseInt(location_id as string) : undefined,
      start_date: start_date as string,
      end_date: end_date as string,
    });
    res.json({ data, total: data.length });
  })
);

// Generate new report
router.post(
  '/',
  verifyToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { title, report_type, device_ids, date_range_start, date_range_end } = req.body;

    if (!title || !report_type) {
      throw new AppError('Report title and type are required', 400);
    }

    const newReport = await queries.createReport({
      title,
      report_type,
      created_at: new Date().toISOString(),
      device_ids: device_ids ? JSON.stringify(device_ids) : null,
      date_range_start,
      date_range_end,
    });

    res.status(201).json({
      message: 'Report generated successfully',
      report: newReport,
    });
  })
);

export default router;
