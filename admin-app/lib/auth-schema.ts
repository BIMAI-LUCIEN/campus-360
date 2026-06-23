import type { DatabaseSync } from 'node:sqlite';

export const initAuthSchema = (db: DatabaseSync) => {
  db.exec(`
    create table if not exists user (
      id text primary key not null,
      name text not null,
      email text not null unique,
      emailVerified integer not null,
      image text,
      createdAt date not null,
      updatedAt date not null,
      role text default 'student',
      banned integer default 0,
      banReason text,
      banExpires date
    );

    create table if not exists session (
      id text primary key not null,
      expiresAt date not null,
      token text not null unique,
      createdAt date not null,
      updatedAt date not null,
      ipAddress text,
      userAgent text,
      userId text not null references user(id) on delete cascade,
      impersonatedBy text
    );

    create table if not exists account (
      id text primary key not null,
      accountId text not null,
      providerId text not null,
      userId text not null references user(id) on delete cascade,
      accessToken text,
      refreshToken text,
      idToken text,
      accessTokenExpiresAt date,
      refreshTokenExpiresAt date,
      scope text,
      password text,
      createdAt date not null,
      updatedAt date not null
    );

    create table if not exists verification (
      id text primary key not null,
      identifier text not null,
      value text not null,
      expiresAt date not null,
      createdAt date not null,
      updatedAt date not null
    );

    create index if not exists session_userId_idx on session(userId);
    create index if not exists account_userId_idx on account(userId);
    create index if not exists verification_identifier_idx on verification(identifier);
  `);
};
