import fs from 'node:fs';
import { Client } from 'pg';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('.env.local');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

const emailArg = process.argv[2];
const tierArg = process.argv[3] || 'elite'; // free, basic, pro, elite
const coinsArg = process.argv[4] !== undefined ? parseInt(process.argv[4], 10) : 5000;
const creditsArg = process.argv[5] !== undefined ? parseInt(process.argv[5], 10) : 100;

if (!emailArg) {
  console.error('Usage: node scripts/set-premium.mjs <email> [tier] [coins] [ia_credits]');
  console.error('Example: node scripts/set-premium.mjs student@test.com elite 10000 500');
  process.exit(1);
}

const validTiers = ['free', 'basic', 'pro', 'elite'];
if (!validTiers.includes(tierArg.toLowerCase())) {
  console.error(`Invalid tier "${tierArg}". Valid tiers are: ${validTiers.join(', ')}`);
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const email = emailArg.toLowerCase().trim();
    console.log(`Recherche de l'utilisateur : ${email}`);

    const userRes = await client.query(
      'select id, name, email, subscription_tier from public.app_users where lower(email) = $1 limit 1',
      [email]
    );

    if (userRes.rows.length === 0) {
      console.error(`Erreur : Utilisateur avec l'email "${email}" introuvable.`);
      console.error('Assurez-vous que l\'utilisateur s\'est connecté au moins une fois sur l\'application mobile pour créer son profil.');
      process.exit(1);
    }

    const user = userRes.rows[0];
    const isPremium = tierArg.toLowerCase() !== 'free';
    const expiresAt = isPremium ? "now() + interval '365 days'" : 'null';

    console.log(`Mise à jour de l'utilisateur ${user.name} (${user.email})...`);

    // Update user subscription
    const updatedUser = await client.query(
      `update public.app_users
       set subscription_tier = $2,
           subscription_expires_at = ${expiresAt},
           updated_at = now()
       where id = $1
       returning id, name, email, subscription_tier, subscription_expires_at`,
      [user.id, tierArg.toLowerCase()]
    );

    // Update or ensure wallet
    const walletRes = await client.query(
      `insert into public.app_wallets (user_id, balance_coins, ia_credits, updated_at)
       values ($1, $2, $3, now())
       on conflict (user_id) do update set
         balance_coins = $2,
         ia_credits = $3,
         updated_at = now()
       returning balance_coins, ia_credits`,
      [user.id, coinsArg, creditsArg]
    );

    // Add transaction log
    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'purchase', 0, $2, 'success')`,
      [user.id, `admin_force_${tierArg.toLowerCase()}`]
    );

    console.log('\n=== MISE À JOUR EFFECTUÉE AVEC SUCCÈS ===');
    console.log(`Nom : ${updatedUser.rows[0].name}`);
    console.log(`Email : ${updatedUser.rows[0].email}`);
    console.log(`Abonnement : ${updatedUser.rows[0].subscription_tier.toUpperCase()}`);
    console.log(`Expiration : ${updatedUser.rows[0].subscription_expires_at ? new Date(updatedUser.rows[0].subscription_expires_at).toLocaleDateString() : 'N/A'}`);
    console.log(`Coins : ${walletRes.rows[0].balance_coins}`);
    console.log(`Crédits IA : ${walletRes.rows[0].ia_credits}`);
    console.log('==========================================');

  } catch (err) {
    console.error('Erreur durant la transaction :', err);
  } finally {
    await client.end();
  }
}

run();
