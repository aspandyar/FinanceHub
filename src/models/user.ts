import prisma from '../config/database.js';
import type { Prisma } from '@prisma/client';

export type User = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>;
export type UserRole = 'admin' | 'manager' | 'user';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  currency?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  currency?: string;
  role?: UserRole;
}

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { id },
  });
};

// Get user by email
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { email },
  });
};

// Create a new user
export const createUser = async (input: CreateUserInput): Promise<User> => {
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      currency: input.currency || 'USD',
      role: input.role || 'user',
    },
  });
};

// Update a user
export const updateUser = async (
  id: string,
  input: UpdateUserInput
): Promise<User | null> => {
  const updateData: {
    email?: string;
    passwordHash?: string;
    fullName?: string;
    currency?: string;
    role?: UserRole;
  } = {};

  if (input.email !== undefined) {
    updateData.email = input.email;
  }
  if (input.passwordHash !== undefined) {
    updateData.passwordHash = input.passwordHash;
  }
  if (input.fullName !== undefined) {
    updateData.fullName = input.fullName;
  }
  if (input.currency !== undefined) {
    updateData.currency = input.currency;
  }
  if (input.role !== undefined) {
    updateData.role = input.role;
  }

  if (Object.keys(updateData).length === 0) {
    return getUserById(id);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  });
};

// Delete a user
export const deleteUser = async (id: string): Promise<boolean> => {
  const result = await prisma.user.delete({
    where: { id },
  });
  return !!result;
};

