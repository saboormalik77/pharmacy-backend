# Recommended .cursorignore Additions

Add these lines to your existing `.cursorignore` file to reduce token usage:

```
# Large document and media files (not needed for code context)
*.pdf
*.doc
*.docx
*.xls
*.xlsx
*.ppt
*.pptx
*.jpg
*.jpeg
*.png
*.gif
*.svg
*.ico
*.webp
*.mp4
*.avi
*.mov
*.wmv
*.zip
*.rar
*.tar
*.gz
*.bz2
*.7z

# Large reference documents and plans (reduce noise)
*_GUIDE.md
*_PLAN.md
*_IMPLEMENTATION.md
*_SPEC.md
*_SUMMARY.md
*_ANALYSIS.md
*_DEPLOYMENT.md
*_SETUP.md
*_DOC.md
DEVELOPMENT_GUIDE_*.md
SYSTEM_*.md
NEXT_STEPS_*.md
meetingdiscussionwithclient.txt
chunksresponses.txt
suggestions.txt
supabaseedgedeploy.txt
returnreports.pdf

# Data and backup directories
reportpdf/
screenshots/
files/
data/
datasets/
backups/
pahrmacy data/

# Scripts and examples that aren't core functionality
example-*.js
test-*.js
sample-*.js
demo-*.js
fix-*.js
debug-*.js
debug-*.sql
optimization_*.json
ndc_search_*.json
*-debug.log*
*-error.log*

# Configuration files that rarely change
.prettierrc
.prettierignore
.editorconfig
.gitattributes
commitlint.config.js
lint-staged.config.js
nixpacks.toml
railway.json
vercel.json
.railwayignore
.vercelignore
.npmrc
Procfile

# Supabase generated files
supabase/.branches/
supabase/.temp/
*.pnp.*

# Terminal output files (these can be very large)
terminals/
**/*.txt

# Keep essential files visible
!README.md
!package.json
!tsconfig.json
!CHECKS_IMPLEMENTATION_PLAN.md
!PHASE_3_4_5_IMPLEMENTATION_SUMMARY.md
!IMPLEMENTATION_SUMMARY.md
```

## Manual Steps Required:

1. **Add to Root .cursorignore**: Copy the above content and append it to your existing `/home/saboor.malik@2bvision.com/2bvt/pharmacy-backend/.cursorignore` file

2. **Create Frontend .cursorignore**: Create `/home/saboor.malik@2bvision.com/2bvision.com/2bvt/pharmacy-backend/Frontend/.cursorignore` with:
```
# Frontend-specific ignores
.next/
out/
build/
dist/
node_modules/
.eslintcache
.turbo/
*.log
.env*
!.env.example
*.tsbuildinfo
.vscode/
.idea/
.DS_Store
Thumbs.db
*.png
*.jpg
*.jpeg
*.gif
*.svg
*.ico
*.webp
coverage/
storybook-static/
```

3. **Create MainAdmin .cursorignore**: Create `/home/saboor.malik@2bvision.com/2bvt/pharmacy-backend/MainAdmin/.cursorignore` with similar content

This will significantly reduce the token usage by excluding:
- All PDF files and media assets
- Large documentation files  
- Node modules and build outputs
- Debug scripts and temporary files
- Data directories and backups
- Configuration files that rarely change

The ignore rules will keep essential code files while excluding the noise that consumes tokens unnecessarily.