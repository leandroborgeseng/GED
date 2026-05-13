-- Política de assinatura por usuário (A1 vs simples)
CREATE TYPE "UserSignaturePolicy" AS ENUM ('SIMPLES', 'ICP_A1');

ALTER TABLE "User" ADD COLUMN "signaturePolicy" "UserSignaturePolicy" NOT NULL DEFAULT 'SIMPLES';
