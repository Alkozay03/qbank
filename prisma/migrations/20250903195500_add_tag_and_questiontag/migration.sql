-- CreateEnum TagType (idempotent, PUBLIC schema)
DO $$
DECLARE
  ns        regnamespace := 'public'::regnamespace;
  tname     text := 'TagType';
  exists_t  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    WHERE t.typname = tname AND t.typnamespace = ns
  ) INTO exists_t;
  IF NOT exists_t THEN
    EXECUTE 'CREATE TYPE public."' || tname || '" AS ENUM (''SUBJECT'',''SYSTEM'',''TOPIC'',''ROTATION'',''RESOURCE'',''MODE'')';
  END IF;
END
$$;

-- Create table Tag (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Tag'
  ) THEN
    EXECUTE $CT$
      CREATE TABLE public."Tag" (
        "id"    TEXT PRIMARY KEY,
        "type"  public."TagType" NOT NULL,
        "value" TEXT NOT NULL
      )
    $CT$;
  END IF;
END
$$;

-- Unique constraint on (type, value)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Tag_type_value_key'
  ) THEN
    CREATE UNIQUE INDEX "Tag_type_value_key" ON public."Tag"("type","value");
  END IF;
END
$$;

-- Create table QuestionTag (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'QuestionTag'
  ) THEN
    EXECUTE $CT$
      CREATE TABLE public."QuestionTag" (
        "questionId" TEXT NOT NULL,
        "tagId"      TEXT NOT NULL,
        CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("questionId","tagId")
      )
    $CT$;
  END IF;
END
$$;

-- FKs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuestionTag_questionId_fkey'
  ) THEN
    ALTER TABLE public."QuestionTag"
      ADD CONSTRAINT "QuestionTag_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES public."Question"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuestionTag_tagId_fkey'
  ) THEN
    ALTER TABLE public."QuestionTag"
      ADD CONSTRAINT "QuestionTag_tagId_fkey"
      FOREIGN KEY ("tagId") REFERENCES public."Tag"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

