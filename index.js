const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
require('dotenv').config();

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";
mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// API creation 
app.get("/", (req, res) => {
    res.send("Express app is Running");
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Updated multer configuration for multiple files
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// Static file serving
app.use('/uploads', express.static('uploads'));

// image upload endpoint
app.post("/upload", upload.single("product"), (req, res) => {
    const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` 
        : `http://localhost:${port}`;
    
    res.json({
        success: 1,
        image_url: `${baseUrl}/uploads/${req.file.filename}`
    });
});

// Enhanced Product Schema
const productSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['men', 'women', 'kids']
    },
    description: { type: String, required: true },
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    popularWith: [{ type: String }],
    image: { type: String, required: true }, 
    colors: [{ type: String }],
    sizes: [{ type: String }],
    stock: { type: Number, default: 0 },
    tags: [{ type: String }]
}, {
    timestamps: true
});

const Product = mongoose.model("Product", productSchema);

// Updated add product endpoint
app.post('/addproduct', async (req, res) => {
    try {
        let products = await Product.find();
        let id;
        if (products.length > 0) {
            let last_product_array = products.slice(-1);
            let last_product = last_product_array[0];
            id = last_product.id + 1;
        } else {
            id = 1;
        }

        const product = new Product({
            id: id,
            title: req.body.title,
            category: req.body.category,
            description: req.body.description,
            oldPrice: req.body.oldPrice,
            newPrice: req.body.newPrice,
            discount: req.body.discount || 0,
            rating: req.body.rating || 0,
            popularWith: req.body.popularWith || [],
            image: req.body.image, 
            colors: req.body.colors || [],
            sizes: req.body.sizes || [],
            stock: req.body.stock || 0,
            tags: req.body.tags || []
        });

        console.log(product);
        await product.save();
        res.json({ success: 1, product });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ success: 0, error: error.message });
    }
});

// remove product endpoint
app.post('/removeproduct', async (req, res) => {
    try {
        const deletedProduct = await Product.findOneAndDelete({ id: req.body.id });
        if (deletedProduct) {
            console.log("Product Removed:", deletedProduct.title);
            res.json({
                success: 1,
                message: "Product removed successfully",
                product: deletedProduct
            });
        } else {
            res.status(404).json({
                success: 0,
                message: "Product not found"
            });
        }
    } catch (error) {
        console.error("Error removing product:", error);
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Get all products endpoint
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        console.log("All products fetched");
        res.json({ success: 1, products });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Get products by category endpoint 
app.get('/products/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const products = await Product.find({ category: category });
        res.json({ success: 1, products });
    } catch (error) {
        console.error("Error fetching products by category:", error);
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Get single product endpoint
app.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id });
        if (product) {
            res.json({ success: 1, product });
        } else {
            res.status(404).json({ success: 0, message: "Product not found" });
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Update product endpoint
app.post('/updateproduct', async (req, res) => {
    try {
        const updatedProduct = await Product.findOneAndUpdate(
            { id: req.body.id },
            req.body,
            { new: true, runValidators: true }
        );

        if (updatedProduct) {
            res.json({ success: 1, product: updatedProduct });
        } else {
            res.status(404).json({ success: 0, message: "Product not found" });
        }
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ success: 0, error: error.message });
    }
});

// --- Enhanced User Schema & Model ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['supplier','customer'], default: 'customer' }
}, { timestamps: true });

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// --- Enhanced Order Schema & Model ---
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        name: String,
        image: String
    }],
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending','shipped','delivered','cancelled'], default: 'pending' },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    paymentMethod: { type: String, enum: ['card', 'paypal', 'cash'], default: 'card' }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// --- Auth Middleware ---
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: 0, message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ success: 0, message: 'Invalid token.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: 0, message: 'Invalid token.' });
    }
};

// --- Enhanced User Endpoints ---

// Register user
app.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: 0, message: 'User already exists' });
        }

        const user = new User({ name, email, password, role: role || 'customer' });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

        res.status(201).json({
            success: 1,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Login user
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: 0, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

        res.json({
            success: 1,
            user: { _id: user._id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Get current user profile
app.get('/users/me', authenticate, async (req, res) => {
    res.json({ success: 1, user: req.user });
});

// Update user profile
app.put('/users/me', authenticate, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({ success: 1, user });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

// --- Enhanced Order Endpoints ---

// Create order
app.post('/orders', authenticate, async (req, res) => {
    try {
        const order = new Order({
            ...req.body,
            userId: req.user._id
        });

        await order.save();
        await order.populate('userId', 'name email');

        res.status(201).json({ success: 1, order });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Get user's orders
app.get('/orders/my-orders', authenticate, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: 1, orders });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Get single order
app.get('/orders/:id', authenticate, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: 0, message: 'Order not found' });
        }

        // Check if user owns the order
        if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'supplier') {
            return res.status(403).json({ success: 0, message: 'Access denied' });
        }

        res.json({ success: 1, order });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

// Update order status (for suppliers)
app.patch('/orders/:id/status', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'supplier') {
            return res.status(403).json({ success: 0, message: 'Access denied' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );

        res.json({ success: 1, order });
    } catch (error) {
        res.status(500).json({ success: 0, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});