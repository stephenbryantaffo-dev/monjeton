# Utilisation :
# 1. Récupérer l'id d'un utilisateur test dans la table profiles de Supabase
# 2. Exporter les variables :
#    export JEKO_WEBHOOK_SECRET="le_secret_webhook"
#    export TEST_USER_ID="uuid_de_l_utilisateur_test"
# 3. Lancer : node test-webhook.js
# 4. Vérifier dans Supabase que le profil est bien passé au plan Pro

const crypto = require('crypto');
const https = require('https');

const WEBHOOK_URL = 'https://xmganxsmfvcbuffeelej.supabase.co/functions/v1/jeko-webhook';

const secret = process.env.JEKO_WEBHOOK_SECRET;
const testUserId = process.env.TEST_USER_ID;

if (!secret) {
  console.error('❌ Variable d\'environnement manquante : JEKO_WEBHOOK_SECRET');
  process.exit(1);
}

if (!testUserId) {
  console.error('❌ Variable d\'environnement manquante : TEST_USER_ID');
  process.exit(1);
}

const timestamp = Date.now();

const payload = {
  id: 'txn_test_' + timestamp,
  amount: { amount: 10000, currency: 'XOF' },
  fees: { amount: 100, currency: 'XOF' },
  status: 'success',
  counterpartLabel: 'Test User',
  counterpartIdentifier: '+2250700000000',
  paymentMethod: 'wave',
  transactionType: 'PaymentRequest',
  businessName: 'Mon Jeton',
  storeName: 'Test Store',
  description: 'Test abonnement Pro',
  executedAt: '2025-01-01 12:00:00',
  transactionDetails: {
    id: 'pr_test_' + timestamp,
    reference: testUserId,
    paymentLinkId: null,
  },
};

// Sérialisation unique et stable : la signature porte sur ces octets exacts
const rawBody = JSON.stringify(payload);

const signature = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

console.log('Payload envoyé :');
console.log(rawBody);
console.log('Signature Jeko-Signature :', signature);

const url = new URL(WEBHOOK_URL);

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Jeko-Signature': signature,
    'Content-Length': Buffer.byteLength(rawBody),
  },
};

const req = https.request(options, (res) => {
  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('\nStatus code :', res.statusCode);
    console.log('Réponse :', responseBody);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✅ Succès : le webhook a été accepté.');
    } else {
      console.log('\n❌ Échec : le webhook a été rejeté.');
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Erreur réseau :', err.message);
  process.exit(1);
});

req.write(rawBody);
req.end();
