const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'logs');
fs.mkdirSync(dir, { recursive: true });
const stream = fs.createWriteStream(path.join(dir, 'access.log'), { flags: 'a' });

// Minimal request logger: console + logs/access.log
module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`;
    stream.write(line + '\n');
    if (process.env.NODE_ENV !== 'test') console.log(line);
  });
  next();
};
