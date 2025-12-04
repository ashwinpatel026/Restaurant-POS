#!/usr/bin/env node

/**
 * JWT Token Generator for POS Client Authentication
 * 
 * Usage:
 *   node scripts/generate-pos-jwt-token.js <storeCode> [expiresIn]
 * 
 * Example:
 *   node scripts/generate-pos-jwt-token.js LOC001 24h
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const storeCode = process.argv[2];
const expiresIn = process.argv[3] || '24h';

if (!storeCode) {
  console.error('Error: storeCode is required');
  console.log('Usage: node scripts/generate-pos-jwt-token.js <storeCode> [expiresIn]');
  console.log('Example: node scripts/generate-pos-jwt-token.js LOC001 24h');
  process.exit(1);
}

const secret = process.env.POS_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';

try {
  const token = jwt.sign(
    {
      type: 'pos_client',
      storeCode: storeCode,
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    {
      expiresIn: expiresIn
    }
  );

  const decoded = jwt.decode(token);
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'N/A';

  console.log('\n========================================');
  console.log('POS JWT Token Generated Successfully');
  console.log('========================================\n');
  console.log('Store Code:', storeCode);
  console.log('Expires In:', expiresIn);
  console.log('Expires At:', expiresAt);
  console.log('\nToken:');
  console.log(token);
  console.log('\n========================================\n');
  console.log('Use this token in your requests:');
  console.log('Authorization: Bearer', token);
  console.log('\n========================================\n');
} catch (error) {
  console.error('Error generating token:', error.message);
  process.exit(1);
}

