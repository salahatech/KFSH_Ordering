import { Router, Request, Response } from 'express';
import { PrismaClient, DocumentType } from '@prisma/client';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { triggerWorkflow } from '../services/workflow.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_DOC_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const uploadsDir = path.join(process.cwd(), 'uploads');
const logosDir = path.join(uploadsDir, 'logos');
const docsDir = path.join(uploadsDir, 'documents');

[uploadsDir, logosDir, docsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.id}-logo-${Date.now()}${ext}`);
  }
});

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.id}-doc-${Date.now()}${ext}`);
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

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_DOC_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
        city: true,
        region: true,
        country: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
        documents: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { uploadedAt: 'desc' }
        },
        orders: { take: 10, orderBy: { createdAt: 'desc' } },
        city: true,
        region: true,
        country: true,
        category: true,
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.post('/', authenticateToken, requireRole('Admin', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, nameEn, nameAr, code,
      email, mobile, phone,
      crNumber, taxNumber,
      fullAddress, address, postalCode,
      shortAddress, buildingNo, street, secondaryNo, district,
      cityId, regionId, countryId, categoryId,
      latitude, longitude,
      licenseNumber, licenseExpiryDate,
      deliveryWindowStart, deliveryWindowEnd, preferredDeliveryTime,
      travelTimeMinutes, permittedProductIds, contacts
    } = req.body;

    if (!nameEn || !nameAr) {
      res.status(400).json({ error: 'English and Arabic names are required' });
      return;
    }

    if (!mobile) {
      res.status(400).json({ error: 'Mobile number is required' });
      return;
    }

    if (!crNumber || !taxNumber) {
      res.status(400).json({ error: 'CR Number and Tax Number are required' });
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address' });
      return;
    }

    const mobileRegex = /^(\+9665|05)\d{8}$/;
    const normalizedMobile = mobile.startsWith('05') ? `+966${mobile.slice(1)}` : mobile;
    if (!mobileRegex.test(mobile) && !/^\+\d{10,15}$/.test(mobile)) {
      res.status(400).json({ error: 'Enter a valid Saudi mobile number (e.g., 05xxxxxxxx or +9665xxxxxxxx)' });
      return;
    }

    const existingCustomer = await prisma.customer.findUnique({ where: { code } });
    if (existingCustomer) {
      res.status(400).json({ error: 'Customer code already exists' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        name: name || nameEn,
        nameEn,
        nameAr,
        code,
        email: email || null,
        mobile: normalizedMobile,
        phone: phone || null,
        crNumber,
        taxNumber,
        fullAddress,
        address,
        shortAddress,
        buildingNo,
        street,
        secondaryNo,
        district,
        postalCode: postalCode || null,
        cityId: cityId || null,
        regionId: regionId || null,
        countryId: countryId || null,
        categoryId: categoryId || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        licenseNumber,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        deliveryWindowStart,
        deliveryWindowEnd,
        preferredDeliveryTime,
        travelTimeMinutes: travelTimeMinutes || 60,
        permittedProducts: {
          create: permittedProductIds?.map((productId: string) => ({ productId })) || [],
        },
        contacts: {
          create: contacts || [],
        },
      },
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
        documents: true,
        city: true,
        region: true,
        country: true,
        category: true,
      },
    });

    await createAuditLog(req.user?.userId, 'CREATE', 'Customer', customer.id, null, customer, req);

    if (req.user?.userId) {
      try {
        await triggerWorkflow({
          entityType: 'CUSTOMER',
          entityId: customer.id,
          requestedById: req.user.userId,
          priority: 'NORMAL',
        });
      } catch (workflowError) {
        console.error('Failed to trigger customer onboarding workflow:', workflowError);
      }
    }

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/:id', authenticateToken, requireRole('Admin', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, nameEn, nameAr,
      email, mobile, phone,
      crNumber, taxNumber,
      fullAddress, address, postalCode,
      shortAddress, buildingNo, street, secondaryNo, district,
      cityId, regionId, countryId, categoryId,
      latitude, longitude,
      licenseNumber, licenseExpiryDate,
      deliveryWindowStart, deliveryWindowEnd, preferredDeliveryTime,
      travelTimeMinutes, isActive, permittedProductIds
    } = req.body;

    const id = req.params.id as string;
    const oldCustomer = await prisma.customer.findUnique({
      where: { id },
      include: { permittedProducts: true },
    });

    if (!oldCustomer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address' });
      return;
    }

    let normalizedMobile = mobile;
    if (mobile) {
      const mobileRegex = /^(\+9665|05)\d{8}$/;
      normalizedMobile = mobile.startsWith('05') ? `+966${mobile.slice(1)}` : mobile;
      if (!mobileRegex.test(mobile) && !/^\+\d{10,15}$/.test(mobile)) {
        res.status(400).json({ error: 'Enter a valid Saudi mobile number (e.g., 05xxxxxxxx or +9665xxxxxxxx)' });
        return;
      }
    }

    if (permittedProductIds) {
      await prisma.customerProduct.deleteMany({ where: { customerId: id } });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: name || nameEn,
        nameEn,
        nameAr,
        email: email || null,
        mobile: normalizedMobile,
        phone: phone || null,
        crNumber,
        taxNumber,
        fullAddress,
        address,
        shortAddress,
        buildingNo,
        street,
        secondaryNo,
        district,
        postalCode: postalCode || null,
        cityId: cityId || null,
        regionId: regionId || null,
        countryId: countryId || null,
        categoryId: categoryId || null,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        licenseNumber,
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : null,
        deliveryWindowStart,
        deliveryWindowEnd,
        preferredDeliveryTime,
        travelTimeMinutes,
        isActive,
        permittedProducts: permittedProductIds ? {
          create: permittedProductIds.map((productId: string) => ({ productId })),
        } : undefined,
      },
      include: {
        permittedProducts: { include: { product: true } },
        contacts: true,
        documents: true,
        city: true,
        region: true,
        country: true,
        category: true,
      },
    });

    await createAuditLog(req.user?.userId, 'UPDATE', 'Customer', customer.id, oldCustomer, customer, req);

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Logo upload endpoint
router.post('/:id/logo', authenticateToken, requireRole('Admin', 'Customer Service'), (req: Request, res: Response): void => {
  logoUpload.single('logo')(req, res, async (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Unsupported file type. Allowed: PNG, JPG.' });
        return;
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File exceeds 5 MB. Please upload a smaller file.' });
        return;
      }
      res.status(400).json({ error: 'File upload failed' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    try {
      const id = req.params.id as string;
      const customer = await prisma.customer.findUnique({ where: { id } });
      
      if (!customer) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      if (customer.logoUrl) {
        const oldPath = path.join(process.cwd(), customer.logoUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const updated = await prisma.customer.update({
        where: { id },
        data: { logoUrl },
      });

      await createAuditLog(req.user?.userId, 'UPDATE', 'Customer', id, { logoUrl: customer.logoUrl }, { logoUrl }, req);

      res.json({ logoUrl, message: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ error: 'Failed to update customer logo' });
    }
  });
});

// Delete logo endpoint
router.delete('/:id/logo', authenticateToken, requireRole('Admin', 'Customer Service'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (customer.logoUrl) {
      const filePath = path.join(process.cwd(), customer.logoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.customer.update({
      where: { id },
      data: { logoUrl: null },
    });

    res.json({ message: 'Logo removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove logo' });
  }
});

// Get customer documents
router.get('/:id/documents', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const documents = await prisma.customerDocument.findMany({
      where: { customerId: id },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload document endpoint
router.post('/:id/documents', authenticateToken, requireRole('Admin', 'Customer Service', 'Finance Admin'), (req: Request, res: Response): void => {
  docUpload.single('document')(req, res, async (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({ error: 'Unsupported file type. Allowed: PDF, PNG, JPG, DOCX.' });
        return;
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File exceeds 5 MB. Please upload a smaller document.' });
        return;
      }
      res.status(400).json({ error: 'File upload failed' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const docType = req.body.docType as DocumentType;
    if (!docType || !['CR', 'TAX_CERT', 'LICENSE', 'CONTRACT', 'NDA', 'OTHER'].includes(docType)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'Document type is required' });
      return;
    }

    try {
      const id = req.params.id as string;
      const customer = await prisma.customer.findUnique({ where: { id } });

      if (!customer) {
        fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const document = await prisma.customerDocument.create({
        data: {
          customerId: id,
          docType,
          docName: req.file.originalname,
          fileUrl: `/uploads/documents/${req.file.filename}`,
          fileSizeBytes: req.file.size,
          mimeType: req.file.mimetype,
          uploadedByUserId: req.user?.userId || null,
        },
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      });

      await createAuditLog(req.user?.userId, 'CREATE', 'CustomerDocument', document.id, null, document, req);

      res.status(201).json(document);
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });
});

// Delete document endpoint
router.delete('/:id/documents/:docId', authenticateToken, requireRole('Admin', 'Customer Service', 'Finance Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, docId } = req.params;

    const document = await prisma.customerDocument.findFirst({
      where: { id: docId, customerId: id },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const filePath = path.join(process.cwd(), document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.customerDocument.delete({ where: { id: docId } });

    await createAuditLog(req.user?.userId, 'DELETE', 'CustomerDocument', docId, document, null, req);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Validate license endpoint
router.get('/:id/validate-license', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const isValid = customer.licenseExpiryDate ? customer.licenseExpiryDate > new Date() : true;

    res.json({
      isValid,
      licenseNumber: customer.licenseNumber,
      expiryDate: customer.licenseExpiryDate,
      message: isValid ? 'License is valid' : 'License has expired',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate license' });
  }
});

export default router;
