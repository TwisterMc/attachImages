# Attach Orphaned Images - WordPress Plugin

A WordPress plugin that automatically scans for orphaned media attachments (images and files with no parent post) and attaches them to posts that reference them.

## Features

- **Automatic Detection**: Finds all attachments in your media library that have no parent post
- **Smart Matching**: Searches post content and custom fields for references to orphaned attachments
- **Multiple Search Patterns**: Looks for:
  - Full URLs
  - Relative URLs
  - Filenames
  - Different image sizes
- **Preview Mode**: Dry run option to see what would be attached without making changes
- **User-Friendly Interface**: Clean admin interface with progress indicators and detailed results
- **Batch Processing**: Handles large media libraries efficiently
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

1. **Query Orphaned Attachments**: Retrieves all attachments where `post_parent = 0`
2. **Generate Search Patterns**: For each attachment, creates multiple search patterns:
   - Full URL (e.g., `https://example.com/wp-content/uploads/2024/11/image.jpg`)
   - Protocol-less URL (e.g., `example.com/wp-content/uploads/2024/11/image.jpg`)
   - Relative URL (e.g., `/wp-content/uploads/2024/11/image.jpg`)
   - Filename only (e.g., `image.jpg`)
   - Thumbnail filenames (e.g., `image-150x150.jpg`)
3. **Search Post Content**: Queries the database for posts containing any of these patterns
4. **Search Post Meta**: Also checks custom fields for attachment references
5. **Attach**: Updates the attachment's `post_parent` to link it to the found post

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
└── README.md           # This file
```

## Frequently Asked Questions

### Will this plugin modify my posts?

No, the plugin only modifies the `post_parent` field of attachments. It does not change any post content.

### What if an attachment could match multiple posts?

The plugin will attach the orphaned file to the first matching post it finds.

### Can I undo the attachments?

Yes, you can manually change the parent post in the Media Library, or set it back to "Unattached" in the attachment edit screen.

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

## Changelog

### Version 1.0.0

- Initial release
- Scan for orphaned attachments
- Auto-attach to matching posts
- Preview mode (dry run)
- Admin interface with progress indicators
- Detailed results reporting

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/yourusername/attach-images).

## License

This plugin is licensed under the GPL v2 or later.

## Credits

Developed by [Your Name]
