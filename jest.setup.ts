// Jest setup file
// This file ensures Jest types are available globally
import { TextEncoder, TextDecoder } from 'util';
import { jest, beforeAll } from '@jest/globals';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill setImmediate for Node 25 ESM
if (typeof setImmediate === 'undefined') {
    (global as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => {
      return setTimeout(fn, 0, ...args);
    };
  }

// Suppress console.error during tests to keep output clean
// The error handler middleware logs errors, which is expected behavior
// but we don't want to see these logs in test output
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});


// Mock the database module GLOBALLY before any tests run
jest.mock('./src/config/database.js', () => ({
  default: {
    query: jest.fn(),
  },
  query: jest.fn(),
}));

// Prevent real database connections
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for actual test failures
};