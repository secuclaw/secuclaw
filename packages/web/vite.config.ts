import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Copy skills folder to public during build
function copySkills() {
  const srcDir = join(__dirname, '../../skills')
  const destDir = join(__dirname, 'public/skills')
  
  if (!existsSync(srcDir)) return
  
  // Create destination directory
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }
  
  // Copy all skill folders
  const items = readdirSync(srcDir)
  for (const item of items) {
    const srcPath = join(srcDir, item)
    const destPath = join(destDir, item)
    
    if (statSync(srcPath).isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true })
      }
      const files = readdirSync(srcPath)
      for (const file of files) {
        if (file.endsWith('.md')) {
          copyFileSync(join(srcPath, file), join(destPath, file))
        }
      }
    }
  }
  console.log('Copied skills to public folder')
}

export default defineConfig({
  esbuild: {
    target: 'es2020',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:21000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
  plugins: [
    {
      name: 'copy-skills',
      closeBundle() {
        copySkills()
      }
    }
  ]
})
