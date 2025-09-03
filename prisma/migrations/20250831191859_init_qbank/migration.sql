-- CreateEnum Role (idempotent, shadow-safe, schema-local)
DO $$
DECLARE
  is_shadow boolean := current_schema = '_prisma_migrate_shadow';
  tname text := 'Role';
  t_exists boolean;
BEGIN
  -- If a prior failed shadow run left the enum in the SHADOW schema, drop it there.
  IF is_shadow THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      WHERE t.typname = tname
        AND t.typnamespace = current_schema::regnamespace
    ) INTO t_exists;

    IF t_exists THEN
      EXECUTE 'DROP TYPE "' || tname || '" CASCADE';
    END IF;
  END IF;

  -- Create or reconcile enum in the CURRENT schema (shadow when diffing, public when applying)
  BEGIN
    EXECUTE 'CREATE TYPE "' || tname || '" AS ENUM (''User'',''Admin'',''MASTER_ADMIN'')';
  EXCEPTION
    WHEN duplicate_object THEN
      -- Ensure MASTER_ADMIN exists
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = current_schema::regnamespace
          AND e.enumlabel = 'MASTER_ADMIN'
      ) THEN
        EXECUTE 'ALTER TYPE "' || tname || '" ADD VALUE ''MASTER_ADMIN''';
      END IF;
  END;
END
$$;

-- CreateEnum QuizMode (idempotent, shadow-safe, schema-local)
DO $$
DECLARE
  is_shadow boolean := current_schema = '_prisma_migrate_shadow';
  tname text := 'QuizMode';
  t_exists boolean;
BEGIN
  IF is_shadow THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      WHERE t.typname = tname
        AND t.typnamespace = current_schema::regnamespace
    ) INTO t_exists;

    IF t_exists THEN
      EXECUTE 'DROP TYPE "' || tname || '" CASCADE';
    END IF;
  END IF;

  BEGIN
    EXECUTE 'CREATE TYPE "' || tname || '" AS ENUM (''RANDOM'',''CUSTOM'',''EXAM'')';
  EXCEPTION
    WHEN duplicate_object THEN
      -- Ensure labels exist (no-op if present)
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = current_schema::regnamespace
          AND e.enumlabel = 'RANDOM'
      ) THEN
        EXECUTE 'ALTER TYPE "' || tname || '" ADD VALUE ''RANDOM''';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = current_schema::regnamespace
          AND e.enumlabel = 'CUSTOM'
      ) THEN
        EXECUTE 'ALTER TYPE "' || tname || '" ADD VALUE ''CUSTOM''';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = tname
          AND t.typnamespace = current_schema::regnamespace
          AND e.enumlabel = 'EXAM'
      ) THEN
        EXECUTE 'ALTER TYPE "' || tname || '" ADD VALUE ''EXAM''';
      END IF;
  END;
END
$$;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'User',
    "gradYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Rotation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Rotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "QuizMode" NOT NULL,
    "count" INTEGER NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizItem" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER,

    CONSTRAINT "QuizItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "quizItemId" TEXT NOT NULL,
    "choiceId" TEXT,
    "isCorrect" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT,
    "questionId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Rotation_name_key" ON "Rotation"("name");

-- CreateIndex
CREATE INDEX "Rotation_name_idx" ON "Rotation"("name");

-- CreateIndex
CREATE INDEX "Question_rotationId_idx" ON "Question"("rotationId");

-- CreateIndex
CREATE INDEX "Choice_questionId_idx" ON "Choice"("questionId");

-- CreateIndex
CREATE INDEX "Quiz_userId_idx" ON "Quiz"("userId");

-- CreateIndex
CREATE INDEX "QuizItem_quizId_idx" ON "QuizItem"("quizId");

-- CreateIndex
CREATE INDEX "QuizItem_questionId_idx" ON "QuizItem"("questionId");

-- CreateIndex
CREATE INDEX "Response_quizItemId_idx" ON "Response"("quizItemId");

-- CreateIndex
CREATE INDEX "Response_choiceId_idx" ON "Response"("choiceId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_quizId_idx" ON "Feedback"("quizId");

-- CreateIndex
CREATE INDEX "Feedback_questionId_idx" ON "Feedback"("questionId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizItem" ADD CONSTRAINT "QuizItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizItem" ADD CONSTRAINT "QuizItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_quizItemId_fkey" FOREIGN KEY ("quizItemId") REFERENCES "QuizItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "Choice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
