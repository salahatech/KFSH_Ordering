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

// Fetch exchange rates from online providers
router.post('/exchange-rates/fetch-online', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider = 'exchangerate-api', apiKey, currencies } = req.body;
    const user = (req as any).user;
    const userId = user.userId || user.id;
    
    const targetCurrencies = currencies || ['USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP', 'JOD'];
    const baseCurrency = 'SAR';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let rates: { fromCurrency: string; rate: number }[] = [];
    let providerName = provider;
    
    try {
      if (provider === 'exchangerate-api' || provider === 'free') {
        // Free ExchangeRate-API (no key required, limited requests)
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
        if (!response.ok) throw new Error('Failed to fetch from ExchangeRate-API');
        const data = await response.json();
        
        providerName = 'ExchangeRate-API';
        for (const currency of targetCurrencies) {
          if (data.rates[currency]) {
            // API returns SAR -> XXX, we need XXX -> SAR (inverse)
            rates.push({
              fromCurrency: currency,
              rate: parseFloat((1 / data.rates[currency]).toFixed(6)),
            });
          }
        }
      } else if (provider === 'openexchangerates' && apiKey) {
        // Open Exchange Rates (requires API key)
        const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=USD`);
        if (!response.ok) throw new Error('Failed to fetch from Open Exchange Rates');
        const data = await response.json();
        
        providerName = 'Open Exchange Rates';
        const sarRate = data.rates['SAR'] || 3.75;
        
        for (const currency of targetCurrencies) {
          if (data.rates[currency]) {
            // Convert through USD: XXX -> USD -> SAR
            const usdToXxx = data.rates[currency];
            const xxxToSar = sarRate / usdToXxx;
            rates.push({
              fromCurrency: currency,
              rate: parseFloat(xxxToSar.toFixed(6)),
            });
          }
        }
      } else if (provider === 'frankfurter') {
        // Frankfurter API (free, no key required, ECB data)
        const currencyList = targetCurrencies.join(',');
        const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}&to=${currencyList}`);
        if (!response.ok) throw new Error('Failed to fetch from Frankfurter API');
        const data = await response.json();
        
        providerName = 'Frankfurter (ECB)';
        for (const currency of targetCurrencies) {
          if (data.rates[currency]) {
            // API returns SAR -> XXX, we need XXX -> SAR (inverse)
            rates.push({
              fromCurrency: currency,
              rate: parseFloat((1 / data.rates[currency]).toFixed(6)),
            });
          }
        }
      } else if (provider === 'fixer' && apiKey) {
        // Fixer.io (requires API key)
        const response = await fetch(`http://data.fixer.io/api/latest?access_key=${apiKey}&base=EUR`);
        if (!response.ok) throw new Error('Failed to fetch from Fixer.io');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error?.info || 'Fixer API error');
        
        providerName = 'Fixer.io';
        const sarRate = data.rates['SAR'] || 4.06;
        
        for (const currency of targetCurrencies) {
          if (data.rates[currency]) {
            // Convert through EUR: XXX -> EUR -> SAR
            const eurToXxx = data.rates[currency];
            const xxxToSar = sarRate / eurToXxx;
            rates.push({
              fromCurrency: currency,
              rate: parseFloat(xxxToSar.toFixed(6)),
            });
          }
        }
      } else {
        res.status(400).json({ error: 'Unsupported provider or missing API key' });
        return;
      }
    } catch (fetchError: any) {
      console.error('Fetch rates error:', fetchError);
      res.status(502).json({ error: fetchError.message || 'Failed to fetch rates from provider' });
      return;
    }
    
    if (rates.length === 0) {
      res.status(404).json({ error: 'No rates returned from provider' });
      return;
    }
    
    // Save rates to database
    const results = await Promise.all(
      rates.map(async (r) => {
        return prisma.exchangeRate.upsert({
          where: {
            date_fromCurrency_toCurrency: {
              date: today,
              fromCurrency: r.fromCurrency,
              toCurrency: baseCurrency,
            },
          },
          create: {
            date: today,
            fromCurrency: r.fromCurrency,
            toCurrency: baseCurrency,
            rate: r.rate,
            source: providerName,
            createdBy: userId,
          },
          update: {
            rate: r.rate,
            source: providerName,
          },
        });
      })
    );
    
    res.json({
      message: `Fetched ${results.length} exchange rates from ${providerName}`,
      provider: providerName,
      date: today.toISOString().split('T')[0],
      rates: results,
    });
  } catch (error) {
    console.error('Fetch online rates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Get available rate providers
router.get('/exchange-rates/providers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  res.json([
    { id: 'exchangerate-api', name: 'ExchangeRate-API', requiresKey: false, description: 'Free tier with rate limits' },
    { id: 'frankfurter', name: 'Frankfurter (ECB)', requiresKey: false, description: 'European Central Bank rates' },
    { id: 'openexchangerates', name: 'Open Exchange Rates', requiresKey: true, description: 'Requires free API key' },
    { id: 'fixer', name: 'Fixer.io', requiresKey: true, description: 'Requires API key' },
  ]);
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
    const userId = user.userId || user.id;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    let prefs = await prisma.userPreference.findUnique({ where: { userId } });
    
    if (!prefs) {
      prefs = await prisma.userPreference.create({
        data: { userId },
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
    const userId = user.userId || user.id;
    const { preferredCurrencyCode, preferredLanguageCode, preferredTimezone } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const prefs = await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
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

router.post('/seed-system-translations', authenticateToken, requireRole('Admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const languages = await prisma.language.findMany({ where: { isActive: true } });
    
    if (languages.length === 0) {
      res.status(400).json({ error: 'No active languages found. Please add languages first.' });
      return;
    }

    const systemTranslations: { key: string; en: string; ar: string }[] = [
      // Navigation - Main Sections
      { key: 'nav.dashboard', en: 'Dashboard', ar: 'لوحة التحكم' },
      { key: 'nav.orders', en: 'Orders', ar: 'الطلبات' },
      { key: 'nav.customers', en: 'Customers', ar: 'العملاء' },
      { key: 'nav.production', en: 'Production', ar: 'الإنتاج' },
      { key: 'nav.batches', en: 'Batches', ar: 'الدفعات' },
      { key: 'nav.quality', en: 'Quality', ar: 'الجودة' },
      { key: 'nav.logistics', en: 'Logistics', ar: 'اللوجستيات' },
      { key: 'nav.shipments', en: 'Shipments', ar: 'الشحنات' },
      { key: 'nav.drivers', en: 'Drivers', ar: 'السائقين' },
      { key: 'nav.inventory', en: 'Inventory', ar: 'المخزون' },
      { key: 'nav.warehouse', en: 'Warehouse', ar: 'المستودع' },
      { key: 'nav.stock', en: 'Stock', ar: 'المخزون' },
      { key: 'nav.materials', en: 'Materials', ar: 'المواد' },
      { key: 'nav.suppliers', en: 'Suppliers', ar: 'الموردين' },
      { key: 'nav.finance', en: 'Finance', ar: 'المالية' },
      { key: 'nav.invoices', en: 'Invoices', ar: 'الفواتير' },
      { key: 'nav.payments', en: 'Payments', ar: 'المدفوعات' },
      { key: 'nav.contracts', en: 'Contracts', ar: 'العقود' },
      { key: 'nav.administration', en: 'Administration', ar: 'الإدارة' },
      { key: 'nav.users', en: 'Users', ar: 'المستخدمين' },
      { key: 'nav.roles', en: 'Roles', ar: 'الأدوار' },
      { key: 'nav.settings', en: 'Settings', ar: 'الإعدادات' },
      { key: 'nav.products', en: 'Products', ar: 'المنتجات' },
      { key: 'nav.equipment', en: 'Equipment', ar: 'المعدات' },
      { key: 'nav.reports', en: 'Reports', ar: 'التقارير' },
      { key: 'nav.helpdesk', en: 'Support', ar: 'الدعم' },
      
      // Common Actions
      { key: 'action.save', en: 'Save', ar: 'حفظ' },
      { key: 'action.cancel', en: 'Cancel', ar: 'إلغاء' },
      { key: 'action.delete', en: 'Delete', ar: 'حذف' },
      { key: 'action.edit', en: 'Edit', ar: 'تعديل' },
      { key: 'action.add', en: 'Add', ar: 'إضافة' },
      { key: 'action.create', en: 'Create', ar: 'إنشاء' },
      { key: 'action.update', en: 'Update', ar: 'تحديث' },
      { key: 'action.search', en: 'Search', ar: 'بحث' },
      { key: 'action.filter', en: 'Filter', ar: 'تصفية' },
      { key: 'action.export', en: 'Export', ar: 'تصدير' },
      { key: 'action.import', en: 'Import', ar: 'استيراد' },
      { key: 'action.download', en: 'Download', ar: 'تحميل' },
      { key: 'action.upload', en: 'Upload', ar: 'رفع' },
      { key: 'action.submit', en: 'Submit', ar: 'إرسال' },
      { key: 'action.approve', en: 'Approve', ar: 'موافقة' },
      { key: 'action.reject', en: 'Reject', ar: 'رفض' },
      { key: 'action.confirm', en: 'Confirm', ar: 'تأكيد' },
      { key: 'action.close', en: 'Close', ar: 'إغلاق' },
      { key: 'action.view', en: 'View', ar: 'عرض' },
      { key: 'action.print', en: 'Print', ar: 'طباعة' },
      { key: 'action.back', en: 'Back', ar: 'رجوع' },
      { key: 'action.next', en: 'Next', ar: 'التالي' },
      { key: 'action.previous', en: 'Previous', ar: 'السابق' },
      
      // Common Labels
      { key: 'label.name', en: 'Name', ar: 'الاسم' },
      { key: 'label.description', en: 'Description', ar: 'الوصف' },
      { key: 'label.status', en: 'Status', ar: 'الحالة' },
      { key: 'label.date', en: 'Date', ar: 'التاريخ' },
      { key: 'label.time', en: 'Time', ar: 'الوقت' },
      { key: 'label.type', en: 'Type', ar: 'النوع' },
      { key: 'label.category', en: 'Category', ar: 'الفئة' },
      { key: 'label.priority', en: 'Priority', ar: 'الأولوية' },
      { key: 'label.quantity', en: 'Quantity', ar: 'الكمية' },
      { key: 'label.price', en: 'Price', ar: 'السعر' },
      { key: 'label.total', en: 'Total', ar: 'الإجمالي' },
      { key: 'label.amount', en: 'Amount', ar: 'المبلغ' },
      { key: 'label.email', en: 'Email', ar: 'البريد الإلكتروني' },
      { key: 'label.phone', en: 'Phone', ar: 'الهاتف' },
      { key: 'label.address', en: 'Address', ar: 'العنوان' },
      { key: 'label.city', en: 'City', ar: 'المدينة' },
      { key: 'label.country', en: 'Country', ar: 'البلد' },
      { key: 'label.notes', en: 'Notes', ar: 'ملاحظات' },
      { key: 'label.comments', en: 'Comments', ar: 'تعليقات' },
      { key: 'label.attachments', en: 'Attachments', ar: 'المرفقات' },
      { key: 'label.createdAt', en: 'Created At', ar: 'تاريخ الإنشاء' },
      { key: 'label.updatedAt', en: 'Updated At', ar: 'تاريخ التحديث' },
      { key: 'label.createdBy', en: 'Created By', ar: 'أنشئ بواسطة' },
      
      // Status Values
      { key: 'status.active', en: 'Active', ar: 'نشط' },
      { key: 'status.inactive', en: 'Inactive', ar: 'غير نشط' },
      { key: 'status.pending', en: 'Pending', ar: 'قيد الانتظار' },
      { key: 'status.approved', en: 'Approved', ar: 'تمت الموافقة' },
      { key: 'status.rejected', en: 'Rejected', ar: 'مرفوض' },
      { key: 'status.completed', en: 'Completed', ar: 'مكتمل' },
      { key: 'status.cancelled', en: 'Cancelled', ar: 'ملغي' },
      { key: 'status.draft', en: 'Draft', ar: 'مسودة' },
      { key: 'status.submitted', en: 'Submitted', ar: 'تم الإرسال' },
      { key: 'status.inProgress', en: 'In Progress', ar: 'قيد التنفيذ' },
      { key: 'status.onHold', en: 'On Hold', ar: 'معلق' },
      { key: 'status.delivered', en: 'Delivered', ar: 'تم التسليم' },
      { key: 'status.shipped', en: 'Shipped', ar: 'تم الشحن' },
      
      // Messages
      { key: 'message.success', en: 'Operation completed successfully', ar: 'تمت العملية بنجاح' },
      { key: 'message.error', en: 'An error occurred', ar: 'حدث خطأ' },
      { key: 'message.loading', en: 'Loading...', ar: 'جاري التحميل...' },
      { key: 'message.noData', en: 'No data available', ar: 'لا توجد بيانات' },
      { key: 'message.confirmDelete', en: 'Are you sure you want to delete this item?', ar: 'هل أنت متأكد من حذف هذا العنصر؟' },
      { key: 'message.unsavedChanges', en: 'You have unsaved changes', ar: 'لديك تغييرات غير محفوظة' },
      { key: 'message.required', en: 'This field is required', ar: 'هذا الحقل مطلوب' },
      
      // Page Titles
      { key: 'page.dashboard', en: 'Dashboard', ar: 'لوحة التحكم' },
      { key: 'page.orderList', en: 'Order Management', ar: 'إدارة الطلبات' },
      { key: 'page.customerList', en: 'Customer Management', ar: 'إدارة العملاء' },
      { key: 'page.productList', en: 'Product Catalog', ar: 'كتالوج المنتجات' },
      { key: 'page.batchList', en: 'Batch Management', ar: 'إدارة الدفعات' },
      { key: 'page.invoiceList', en: 'Invoice Management', ar: 'إدارة الفواتير' },
      { key: 'page.shipmentList', en: 'Shipment Tracking', ar: 'تتبع الشحنات' },
      { key: 'page.userList', en: 'User Management', ar: 'إدارة المستخدمين' },
      { key: 'page.settings', en: 'System Settings', ar: 'إعدادات النظام' },
      { key: 'page.reports', en: 'Reports Center', ar: 'مركز التقارير' },
      { key: 'page.helpdesk', en: 'Support Tickets', ar: 'تذاكر الدعم' },
      { key: 'page.profile', en: 'My Profile', ar: 'ملفي الشخصي' },
      { key: 'page.notifications', en: 'Notifications', ar: 'الإشعارات' },
    ];

    let created = 0;
    let skipped = 0;

    for (const translation of systemTranslations) {
      for (const lang of languages) {
        const value = lang.code === 'en' ? translation.en : 
                      lang.code === 'ar' ? translation.ar : 
                      translation.en;

        const existing = await prisma.translationEntry.findFirst({
          where: {
            entityType: 'SYSTEM',
            entityId: 'UI',
            fieldKey: translation.key,
            langCode: lang.code,
          }
        });

        if (!existing) {
          await prisma.translationEntry.create({
            data: {
              entityType: 'SYSTEM',
              entityId: 'UI',
              fieldKey: translation.key,
              langCode: lang.code,
              value,
            }
          });
          created++;
        } else {
          skipped++;
        }
      }
    }

    res.json({ 
      message: 'System translations seeded', 
      created,
      skipped,
      totalKeys: systemTranslations.length,
      languages: languages.length
    });
  } catch (error) {
    console.error('Seed system translations error:', error);
    res.status(500).json({ error: 'Failed to seed system translations' });
  }
});

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
