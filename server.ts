import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const db = new Database('garage.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS motorcycles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    modifications TEXT,
    image TEXT,
    engine TEXT,
    power TEXT,
    torque TEXT,
    weight TEXT,
    topSpeed TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.post('/api/upload', (req, res) => {
    console.log('--- Base64 Upload Start ---');
    const { image, fileName } = req.body;

    if (!image || !fileName) {
      return res.status(400).json({ error: 'Missing image data or file name' });
    }

    try {
      // Remove header (e.g., data:image/png;base64,)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      
      const fileExt = path.extname(fileName) || '.jpg';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newFileName = uniqueSuffix + fileExt;
      const filePath = path.join(uploadsDir, newFileName);

      fs.writeFileSync(filePath, buffer);
      
      const imageUrl = `/uploads/${newFileName}`;
      console.log('Generated URL:', imageUrl);
      res.json({ imageUrl });
    } catch (error) {
      console.error('Base64 Upload Error:', error);
      res.status(500).json({ error: 'Failed to save uploaded image' });
    }
  });

  app.get('/api/motorcycles', (req, res) => {
    try {
      const bikes = db.prepare('SELECT * FROM motorcycles ORDER BY created_at DESC').all();
      // Map flat DB structure back to nested specs object
      const formattedBikes = bikes.map((bike: any) => ({
        id: bike.id,
        name: bike.name,
        category: bike.category,
        year: bike.year,
        description: bike.description,
        modifications: bike.modifications,
        image: bike.image,
        specs: {
          engine: bike.engine,
          power: bike.power,
          torque: bike.torque,
          weight: bike.weight,
          topSpeed: bike.topSpeed
        }
      }));
      res.json(formattedBikes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch motorcycles' });
    }
  });

  app.post('/api/motorcycles', (req, res) => {
    const bike = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO motorcycles (id, name, category, year, description, modifications, image, engine, power, torque, weight, topSpeed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        bike.id,
        bike.name,
        bike.category,
        bike.year,
        bike.description,
        bike.modifications,
        bike.image,
        bike.specs.engine,
        bike.specs.power,
        bike.specs.torque,
        bike.specs.weight,
        bike.specs.topSpeed
      );
      res.status(201).json(bike);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add motorcycle' });
    }
  });

  app.put('/api/motorcycles/:id', (req, res) => {
    const { id } = req.params;
    const bike = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE motorcycles 
        SET name = ?, category = ?, year = ?, description = ?, modifications = ?, image = ?, 
            engine = ?, power = ?, torque = ?, weight = ?, topSpeed = ?
        WHERE id = ?
      `);
      stmt.run(
        bike.name,
        bike.category,
        bike.year,
        bike.description,
        bike.modifications,
        bike.image,
        bike.specs.engine,
        bike.specs.power,
        bike.specs.torque,
        bike.specs.weight,
        bike.specs.topSpeed,
        id
      );
      res.json(bike);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update motorcycle' });
    }
  });

  app.post('/api/motorcycles/:id/delete', (req, res) => {
    const { id } = req.params;
    console.log('DELETE (POST) request for ID:', id);
    try {
      // Log all IDs to see what's in the DB
      const allIds = db.prepare('SELECT id FROM motorcycles').all().map((row: any) => row.id);
      console.log('Current IDs in DB:', allIds);

      const result = db.prepare('DELETE FROM motorcycles WHERE id = ?').run(id);
      console.log('Delete result:', result);
      
      if (result.changes > 0) {
        res.status(200).json({ success: true });
      } else {
        console.warn(`ID ${id} not found in DB. Available IDs:`, allIds);
        res.status(404).json({ error: `Motorcycle with ID ${id} not found` });
      }
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete motorcycle' });
    }
  });

  app.delete('/api/motorcycles/:id', (req, res) => {
    const { id } = req.params;
    console.log('DELETE request for ID:', id);
    try {
      const result = db.prepare('DELETE FROM motorcycles WHERE id = ?').run(id);
      if (result.changes > 0) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Motorcycle not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  // Seeding logic removed - user will add their own data
  
  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error' 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
