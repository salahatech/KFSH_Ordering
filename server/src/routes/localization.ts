import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// ==================== LANGUAGES ====================

router.get('/languages', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { activeOnly } = req.query;
    const where = activeOnly === 'true' ? { isActive: true } : {};
    
    const languages = await prisma.language.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    
    res.json(languages);
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ error: 'Failed to get languages' });
  }
});

router.post('/languages', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, nativeName, direction, isActive, isDefault, sortOrder } = req.body;
    
    if (!code || !name) {
      res.status(400).json({ error: 'Code and name are required' });
      return;
    }
    
    if (isDefault) {
      await prisma.language.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    
    const language = await prisma.language.create({
      data: {
        code: code.toLowerCase(),
        name,
        nativeName,
        direction: direction || 'ltr',
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });
    
    res.status(201).json(language);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Language code already exists' });
      return;
    }
    console.error('Create language error:', error);
    res.status(500).json({ error: 'Failed to create language' });
  }
});

router.put('/languages/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { code, name, nativeName, direction, isActive, isDefault, sortOrder } = req.body;
    
    if (isDefault) {
      await prisma.language.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
    }
    
    const language = await prisma.language.update({
      where: { id },
      data: {
        ...(code && { code: code.toLowerCase() }),
        ...(name && { name }),
        ...(nativeName !== undefined && { nativeName }),
        ...(direction && { direction }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    
    res.json(language);
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

router.delete('/languages/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const language = await prisma.language.findUnique({ where: { id } });
    if (language?.isDefault) {
      res.status(400).json({ error: 'Cannot delete default language' });
      return;
    }
    
    await prisma.language.delete({ where: { id } });
    res.json({ message: 'Language deleted' });
  } catch (error) {
    console.error('Delete language error:', error);
    res.status(500).json({ error: 'Failed to delete language' });
  }
});

// ==================== TRANSLATIONS ====================

router.get('/translations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, langCode, search, page = '1', pageSize = '50' } = req.query;
    
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (langCode) where.langCode = langCode;
    if (search) {
      where.OR = [
        { value: { contains: search as string, mode: 'insensitive' } },
        { fieldKey: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    
    const [translations, total] = await Promise.all([
      prisma.translationEntry.findMany({
        where,
        orderBy: [{ entityType: 'asc' }, { entityId: 'asc' }, { fieldKey: 'asc' }, { langCode: 'asc' }],
        skip,
        take: parseInt(pageSize as string),
      }),
      prisma.translationEntry.count({ where }),
    ]);
    
    res.json({
      data: translations,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    });
  } catch (error) {
    console.error('Get translations error:', error);
    res.status(500).json({ error: 'Failed to get translations' });
  }
});

router.post('/translations', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, fieldKey, langCode, value } = req.body;
    const user = (req as any).user;
    
    if (!entityType || !entityId || !fieldKey || !langCode || value === undefined) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }
    
    const translation = await prisma.translationEntry.upsert({
      where: {
        entityType_entityId_fieldKey_langCode: { entityType, entityId, fieldKey, langCode },
      },
      create: { entityType, entityId, fieldKey, langCode, value, updatedBy: user?.id },
      update: { value, updatedBy: user?.id },
    });
    
    res.status(201).json(translation);
  } catch (error) {
    console.error('Create translation error:', error);
    res.status(500).json({ error: 'Failed to create translation' });
  }
});

router.post('/translations/bulk', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { translations } = req.body;
    const user = (req as any).user;
    
    if (!Array.isArray(translations)) {
      res.status(400).json({ error: 'Translations array is required' });
      return;
    }
    
    const results = await Promise.all(
      translations.map(async (t: any) => {
        return prisma.translationEntry.upsert({
          where: {
            entityType_entityId_fieldKey_langCode: {
              entityType: t.entityType,
              entityId: t.entityId,
              fieldKey: t.fieldKey,
              langCode: t.langCode,
            },
          },
          create: { ...t, updatedBy: user?.id },
          update: { value: t.value, updatedBy: user?.id },
        });
      })
    );
    
    res.json({ count: results.length, translations: results });
  } catch (error) {
    console.error('Bulk create translations error:', error);
    res.status(500).json({ error: 'Failed to create translations' });
  }
});

router.delete('/translations/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.translationEntry.delete({ where: { id } });
    res.json({ message: 'Translation deleted' });
  } catch (error) {
    console.error('Delete translation error:', error);
    res.status(500).json({ error: 'Failed to delete translation' });
  }
});

router.get('/translations/entity/:entityType/:entityId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    
    const translations = await prisma.translationEntry.findMany({
      where: { entityType, entityId },
      orderBy: [{ fieldKey: 'asc' }, { langCode: 'asc' }],
    });
    
    const grouped: Record<string, Record<string, string>> = {};
    for (const t of translations) {
      if (!grouped[t.fieldKey]) grouped[t.fieldKey] = {};
      grouped[t.fieldKey][t.langCode] = t.value;
    }
    
    res.json(grouped);
  } catch (error) {
    console.error('Get entity translations error:', error);
    res.status(500).json({ error: 'Failed to get entity translations' });
  }
});

