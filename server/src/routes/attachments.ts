import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const DANGEROUS_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'jar', 'msi', 'dll', 'scr', 'com'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

async function logAuditEvent(userId: string, entityType: string, entityId: string, action: string, details: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        entityType: 'Attachment',
        entityId,
        action,
        changes: details
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

router.get('/types', async (req: Request, res: Response) => {
  try {
    const types = await prisma.attachmentType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(types);
  } catch (error) {
    console.error('Error fetching attachment types:', error);
    res.status(500).json({ error: 'Failed to fetch attachment types' });
  }
});

router.post('/types', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, extensions, mimeTypes, maxSizeMB, isActive } = req.body;
    
    const type = await prisma.attachmentType.create({
      data: {
        name,
        extensions: extensions || [],
        mimeTypes: mimeTypes || [],
        maxSizeMB: maxSizeMB || 5.0,
        isActive: isActive !== false
      }
    });
    
    if (userId) {
      await logAuditEvent(userId, 'AttachmentType', type.id, 'CREATE', { name, extensions, mimeTypes, maxSizeMB });
    }
    
    res.status(201).json(type);
  } catch (error) {
    console.error('Error creating attachment type:', error);
    res.status(500).json({ error: 'Failed to create attachment type' });
  }
});

router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { name, extensions, mimeTypes, maxSizeMB, isActive } = req.body;
    
    const oldType = await prisma.attachmentType.findUnique({ where: { id } });
    
    const type = await prisma.attachmentType.update({
      where: { id },
      data: {
        name,
        extensions,
        mimeTypes,
        maxSizeMB,
        isActive
      }
    });
    
    if (userId) {
      await logAuditEvent(userId, 'AttachmentType', id, 'UPDATE', { 
        before: oldType, 
        after: { name, extensions, mimeTypes, maxSizeMB, isActive } 
      });
    }
    
    res.json(type);
  } catch (error) {
    console.error('Error updating attachment type:', error);
    res.status(500).json({ error: 'Failed to update attachment type' });
  }
});

router.delete('/types/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    const attachmentCount = await prisma.attachment.count({
      where: { attachmentTypeId: id }
    });
    
    if (attachmentCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete attachment type that has attachments' 
      });
    }
    
    const type = await prisma.attachmentType.findUnique({ where: { id } });
    await prisma.attachmentType.delete({ where: { id } });
    
    if (userId) {
      await logAuditEvent(userId, 'AttachmentType', id, 'DELETE', { deletedType: type });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment type:', error);
    res.status(500).json({ error: 'Failed to delete attachment type' });
  }
});

router.get('/allowed-extensions', async (req: Request, res: Response) => {
  try {
    const types = await prisma.attachmentType.findMany({
      where: { isActive: true },
      select: { extensions: true, mimeTypes: true, maxSizeMB: true }
    });
    
    const allExtensions = new Set<string>();
    const allMimeTypes = new Set<string>();
    let maxSize = 5.0;
    
    types.forEach((t: { extensions: string[]; mimeTypes: string[]; maxSizeMB: number }) => {
      t.extensions.forEach((ext: string) => allExtensions.add(ext.toLowerCase()));
      t.mimeTypes.forEach((mt: string) => allMimeTypes.add(mt));
      if (t.maxSizeMB > maxSize) maxSize = t.maxSizeMB;
    });
    
    res.json({
      extensions: Array.from(allExtensions),
      mimeTypes: Array.from(allMimeTypes),
      maxSizeMB: maxSize
    });
  } catch (error) {
    console.error('Error fetching allowed extensions:', error);
    res.status(500).json({ error: 'Failed to fetch allowed extensions' });
  }
});

router.get('/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const attachments = await prisma.attachment.findMany({
      where: { entityType, entityId },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        attachmentType: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

router.post('/:entityType/:entityId', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { description, attachmentTypeId } = req.body;
    const file = req.file;
    const userId = req.user?.userId;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!userId) {
      fs.unlinkSync(file.path);
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
    const fileMime = file.mimetype;
    
    if (DANGEROUS_EXTENSIONS.includes(fileExt)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        error: `File type .${fileExt} is not allowed for security reasons.` 
      });
    }
    
    const activeTypes = await prisma.attachmentType.findMany({
      where: { isActive: true }
    });
    
    if (activeTypes.length > 0) {
      const isAllowed = activeTypes.some((type: { extensions: string[]; mimeTypes: string[] }) => {
        const extMatch = type.extensions.length === 0 || 
          type.extensions.some((ext: string) => ext.toLowerCase() === fileExt);
        const mimeMatch = type.mimeTypes.length === 0 || 
          type.mimeTypes.some((mt: string) => mt === fileMime);
        return extMatch || mimeMatch;
      });
      
      if (!isAllowed) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ 
          error: `File type .${fileExt} is not allowed. Check settings for allowed types.` 
        });
      }
    }
    
    const attachment = await prisma.attachment.create({
      data: {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        description: description || null,
        entityType,
        entityId,
        attachmentTypeId: attachmentTypeId || null,
        uploadedById: userId
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        attachmentType: {
          select: { id: true, name: true }
        }
      }
    });
    
    await logAuditEvent(userId, entityType, entityId, 'ATTACHMENT_UPLOAD', {
      attachmentId: attachment.id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    });
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }
    
    await prisma.attachment.delete({ where: { id } });
    
    await logAuditEvent(userId, attachment.entityType, attachment.entityId, 'ATTACHMENT_DELETE', {
      attachmentId: id,
      fileName: attachment.originalName,
      fileSize: attachment.fileSize
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

router.get('/download/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    await logAuditEvent(userId, attachment.entityType, attachment.entityId, 'ATTACHMENT_DOWNLOAD', {
      attachmentId: id,
      fileName: attachment.originalName
    });
    
    res.download(attachment.filePath, attachment.originalName);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

export default router;
