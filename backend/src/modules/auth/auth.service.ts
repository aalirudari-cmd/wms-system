import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../core/errors.js';
import { signAccessToken } from '../../middleware/auth.middleware.js';
import { authRepository } from './auth.repository.js';
import type { LoginInput } from './auth.schema.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildAccessPayload(user: Awaited<ReturnType<typeof authRepository.findUserByUsername>>) {
  if (!user) throw new UnauthorizedError('Invalid credentials.');
  return {
    sub: user.id,
    username: user.username,
    roleId: user.roleId,
    roleName: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}

async function issueRefreshToken(userId: number, userAgent?: string, ip?: string) {
  const raw = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  await authRepository.createRefreshToken({ userId, tokenHash: hashToken(raw), expiresAt, userAgent, ip });
  return { raw, expiresAt };
}

export const authService = {
  async login(input: LoginInput, meta: { userAgent?: string; ip?: string }) {
    const user = await authRepository.findUserByUsername(input.username);
    if (!user || !user.active) throw new UnauthorizedError('Invalid credentials.');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials.');

    await authRepository.touchLastLogin(user.id);
    const accessToken = signAccessToken(buildAccessPayload(user));
    const refresh = await issueRefreshToken(user.id, meta.userAgent, meta.ip);

    return {
      accessToken,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.key),
      },
    };
  },

  async refresh(rawToken: string | undefined, meta: { userAgent?: string; ip?: string }) {
    if (!rawToken) throw new UnauthorizedError('Missing refresh token.');
    const tokenHash = hashToken(rawToken);
    const stored = await authRepository.findRefreshTokenByHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token is invalid or expired.');
    }

    const user = await authRepository.findUserById(stored.userId);
    if (!user || !user.active) throw new UnauthorizedError('Account is inactive.');

    // Rotate: revoke the old token, issue a new pair.
    await authRepository.revokeRefreshToken(stored.id);
    const accessToken = signAccessToken(buildAccessPayload(user));
    const refresh = await issueRefreshToken(user.id, meta.userAgent, meta.ip);

    return {
      accessToken,
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.key),
      },
    };
  },

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
    if (stored && !stored.revokedAt) await authRepository.revokeRefreshToken(stored.id);
  },

  async me(userId: number) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    };
  },
};

