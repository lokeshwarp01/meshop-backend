const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
require('dotenv').config();

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
mongoose.connect("mongodb+srv://lokeshwar:lokeshwarp@cluster0.1fbxk7q.mongodb.net/")
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// API creation 
app.get("/", (req, res) => {
    res.send("Express app is Running");
});

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

// image upload endpoint (existing)
app.post("/upload", upload.single("product"), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/uploads/${req.file.filename}`
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

app.listen(port, () => {
    console.log(`🚀 Server is running on port ${port}`);
});
