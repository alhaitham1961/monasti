const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// CURRENCY CONVERSION (IQD <-> USD and other Arab currencies)
// ============================================================

// Exchange rates (approximate, updated regularly)
// Base: 1 USD
const EXCHANGE_RATES = {
  USD: 1,
  IQD: 1310,        // 1 USD = 1310 IQD (official rate)
  SAR: 3.75,        // Saudi Riyal
  AED: 3.67,        // UAE Dirham
  QAR: 3.64,        // Qatari Riyal
  KWD: 0.31,        // Kuwaiti Dinar
  BHD: 0.38,        // Bahraini Dinar
  OMR: 0.38,        // Omani Rial
  EGP: 48.5,        // Egyptian Pound
  JOD: 0.71,        // Jordanian Dinar
  LBP: 89500,       // Lebanese Pound
  SYP: 13000,       // Syrian Pound
  TND: 3.1,         // Tunisian Dinar
  DZD: 134,         // Algerian Dinar
  MAD: 9.9,         // Moroccan Dirham
  LYD: 4.8,         // Libyan Dinar
  SDG: 600,         // Sudanese Pound
  YER: 250,         // Yemeni Rial
};

// Get all available currencies and rates
router.get('/rates', authenticateToken, (req, res) => {
  res.json({
    base: 'USD',
    rates: EXCHANGE_RATES,
    updatedAt: new Date().toISOString()
  });
});

// Convert amount from one currency to another
router.get('/convert', authenticateToken, (req, res) => {
  const { amount, from, to } = req.query;

  if (!amount || !from || !to) {
    return res.status(400).json({ error: 'amount, from, and to are required' });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const fromRate = EXCHANGE_RATES[from.toUpperCase()];
  const toRate = EXCHANGE_RATES[to.toUpperCase()];

  if (!fromRate) {
    return res.status(400).json({ error: `Unsupported currency: ${from}` });
  }

  if (!toRate) {
    return res.status(400).json({ error: `Unsupported currency: ${to}` });
  }

  // Convert: amount in 'from' -> USD -> 'to'
  const amountInUSD = amountNum / fromRate;
  const convertedAmount = amountInUSD * toRate;

  res.json({
    amount: amountNum,
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    rate: Math.round((toRate / fromRate) * 10000) / 10000,
    updatedAt: new Date().toISOString()
  });
});

// Convert IQD to USD (shortcut)
router.get('/iqd-to-usd', authenticateToken, (req, res) => {
  const { amount } = req.query;

  if (!amount) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const converted = amountNum / EXCHANGE_RATES.IQD;

  res.json({
    amount: amountNum,
    from: 'IQD',
    to: 'USD',
    convertedAmount: Math.round(converted * 100) / 100,
    rate: Math.round((1 / EXCHANGE_RATES.IQD) * 10000) / 10000
  });
});

// Convert USD to IQD (shortcut)
router.get('/usd-to-iqd', authenticateToken, (req, res) => {
  const { amount } = req.query;

  if (!amount) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const converted = amountNum * EXCHANGE_RATES.IQD;

  res.json({
    amount: amountNum,
    from: 'USD',
    to: 'IQD',
    convertedAmount: Math.round(converted),
    rate: EXCHANGE_RATES.IQD
  });
});

module.exports = router;
