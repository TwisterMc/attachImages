# Attach Orphaned Images - WordPress Plugin

A WordPress plugin that automatically scans for orphaned media attachments (images and files with no parent post) and attaches them to posts that reference them.

## Features

- **Automatic Detection**: Finds all attachments in your media library that have no parent post
- **Smart Matching**: Searches post content and custom fields for references to orphaned attachments
- **All Post Statuses**: Searches published, draft, pending, scheduled, and private posts
- **Multiple Search Patterns**: Looks for:
  - Full URLs
  - Relative URLs
  - Filenames
  - Different image sizes (large, medium, thumbnail)
- **Preview Mode**: Dry run option to see what would be attached without making changes
- **Stop Processing**: Cancel scans at any time and view partial results
- **Batch Processing**: Efficiently handles large media libraries (3000+ images) in 50-item batches
- **Performance Optimized**: 
  - Query result caching
  - Combined database queries
  - Increased execution time limits
- **User-Friendly Interface**: Clean admin interface with real-time progress indicators and detailed results
- **Fully Accessible**: ARIA attributes, screen reader support, keyboard navigation
- **Internationalization**: Translation-ready with Spanish (es_ES) included
- **Detailed Reporting**: Shows which attachments were matched and which posts they were attached to

## Installation

1. Upload the `attachImages` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Navigate to **Media > Attach Images** in the WordPress admin panel

## Usage

### Running a Scan

1. Go to **Media > Attach Images** in your WordPress admin
2. Click one of the following buttons:
   - **Scan and Attach Images**: Performs the actual attachment process
   - **Preview Only (Dry Run)**: Shows what would happen without making changes
   - **Stop**: (Appears during processing) Cancels the scan and shows partial results

### Understanding Results

The results page shows:

- **Total Orphaned**: Number of attachments with no parent post
- **Attached/Would Attach**: Number of attachments successfully matched to posts
- **Not Found**: Number of attachments with no matching posts

Each result includes:

- Attachment name and ID
- Matched post title and ID (if found)
- Status indicator

## How It Works

The plugin performs the following steps:

1. **Query Orphaned Attachments**: Retrieves attachments in batches of 50 where `post_parent = 0`
2. **Generate Search Patterns**: For each attachment, creates multiple search patterns:
   - Full URL (e.g., `https://example.com/wp-content/uploads/2024/11/image.jpg`)
   - Protocol-less URL (e.g., `example.com/wp-content/uploads/2024/11/image.jpg`)
   - Relative URL (e.g., `/wp-content/uploads/2024/11/image.jpg`)
   - Filename only (e.g., `image.jpg`)
   - Common thumbnail sizes (large, medium, thumbnail)
3. **Search Post Content**: Queries the database for posts (all statuses) containing any of these patterns using combined OR queries
4. **Search Post Meta**: Also checks custom fields for attachment references (if not found in content)
5. **Cache Results**: Stores search results for 1 hour to improve performance on subsequent batches
6. **Attach**: Updates the attachment's `post_parent` to link it to the found post
7. **Continue**: Processes next batch until all orphaned attachments are scanned or user stops

### Performance Optimizations

- **Batch Processing**: Processes 50 attachments per AJAX request to avoid timeouts
- **Combined Queries**: Uses OR clauses instead of multiple separate queries
- **Smart Caching**: Caches positive results for 1 hour, negative results for 30 minutes
- **Execution Time**: Increases PHP execution limit to 300 seconds per batch
- **Limited Size Checks**: Only checks 3 most common image sizes instead of all variants

## Requirements

- WordPress 5.0 or higher
- PHP 7.0 or higher
- User capability: `upload_files`

## Security

- AJAX requests are protected with WordPress nonces
- User capability checks ensure only authorized users can run scans
- All database queries use prepared statements to prevent SQL injection

## File Structure

```
attachImages/
├── attach_images.php    # Main plugin file
├── css/
│   └── admin.css       # Admin interface styles
├── js/
│   └── admin.js        # Admin interface JavaScript
├── languages/
│   ├── attach-images.pot        # Translation template
│   ├── attach-images-es_ES.po   # Spanish translation (editable)
│   └── attach-images-es_ES.mo   # Spanish translation (compiled)
└── README.md           # This file
```

## Frequently Asked Questions

### Will this plugin modify my posts?

No, the plugin only modifies the `post_parent` field of attachments. It does not change any post content.

### What if an attachment could match multiple posts?

The plugin will attach the orphaned file to the first matching post it finds.

### Can I undo the attachments?

Yes, you can manually change the parent post in the Media Library, or set it back to "Unattached" in the attachment edit screen.

### Does this search draft and scheduled posts?

Yes! The plugin searches all post statuses including published, draft, pending, scheduled (future), and private posts.

### Can I stop the scan if it's taking too long?

Yes, click the **Stop** button that appears during processing. You'll see partial results for what was completed before stopping.

### How many images can this plugin handle?

The plugin is optimized for large libraries. It has been tested with 3000+ images using batch processing to avoid server timeouts.

### Does this work with custom post types?

Currently, the plugin searches in `post` and `page` post types. You can modify the code to include custom post types.

## Development

To modify search behavior or add custom post types, edit the `find_post_with_attachment()` method in `attach_images.php`.

### Adding Custom Post Types

Look for this line in the code:

```php
WHERE post_type IN ('post', 'page')
```

Change it to include your custom post types:

```php
WHERE post_type IN ('post', 'page', 'portfolio', 'product')
```

### Adding Translations

1. Copy `languages/attach-images.pot` to `languages/attach-images-{locale}.po`
2. Translate strings in the `.po` file
3. Compile with: `msgfmt -o attach-images-{locale}.mo attach-images-{locale}.po`

### Accessibility

The plugin follows WCAG 2.1 guidelines:
- Full keyboard navigation support
- ARIA attributes for dynamic content
- Screen reader announcements for progress updates
- Accessible error notifications

## Changelog

### Version 1.0.0

- Initial release
- Scan for orphaned attachments
- Auto-attach to matching posts
- Preview mode (dry run)
- Batch processing (50 items per batch)
- Stop button to cancel processing
- Search all post statuses (not just published)
- Performance optimizations:
  - Query result caching
  - Combined database queries
  - Execution time management
- Accessibility features:
  - ARIA attributes
  - Screen reader support
  - Keyboard navigation
- Internationalization:
  - Translation-ready
  - Spanish (es_ES) included
- Admin interface with real-time progress indicators
- Detailed results reporting

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/TwisterMc/attachImages).

## License

This plugin is licensed under the GPL v2 or later.

## Credits

Developed by Thomas McMahon
