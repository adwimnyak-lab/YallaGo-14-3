import Database from 'better-sqlite3';
import path from 'path';
import { krayotRestaurants } from './seedData.ts';

const db = new Database('yallago.db');

export function initDb() {
  // Initialize database schema
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('customer', 'business', 'courier', 'admin')) NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    address TEXT,
    region TEXT,
    phone TEXT,
    rating REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT 1,
    category TEXT,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    courier_id INTEGER,
    status TEXT CHECK(status IN ('pending', 'preparing', 'ready', 'assigned', 'delivering', 'completed', 'cancelled')) DEFAULT 'pending',
    total_price REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'credit_card')) NOT NULL,
    delivery_address TEXT NOT NULL,
    manual_customer_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (courier_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );

  CREATE TABLE IF NOT EXISTS courier_status (
    courier_id INTEGER PRIMARY KEY,
    is_online BOOLEAN DEFAULT 0,
    current_lat REAL,
    current_lng REAL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (courier_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    courier_id INTEGER,
    action TEXT CHECK(action IN ('assigned', 'accepted', 'rejected', 'picked_up', 'completed')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (courier_id) REFERENCES users(id)
  );
`);

// Add region and phone columns if they don't exist (for existing DBs)
try {
  db.exec("ALTER TABLE restaurants ADD COLUMN region TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE restaurants ADD COLUMN phone TEXT;");
} catch (e) {}

  // Seed some restaurants if none exist
  const restaurantCount = db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as any;
  if (restaurantCount.count === 0) {
    // Create a mock owner
    db.prepare("INSERT OR IGNORE INTO users (email, password, name, role) VALUES ('owner@example.com', 'password', 'Restaurant Owner', 'business')").run();
    const owner = db.prepare("SELECT id FROM users WHERE email = 'owner@example.com'").get() as any;
    const ownerId = owner.id;

    const restaurantsData = [
      // Haifa
      { name: 'שווארמה חזן', region: 'region_haifa', address: 'דרך יפו 140, חיפה', rating: 4.8, description: 'השווארמה המפורסמת בחיפה', type: 'shawarma' },
      { name: 'מעיין הבירה', region: 'region_haifa', address: 'נתנזון 4, חיפה', rating: 4.7, description: 'אוכל יהודי מזרח אירופאי קלאסי', type: 'meat' },
      { name: 'סינטה בר', region: 'region_haifa', address: 'שדרות מוריה 127, חיפה', rating: 4.6, description: 'מסעדת בשרים וביסטרו איכותי', type: 'steak' },
      { name: 'פאטוש', region: 'region_haifa', address: 'שדרות בן גוריון 38, חיפה', rating: 4.5, description: 'אוכל ערבי ים תיכוני במושבה הגרמנית', type: 'salad' },
      { name: 'רפאלו', region: 'region_haifa', address: 'קניון קסטרא, חיפה', rating: 4.7, description: 'מסעדה איטלקית משפחתית', type: 'pasta' },
      { name: 'מינאטו', region: 'region_haifa', address: 'דרך יפו 145, חיפה', rating: 4.4, description: 'סושי ובר יפני אותנטי', type: 'sushi' },
      { name: 'בורקס בכר העגלה', region: 'region_haifa', address: 'חיפה', rating: 4.9, description: 'הבורקס הכי טוב בעיר', type: 'pastry' },

      // Krayot (Original)
      { name: 'בורגר סאלון', region: 'region_krayot', address: 'קריון, קרית ביאליק', rating: 4.5, description: 'המבורגרים מבשר טרי', type: 'burger' },
      { name: 'גלידריית גולדה', region: 'region_krayot', address: 'אח"י אילת 12, קרית חיים', rating: 4.9, description: 'גלידה איטלקית משובחת', type: 'icecream' },
      { name: 'שיפודי התקווה', region: 'region_krayot', address: 'קרית מוצקין', rating: 4.3, description: 'על האש ישראלי קלאסי', type: 'kebab' },
      { name: 'נאפיס', region: 'region_krayot', address: 'צומת קרית אתא', rating: 4.2, description: 'אוכל מכל העולם במקום אחד', type: 'food' },
      { name: 'סושי בר', region: 'region_krayot', address: 'קרית מוצקין', rating: 4.4, description: 'סושי טרי ואיכותי', type: 'sushi' },
      { name: 'פיצה האט', region: 'region_krayot', address: 'קרית ים', rating: 4.1, description: 'הפיצה המוכרת והאהובה', type: 'pizza' },
      { name: 'קפה קפה קריון', region: 'region_krayot', address: 'קרית ביאליק', rating: 4.0, description: 'בית קפה ומסעדה', type: 'coffee' },

      // New Krayot Restaurants from user
      ...krayotRestaurants.map(r => ({ ...r, region: 'region_krayot' })),

      // Ramat Yishai
      { name: 'לימוזין', region: 'region_ramat_yishai', address: 'אזור התעשייה רמת ישי', rating: 4.8, description: 'מסעדת בשרים וקצביה', type: 'steak' },
      { name: 'נדב קינוחים', region: 'region_ramat_yishai', address: 'רמת ישי', rating: 4.7, description: 'בית מאפה וקונדיטוריה', type: 'cake' },
      { name: 'זוזוברה', region: 'region_ramat_yishai', address: 'רמת ישי', rating: 4.5, description: 'אוכל אסייתי מהיר ואיכותי', type: 'noodles' },
      { name: 'טאבון רמת ישי', region: 'region_ramat_yishai', address: 'רמת ישי', rating: 4.4, description: 'מאפים ופיצות בטאבון', type: 'bread' },
      { name: 'קפה לואיז', region: 'region_ramat_yishai', address: 'רמת ישי', rating: 4.3, description: 'אוכל בריא וטבעי', type: 'healthy' },
      { name: 'המבורגר רמת ישי', region: 'region_ramat_yishai', address: 'רמת ישי', rating: 4.5, description: 'המבורגר איכותי', type: 'burger' },

      // Tivon
      { name: 'טנדוקה', region: 'region_tivon', address: 'קרית טבעון', rating: 4.6, description: 'מסעדת בשרים כשרה', type: 'meat' },
      { name: 'פלאפל אוריון', region: 'region_tivon', address: 'טבעון', rating: 4.7, description: 'הפלאפל המיתולוגי', type: 'falafel' },
      { name: 'קפה פייגה', region: 'region_tivon', address: 'טבעון', rating: 4.5, description: 'בית קפה שכונתי נעים', type: 'coffee' },
      { name: 'פיצה פלוס', region: 'region_tivon', address: 'טבעון', rating: 4.2, description: 'פיצה איטלקית דקה', type: 'pizza' },
      { name: 'חומוס אליהו', region: 'region_tivon', address: 'טבעון', rating: 4.6, description: 'חומוס חם וטרי', type: 'hummus' },
      { name: 'גלידה טבעון', region: 'region_tivon', address: 'טבעון', rating: 4.8, description: 'גלידה טבעית', type: 'icecream' },

      // Atlit
      { name: 'קפה עתלית', region: 'region_atlit', address: 'עתלית', rating: 4.4, description: 'בית קפה מול הים', type: 'coffee' },
      { name: 'פיצה עתלית', region: 'region_atlit', address: 'עתלית', rating: 4.1, description: 'פיצה משפחתית חמה', type: 'pizza' },
      { name: 'שווארמה עתלית', region: 'region_atlit', address: 'עתלית', rating: 4.3, description: 'שווארמה טעימה ומהירה', type: 'shawarma' },
      { name: 'המטבח של אמא', region: 'region_atlit', address: 'עתלית', rating: 4.6, description: 'אוכל ביתי מבושל', type: 'stew' },
      { name: 'סושי עתלית', region: 'region_atlit', address: 'עתלית', rating: 4.2, description: 'סושי טרי', type: 'sushi' },

      // Migdal HaEmek
      { name: 'שיפודי העמק', region: 'region_migdal_haemek', address: 'מגדל העמק', rating: 4.4, description: 'בשרים על האש', type: 'kebab' },
      { name: 'פיצה רומא', region: 'region_migdal_haemek', address: 'מגדל העמק', rating: 4.2, description: 'פיצה בסגנון איטלקי', type: 'pizza' },
      { name: 'פלאפל העמק', region: 'region_migdal_haemek', address: 'מגדל העמק', rating: 4.5, description: 'פלאפל חם וטרי', type: 'falafel' },
      { name: 'קפה קפה', region: 'region_migdal_haemek', address: 'מגדל העמק', rating: 4.1, description: 'רשת בתי הקפה המוכרת', type: 'coffee' },
      { name: 'בורגר העמק', region: 'region_migdal_haemek', address: 'מגדל העמק', rating: 4.3, description: 'המבורגר בשרי', type: 'burger' },

      // Acre
      { name: 'אורי בורי', region: 'region_acre', address: 'עכו העתיקה', rating: 4.9, description: 'מסעדת דגים ופירות ים מפורסמת', type: 'fish' },
      { name: 'חומוס סעיד', region: 'region_acre', address: 'שוק עכו', rating: 4.8, description: 'החומוס המפורסם ביותר בעכו', type: 'hummus' },
      { name: 'אלמרסא', region: 'region_acre', address: 'נמל עכו', rating: 4.7, description: 'מסעדת שף בנמל', type: 'chef' },
      { name: 'דוניא', region: 'region_acre', address: 'עכו', rating: 4.5, description: 'אוכל רחוב משודרג', type: 'streetfood' },
      { name: 'סבידה', region: 'region_acre', address: 'עכו העתיקה', rating: 4.6, description: 'דגים טריים מהים', type: 'fish' },
      { name: 'פיצה עכו', region: 'region_acre', address: 'עכו', rating: 4.1, description: 'פיצה חמה', type: 'pizza' },

      // Nahariya
      { name: 'פינגווין', region: 'region_nahariya', address: 'געתון 31, נהריה', rating: 4.6, description: 'המוסד המיתולוגי של נהריה', type: 'restaurant' },
      { name: 'בורגרים', region: 'region_nahariya', address: 'נהריה', rating: 4.3, description: 'המבורגרים קטנים בטעמים גדולים', type: 'burger' },
      { name: 'קפה נמרוד', region: 'region_nahariya', address: 'טיילת נהריה', rating: 4.5, description: 'בית קפה מול הגלים', type: 'coffee' },
      { name: 'אדלינה', region: 'region_nahariya', address: 'קיבוץ כברי (ליד נהריה)', rating: 4.8, description: 'מסעדת שף ים תיכונית', type: 'chef' },
      { name: 'סושי מושי', region: 'region_nahariya', address: 'נהריה', rating: 4.4, description: 'סושי יצירתי וטעים', type: 'sushi' },
      { name: 'פלאפל נהריה', region: 'region_nahariya', address: 'נהריה', rating: 4.6, description: 'פלאפל מעולה', type: 'falafel' },

      // Karmiel
      { name: 'קפה לנדוור', region: 'region_karmiel', address: 'כרמיאל', rating: 4.4, description: 'ארוחות בוקר וקפה משובח', type: 'breakfast' },
      { name: 'BBB', region: 'region_karmiel', address: 'כרמיאל', rating: 4.5, description: 'המבורגרים ובר', type: 'burger' },
      { name: 'שניצל איילה', region: 'region_karmiel', address: 'כרמיאל', rating: 4.7, description: 'השניצל הכי טוב בצפון', type: 'schnitzel' },
      { name: 'איטליאנו', region: 'region_karmiel', address: 'כרמיאל', rating: 4.3, description: 'פסטות ופיצות בעבודת יד', type: 'pasta' },
      { name: 'סושיא', region: 'region_karmiel', address: 'כרמיאל', rating: 4.4, description: 'סושי ומוקפצים', type: 'sushi' },
      { name: 'חומוס בר', region: 'region_karmiel', address: 'כרמיאל', rating: 4.6, description: 'חומוס ופול חם', type: 'hummus' },
      { name: 'פיצה כרמיאל', region: 'region_karmiel', address: 'כרמיאל', rating: 4.2, description: 'פיצה טעימה', type: 'pizza' }
    ];

    const typeToTags: Record<string, string> = {
      'pasta': 'pasta,italian,food',
      'burger': 'burger,beef,food',
      'asian': 'asian,food,dish',
      'sushi': 'sushi,japanese,food',
      'meat': 'steak,meat,food',
      'shawarma': 'shawarma,kebab,food',
      'coffee': 'coffee,cafe,breakfast',
      'bread': 'bakery,bread,pastry',
      'food': 'israeli,food,dish',
      'fish': 'fish,seafood,food',
      'pizza': 'pizza,food',
      'bar': 'cocktail,drink,bar',
      'restaurant': 'gourmet,food,plating',
      'icecream': 'icecream,dessert',
      'kebab': 'kebab,grill,meat',
      'cake': 'cake,dessert,pastry',
      'noodles': 'noodles,asian,food',
      'healthy': 'salad,healthy,food',
      'falafel': 'falafel,hummus,food',
      'hummus': 'hummus,pita,food',
      'stew': 'stew,homecooking,food',
      'schnitzel': 'schnitzel,chicken,food',
      'breakfast': 'breakfast,eggs,food',
      'chef': 'gourmet,plating,chef'
    };

    restaurantsData.forEach((res, i) => {
      const tags = typeToTags[res.type || 'restaurant'] || 'food,dish';
      const restaurantId = db.prepare(`
        INSERT INTO restaurants (owner_id, name, description, image_url, address, region, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        ownerId,
        res.name,
        res.description,
        `https://loremflickr.com/800/450/${tags}?lock=${i + 500}`,
        res.address,
        res.region,
        res.rating
      ).lastInsertRowid;

      // Add some menu items for each restaurant
      db.prepare(`
        INSERT INTO menu_items (restaurant_id, name, description, price, image_url, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        restaurantId,
        `מנה מומלצת - ${res.name}`,
        `המנה הכי טובה שלנו, מומלץ בחום!`,
        45 + (i % 20),
        `https://loremflickr.com/400/300/${tags.split(',')[0]},dish?lock=${i + 1500}`,
        'עיקריות'
      );
    });
  }
}

export default db;
