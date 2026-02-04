import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getSchedulerStatus, updateSchedulerConfig } from '../services/automation/scheduler.js';
import { runScheduledReports } from '../services/automation/scheduledReports.js';
import { runApprovalReminders } from '../services/automation/approvalReminders.js';
import { checkCriticalEvents } from '../services/automation/eventNotifications.js';
import { createAuditLog } from '../middleware/audit.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/status', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const status = getSchedulerStatus();
    
    const configKeys = [
      'scheduler_approval_reminders_last_run',
      'scheduler_approval_reminders_last_status',
      'scheduler_daily_report_last_run',
      'scheduler_daily_report_last_status',
      'scheduler_weekly_report_last_run',
      'scheduler_weekly_report_last_status',
      'scheduler_critical_events_last_run',
      'scheduler_critical_events_last_status',
      'approval_reminder_hours',
      'report_daily_recipients',
      'report_weekly_recipients',
    ];
    
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: configKeys } }
    });
    
    const configMap: Record<string, string> = {};
    configs.forEach(c => { configMap[c.key] = c.value; });
    
    res.json({
      tasks: status,
      config: configMap,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting automation status:', error);
    res.status(500).json({ error: 'Failed to get automation status' });
  }
});

router.put('/config/:taskName', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { taskName } = req.params;
    const { enabled, schedule } = req.body;
    const userId = req.user?.userId;
    
    const validTasks = ['approval_reminders', 'daily_report', 'weekly_report', 'critical_events'];
    if (!validTasks.includes(taskName)) {
      return res.status(400).json({ error: 'Invalid task name' });
    }
    
    await updateSchedulerConfig(taskName, { enabled, schedule });
    
    await createAuditLog(
      userId,
      'UPDATE',
      'AutomationConfig',
      taskName,
      null,
      { enabled, schedule },
      req
    );
    
    res.json({ success: true, taskName, enabled, schedule });
  } catch (error) {
    console.error('Error updating automation config:', error);
    res.status(500).json({ error: 'Failed to update automation config' });
  }
});

router.post('/run/:taskName', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { taskName } = req.params;
    const userId = req.user?.userId;
    
    let result: any;
    
    switch (taskName) {
      case 'approval_reminders':
        await runApprovalReminders();
        result = { message: 'Approval reminders executed' };
        break;
      case 'daily_report':
        await runScheduledReports('daily');
        result = { message: 'Daily report sent' };
        break;
      case 'weekly_report':
        await runScheduledReports('weekly');
        result = { message: 'Weekly report sent' };
        break;
      case 'critical_events':
        const events = await checkCriticalEvents();
        result = { message: 'Critical events checked', eventsFound: events.length };
        break;
      default:
        return res.status(400).json({ error: 'Invalid task name' });
    }
    
    await createAuditLog(
      userId,
      'EXECUTE',
      'AutomationTask',
      taskName,
      null,
      result,
      req
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Error running automation task:', error);
    res.status(500).json({ error: error.message || 'Failed to run automation task' });
  }
});

router.put('/settings/reminder-hours', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { hours } = req.body;
    
    if (!hours || hours < 1 || hours > 48) {
      return res.status(400).json({ error: 'Hours must be between 1 and 48' });
    }
    
    await prisma.systemConfig.upsert({
      where: { key: 'approval_reminder_hours' },
      update: { value: String(hours) },
      create: { key: 'approval_reminder_hours', value: String(hours), dataType: 'number' }
    });
    
    res.json({ success: true, hours });
  } catch (error) {
    console.error('Error updating reminder hours:', error);
    res.status(500).json({ error: 'Failed to update reminder hours' });
  }
});

router.put('/settings/report-recipients', authenticateToken, requireRole('Admin'), async (req: Request, res: Response) => {
  try {
    const { type, recipients } = req.body;
    
    if (!['daily', 'weekly'].includes(type)) {
      return res.status(400).json({ error: 'Type must be daily or weekly' });
    }
    
    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'Recipients must be an array of email addresses' });
    }
    
    const key = type === 'daily' ? 'report_daily_recipients' : 'report_weekly_recipients';
    
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: recipients.join(',') },
      create: { key, value: recipients.join(','), dataType: 'string' }
    });
    
    res.json({ success: true, type, recipients });
  } catch (error) {
    console.error('Error updating report recipients:', error);
    res.status(500).json({ error: 'Failed to update report recipients' });
  }
});

export default router;
