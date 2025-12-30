# Discourse Theme Customization for Fomio WebView Auth

This document describes how to customize your Discourse instance to provide a native-feeling authentication experience when accessed from the Fomio mobile app.

## Overview

When the Fomio app opens the User API Key authorization page in a WebView, it appends `?fomio=1` to the URL. Your Discourse theme should detect this parameter and apply minimal, mobile-optimized styling. The signup page may also include `return_to=fomio://auth_redirect` to offer a “Return to App” button.

## Goals

1. **Hide distracting elements** - Remove global navigation, footer, sidebar
2. **Match app aesthetics** - Use Fomio's color palette and design language
3. **Focus on the task** - Only show the authorization/login form

## Implementation

### Step 1: Create a Theme Component

In your Discourse Admin panel:
1. Go to **Admin** → **Customize** → **Themes**
2. Edit your active theme (or create a new one)
3. Click **Edit CSS/HTML**
4. Add the following to the appropriate sections

### Step 2: Add JavaScript (Header section)

This script detects the `fomio=1` URL parameter and sets a data attribute on the HTML element. If `return_to` is provided, it also adds a “Return to App” button.

```html
<script type="text/discourse-plugin" version="0.8">
  // Detect Fomio app WebView
  const params = new URLSearchParams(window.location.search);
  if (params.has('fomio') || params.get('fomio') === '1') {
    document.documentElement.setAttribute('data-fomio', '1');
    
    // Also set on body when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
      document.body.classList.add('fomio-webview');
    });

    const returnTo = params.get('return_to');
    if (returnTo) {
      document.addEventListener('DOMContentLoaded', function() {
        const button = document.createElement('a');
        button.href = returnTo;
        button.textContent = 'Return to App';
        button.className = 'fomio-return-to-app';
        document.body.appendChild(button);
      });
    }
  }
</script>
```

### Step 3: Add CSS (Common section)

Add this CSS to hide unnecessary elements and style the page for Fomio:

