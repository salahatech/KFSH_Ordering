import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const uploadsDir = path.join(process.cwd(), 'uploads');
const logosDir = path.join(uploadsDir, 'logos');
const locationPhotosDir = path.join(uploadsDir, 'location-photos');

[uploadsDir, logosDir, locationPhotosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const customerId = (req as any).user?.customerId || 'unknown';
    cb(null, `${customerId}-logo-${Date.now()}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user.customerId) {
      res.status(403).json({ error: 'This endpoint is only available for customer users' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: user.customerId },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        city: true,
        region: true,
        country: true,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer profile not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user.customerId) {
      res.status(403).json({ error: 'This endpoint is only available for customer users' });
      return;
    }

    const {
      nameEn,
      nameAr,
      email,
      mobile,
      phone,
      fullAddress,
      address,
      postalCode,
      latitude,
      longitude,
      deliveryWindowStart,
      deliveryWindowEnd,
      preferredDeliveryTime,
      cityId,
      regionId,
      countryId,
      contacts,
    } = req.body;

    const oldCustomer = await prisma.customer.findUnique({
      where: { id: user.customerId },
      include: { contacts: true },
    });

    const customer = await prisma.customer.update({
      where: { id: user.customerId },
      data: {
        nameEn,
        nameAr,
        name: nameEn,
        email,
        mobile,
        phone,
        fullAddress,
        address: fullAddress || address,
        postalCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        deliveryWindowStart,
        deliveryWindowEnd,
        preferredDeliveryTime,
        cityId: cityId || null,
        regionId: regionId || null,
        countryId: countryId || null,
      },
      include: {
        contacts: true,
        city: true,
        region: true,
        country: true,
      },
    });

    if (contacts && Array.isArray(contacts)) {
      await prisma.customerContact.deleteMany({
        where: { customerId: user.customerId },
      });

      if (contacts.length > 0) {
        await prisma.customerContact.createMany({
          data: contacts.map((c: any, index: number) => ({
            customerId: user.customerId,
            name: c.name,
            title: c.title || null,
            email: c.email || null,
            phone: c.phone || null,
            isPrimary: index === 0,
          })),
        });
      }
    }

    const updatedCustomer = await prisma.customer.findUnique({
      where: { id: user.customerId },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        city: true,
        region: true,
        country: true,
      },
    });

    await createAuditLog(
      user.userId,
      'UPDATE',
      'Customer',
      user.customerId,
      oldCustomer,
      updatedCustomer,
      req
    );

    res.json(updatedCustomer);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/logo', authenticateToken, (req: Request, res: Response): void => {
  const user = (req as any).user;
  
  if (!user.customerId) {
    res.status(403).json({ error: 'This endpoint is only available for customer users' });
    return;
  }

  logoUpload.single('logo')(req, res, async (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Invalid file type. Only PNG and JPG are allowed.' });
      } else if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds 5MB limit.' });
      } else {
        res.status(500).json({ error: 'Failed to upload logo' });
      }
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    try {
      const oldCustomer = await prisma.customer.findUnique({
        where: { id: user.customerId },
      });

      if (oldCustomer?.logoUrl) {
        const oldPath = path.join(process.cwd(), oldCustomer.logoUrl.replace(/^\//, ''));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;

      const customer = await prisma.customer.update({
        where: { id: user.customerId },
        data: { logoUrl },
      });

      await createAuditLog(
        user.userId,
        'UPDATE',
        'Customer',
        user.customerId,
        { logoUrl: oldCustomer?.logoUrl },
        { logoUrl },
        req
      );

      res.json({ logoUrl: customer.logoUrl });
    } catch (error) {
      console.error('Logo save error:', error);
      res.status(500).json({ error: 'Failed to save logo' });
    }
  });
});

router.delete('/logo', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user.customerId) {
      res.status(403).json({ error: 'This endpoint is only available for customer users' });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: { id: user.customerId },
    });

    if (customer?.logoUrl) {
      const logoPath = path.join(process.cwd(), customer.logoUrl);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }

      await prisma.customer.update({
        where: { id: user.customerId },
        data: { logoUrl: null },
      });

      await createAuditLog(
        user.userId,
        'UPDATE',
        'Customer',
        user.customerId,
        { logoUrl: customer.logoUrl },
        { logoUrl: null },
        req
      );
    }

    res.json({ message: 'Logo removed' });
  } catch (error) {
    console.error('Logo delete error:', error);
    res.status(500).json({ error: 'Failed to remove logo' });
  }
});

const locationPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, locationPhotosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const customerId = (req as any).user?.customerId || 'unknown';
    cb(null, `${customerId}-location-${Date.now()}${ext}`);
  }
});

const locationPhotoUpload = multer({
  storage: locationPhotoStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

router.get('/location-photos', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user.customerId) {
      res.status(403).json({ error: 'This endpoint is only available for customer users' });
      return;
    }

    const photos = await prisma.customerLocationPhoto.findMany({
      where: { customerId: user.customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(photos);
  } catch (error) {
    console.error('Location photos fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch location photos' });
  }
});

router.post('/location-photos', authenticateToken, (req: Request, res: Response): void => {
  const user = (req as any).user;
  
  if (!user.customerId) {
    res.status(403).json({ error: 'This endpoint is only available for customer users' });
    return;
  }

  locationPhotoUpload.single('photo')(req, res, async (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Invalid file type. Only PNG and JPG are allowed.' });
      } else if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds 5MB limit.' });
      } else {
        res.status(500).json({ error: 'Failed to upload photo' });
      }
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    try {
      const { caption } = req.body;
      const photoUrl = `/uploads/location-photos/${req.file.filename}`;

      const photo = await prisma.customerLocationPhoto.create({
        data: {
          customerId: user.customerId,
          photoUrl,
          caption: caption || null,
          fileSizeBytes: req.file.size,
          mimeType: req.file.mimetype,
          uploadedByUserId: user.userId,
        },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      await createAuditLog(
        user.userId,
        'CREATE',
        'CustomerLocationPhoto',
        photo.id,
        null,
        { photoUrl, caption },
        req
      );

      res.json(photo);
    } catch (error) {
      console.error('Location photo save error:', error);
      res.status(500).json({ error: 'Failed to save location photo' });
    }
  });
});

router.delete('/location-photos/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    if (!user.customerId) {
      res.status(403).json({ error: 'This endpoint is only available for customer users' });
      return;
    }

    const photo = await prisma.customerLocationPhoto.findFirst({
      where: { id, customerId: user.customerId },
    });

    if (!photo) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    const photoPath = path.join(process.cwd(), photo.photoUrl.replace(/^\//, ''));
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    await prisma.customerLocationPhoto.delete({
      where: { id },
    });

    await createAuditLog(
      user.userId,
      'DELETE',
      'CustomerLocationPhoto',
      id,
      { photoUrl: photo.photoUrl, caption: photo.caption },
      null,
      req
    );

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Location photo delete error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;
