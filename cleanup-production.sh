#!/bin/bash

# Production Cleanup Script for LaxmiPowerTech Frontend
# Run this before deployment

echo "🚀 Starting Production Cleanup..."
echo ""

# 1. Remove console.logs (keeping console.error for critical errors)
echo "📝 Step 1: Removing console.log and console.warn statements..."
find src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i '' -E '/console\.(log|warn)\(/d' {} +
echo "✅ Console logs removed"
echo ""

# 2. Remove backup files
echo "🗑️  Step 2: Removing backup/old files..."
rm -rf src/backup/
rm -f src/pages/TaskSubmissionOld.jsx
rm -f src/pages/SubcontractorAttendanceDashboard.jsx.backup 2>/dev/null
rm -f src/pages/LabourAttendanceDashboard.jsx.backup 2>/dev/null
echo "✅ Backup files removed"
echo ""

# 3. Remove unused Chakra UI
echo "📦 Step 3: Removing unused dependencies..."
npm uninstall @chakra-ui/react @emotion/react --save
echo "✅ Chakra UI removed"
echo ""

# 4. Create .env.example
echo "📄 Step 4: Creating .env.example..."
cat > .env.example << 'EOF'
# API Configuration
VITE_API_BASE_URL=https://your-backend-url.com/api

# Google Maps (if needed)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here

# Other configurations
# Add any other environment variables your app needs
EOF
echo "✅ .env.example created"
echo ""

# 5. Build test
echo "🏗️  Step 5: Testing production build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - fix errors before deploying"
    exit 1
fi
echo ""

# 6. Check bundle size
echo "📊 Step 6: Checking bundle size..."
du -sh dist/
echo ""

echo "✨ Cleanup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review PRE_DEPLOYMENT_AUDIT_REPORT.md"
echo "2. Test the app: npm run preview"
echo "3. Verify all pages work"
echo "4. Check API integration"
echo "5. Deploy to staging first"
echo ""
echo "🚀 Ready for deployment!"
