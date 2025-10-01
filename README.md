# QBank - Medical Question Bank Platform# QBank - AI-Powered Question Extraction System



A comprehensive medical education platform built with Next.js and PostgreSQL.This is a [Next.js](https://nextjs.org) project with an advanced AI question extraction backend, featuring enhanced structure detection for tables and images.



## Getting Started## Features



First, install dependencies:### Core Functionality

- **Next.js Frontend**: Modern React-based user interface

```bash- **AI Question Extraction**: Multi-stage AI pipeline for extracting questions from screenshots

npm install- **Structure Detection**: Advanced table and image extraction with layout analysis

```- **Multiple AI Models**: Donut, OpenCLIP, LayoutParser, and Table Transformer integration



Then, run the development server:### Enhanced Structure Module

- **Layout Detection**: Uses LayoutParser with Detectron2 for detecting tables, figures, and text blocks

```bash- **Table Structure Recognition (TSR)**: Microsoft Table Transformer and PaddleOCR backends for converting table images to HTML

npm run dev- **Attachment Assignment**: Smart assignment of tables/images to question vs explanation sections

# or with faster Turbopack- **Bold Text Detection**: Advanced stroke width analysis and OCR integration for formatting detection

npm run dev:turbo- **Configurable Processing**: YAML-based configuration for all processing parameters

```

## Getting Started

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Supabase (default runtime database)

## Environment Setup

By default the app connects to the Supabase Postgres instance shared with production. The required connection strings are already present in `.env` and `.env.local`:

Copy `.env.example` to `.env.local` and configure your environment variables:

```

```envDATABASE_URL=postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?sslmode=require

DATABASE_URL="your_database_url_here"DIRECT_DATABASE_URL=postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?sslmode=require

NEXTAUTH_SECRET="your_secret_here"PRISMA_MIGRATION_SHADOW_DATABASE_URL=postgresql://postgres:K12482s%24031231%5E@db.wmlizlldqmsbvguhftgi.supabase.co:5432/postgres?schema=_prisma_migrate_shadow&sslmode=require

``````



## Database SetupTo verify connectivity any time:



The application uses Prisma with PostgreSQL:```bash

npx prisma db pull

```bash```

# Run database migrations

npx prisma migrate devIf this command succeeds, Supabase is reachable and the app will boot without the Prisma P1001 error. Use `npm run start:standalone` (which runs `node .next/standalone/server.js`) to mirror the production launch target.



# Generate Prisma client### Optional: Local Docker Postgres for offline dev

npx prisma generate

If you need to work without touching Supabase, a Dockerized Postgres service is still available. Copy the helper file and override the URLs locally:

# (Optional) Seed the database

npx prisma db seed1. ```bash

```   cp .env.local.docker .env.local

   ```

## Production Deployment   (On Windows PowerShell use `Copy-Item .env.local.docker .env.local`).



Build the application for production:2. Start the container and run migrations:

   ```bash

```bash   docker compose up -d postgres

npm run build   npx prisma migrate deploy

npm start   ```

```

3. When you want to switch back to Supabase, restore `.env.local` from source control or recopy from `.env`.

## Key Features

Stop the container with `docker compose down` when you are done working locally.

- **Multi-year Medical Questions**: Comprehensive question bank for different medical years

- **User Management**: Role-based access control with admin capabilities### Frontend Development

- **Progress Tracking**: User progress and performance analytics

- **Modern UI**: Clean, responsive design with animated backgroundsFirst, run the development server:



## Available Scripts```bash

npm run dev

- **Database Management**: Scripts for backup, restore, and migration# or

- **User Management**: Admin role management and user data toolsyarn dev

- **Development**: Testing utilities and development helpers# or

pnpm dev

## Learn More# or

bun dev

- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework features```

- [Prisma Documentation](https://www.prisma.io/docs) - Database toolkit

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Previewing the Production Build

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
Next.js is configured with `output: "standalone"`. To test the compiled app locally:

1. Build the project
  ```bash
  npm run build
  ```
2. Start the standalone server
  ```bash
  npm run start:standalone
  ```

`next start` will emit a warning in this setup. Using the standalone server mirrors how the app runs in production and respects the local Prisma database fallback.

## Development Tools

The application includes various development utilities for database management and testing:

### Components

1. **Layout Detection** (`structure/layout_detect.py`)
   - Uses LayoutParser with PubLayNet model
   - Detects tables, figures, and text blocks
   - Configurable confidence thresholds and area filtering

2. **Table Structure Recognition** (`structure/table_tsr.py`)
   - **Table Transformer Backend**: Microsoft's DETR-based model for table HTML generation
   - **PaddleOCR Backend**: PP-StructureV3 for complete table processing
   - Fallback HTML generation for failed extractions

3. **Attachment Assignment** (`structure/attach_assign.py`)
   - Text similarity matching for question/explanation sections
   - Spatial proximity analysis for element assignment
   - Configurable assignment margins and thresholds

4. **Cropping Utilities** (`structure/crop_utils.py`)
   - PIL-based image cropping from layout blocks
   - Automatic crop saving with organized naming
   - Bounding box coordinate handling

5. **Bold Text Detection** (`style/bold_detect.py`)
   - **Thickness Backend**: Stroke Width Transform (SWT) and morphological analysis
   - **OCR Integration**: PaddleOCR and EasyOCR support for precise word detection
   - **Smart Assignment**: Text similarity and spatial analysis for section assignment
   - **Formatting Spans**: Continuous text regions with consistent styling

### Standalone Usage

Test structure detection independently:

```bash
cd ai-question-extractor
python structure/run_structure.py --image sample.png --backend tatr --enable-bold --out results.json
```

Test bold detection specifically:

```bash
python style/bold_detect.py sample.png thickness 1.5
```

### Testing

Run the comprehensive test suite:

```bash
cd ai-question-extractor
python -m pytest tests/test_structure.py -v
```

Evaluate table extraction quality:

```bash
python tests/eval_tables.py --gold gold_tables.json --pred predicted_tables.json --output eval_results.json
```

### Configuration

Key configuration options in `config.yaml`:

```yaml
# Backend selection
structure_backend: "tatr"  # or "ppstruct"

# Detection thresholds
table_detection:
  min_area: 1500
  
figure_detection:
  min_area: 1000

# Assignment settings
attachment_assignment:
  margin_px: 40
  similarity_threshold: 0.3

# Bold text detection
bold_detection:
  backend: "thickness"  # or "classifier"
  thickness_threshold: 1.5
  enable: true
  
# Output settings
output:
  crops_dir: "data/crops"
  save_crops: true
```

### Enhanced JSON Schema

The structure module extends the base JSON output with rich attachment data:

```json
{
  "question": "...",
  "choices": [...],
  "explanation": "...",
  "attachments": {
    "question": {
      "tables": [{"html": "...", "title": "...", "bbox": [0,0,0,0]}],
      "images": [{"path": "...", "alt": "...", "bbox": [0,0,0,0]}]
    },
    "explanation": {
      "tables": [...],
      "images": [...]
    }
  },
  "formatting": {
    "question": [{"text": "...", "bbox": [0,0,0,0], "bold": false}],
    "explanation": [{"text": "...", "bbox": [0,0,0,0], "bold": true}]
  }
}
```

## API Endpoints

### Question Extraction
- `POST /extract/upload` - Extract from uploaded image file
- `POST /extract/base64` - Extract from base64 image data

Both endpoints now include enhanced structure detection when available.

## Architecture

```
Frontend (Next.js) 
    ↓ HTTP API
AI Server (FastAPI)
    ↓ Multi-stage pipeline
┌─ Stage A: Template Detection (OpenCLIP)
├─ Stage B: Field Extraction (Donut)
└─ Stage C: Structure Enhancement (LayoutParser + Table Transformer)
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework features
- [LayoutParser Documentation](https://layout-parser.readthedocs.io/) - Layout detection
- [Table Transformer](https://huggingface.co/microsoft/table-transformer-structure-recognition-v1.1-all) - Table structure recognition
- [PaddleOCR Documentation](https://paddleocr.readthedocs.io/) - Alternative OCR backend

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