router.get('/translations/completeness', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const activeLanguages = await prisma.language.findMany({ where: { isActive: true } });
    const entityTypes = await prisma.translationEntry.groupBy({ by: ['entityType'], _count: true });
    
    const completeness: Record<string, any> = {};
    
    for (const et of entityTypes) {
      const entriesByLang = await prisma.translationEntry.groupBy({
        by: ['langCode'],
        where: { entityType: et.entityType },
        _count: true,
      });
      
      const langCounts: Record<string, number> = {};
      entriesByLang.forEach(e => { langCounts[e.langCode] = e._count; });
      
      const maxCount = Math.max(...Object.values(langCounts), 1);
      
      completeness[et.entityType] = {
        total: et._count,
        byLanguage: activeLanguages.map(lang => ({
          langCode: lang.code,
          count: langCounts[lang.code] || 0,
          percent: Math.round(((langCounts[lang.code] || 0) / maxCount) * 100),
        })),
      };
    }
    
    res.json(completeness);
  } catch (error) {
    console.error('Get translation completeness error:', error);
    res.status(500).json({ error: 'Failed to get completeness' });
  }
});

// ==================== EXCHANGE RATES ====================

router.get('/exchange-rates', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromCurrency, fromDate, toDate, page = '1', pageSize = '50' } = req.query;
    
    const where: any = {};
    if (fromCurrency) where.fromCurrency = fromCurrency;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate as string);
      if (toDate) where.date.lte = new Date(toDate as string);
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    
    const [rates, total] = await Promise.all([
      prisma.exchangeRate.findMany({
        where,
        orderBy: [{ date: 'desc' }, { fromCurrency: 'asc' }],
        skip,
        take: parseInt(pageSize as string),
      }),
      prisma.exchangeRate.count({ where }),
    ]);
    
    res.json({
      data: rates,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to get exchange rates' });
  }
});

router.get('/exchange-rates/latest', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromCurrency } = req.query;
    
    const where: any = { isActive: true };
    if (fromCurrency) where.fromCurrency = fromCurrency;
    
    const rates = await prisma.exchangeRate.findMany({
      where,
      orderBy: { date: 'desc' },
      distinct: ['fromCurrency'],
    });
    
    res.json(rates);
  } catch (error) {
    console.error('Get latest exchange rates error:', error);
    res.status(500).json({ error: 'Failed to get latest rates' });
  }
});

router.get('/exchange-rates/convert', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, fromCurrency, date } = req.query;
    
    if (!amount || !fromCurrency) {
      res.status(400).json({ error: 'Amount and fromCurrency are required' });
      return;
    }
    
    const targetDate = date ? new Date(date as string) : new Date();
    
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: fromCurrency as string,
        toCurrency: 'SAR',
        date: { lte: targetDate },
        isActive: true,
      },
      orderBy: { date: 'desc' },
    });
    
    if (!rate) {
      res.status(404).json({ error: 'No exchange rate found for this currency' });
      return;
    }
    
    const amountNum = parseFloat(amount as string);
    const convertedAmount = amountNum * rate.rate;
    
    res.json({
      fromAmount: amountNum,
      fromCurrency: fromCurrency,
      toAmount: convertedAmount,
      toCurrency: 'SAR',
      rate: rate.rate,
      rateDate: rate.date,
    });
  } catch (error) {
    console.error('Convert currency error:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

router.post('/exchange-rates', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, fromCurrency, rate, source } = req.body;
    const user = (req as any).user;
    
    if (!date || !fromCurrency || !rate) {
      res.status(400).json({ error: 'Date, fromCurrency, and rate are required' });
      return;
    }
    
    if (rate <= 0) {
      res.status(400).json({ error: 'Rate must be greater than 0' });
      return;
    }
    
    const exchangeRate = await prisma.exchangeRate.upsert({
      where: {
        date_fromCurrency_toCurrency: {
          date: new Date(date),
          fromCurrency: fromCurrency.toUpperCase(),
          toCurrency: 'SAR',
        },
      },
      create: {
        date: new Date(date),
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: 'SAR',
        rate,
        source: source || 'MANUAL',
        createdBy: user?.id,
      },
      update: {
        rate,
        source: source || 'MANUAL',
      },
    });
    
    res.status(201).json(exchangeRate);
  } catch (error) {
    console.error('Create exchange rate error:', error);
    res.status(500).json({ error: 'Failed to create exchange rate' });
  }
});

router.post('/exchange-rates/bulk', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { rates } = req.body;
    const user = (req as any).user;
    
    if (!Array.isArray(rates)) {
      res.status(400).json({ error: 'Rates array is required' });
      return;
    }
    
    const results = await Promise.all(
      rates.map(async (r: any) => {
        return prisma.exchangeRate.upsert({
          where: {
            date_fromCurrency_toCurrency: {
              date: new Date(r.date),
              fromCurrency: r.fromCurrency.toUpperCase(),
              toCurrency: 'SAR',
            },
          },
          create: {
            date: new Date(r.date),
            fromCurrency: r.fromCurrency.toUpperCase(),
            toCurrency: 'SAR',
            rate: r.rate,
            source: r.source || 'MANUAL',
            createdBy: user?.id,
          },
          update: {
            rate: r.rate,
            source: r.source || 'MANUAL',
          },
        });
      })
    );
    
    res.json({ count: results.length });
  } catch (error) {
    console.error('Bulk create exchange rates error:', error);
    res.status(500).json({ error: 'Failed to create exchange rates' });
  }
});

