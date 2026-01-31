# Cookie Saver Extension

Chrome extension to save a site's cookies to JSON with manual selection.

## Features

- Display all cookies for the current site
- Manual selection of cookies to save via a modal
- Search cookies by name, value or domain
- Export to JSON with full cookie details
- Modern and intuitive interface

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked extension"
4. Select the `chrome-extension-cookiessav` folder
5. The extension is now installed!

## Usage

1. Navigate to the site whose cookies you want to save
2. Click the extension icon in the toolbar
3. Click "Select cookies"
4. In the modal:
   - Check/uncheck the cookies you want to save
   - Use the search to filter cookies
   - Use "Select all" or "Deselect all" to save time
5. Click "Save" to download the JSON file

## JSON File Format

The JSON file contains:
- Site info (URL, domain)
- Export date
- Cookie count
- Detailed list of each cookie with:
  - name, value, domain, path
  - secure, httpOnly, sameSite
  - expirationDate

## Permissions

The extension requires:
- `cookies`: To read site cookies
- `tabs`: To detect the current site
- `<all_urls>`: To access cookies for all sites

## Notes

- By default, all cookies are selected
- You can manually deselect analytics/tracking cookies
- The JSON file is downloaded to your downloads folder
