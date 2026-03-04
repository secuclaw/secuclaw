import crypto from 'crypto';

const ID_PREFIXES: Record<string, string> = {
  user: 'usr',
  session: 'sess',
  saml: 'saml',
  saml_req: 'samlreq',
  saml_logout: 'samllgr',
  oidc_state: 'oidcst',
};

export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('base64url');
  const prefixStr = prefix ? (ID_PREFIXES[prefix] || prefix) + '_' : '';
  return `${prefixStr}${timestamp}_${random}`;
}

export function parseId(id: string): { prefix?: string; timestamp: number; random: string } {
  const underscoreIndex = id.indexOf('_');
  if (underscoreIndex === -1) {
    const timestampEnd = id.indexOf('_', 0);
    if (timestampEnd === -1) {
      return { timestamp: parseInt(id.substring(0, 8), 36), random: id.substring(8) };
    }
    return { timestamp: parseInt(id.substring(0, timestampEnd), 36), random: id.substring(timestampEnd + 1) };
  }
  
  const prefix = id.substring(0, underscoreIndex);
  const remainder = id.substring(underscoreIndex + 1);
  const secondUnderscore = remainder.indexOf('_');
  
  if (secondUnderscore === -1) {
    return { prefix, timestamp: parseInt(remainder.substring(0, 8), 36), random: remainder.substring(8) };
  }
  
  return {
    prefix,
    timestamp: parseInt(remainder.substring(0, secondUnderscore), 36),
    random: remainder.substring(secondUnderscore + 1),
  };
}
