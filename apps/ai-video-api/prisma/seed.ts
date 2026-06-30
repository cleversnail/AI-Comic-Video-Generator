import { execSync } from 'child_process';

execSync('npx ts-node prisma/seeds/models.seed.ts', { stdio: 'inherit' });
