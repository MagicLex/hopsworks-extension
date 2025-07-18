# Hopsworks ML Integration Chrome Extension

Auto-generate ML recommendation scripts for any e-commerce site in 30 seconds.

## Installation (Developer Mode)

1. **Clone and prepare**
   ```bash
   git clone https://github.com/magiclex/hopsworks-extension.git
   cd hopsworks-extension
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `hopsworks-extension` folder

3. **Test it**
   - Navigate to any e-commerce site (Shopify, WooCommerce, etc.)
   - Click the extension icon (HW) in toolbar
   - Click "ANALYZE SITE"
   - Review detection results
   - Enter your API key and generate script

## Features

The extension automatically detects:
- Product cards and listings
- Product IDs
- Prices
- Add to cart buttons
- User identification methods

Then generates a complete integration script that:
- Tracks user behavior
- Loads Hopsworks SDK
- Injects ML recommendations
- Handles user identification progressively

## Supported Sites

Tested on:
- Shopify stores
- WooCommerce
- BigCommerce
- Custom React/Vue/Angular e-commerce sites

## How it works

1. **Content scripts** analyze the DOM to find e-commerce elements
2. **User detection** tries multiple strategies (cookies, JS globals, DOM elements)
3. **Script generator** creates customized integration code
4. **Copy & paste** the script into your site

## Architecture

```
src/
├── content/
│   ├── analyzer.js    # Detects e-commerce elements
│   ├── detector.js    # User identification strategies
│   └── selector.js    # Visual element selector
├── popup/
│   ├── index.html     # Extension UI
│   ├── styles.css     # UI styling
│   └── popup.js       # UI controller
├── background/
│   └── service-worker.js
└── shared/
    └── generator.js   # Script generation logic
```

## Development

No build step required - vanilla JavaScript for performance.

To modify:
1. Edit files in `src/`
2. Go to `chrome://extensions/`
3. Click refresh icon on the extension

## Security

- No eval() except for user ID detection
- Content scripts are sandboxed
- No external dependencies
- All processing happens locally

## Design

Clean, functional design:
- 1px border radius
- #1eb182 accent color
- Monospace typography
- Optimized for clarity

## Usage

After installing:
1. Visit an e-commerce site
2. Run the analyzer
3. Get your Hopsworks API key from dashboard
4. Generate and implement the script
5. Start getting ML-powered recommendations

---

© 2024 Hopsworks. All rights reserved.