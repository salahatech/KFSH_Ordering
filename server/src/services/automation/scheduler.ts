import cron, { ScheduledTask } from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { runApprovalReminders } from './approvalReminders.js';
import { runScheduledReports } from './scheduledReports.js';
import { checkCriticalEvents } from './eventNotifications.js';

const prisma = new PrismaClient();

interface ScheduledTaskInfo {
  name: string;
  schedule: string;
  task: ScheduledTask | null;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
}

const scheduledTasks: Map<string, ScheduledTaskInfo> = new Map();

export async function initializeScheduler() {
  console.log('[Scheduler] Initializing workflow automation...');
  
  const approvalReminderConfig = await getSchedulerConfig('approval_reminders');
  if (approvalReminderConfig.enabled) {
    scheduleTask('approval_reminders', approvalReminderConfig.schedule, async () => {
      console.log('[Scheduler] Running approval reminders...');
      await runApprovalReminders();
    });
  }
  
  const dailyReportConfig = await getSchedulerConfig('daily_report');
  if (dailyReportConfig.enabled) {
    scheduleTask('daily_report', dailyReportConfig.schedule, async () => {
      console.log('[Scheduler] Running daily report...');
      await runScheduledReports('daily');
    });
  }
  
  const weeklyReportConfig = await getSchedulerConfig('weekly_report');
  if (weeklyReportConfig.enabled) {
    scheduleTask('weekly_report', weeklyReportConfig.schedule, async () => {
      console.log('[Scheduler] Running weekly report...');
      await runScheduledReports('weekly');
    });
  }
  
  const criticalEventsConfig = await getSchedulerConfig('critical_events');
  if (criticalEventsConfig.enabled) {
    scheduleTask('critical_events', criticalEventsConfig.schedule, async () => {
      console.log('[Scheduler] Checking critical events...');
      await checkCriticalEvents();
    });
  }
  
  console.log('[Scheduler] Workflow automation initialized with', scheduledTasks.size, 'tasks');
}

export function scheduleTask(name: string, schedule: string, callback: () => Promise<void>) {
  if (scheduledTasks.has(name)) {
    const existing = scheduledTasks.get(name);
    if (existing?.task) {
      existing.task.stop();
    }
  }
  
  if (!cron.validate(schedule)) {
    console.error(`[Scheduler] Invalid cron schedule for ${name}: ${schedule}`);
    return;
  }
  
  const task = cron.schedule(schedule, async () => {
    const taskInfo = scheduledTasks.get(name);
    if (taskInfo) {
      taskInfo.lastRun = new Date();
    }
    
    try {
      await callback();
      await logSchedulerRun(name, 'SUCCESS');
    } catch (error: any) {
      console.error(`[Scheduler] Task ${name} failed:`, error);
      await logSchedulerRun(name, 'FAILED', error.message);
    }
  });
  
  scheduledTasks.set(name, {
    name,
    schedule,
    task,
    enabled: true,
    lastRun: null,
    nextRun: null,
  });
  
  console.log(`[Scheduler] Task '${name}' scheduled: ${schedule}`);
}

export function stopTask(name: string) {
  const taskInfo = scheduledTasks.get(name);
  if (taskInfo?.task) {
    taskInfo.task.stop();
    taskInfo.enabled = false;
    console.log(`[Scheduler] Task '${name}' stopped`);
  }
}

export function startTask(name: string) {
  const taskInfo = scheduledTasks.get(name);
  if (taskInfo?.task) {
    taskInfo.task.start();
    taskInfo.enabled = true;
    console.log(`[Scheduler] Task '${name}' started`);
  }
}

export function getSchedulerStatus(): ScheduledTaskInfo[] {
  return Array.from(scheduledTasks.values()).map(t => ({
    name: t.name,
    schedule: t.schedule,
    task: null,
    enabled: t.enabled,
    lastRun: t.lastRun,
    nextRun: t.nextRun,
  }));
}

async function getSchedulerConfig(taskName: string): Promise<{ enabled: boolean; schedule: string }> {
  const defaults: Record<string, { enabled: boolean; schedule: string }> = {
    'approval_reminders': { enabled: true, schedule: '0 */4 * * *' },
    'daily_report': { enabled: true, schedule: '0 6 * * *' },
    'weekly_report': { enabled: true, schedule: '0 6 * * 1' },
    'critical_events': { enabled: true, schedule: '*/15 * * * *' },
  };
  
  try {
    const enabledConfig = await prisma.systemConfig.findUnique({
      where: { key: `scheduler_${taskName}_enabled` }
    });
    
    const scheduleConfig = await prisma.systemConfig.findUnique({
      where: { key: `scheduler_${taskName}_schedule` }
    });
    
    return {
      enabled: enabledConfig ? enabledConfig.value === 'true' : defaults[taskName]?.enabled ?? false,
      schedule: scheduleConfig?.value || defaults[taskName]?.schedule || '0 * * * *',
    };
  } catch (error) {
    return defaults[taskName] || { enabled: false, schedule: '0 * * * *' };
  }
}

async function logSchedulerRun(taskName: string, status: 'SUCCESS' | 'FAILED', error?: string) {
  try {
    await prisma.systemConfig.upsert({
      where: { key: `scheduler_${taskName}_last_run` },
      update: { value: new Date().toISOString() },
      create: { key: `scheduler_${taskName}_last_run`, value: new Date().toISOString(), dataType: 'string' }
    });
    
    await prisma.systemConfig.upsert({
      where: { key: `scheduler_${taskName}_last_status` },
      update: { value: status },
      create: { key: `scheduler_${taskName}_last_status`, value: status, dataType: 'string' }
    });
    
    if (error) {
      await prisma.systemConfig.upsert({
        where: { key: `scheduler_${taskName}_last_error` },
        update: { value: error.substring(0, 500) },
        create: { key: `scheduler_${taskName}_last_error`, value: error.substring(0, 500), dataType: 'string' }
      });
    }
  } catch (e) {
    console.error('[Scheduler] Failed to log run:', e);
  }
}

export async function updateSchedulerConfig(taskName: string, config: { enabled?: boolean; schedule?: string }) {
  if (config.enabled !== undefined) {
    await prisma.systemConfig.upsert({
      where: { key: `scheduler_${taskName}_enabled` },
      update: { value: String(config.enabled) },
      create: { key: `scheduler_${taskName}_enabled`, value: String(config.enabled), dataType: 'boolean' }
    });
    
    if (config.enabled) {
      startTask(taskName);
    } else {
      stopTask(taskName);
    }
  }
  
  if (config.schedule) {
    await prisma.systemConfig.upsert({
      where: { key: `scheduler_${taskName}_schedule` },
      update: { value: config.schedule },
      create: { key: `scheduler_${taskName}_schedule`, value: config.schedule, dataType: 'string' }
    });
    
    const taskInfo = scheduledTasks.get(taskName);
    if (taskInfo) {
      const callback = async () => {
        console.log(`[Scheduler] Running ${taskName}...`);
      };
      scheduleTask(taskName, config.schedule, callback);
    }
  }
}

export function shutdownScheduler() {
  console.log('[Scheduler] Shutting down...');
  for (const [name, taskInfo] of scheduledTasks) {
    if (taskInfo.task) {
      taskInfo.task.stop();
      console.log(`[Scheduler] Stopped task: ${name}`);
    }
  }
  scheduledTasks.clear();
}
