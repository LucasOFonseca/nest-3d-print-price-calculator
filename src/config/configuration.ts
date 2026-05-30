import 'dotenv/config';

export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: { url: process.env.DATABASE_URL },
  frontend: { url: process.env.FRONTEND_URL || 'http://localhost:3000' },
});
