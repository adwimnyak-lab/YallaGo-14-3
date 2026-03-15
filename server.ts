import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDb } from './src/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  initDb();
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Registration
  app.post('/api/register', (req, res) => {
    const { email, password, name, role, phone } = req.body;
    try {
      const result = db.prepare('INSERT INTO users (email, password, name, role, phone) VALUES (?, ?, ?, ?, ?)')
        .run(email, password, name, role, phone);
      
      const user = db.prepare('SELECT id, email, name, role, phone FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
      res.json({ success: true, user });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ success: false, message: 'Email already exists' });
      } else {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    }
  });

  // Basic Auth (Mock for now, will expand later)
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (user && user.password === password) {
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  // Restaurant Management
  app.post('/api/restaurants', (req, res) => {
    const { ownerId, name, description, image_url, address, region, rating, phone } = req.body;
    try {
      const result = db.prepare('INSERT INTO restaurants (owner_id, name, description, image_url, address, region, rating, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(ownerId || 1, name, description, image_url, address, region, rating || 0, phone);
      
      const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, restaurant });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.delete('/api/restaurants/:id', (req, res) => {
    const { id } = req.params;
    try {
      // Soft delete by setting is_active to 0
      const result = db.prepare('UPDATE restaurants SET is_active = 0 WHERE id = ?').run(id);
      
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: 'Restaurant not found' });
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  });

  app.get('/api/my-restaurants/:ownerId', (req, res) => {
    const restaurants = db.prepare('SELECT * FROM restaurants WHERE owner_id = ?').all(req.params.ownerId);
    res.json(restaurants);
  });

  app.patch('/api/restaurants/:id', (req, res) => {
    const { name, description, image_url, address, region } = req.body;
    try {
      db.prepare(`
        UPDATE restaurants 
        SET name = ?, description = ?, image_url = ?, address = ?, region = ? 
        WHERE id = ?
      `).run(name, description, image_url, address, region, req.params.id);
      
      const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(req.params.id);
      res.json({ success: true, restaurant });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Menu Management
  app.post('/api/menu-items', (req, res) => {
    const { restaurant_id, name, description, price, category, image_url } = req.body;
    try {
      const result = db.prepare('INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)')
        .run(restaurant_id, name, description, price, category, image_url);
      
      const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
      res.json({ success: true, item });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.patch('/api/menu-items/:id/toggle', (req, res) => {
    const { is_available } = req.body;
    try {
      db.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?').run(is_available ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Order Management
  app.post('/api/orders', (req, res) => {
    const { customer_id, restaurant_id, items, total_price, payment_method, address, customer_name } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO orders (customer_id, restaurant_id, total_price, payment_method, delivery_address, manual_customer_name, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).run(customer_id, restaurant_id, total_price, payment_method, address, customer_name);
      
      const orderId = result.lastInsertRowid;
      
      const order = db.prepare(`
        SELECT o.*, COALESCE(o.manual_customer_name, u.name) as customer_name, u.phone as customer_phone
        FROM orders o
        JOIN users u ON o.customer_id = u.id
        WHERE o.id = ?
      `).get(orderId);

      res.json(order);
    } catch (error) {
      console.error('Order error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.get('/api/restaurants/:id/orders', (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, COALESCE(o.manual_customer_name, u.name) as customer_name, u.phone as customer_phone 
      FROM orders o 
      JOIN users u ON o.customer_id = u.id 
      WHERE o.restaurant_id = ? AND o.status != 'completed'
      ORDER BY o.created_at DESC
    `).all(req.params.id);
    res.json(orders);
  });

  app.patch('/api/orders/:id/assign', (req, res) => {
    const { courier_id } = req.body;
    try {
      db.prepare("UPDATE orders SET courier_id = ?, status = 'assigned' WHERE id = ?").run(courier_id, req.params.id);
      
      // Fetch order and restaurant details for the notification
      const order = db.prepare(`
        SELECT o.id, r.name as restaurantName 
        FROM orders o 
        JOIN restaurants r ON o.restaurant_id = r.id 
        WHERE o.id = ?
      `).get(req.params.id) as any;

      if (order) {
        io.to(`user_${courier_id}`).emit('new-order-assigned', {
          orderId: order.id,
          restaurantName: order.restaurantName
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.get('/api/couriers/:id/orders', (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, r.name as restaurant_name, r.address as restaurant_address, u.name as customer_name
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users u ON o.customer_id = u.id
      WHERE o.courier_id = ? AND o.status IN ('assigned', 'picked_up')
    `).all(req.params.id);
    res.json(orders);
  });

  app.patch('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    try {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
      
      // Log the action
      const order = db.prepare('SELECT courier_id FROM orders WHERE id = ?').get(req.params.id) as any;
      if (order && order.courier_id) {
        db.prepare('INSERT INTO order_logs (order_id, courier_id, action) VALUES (?, ?, ?)')
          .run(req.params.id, order.courier_id, status === 'completed' ? 'completed' : status === 'delivering' ? 'picked_up' : 'assigned');
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Courier Actions (Accept/Reject)
  app.post('/api/orders/:id/respond', (req, res) => {
    const { courier_id, action } = req.body; // 'accept' or 'reject'
    const orderId = req.params.id;

    try {
      if (action === 'accept') {
        db.prepare("UPDATE orders SET status = 'delivering' WHERE id = ?").run(orderId);
        db.prepare("INSERT INTO order_logs (order_id, courier_id, action) VALUES (?, ?, 'accepted')").run(orderId, courier_id);
      } else {
        db.prepare("UPDATE orders SET status = 'pending', courier_id = NULL WHERE id = ?").run(orderId);
        db.prepare("INSERT INTO order_logs (order_id, courier_id, action) VALUES (?, ?, 'rejected')").run(orderId, courier_id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Courier Performance Stats
  app.get('/api/couriers/:id/performance', (req, res) => {
    const courierId = req.params.id;
    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN status = 'completed' AND date(created_at) = date('now') THEN 1 END) as today,
          COUNT(CASE WHEN status = 'completed' AND date(created_at) >= date('now', '-7 days') THEN 1 END) as week,
          COUNT(CASE WHEN status = 'completed' AND date(created_at) >= date('now', '-30 days') THEN 1 END) as month
        FROM orders 
        WHERE courier_id = ?
      `).get(courierId) as any;
      
      const businessStats = db.prepare(`
        SELECT r.name as business_name, COUNT(*) as count
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.courier_id = ? AND o.status = 'completed'
        GROUP BY r.id
      `).all(courierId);

      res.json({ ...(stats || {}), businessStats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Admin Courier Stats
  app.get('/api/admin/courier-performance', (req, res) => {
    try {
      const stats = db.prepare(`
        SELECT 
          u.id, u.name,
          COUNT(CASE WHEN l.action = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN l.action = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN o.status = 'completed' AND date(o.created_at) = date('now') THEN 1 END) as today,
          COUNT(CASE WHEN o.status = 'completed' AND date(o.created_at) >= date('now', '-7 days') THEN 1 END) as week,
          COUNT(CASE WHEN o.status = 'completed' AND date(o.created_at) >= date('now', '-30 days') THEN 1 END) as month
        FROM users u
        LEFT JOIN order_logs l ON u.id = l.courier_id
        LEFT JOIN orders o ON u.id = o.courier_id
        WHERE u.role = 'courier'
        GROUP BY u.id
      `).all() as any[];

      // Add business breakdown for each courier
      const enhancedStats = stats.map(courier => {
        const businesses = db.prepare(`
          SELECT r.name as business_name, COUNT(*) as count
          FROM orders o
          JOIN restaurants r ON o.restaurant_id = r.id
          WHERE o.courier_id = ? AND o.status = 'completed'
          GROUP BY r.id
        `).all(courier.id);
        return { ...courier, businesses };
      });

      res.json(enhancedStats);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Courier Location Simulation
  app.patch('/api/couriers/:id/location', (req, res) => {
    const { lat, lng, is_online } = req.body;
    try {
      db.prepare(`
        INSERT INTO courier_status (courier_id, current_lat, current_lng, is_online, last_updated)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(courier_id) DO UPDATE SET
          current_lat = excluded.current_lat,
          current_lng = excluded.current_lng,
          is_online = excluded.is_online,
          last_updated = CURRENT_TIMESTAMP
      `).run(req.params.id, lat, lng, is_online ? 1 : 0);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.get('/api/couriers/online', (req, res) => {
    try {
      const couriers = db.prepare(`
        SELECT u.id, u.name, cs.current_lat as lat, cs.current_lng as lng
        FROM users u
        JOIN courier_status cs ON u.id = cs.courier_id
        WHERE u.role = 'courier' AND cs.is_online = 1
      `).all();
      res.json(couriers);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Fetch Restaurants
  app.get('/api/orders/customer/:id', (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, r.name as restaurant_name, r.address as restaurant_address, cs.current_lat as courier_lat, cs.current_lng as courier_lng
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      LEFT JOIN courier_status cs ON o.courier_id = cs.courier_id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `).all(req.params.id);
    res.json(orders);
  });

  app.get('/api/restaurants', (req, res) => {
    const restaurants = db.prepare('SELECT * FROM restaurants WHERE is_active = 1').all();
    res.json(restaurants);
  });

  // Fetch Menu for a Restaurant (Public)
  app.get('/api/restaurants/:id/menu', (req, res) => {
    const menu = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1').all(req.params.id);
    res.json(menu);
  });

  // Fetch All Menu Items for a Restaurant (Business Owner)
  app.get('/api/restaurants/:id/menu-all', (req, res) => {
    const menu = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ?').all(req.params.id);
    res.json(menu);
  });

  // Group Ordering State (In-memory for now)
  const groupOrders = new Map<string, { restaurantId: number, items: any[], users: string[] }>();

  // Real-time Socket.io logic
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('start-group-order', (data) => {
      const { restaurantId, userId } = data;
      const groupId = Math.random().toString(36).substring(2, 8).toUpperCase();
      groupOrders.set(groupId, { restaurantId, items: [], users: [userId] });
      socket.join(`group_${groupId}`);
      socket.emit('group-order-started', { groupId, restaurantId });
    });

    socket.on('join-group-order', (data) => {
      const { groupId, userId } = data;
      const group = groupOrders.get(groupId);
      if (group) {
        if (!group.users.includes(userId)) {
          group.users.push(userId);
        }
        socket.join(`group_${groupId}`);
        socket.emit('group-order-joined', { groupId, restaurantId: group.restaurantId, items: group.items });
        io.to(`group_${groupId}`).emit('group-order-updated', { items: group.items });
      } else {
        socket.emit('group-order-error', { message: 'Group not found' });
      }
    });

    socket.on('update-group-cart', (data) => {
      const { groupId, items } = data;
      const group = groupOrders.get(groupId);
      if (group) {
        group.items = items;
        io.to(`group_${groupId}`).emit('group-order-updated', { items });
      }
    });

    socket.on('update-location', (data) => {
      // data: { courierId, lat, lng }
      const { courierId, lat, lng } = data;
      db.prepare('INSERT OR REPLACE INTO courier_status (courier_id, is_online, current_lat, current_lng, last_updated) VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)')
        .run(courierId, lat, lng);
      
      // Broadcast to relevant rooms (e.g., admin or specific business)
      io.emit('courier-location-updated', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
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
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