router.delete('/exchange-rates/:id', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.exchangeRate.delete({ where: { id } });
    res.json({ message: 'Exchange rate deleted' });
  } catch (error) {
    console.error('Delete exchange rate error:', error);
    res.status(500).json({ error: 'Failed to delete exchange rate' });
  }
});

// ==================== SYSTEM LOCALIZATION SETTINGS ====================

router.get('/settings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.systemLocalization.findFirst();
    
    if (!settings) {
      settings = await prisma.systemLocalization.create({ data: {} });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get localization settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/settings', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      defaultLanguageCode,
      defaultTimezone,
      enableMultiCurrencyDisplay,
      enableUserLanguageOverride,
      enableUserTimezoneOverride,
      enableUserCurrencyOverride,
      dateFormat,
      timeFormat,
      numberFormat,
    } = req.body;
    
    let settings = await prisma.systemLocalization.findFirst();
    
    if (!settings) {
      settings = await prisma.systemLocalization.create({
        data: {
          ...(defaultLanguageCode && { defaultLanguageCode }),
          ...(defaultTimezone && { defaultTimezone }),
          ...(enableMultiCurrencyDisplay !== undefined && { enableMultiCurrencyDisplay }),
          ...(enableUserLanguageOverride !== undefined && { enableUserLanguageOverride }),
          ...(enableUserTimezoneOverride !== undefined && { enableUserTimezoneOverride }),
          ...(enableUserCurrencyOverride !== undefined && { enableUserCurrencyOverride }),
          ...(dateFormat && { dateFormat }),
          ...(timeFormat && { timeFormat }),
          ...(numberFormat && { numberFormat }),
        },
      });
    } else {
      settings = await prisma.systemLocalization.update({
        where: { id: settings.id },
        data: {
          ...(defaultLanguageCode && { defaultLanguageCode }),
          ...(defaultTimezone && { defaultTimezone }),
          ...(enableMultiCurrencyDisplay !== undefined && { enableMultiCurrencyDisplay }),
          ...(enableUserLanguageOverride !== undefined && { enableUserLanguageOverride }),
          ...(enableUserTimezoneOverride !== undefined && { enableUserTimezoneOverride }),
          ...(enableUserCurrencyOverride !== undefined && { enableUserCurrencyOverride }),
          ...(dateFormat && { dateFormat }),
          ...(timeFormat && { timeFormat }),
          ...(numberFormat && { numberFormat }),
        },
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Update localization settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== USER PREFERENCES ====================

router.get('/user-preferences', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    let prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });
    
    if (!prefs) {
      prefs = await prisma.userPreference.create({
        data: { userId: user.id },
      });
    }
    
    res.json(prefs);
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

router.put('/user-preferences', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { preferredCurrencyCode, preferredLanguageCode, preferredTimezone } = req.body;
    
    const prefs = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...(preferredCurrencyCode && { preferredCurrencyCode }),
        ...(preferredLanguageCode && { preferredLanguageCode }),
        ...(preferredTimezone && { preferredTimezone }),
      },
      update: {
        ...(preferredCurrencyCode && { preferredCurrencyCode }),
        ...(preferredLanguageCode && { preferredLanguageCode }),
        ...(preferredTimezone && { preferredTimezone }),
      },
    });
    
    res.json(prefs);
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ==================== HELPER: Get localized value ====================

router.get('/localized/:entityType/:entityId/:fieldKey', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, fieldKey } = req.params;
    const { lang } = req.query;
    
    const settings = await prisma.systemLocalization.findFirst();
    const targetLang = (lang as string) || settings?.defaultLanguageCode || 'en';
    
    let translation = await prisma.translationEntry.findFirst({
      where: { entityType, entityId, fieldKey, langCode: targetLang },
    });
    
    if (!translation && targetLang !== 'en') {
      translation = await prisma.translationEntry.findFirst({
        where: { entityType, entityId, fieldKey, langCode: 'en' },
      });
    }
    
    res.json({ value: translation?.value || null, langCode: translation?.langCode || null });
  } catch (error) {
    console.error('Get localized value error:', error);
    res.status(500).json({ error: 'Failed to get localized value' });
  }
});

// ==================== SEED DEFAULT LANGUAGES ====================

router.post('/seed-languages', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const defaultLanguages = [
      { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', isDefault: true, sortOrder: 1 },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', isDefault: false, sortOrder: 2 },
    ];
    
    for (const lang of defaultLanguages) {
      await prisma.language.upsert({
        where: { code: lang.code },
        create: lang,
        update: {},
      });
    }
    
    res.json({ message: 'Default languages seeded', languages: defaultLanguages });
  } catch (error) {
    console.error('Seed languages error:', error);
    res.status(500).json({ error: 'Failed to seed languages' });
  }
});

export default router;
