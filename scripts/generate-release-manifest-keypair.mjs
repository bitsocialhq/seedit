import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

console.log('# Store this PEM as the GitHub secret RELEASE_MANIFEST_PRIVATE_KEY_PEM.');
console.log(privateKey.export({ format: 'pem', type: 'sec1' }).toString().trim());
console.log('\n# Commit this public JWK in the verifier that pins the release signing key.');
console.log(JSON.stringify(publicKey.export({ format: 'jwk' }), null, 2));
