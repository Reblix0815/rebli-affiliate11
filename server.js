const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(PUBLIC_DIR, 'products.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
    secret: 'reblix_ldplayer_secret_key_98765',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(PUBLIC_DIR));

// Daten lesen
function getData() {
    const defaultData = {
        topOffers: {
            LDPlayer: "https://leap.ldplayer.gg/T4VV05TOl",
            Plarium: "https://leap.ldplayer.gg/T4VV05TOl",
            Impact: "https://leap.ldplayer.gg/T4VV05TOl",
            Eneba: "https://leap.ldplayer.gg/T4VV05TOl"
        },
        products: []
    };

    if (!fs.existsSync(DATA_FILE)) return defaultData;
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return { topOffers: defaultData.topOffers, products: parsed };
        }
        return parsed;
    } catch (error) {
        return defaultData;
    }
}

// Daten speichern
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        return false;
    }
}

function requireAuth(req, res, next) {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    return res.status(401).json({ success: false, message: "Nicht autorisiert!" });
}

// ROUTEN

app.get('/api/data', (req, res) => {
    res.json(getData());
});

app.get('/api/products', (req, res) => {
    res.json(getData().products);
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Reblix' && password === 'M3h36mimik') {
        req.session.isLoggedIn = true;
        req.session.username = username;
        return res.json({ success: true, redirectUrl: '/admin.html' });
    } else {
        return res.status(401).json({ success: false, message: 'Falscher Benutzername oder Passwort!' });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});

app.get('/api/auth-status', (req, res) => {
    res.json({ loggedIn: !!(req.session && req.session.isLoggedIn), user: req.session ? req.session.username : null });
});

// Top 4 Haupt-Affiliate Links aktualisieren
app.post('/api/admin/top-offers', requireAuth, (req, res) => {
    const { topOffers } = req.body;
    if (!topOffers) return res.status(400).json({ success: false, message: 'Keine Daten!' });

    const currentData = getData();
    currentData.topOffers = topOffers;

    if (saveData(currentData)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Speichern der Links.' });
    }
});

// Produkte verwalten
app.post('/api/admin/products', requireAuth, (req, res) => {
    const { provider, title, description, image, link } = req.body;
    if (!provider || !title || !description || !image || !link) {
        return res.status(400).json({ success: false, message: 'Bitte alle Felder ausfüllen!' });
    }

    const currentData = getData();
    const newProduct = {
        id: Date.now().toString(),
        provider: provider.trim(),
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
        link: link.trim()
    };
    currentData.products.push(newProduct);

    if (saveData(currentData)) {
        res.json({ success: true, product: newProduct });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Speichern.' });
    }
});

app.put('/api/admin/products/:id', requireAuth, (req, res) => {
    const productId = req.params.id;
    const { provider, title, description, image, link } = req.body;
    const currentData = getData();
    const index = currentData.products.findIndex(p => p.id === productId);

    if (index === -1) return res.status(404).json({ success: false, message: 'Nicht gefunden!' });

    currentData.products[index] = {
        id: productId,
        provider: provider.trim(),
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
        link: link.trim()
    };

    if (saveData(currentData)) {
        res.json({ success: true, product: currentData.products[index] });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren.' });
    }
});

app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
    const currentData = getData();
    currentData.products = currentData.products.filter(p => p.id !== req.params.id);
    if (saveData(currentData)) {
        res.json({ success: true, message: 'Gelöscht!' });
    } else {
        res.status(500).json({ success: false, message: 'Fehler beim Löschen.' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});