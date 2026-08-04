import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  target: 'node20',
  sourcemap: true,
  external: [
    'mongoose',
    '@sendgrid/mail',
    'cloudinary',
    'ioredis',
    'bullmq',
    'multer-storage-cloudinary',
    'pdf-parse',
    'nodemailer',
    'swagger-ui-express',
  ],
  banner: {
    js: 'import{createRequire}from"module";const require=createRequire(import.meta.url);',
  },
});

console.log('✅ Build successful: dist/index.js');