```css
/* ===========================================
   Fomio WebView Styles
   Only applied when ?fomio=1 parameter is present
   =========================================== */

/* Hide global navigation and chrome */
html[data-fomio="1"] .d-header,
html[data-fomio="1"] .d-header-wrap,
html[data-fomio="1"] header.d-header,
html[data-fomio="1"] .sidebar-wrapper,
html[data-fomio="1"] .sidebar-container,
html[data-fomio="1"] #main-outlet-wrapper > .sidebar-wrapper,
html[data-fomio="1"] footer,
html[data-fomio="1"] .footer-links,
html[data-fomio="1"] .d-footer,
html[data-fomio="1"] .category-breadcrumb,
html[data-fomio="1"] .navigation-container {
  display: none !important;
}

/* Hide "Powered by Discourse" and similar branding */
html[data-fomio="1"] .powered-by,
html[data-fomio="1"] .footer-message,
html[data-fomio="1"] .discourse-update-banner {
  display: none !important;
}

/* Remove sidebar spacing */
html[data-fomio="1"] #main-outlet {
  padding-left: 0 !important;
  padding-right: 0 !important;
  max-width: 100% !important;
}

html[data-fomio="1"] .wrap {
  max-width: 100% !important;
  padding: 0 16px !important;
}

/* Return to App button */
html[data-fomio="1"] .fomio-return-to-app {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 16px auto 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: #2F6BFF;
  color: #FFFFFF !important;
  font-weight: 600;
  text-decoration: none !important;
}

/* ===========================================
   Dark Mode Styles (AMOLED Black)
   =========================================== */

html[data-fomio="1"] body {
  background-color: #000000 !important;
}

html[data-fomio="1"] .user-api-key-info-page,
html[data-fomio="1"] .login-modal,
html[data-fomio="1"] .login-form,
html[data-fomio="1"] .user-api-key {
  background-color: #000000 !important;
  color: #FFFFFF !important;
}

/* Card/surface backgrounds */
html[data-fomio="1"] .login-modal-body,
html[data-fomio="1"] .d-modal__body,
html[data-fomio="1"] .user-api-key-scopes {
  background-color: #1C1C1E !important;
  border-radius: 12px !important;
}

/* Text colors */
html[data-fomio="1"] h1,
html[data-fomio="1"] h2,
html[data-fomio="1"] h3,
html[data-fomio="1"] .title,
html[data-fomio="1"] label {
  color: #FFFFFF !important;
}

html[data-fomio="1"] p,
html[data-fomio="1"] .description,
html[data-fomio="1"] .instructions {
  color: #8E8E93 !important;
}

/* ===========================================
   Button Styles (Fomio Accent Color)
   =========================================== */

html[data-fomio="1"] .btn-primary,
html[data-fomio="1"] button[type="submit"],
html[data-fomio="1"] .user-api-key .btn-primary {
  background-color: #7CC4FF !important;
  color: #000000 !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  padding: 14px 24px !important;
  font-size: 16px !important;
  transition: opacity 0.15s ease !important;
}

html[data-fomio="1"] .btn-primary:hover,
html[data-fomio="1"] button[type="submit"]:hover {
  background-color: #5AB8FF !important;
  opacity: 0.9 !important;
}

html[data-fomio="1"] .btn-danger,
html[data-fomio="1"] .btn.cancel {
  background-color: transparent !important;
  color: #FF453A !important;
  border: 1px solid #FF453A !important;
  border-radius: 8px !important;
}

/* Secondary/cancel buttons */
html[data-fomio="1"] .btn-default,
html[data-fomio="1"] .btn-flat {
  background-color: transparent !important;
  color: #7CC4FF !important;
  border: 1px solid #3A3A3C !important;
  border-radius: 8px !important;
}

/* ===========================================
   Form Input Styles
   =========================================== */

html[data-fomio="1"] input[type="text"],
html[data-fomio="1"] input[type="email"],
html[data-fomio="1"] input[type="password"],
html[data-fomio="1"] .ember-text-field {
  background-color: #1C1C1E !important;
  color: #FFFFFF !important;
  border: 1px solid #3A3A3C !important;
  border-radius: 8px !important;
  padding: 12px 16px !important;
  font-size: 16px !important;
}

html[data-fomio="1"] input:focus {
  border-color: #7CC4FF !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(124, 196, 255, 0.2) !important;
}

html[data-fomio="1"] input::placeholder {
  color: #6C6C70 !important;
}

/* ===========================================
   User API Key Authorization Page
   =========================================== */

html[data-fomio="1"] .user-api-key-info-page {
  padding: 20px !important;
  padding-top: 40px !important;
}

html[data-fomio="1"] .user-api-key-info-page h2 {
  font-size: 24px !important;
  margin-bottom: 16px !important;
}

html[data-fomio="1"] .user-api-key-scopes {
  padding: 16px !important;
  margin: 16px 0 !important;
}

html[data-fomio="1"] .user-api-key-scopes li {
  color: #8E8E93 !important;
  padding: 8px 0 !important;
  border-bottom: 1px solid #2C2C2E !important;
}

html[data-fomio="1"] .user-api-key-scopes li:last-child {
  border-bottom: none !important;
}

/* ===========================================
   Light Mode Variant (Optional)
   =========================================== */

/* If you want to support light mode, add these with a media query or theme detection */
@media (prefers-color-scheme: light) {
  /* Uncomment and adjust if you want light mode support:
  html[data-fomio="1"] body {
    background-color: #FFFFFF !important;
  }
  
  html[data-fomio="1"] .user-api-key-info-page {
    background-color: #FFFFFF !important;
    color: #000000 !important;
  }
  
  html[data-fomio="1"] .btn-primary {
    background-color: #4F9CF9 !important;
  }
  */
}

/* ===========================================
   Mobile-Specific Adjustments
   =========================================== */

html[data-fomio="1"] {
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

html[data-fomio="1"] * {
  -webkit-touch-callout: none;
}

/* Ensure touch targets are large enough */
html[data-fomio="1"] .btn,
html[data-fomio="1"] button,
html[data-fomio="1"] a.btn {
  min-height: 44px !important;
  min-width: 44px !important;
}

/* Smooth scrolling */
html[data-fomio="1"] {
  scroll-behavior: smooth;
}
```

### Step 4: Test Your Theme

1. Save the theme changes
2. Open the User API Key authorization URL directly in a browser with `?fomio=1`:
   ```
   https://your-discourse.com/user-api-key/new?application_name=Fomio&...&fomio=1
   ```
3. Verify that:
   - Header and sidebar are hidden
   - Background is dark (#000000)
   - Buttons use the accent color (#7CC4FF)
   - The page feels minimal and focused

## Color Reference

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `#000000` | `#FFFFFF` |
| Surface | `#1C1C1E` | `#F2F2F7` |
| Primary Text | `#FFFFFF` | `#000000` |
| Secondary Text | `#8E8E93` | `#6C6C70` |
| Accent (Primary Button) | `#7CC4FF` | `#4F9CF9` |
| On Accent | `#000000` | `#FFFFFF` |
| Border | `#3A3A3C` | `#C6C6C8` |
| Danger | `#FF453A` | `#FF3B30` |

## Troubleshooting

### Elements not hiding?

Some Discourse themes or plugins may use different class names. Use browser DevTools to inspect the elements and adjust the CSS selectors accordingly.

### Styles not applying?

1. Ensure the JavaScript runs before the CSS loads
2. Check that `data-fomio="1"` is being set on the `<html>` element
3. Clear Discourse's asset cache in Admin settings

### Button styles not working?

Discourse may have more specific selectors. Add more specificity:
```css
html[data-fomio="1"] .d-modal .btn-primary.btn-large {
  /* your styles */
}
```

## Security Note

The `?fomio=1` parameter is purely cosmetic and does not affect the security of the User API Key authorization process. The authorization flow remains the same - only the visual presentation changes.

## Related Files

- `app/(auth)/auth-modal.tsx` - The WebView component that loads these pages
- `shared/design/tokens.ts` - Fomio's design token definitions
- `tailwind.config.js` - Fomio's Tailwind configuration with color palette
