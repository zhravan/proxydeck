ALTER TABLE "user"
  ADD COLUMN "role" text NOT NULL DEFAULT 'viewer';

-- Preserve the first existing account as the instance administrator.
WITH first_user AS (
  SELECT "id" FROM "user" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1
)
UPDATE "user" SET "role" = 'admin'
WHERE "id" IN (SELECT "id" FROM first_user);

ALTER TABLE "user"
  ADD CONSTRAINT "user_role_check" CHECK ("role" IN ('admin','operator','viewer'));
