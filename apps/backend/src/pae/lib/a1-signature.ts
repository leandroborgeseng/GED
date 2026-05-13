import { BadRequestException } from '@nestjs/common';
import { createVerify, X509Certificate } from 'node:crypto';

/** Payload canônico que o cliente deve assinar com a chave privada do certificado A1 (UTF-8). */
export function buildA1SignaturePayload(params: {
  processId: string;
  signatureId: string;
  documentSha256: string;
}): string {
  return `GED-PAE|v1|${params.processId}|${params.signatureId}|${params.documentSha256}`;
}

export function verifyA1DetachedSignature(params: {
  certificatePem: string;
  payloadUtf8: string;
  signatureBase64: string;
}): { subject: string; issuer: string; serialNumber: string; fingerprint256: string; validTo: string } {
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(params.certificatePem);
  } catch {
    throw new BadRequestException('Certificado PEM inválido.');
  }
  const now = new Date();
  if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) {
    throw new BadRequestException('Certificado fora do período de validade.');
  }
  const sigBuf = Buffer.from(params.signatureBase64, 'base64');
  const key = cert.publicKey;
  const type = key.asymmetricKeyType;
  let ok = false;
  if (type === 'rsa') {
    const v = createVerify('RSA-SHA256');
    v.update(params.payloadUtf8, 'utf8');
    v.end();
    ok = v.verify(key, sigBuf);
  } else if (type === 'ec') {
    const v = createVerify('SHA256');
    v.update(params.payloadUtf8, 'utf8');
    v.end();
    ok = v.verify(key, sigBuf);
  } else {
    throw new BadRequestException('Tipo de chave pública não suportado (use RSA ou EC).');
  }
  if (!ok) throw new BadRequestException('Assinatura digital não confere com o certificado.');
  return {
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    fingerprint256: cert.fingerprint256,
    validTo: cert.validTo,
  };
}
