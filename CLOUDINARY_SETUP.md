# Image Upload Setup with Cloudinary

## Why Cloudinary?

The app uploads images for:
- IDU screenshots
- Question images  
- Explanation images
- Message attachments

**Problem**: Vercel serverless doesn't have a writable filesystem
**Solution**: Cloud storage (Cloudinary - FREE tier)

## Cloudinary Free Tier
- ✅ 25GB storage (enough for ~200,000 images)
- ✅ 25GB bandwidth/month
- ✅ Automatic image optimization
- ✅ CDN delivery worldwide
- ✅ No credit card required

## Setup Instructions

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up (no credit card needed)
3. Verify your email

### 2. Get Your Credentials
After logging in:
1. Go to Dashboard (https://cloudinary.com/console)
2. You'll see:
   - **Cloud Name**: `dxxxxxxx`
   - **API Key**: `123456789012345`
   - **API Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Add to Environment Variables

#### Local Development
Add to `.env.local`:
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

#### Vercel Production
1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add three variables:
   - `CLOUDINARY_CLOUD_NAME` = your cloud name
   - `CLOUDINARY_API_KEY` = your API key
   - `CLOUDINARY_API_SECRET` = your API secret
3. Click "Save"
4. Redeploy your app

### 4. Test Upload
1. Go to Bulk Question Manager
2. Try uploading an IDU screenshot
3. Check Cloudinary Dashboard → Media Library to see uploaded images

## Image Organization

Images are automatically organized in folders:
- `qbank/idu/` - IDU screenshots
- `qbank/questions/` - Question images
- `qbank/explanations/` - Explanation images  
- `qbank/messages/` - Message attachments
- `qbank/comments/` - Comment images

## Migration Notes

**Existing local images** (stored in `/uploads/`) will not be accessible in production. You'll need to:
1. Set up Cloudinary
2. Re-upload images through the admin interface
3. Or bulk import from local storage (contact if you need this)

## Cost Estimate

For ~5000 images at 80-120KB each:
- Total storage: ~500MB (well within 25GB limit)
- Monthly bandwidth: Depends on traffic, but likely under 5GB
- **Cost: FREE** (Cloudinary free tier more than sufficient)

## Troubleshooting

### "Upload failed" error
- Check environment variables are set correctly
- Verify Cloudinary credentials in Dashboard
- Check Vercel deployment logs

### Images not displaying
- Cloudinary URLs look like: `https://res.cloudinary.com/your-cloud-name/image/upload/v1234/...`
- Check browser console for CORS errors
- Verify image URL is valid

### Need help?
- Cloudinary docs: https://cloudinary.com/documentation
- Support: https://support.cloudinary.com/
