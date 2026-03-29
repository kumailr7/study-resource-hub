const mongoose = require('mongoose');
const clerk = require('@clerk/clerk-sdk-node');
const User = require('../models/Users');
const { config } = require('dotenv');

config();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY is not set in .env');
  process.exit(1);
}

const clerkClient = clerk.createClerkClient({ secretKey: CLERK_SECRET_KEY });

const getClerkUserByExternalId = async (externalId) => {
  const users = await clerkClient.users.getUserList({ externalId: [externalId] });
  return users;
};

const createClerkUser = async (user) => {
  const emailValue = user.email;
  const created = await clerkClient.users.createUser({
    externalId: String(user._id),
    username: user.username,
    emailAddress: [emailValue],
    firstName: user.username?.split('@')[0] || 'user',
    lastName: '',
    password: randomPassword(30),
    skipPasswordChecks: true,
    publicMetadata: {
      migrated_from: 'atlas-legacy',
      old_user_id: String(user._id),
      role: user.role || 'user',
    },
  });

  return created;
};

const isEmail = (value) => {
  if (!value || typeof value !== 'string') return false;
  // basic email validation to protect migration path
  return /^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
};

const normalizeUsernameToEmail = (username, id) => {
  if (isEmail(username)) return username;
  if (!username || typeof username !== 'string') {
    return `user-${id}@example.com`;
  }

  const local = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 35);

  if (!local) return `user-${id}@example.com`;
  return `${local}-${id}@example.com`;
};

const randomPassword = (length = 20) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
  let pwd = '';
  for (let i = 0; i < length; i += 1) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB for Clerk migration.');

    const atlasUsers = await User.find().lean();
    console.log(`Found ${atlasUsers.length} users in MongoDB.`);

    for (const atlasUser of atlasUsers) {
      const externalId = String(atlasUser._id);
      const email = normalizeUsernameToEmail(atlasUser.username, externalId);

      try {
        const existing = await getClerkUserByExternalId(externalId);
        if (Array.isArray(existing) && existing.length > 0) {
          console.log(`Clerk user already exists for externalId=${externalId}; skipping.`);
          continue;
        }
      } catch (err) {
        console.error(`Lookup failed for externalId=${externalId}: ${err.message}`);
        continue;
      }

      const normalizedUsername = atlasUser.username
        ? atlasUser.username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '')
            .slice(0, 30)
        : `user-${externalId}`;

      const clerkUsername = normalizedUsername || `user-${externalId}`;

      try {
        const created = await createClerkUser({ ...atlasUser, username: clerkUsername, email: email });

        if (!isEmail(atlasUser.username)) {
          console.log(`User _id=${externalId} had non-email username '${atlasUser.username}', fallback email '${email}' used.`);
        }

        console.log(`Migrated user from Mongo -> Clerk: _id=${atlasUser._id}, clerk_id=${created.id}`);
      } catch (err) {
        if (err && err.errors) {
          console.error(`Failed to create Clerk user for _id=${atlasUser._id}:`, JSON.stringify(err.errors));
        } else {
          console.error(`Failed to create Clerk user for _id=${atlasUser._id}: ${err?.message || err}`);
        }
      }
    }

    console.log('Clerk migration job completed.');
  } catch (err) {
    console.error('Migration setup error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
