-- Renomeia coluna do motor documental Mayan → Paperless-ngx
ALTER TABLE "ProcessDocument" RENAME COLUMN "mayanDocumentId" TO "paperlessDocumentId";
