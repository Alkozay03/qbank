-- CreateTable
CREATE TABLE "public"."Rotation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Rotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rotation_name_key" ON "public"."Rotation"("name");
