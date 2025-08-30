/*
  Warnings:

  - The values [REVIEW] on the enum `QuestionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [EDITOR,REVIEWER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lastEditorId` on the `Explanation` table. All the data in the column will be lost.
  - You are about to drop the column `references` on the `Explanation` table. All the data in the column will be lost.
  - You are about to drop the column `explainedAt` on the `Response` table. All the data in the column will be lost.
  - You are about to drop the column `timeMs` on the `Response` table. All the data in the column will be lost.
  - You are about to drop the `QuestionTopic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."QuestionStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
ALTER TABLE "public"."Question" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Question" ALTER COLUMN "status" TYPE "public"."QuestionStatus_new" USING ("status"::text::"public"."QuestionStatus_new");
ALTER TYPE "public"."QuestionStatus" RENAME TO "QuestionStatus_old";
ALTER TYPE "public"."QuestionStatus_new" RENAME TO "QuestionStatus";
DROP TYPE "public"."QuestionStatus_old";
ALTER TABLE "public"."Question" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('STUDENT', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuestionTopic" DROP CONSTRAINT "QuestionTopic_questionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuestionTopic" DROP CONSTRAINT "QuestionTopic_topicId_fkey";

-- DropForeignKey
ALTER TABLE "public"."QuizItem" DROP CONSTRAINT "QuizItem_quizId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Response" DROP CONSTRAINT "Response_quizItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Topic" DROP CONSTRAINT "Topic_rotationId_fkey";

-- AlterTable
ALTER TABLE "public"."Explanation" DROP COLUMN "lastEditorId",
DROP COLUMN "references";

-- AlterTable
ALTER TABLE "public"."Quiz" ALTER COLUMN "count" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Response" DROP COLUMN "explainedAt",
DROP COLUMN "timeMs",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerified" TIMESTAMP(3);

-- DropTable
DROP TABLE "public"."QuestionTopic";

-- DropTable
DROP TABLE "public"."Topic";

-- CreateIndex
CREATE INDEX "Choice_questionId_idx" ON "public"."Choice"("questionId");

-- CreateIndex
CREATE INDEX "QuizItem_quizId_idx" ON "public"."QuizItem"("quizId");

-- CreateIndex
CREATE INDEX "QuizItem_questionId_idx" ON "public"."QuizItem"("questionId");

-- CreateIndex
CREATE INDEX "Response_quizItemId_idx" ON "public"."Response"("quizItemId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."QuizItem" ADD CONSTRAINT "QuizItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_quizItemId_fkey" FOREIGN KEY ("quizItemId") REFERENCES "public"."QuizItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
