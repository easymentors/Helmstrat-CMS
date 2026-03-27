// ============================================
// Helmstrat CMS - Main Server File
// ============================================

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURATION
// ============================================

const IMAGE_FOLDER = path.join(__dirname, 'cms-images');
const TEMPLATE_FOLDER = path.join(__dirname, 'cms-templates');
const UPLOADS_FOLDER = path.join(__dirname, 'public/uploads/images');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(IMAGE_FOLDER)) {
    fs.mkdirSync(IMAGE_FOLDER, { recursive: true });
}
if (!fs.existsSync(TEMPLATE_FOLDER)) {
    fs.mkdirSync(TEMPLATE_FOLDER, { recursive: true });
}
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

app.locals.formatSize = formatSize;

// ============================================
// MIDDLEWARE
// ============================================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/cms-images', express.static(IMAGE_FOLDER));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dest = path.join(__dirname, 'public/uploads/');
        if (file.fieldname.startsWith('image_') || file.fieldname.startsWith('blogImage_')) {
            dest = path.join(__dirname, 'public/uploads/images/');
        } else if (file.fieldname.startsWith('video_')) {
            dest = path.join(__dirname, 'public/uploads/videos/');
        }
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ============================================
// HELPER FUNCTIONS
// ============================================

function getPages() {
    try {
        const data = fs.readFileSync(path.join(DATA_DIR, 'pages.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { pages: [] };
    }
}

function getPageBySlug(slug) {
    const data = getPages();
    const normalizedSlug = slug.toLowerCase();
    return data.pages.find(p => p.slug.toLowerCase() === normalizedSlug || p.slug.toLowerCase() === '/' + normalizedSlug);
}

function getPageById(id) {
    const data = getPages();
    return data.pages.find(p => p.id === id);
}

function getBlogPosts() {
    try {
        const data = fs.readFileSync(path.join(DATA_DIR, 'blog.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { posts: [] };
    }
}

function saveBlogPosts(data) {
    fs.writeFileSync(path.join(DATA_DIR, 'blog.json'), JSON.stringify(data, null, 2));
}

function savePages(data) {
    fs.writeFileSync(path.join(DATA_DIR, 'pages.json'), JSON.stringify(data, null, 2));
}

function getSettings() {
    try {
        const data = fs.readFileSync(path.join(DATA_DIR, 'settings.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { admin: { password: '12345678' }, navigation: { enabled: true, pages: [] } };
    }
}

function saveSettings(data) {
    fs.writeFileSync(path.join(DATA_DIR, 'settings.json'), JSON.stringify(data, null, 2));
}

function getNavigationPages() {
    const settings = getSettings();
    const allPages = getPages().pages;
    const excludedPages = settings.navigation?.excluded || [];
    
    return allPages
        .filter(p => !excludedPages.includes(p.id))
        .sort((a, b) => (a.order || 99) - (b.order || 99));
}

function generateId() {
    return 'page_' + Date.now();
}

// ============================================
// PUBLIC ROUTES
// ============================================

function getSiteSettings() {
    const settings = getSettings();
    return {
        siteName: settings.admin?.siteName || 'Helmstrat',
        siteDescription: settings.admin?.siteDescription || '',
        email: settings.site?.email || '',
        phone: settings.site?.phone || '',
        address: settings.site?.address || '',
        socialLinks: settings.site?.socialLinks || {}
    };
}

// Homepage
app.get('/', (req, res) => {
    const homePage = getPageBySlug('/');
    const defaultHome = {
        subtitle: 'Software Agency',
        content: 'Transforming ideas into powerful digital solutions. We craft innovative software, stunning interfaces, and scalable systems that drive business growth.',
        heroTitle: 'We Build',
        heroGradientText: 'Digital Excellence',
        ctaPrimary: 'Start Your Project',
        ctaSecondary: 'Our Services',
        stats: [
            { value: '50+', label: 'Projects Delivered' },
            { value: '30+', label: 'Happy Clients' },
            { value: '5+', label: 'Years Experience' }
        ]
    };
    const page = homePage || defaultHome;
    res.render('home', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
});

// About page
app.get('/about', (req, res) => {
    const aboutPage = getPageBySlug('/about');
    const defaultAbout = {
        subtitle: 'About Us',
        content: 'At Helmstrat, we believe in building more than just software – we build partnerships.',
        fullContent: 'From startups to enterprises, we adapt to your needs and deliver results that exceed expectations.',
        features: [
            { icon: 'code-2', title: 'Clean Code' },
            { icon: 'users', title: 'Team Collaboration' },
            { icon: 'rocket', title: 'Fast Delivery' },
            { icon: 'headphones', title: '24/7 Support' }
        ],
        highlights: [
            'Agile development methodology',
            'Transparent communication',
            'Post-launch support & maintenance'
        ]
    };
    const page = aboutPage || defaultAbout;
    res.render('about', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
});

// Services page
app.get('/services', (req, res) => {
    const servicesPage = getPageBySlug('/services');
    const defaultServices = {
        subtitle: 'What We Do',
        content: 'Comprehensive digital solutions tailored to your unique needs.',
        services: [
            { icon: 'monitor', color: 'primary', title: 'Web Development', description: 'Custom websites and web applications built with modern frameworks.' },
            { icon: 'smartphone', color: 'purple-400', title: 'Mobile Apps', description: 'Native and cross-platform mobile applications for iOS and Android.' },
            { icon: 'palette', color: 'amber-400', title: 'UI/UX Design', description: 'Beautiful, intuitive interfaces that users love.' },
            { icon: 'cloud', color: 'blue-400', title: 'Cloud Solutions', description: 'Scalable cloud infrastructure and migration services.' },
            { icon: 'database', color: 'green-400', title: 'Backend & APIs', description: 'Robust server-side solutions, RESTful APIs, and database architecture.' },
            { icon: 'shield', color: 'pink-400', title: 'Quality Assurance', description: 'Comprehensive testing services to ensure your software is bulletproof.' }
        ]
    };
    const page = servicesPage || defaultServices;
    res.render('services', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
});

// Testimonials page
app.get('/testimonials', (req, res) => {
    const testimonialsPage = getPageBySlug('/testimonials');
    const defaultTestimonials = {
        subtitle: 'Testimonials',
        content: "Don't just take our word for it. Here's what our partners have to say.",
        testimonials: [
            { name: 'Sarah Ahmed', role: 'CEO, TechStart Inc.', initials: 'SA', gradientFrom: 'primary', gradientTo: 'primary-light', rating: 5, text: 'Helmstrat transformed our outdated system into a modern, efficient platform.' },
            { name: 'Michael Khan', role: 'Founder, DeliveryHub', initials: 'MK', gradientFrom: 'purple-500', gradientTo: 'purple-400', rating: 5, text: 'The mobile app they built exceeded all expectations.' },
            { name: 'Fatima Ali', role: 'CTO, FinanceFlow', initials: 'FA', gradientFrom: 'amber-500', gradientTo: 'amber-400', rating: 5, text: 'Working with Helmstrat was a game-changer.' }
        ],
        logos: ['TechCorp', 'InnovateLab', 'DataMax', 'CloudFirst', 'NextGen']
    };
    const page = testimonialsPage || defaultTestimonials;
    res.render('testimonials', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
});

// Contact page
app.get('/contact', (req, res) => {
    const contactPage = getPageBySlug('/contact');
    const defaultContact = {
        subtitle: 'Get In Touch',
        content: "Have a project in mind? We'd love to hear about it.",
        contactInfo: {
            email: 'hello@helmstrat.com',
            phone: '+1 (555) 123-4567',
            location: '123 Innovation Drive, Tech City, TC 12345'
        },
        socialLinks: {
            twitter: '#',
            linkedin: '#',
            github: '#',
            instagram: '#'
        }
    };
    const page = contactPage || defaultContact;
    res.render('contact', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
});

// Products page
app.get('/products', (req, res) => {
    const productsPage = getPageBySlug('/products');
    const defaultProducts = {
        subtitle: 'Our Products',
        content: 'Explore our suite of innovative digital products.',
        products: [
            {
                name: 'Desi Recipes',
                tagline: 'Authentic Pakistani & Indian Recipes',
                description: 'Discover the rich flavors of Pakistani and Indian cuisine with our comprehensive recipe app.',
                features: ['500+ Authentic Recipes', 'Step-by-Step Instructions', 'Beautiful Food Images'],
                platform: 'Android',
                playStoreUrl: 'https://play.google.com/store/apps/details?id=com.smartrasoi.app',
                image: '/images/App.png'
            }
        ]
    };
    const page = productsPage || defaultProducts;
    res.render('products', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
});

// Blog page
app.get('/blog', (req, res) => {
    const blogData = getBlogPosts();
    const blogPage = getPageBySlug('/blog');
    const page = blogPage || { title: 'Blog', subtitle: 'Our Blog' };
    res.render('blog', { 
        page: page, 
        pages: getNavigationPages(), 
        siteSettings: getSiteSettings(),
        posts: blogData.posts || [],
        isAdmin: false
    });
});

// Single blog post
app.get('/blog/:slug', (req, res) => {
    const blogData = getBlogPosts();
    const slug = decodeURIComponent(req.params.slug);
    const post = blogData.posts.find(p => 
        p.title.toLowerCase().replace(/\s+/g, '-') === slug
    );
    
    if (post) {
        res.render('blog-post', { 
            post: post,
            pages: getNavigationPages(), 
            siteSettings: getSiteSettings()
        });
    } else {
        res.redirect('/blog');
    }
});

// ============================================
// API ROUTES
// ============================================

// Contact form API
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
        return res.json({ success: false, message: 'Please fill in all required fields' });
    }
    
    console.log('========================================');
    console.log('NEW CONTACT FORM SUBMISSION');
    console.log('========================================');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Subject:', subject || 'No Subject');
    console.log('Message:', message);
    console.log('========================================');
    
    const contactsFile = 'data/contacts.json';
    let contacts = [];
    try {
        if (fs.existsSync(contactsFile)) {
            contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
        }
    } catch (err) {
        contacts = [];
    }
    
    const newContact = {
        id: 'contact_' + Date.now(),
        name,
        email,
        subject: subject || 'No Subject',
        message,
        createdAt: new Date().toISOString()
    };
    
    contacts.push(newContact);
    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));
    
    const settings = getSettings();
    if (settings.email && settings.email.enabled && settings.email.password !== 'YOUR_EMAIL_PASSWORD') {
        const transporter = nodemailer.createTransport({
            host: settings.email.host,
            port: settings.email.port,
            secure: settings.email.secure,
            auth: {
                user: settings.email.user,
                pass: settings.email.password
            }
        });
        
        const mailOptions = {
            from: settings.email.user,
            to: settings.email.to,
            subject: `New Contact: ${subject || 'Website Inquiry'} from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><small>Sent from Helmstrat CMS Contact Form</small></p>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully!');
        } catch (emailErr) {
            console.log('Email could not be sent:', emailErr.message);
        }
    } else {
        console.log('Email not configured. Message saved to contacts.json only.');
    }
    
    res.json({ success: true, message: 'Message sent successfully!' });
});

// Get all pages API
app.get('/api/pages', (req, res) => {
    res.json(getPages());
});

// Get single page API
app.get('/api/pages/:id', (req, res) => {
    const page = getPageById(req.params.id);
    if (page) {
        res.json(page);
    } else {
        res.status(404).json({ error: 'Page not found' });
    }
});

// ============================================
// ADMIN ROUTES
// ============================================

app.get('/admin', (req, res) => {
    res.render('admin-login', { error: null });
});

app.get('/admin/media', (req, res) => {
    const uploadsDir = path.join(__dirname, 'public/uploads/images');
    const cmsImagesDir = IMAGE_FOLDER;
    
    let images = [];
    
    // Get images from public/uploads/images
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
                images.push({
                    filename: file,
                    path: '/uploads/images/' + file,
                    size: stats.size,
                    date: stats.mtime,
                    location: 'Uploads'
                });
            }
        });
    }
    
    // Get images from CMS Images folder
    if (fs.existsSync(cmsImagesDir)) {
        const files = fs.readdirSync(cmsImagesDir);
        files.forEach(file => {
            const filePath = path.join(cmsImagesDir, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
                images.push({
                    filename: file,
                    path: '/cms-images/' + file,
                    size: stats.size,
                    date: stats.mtime,
                    location: 'CMS Images'
                });
            }
        });
    }
    
    // Sort by date (newest first)
    images.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.render('media', { images: images });
});

app.post('/admin/media/delete', (req, res) => {
    const { filepath, location } = req.body;
    
    let fullPath = '';
    if (location === 'Uploads') {
        fullPath = path.join(__dirname, 'public/uploads/images', filepath);
    } else if (location === 'CMS Images') {
        fullPath = path.join(IMAGE_FOLDER, filepath);
    }
    
    if (fullPath && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
    
    res.json({ success: true });
});

app.get('/admin/settings', (req, res) => {
    const settings = getSettings();
    res.render('settings', { settings: settings, success: null, error: null });
});

app.post('/admin/settings', (req, res) => {
    const settings = getSettings();
    
    settings.admin.siteName = req.body.siteName || 'Helmstrat';
    settings.admin.siteDescription = req.body.siteDescription || '';
    settings.site = {
        email: req.body.siteEmail || '',
        phone: req.body.sitePhone || '',
        address: req.body.siteAddress || '',
        socialLinks: {
            twitter: req.body.twitter || '#',
            linkedin: req.body.linkedin || '#',
            github: req.body.github || '#',
            instagram: req.body.instagram || '#'
        }
    };
    settings.email = {
        enabled: req.body.emailEnabled === 'on',
        host: req.body.emailHost || '',
        port: parseInt(req.body.emailPort) || 465,
        secure: req.body.emailSecure === 'on',
        user: req.body.emailUser || '',
        password: req.body.emailPassword || '',
        to: req.body.emailTo || ''
    };
    
    saveSettings(settings);
    res.render('settings', { settings: settings, success: 'Settings saved successfully!', error: null });
});

app.post('/admin/login', (req, res) => {
    const settings = getSettings();
    const { password } = req.body;
    
    if (password === settings.admin.password) {
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin-login', { error: 'Invalid password' });
    }
});

app.get('/admin/dashboard', (req, res) => {
    const data = getPages();
    res.render('dashboard', { pages: data.pages });
});

app.get('/admin/navigation', (req, res) => {
    const allPages = getPages().pages;
    const settings = getSettings();
    res.render('navigation', { 
        pages: allPages,
        navOrder: settings.navigation || { excluded: [] }
    });
});

app.post('/admin/navigation', (req, res) => {
    const settings = getSettings();
    let excluded = [];
    
    if (req.body.excluded) {
        if (Array.isArray(req.body.excluded)) {
            excluded = req.body.excluded;
        } else {
            excluded = req.body.excluded.split(',').map(s => s.trim()).filter(s => s);
        }
    }
    
    settings.navigation = {
        enabled: true,
        excluded: excluded
    };
    saveSettings(settings);
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit-about', (req, res) => {
    const aboutPage = getPageBySlug('/about');
    if (aboutPage) {
        res.render('edit-about', { page: aboutPage });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.post('/admin/edit-about', (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.slug === '/about');
    
    if (index !== -1) {
        data.pages[index].subtitle = req.body.subtitle;
        data.pages[index].content = req.body.content;
        data.pages[index].fullContent = req.body.fullContent;
        data.pages[index].highlights = req.body.highlights.split(',').map(h => h.trim()).filter(h => h);
        data.pages[index].updatedAt = new Date().toISOString();
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit-home', (req, res) => {
    const homePage = getPageBySlug('/');
    if (homePage) {
        res.render('edit-home', { page: homePage });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.post('/admin/edit-home', (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.slug === '/');
    
    if (index !== -1) {
        data.pages[index].heroTitle = req.body.heroTitle;
        data.pages[index].heroGradientText = req.body.heroGradientText;
        data.pages[index].subtitle = req.body.subtitle;
        data.pages[index].content = req.body.content;
        data.pages[index].ctaPrimary = req.body.ctaPrimary;
        data.pages[index].ctaSecondary = req.body.ctaSecondary;
        data.pages[index].stats = [
            { value: req.body.statValue0, label: req.body.statLabel0 },
            { value: req.body.statValue1, label: req.body.statLabel1 },
            { value: req.body.statValue2, label: req.body.statLabel2 }
        ];
        data.pages[index].updatedAt = new Date().toISOString();
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit-services', (req, res) => {
    const servicesPage = getPageBySlug('/services');
    if (servicesPage) {
        res.render('edit-services', { page: servicesPage });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.post('/admin/edit-services', (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.slug === '/services');
    
    if (index !== -1) {
        data.pages[index].subtitle = req.body.subtitle;
        data.pages[index].content = req.body.content;
        data.pages[index].services = [
            { icon: req.body.icon0, color: req.body.color0, title: req.body.title0, description: req.body.description0 },
            { icon: req.body.icon1, color: req.body.color1, title: req.body.title1, description: req.body.description1 },
            { icon: req.body.icon2, color: req.body.color2, title: req.body.title2, description: req.body.description2 },
            { icon: req.body.icon3, color: req.body.color3, title: req.body.title3, description: req.body.description3 },
            { icon: req.body.icon4, color: req.body.color4, title: req.body.title4, description: req.body.description4 },
            { icon: req.body.icon5, color: req.body.color5, title: req.body.title5, description: req.body.description5 }
        ];
        data.pages[index].updatedAt = new Date().toISOString();
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit-testimonials', (req, res) => {
    const testimonialsPage = getPageBySlug('/testimonials');
    if (testimonialsPage) {
        res.render('edit-testimonials', { page: testimonialsPage });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.post('/admin/edit-testimonials', (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.slug === '/testimonials');
    
    if (index !== -1) {
        data.pages[index].subtitle = req.body.subtitle;
        data.pages[index].content = req.body.content;
        data.pages[index].logos = req.body.logos.split(',').map(l => l.trim()).filter(l => l);
        data.pages[index].testimonials = [
            { name: req.body.name0, role: req.body.role0, initials: req.body.initials0, gradientFrom: req.body.gradientFrom0, gradientTo: req.body.gradientFrom0, rating: parseInt(req.body.rating0), text: req.body.text0 },
            { name: req.body.name1, role: req.body.role1, initials: req.body.initials1, gradientFrom: req.body.gradientFrom1, gradientTo: req.body.gradientFrom1, rating: parseInt(req.body.rating1), text: req.body.text1 },
            { name: req.body.name2, role: req.body.role2, initials: req.body.initials2, gradientFrom: req.body.gradientFrom2, gradientTo: req.body.gradientFrom2, rating: parseInt(req.body.rating2), text: req.body.text2 }
        ];
        data.pages[index].updatedAt = new Date().toISOString();
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit-contact', (req, res) => {
    const contactPage = getPageBySlug('/contact');
    if (contactPage) {
        res.render('edit-contact', { page: contactPage });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.post('/admin/edit-contact', (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.slug === '/contact');
    
    if (index !== -1) {
        data.pages[index].subtitle = req.body.subtitle;
        data.pages[index].content = req.body.content;
        data.pages[index].contactInfo = {
            email: req.body.email,
            phone: req.body.phone,
            location: req.body.location
        };
        data.pages[index].socialLinks = {
            twitter: req.body.twitter,
            linkedin: req.body.linkedin,
            github: req.body.github,
            instagram: req.body.instagram
        };
        data.pages[index].updatedAt = new Date().toISOString();
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit-products', (req, res) => {
    const productsPage = getPageBySlug('/products');
    if (productsPage) {
        res.render('edit-products', { page: productsPage });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.get('/admin/edit-blog', (req, res) => {
    const blogData = getBlogPosts();
    res.render('edit-blog', { posts: blogData.posts || [] });
});

app.post('/admin/blog', upload.fields([
    { name: 'blogImage_0', maxCount: 1 },
    { name: 'blogImage_1', maxCount: 1 },
    { name: 'blogImage_2', maxCount: 1 },
    { name: 'blogImage_3', maxCount: 1 },
    { name: 'blogImage_4', maxCount: 1 },
    { name: 'blogImage_5', maxCount: 1 },
    { name: 'blogImage_6', maxCount: 1 },
    { name: 'blogImage_7', maxCount: 1 },
    { name: 'blogImage_8', maxCount: 1 },
    { name: 'blogImage_9', maxCount: 1 }
]), (req, res) => {
    let posts = [];
    if (req.body.postsData) {
        try {
            posts = JSON.parse(req.body.postsData);
            
            // Process uploaded images and URL inputs
            for (let i = 0; i < posts.length; i++) {
                const imageField = 'blogImage_' + i;
                const imageUrlField = 'imageUrl_' + i;
                const existingImage = posts[i].image || '';
                
                // First check for uploaded file
                if (req.files && req.files[imageField] && req.files[imageField][0]) {
                    posts[i].image = '/uploads/images/' + req.files[imageField][0].filename;
                }
                // Then check for image URL
                else if (req.body[imageUrlField] && req.body[imageUrlField].trim()) {
                    posts[i].image = req.body[imageUrlField].trim();
                }
            }
        } catch (e) {
            posts = [];
        }
    }
    saveBlogPosts({ posts: posts });
    res.redirect('/admin/dashboard');
});

app.post('/admin/edit-products', upload.fields([
    { name: 'image_0', maxCount: 1 },
    { name: 'image_1', maxCount: 1 },
    { name: 'image_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
    { name: 'image_4', maxCount: 1 },
    { name: 'image_5', maxCount: 1 },
    { name: 'image_6', maxCount: 1 },
    { name: 'image_7', maxCount: 1 },
    { name: 'image_8', maxCount: 1 },
    { name: 'image_9', maxCount: 1 }
]), (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.slug === '/products');
    
    if (index !== -1) {
        const productCount = parseInt(req.body.productCount) || 0;
        const products = [];
        
        for (let i = 0; i < productCount; i++) {
            const name = req.body['name_' + i];
            if (name) {
                const imageField = 'image_' + i;
                const imageUrlField = 'imageUrl_' + i;
                const existingImage = (data.pages[index].products && data.pages[index].products[i] && data.pages[index].products[i].image) || '';
                
                let imagePath = existingImage;
                
                // First check for uploaded file
                if (req.files && req.files[imageField] && req.files[imageField][0]) {
                    imagePath = '/uploads/images/' + req.files[imageField][0].filename;
                }
                // Then check for image URL (only if different from existing and not empty)
                else if (req.body[imageUrlField] && req.body[imageUrlField].trim() && req.body[imageUrlField].trim() !== existingImage) {
                    imagePath = req.body[imageUrlField].trim();
                }
                
                products.push({
                    name: name,
                    tagline: req.body['tagline_' + i] || '',
                    description: req.body['description_' + i] || '',
                    features: req.body['features_' + i] ? req.body['features_' + i].split(',').map(f => f.trim()).filter(f => f) : [],
                    platform: req.body['platform_' + i] || 'Android',
                    playStoreUrl: req.body['playStoreUrl_' + i] || '',
                    image: imagePath
                });
            }
        }
        
        if (products.length === 0) {
            products.push({
                name: 'New Product',
                tagline: 'Coming Soon',
                description: 'Add your product description here.',
                features: ['Feature 1', 'Feature 2'],
                platform: 'Android',
                playStoreUrl: '',
                image: '/images/App.png'
            });
        }
        
        data.pages[index].subtitle = req.body.subtitle;
        data.pages[index].content = req.body.content;
        data.pages[index].products = products;
        data.pages[index].updatedAt = new Date().toISOString();
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/add-page', (req, res) => {
    res.render('add-page');
});

app.post('/admin/add-page', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), (req, res) => {
    const data = getPages();
    
    const newPage = {
        id: generateId(),
        title: req.body.title,
        slug: '/' + req.body.slug,
        content: req.body.content,
        image: req.files['image'] ? '/uploads/images/' + req.files['image'][0].filename : null,
        video: req.files['video'] ? '/uploads/videos/' + req.files['video'][0].filename : null,
        order: data.pages.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    data.pages.push(newPage);
    savePages(data);
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/edit/:id', (req, res) => {
    const page = getPageById(req.params.id);
    
    if (page) {
        res.render('edit-page', { page: page });
    } else {
        res.redirect('/admin/dashboard');
    }
});

app.post('/admin/edit/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), (req, res) => {
    const data = getPages();
    const index = data.pages.findIndex(p => p.id === req.params.id);
    
    if (index !== -1) {
        data.pages[index].title = req.body.title;
        data.pages[index].slug = '/' + req.body.slug;
        data.pages[index].content = req.body.content;
        data.pages[index].updatedAt = new Date().toISOString();
        
        if (req.files['image']) {
            data.pages[index].image = '/uploads/images/' + req.files['image'][0].filename;
        }
        if (req.files['video']) {
            data.pages[index].video = '/uploads/videos/' + req.files['video'][0].filename;
        }
        
        savePages(data);
    }
    
    res.redirect('/admin/dashboard');
});

app.get('/admin/delete/:id', (req, res) => {
    const data = getPages();
    data.pages = data.pages.filter(p => p.id !== req.params.id);
    savePages(data);
    res.redirect('/admin/dashboard');
});

app.get('/admin/upload-template', (req, res) => {
    res.render('upload-template');
});

app.post('/admin/upload-template', upload.single('template'), (req, res) => {
    if (req.file) {
        const destPath = path.join(TEMPLATE_FOLDER, req.file.originalname);
        fs.copyFileSync(req.file.path, destPath);
        fs.unlinkSync(req.file.path);
    }
    res.redirect('/admin/dashboard');
});

// ============================================
// UPLOAD ROUTES
// ============================================

app.post('/admin/upload-image', upload.single('file'), (req, res) => {
    if (req.file) {
        const destPath = path.join(IMAGE_FOLDER, req.file.originalname);
        fs.copyFileSync(req.file.path, destPath);
        fs.unlinkSync(req.file.path);
        res.json({ success: true, path: IMAGE_FOLDER + '\\' + req.file.originalname });
    } else {
        res.json({ success: false });
    }
});

// Serve images from external folder
app.use('/cms-images', express.static(IMAGE_FOLDER));

// ============================================
// GENERIC PAGE ROUTE (MUST BE LAST)
// ============================================

app.get('/:slug', (req, res) => {
    const slug = '/' + req.params.slug;
    const page = getPageBySlug(slug);
    
    if (page) {
        const template = page.template || 'page';
        try {
            res.render(template, { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
        } catch (err) {
            res.render('page', { page: page, pages: getNavigationPages(), siteSettings: getSiteSettings() });
        }
    } else {
        res.status(404).send('Page not found');
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log('Helmstrat CMS Server is running!');
    console.log('========================================');
    console.log('Local URL: http://localhost:' + PORT);
    console.log('----------------------------------------');
    console.log('Public Pages:');
    console.log('  http://localhost:' + PORT + '/');
    console.log('  http://localhost:' + PORT + '/about');
    console.log('  http://localhost:' + PORT + '/services');
    console.log('  http://localhost:' + PORT + '/testimonials');
    console.log('  http://localhost:' + PORT + '/contact');
    console.log('  http://localhost:' + PORT + '/products');
    console.log('----------------------------------------');
    console.log('Admin URL: http://localhost:' + PORT + '/admin');
    console.log('Password: 12345678');
    console.log('========================================');
    console.log('Image Folder: ' + IMAGE_FOLDER);
    console.log('Template Folder: ' + TEMPLATE_FOLDER);
    console.log('========================================');
});
