<?php
/**
 * Plugin Name: Attach Orphaned Images
 * Plugin URI: https://github.com/TwisterMc/attachImages
 * Description: Scans attachments with no parent and attaches them to posts that contain their filename/URL
 * Version: 1.0.0.9
 * Author: Thomas McMahon
 * Author URI: https://www.twistermc.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: attach-images
 * Domain Path: /languages
 * Requires at least: 5.0
 * Requires PHP: 7.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin class.
 */
class Attach_Orphaned_Images {

	/**
	 * Plugin version.
	 */
	const VERSION = '1.0.0.9';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
		add_action( 'wp_ajax_attach_orphaned_images', array( $this, 'ajax_attach_images' ) );
		add_action( 'wp_ajax_clear_attachment_cache', array( $this, 'ajax_clear_cache' ) );
	}

	/**
	 * Add admin menu page.
	 */
	public function add_admin_menu() {
		add_media_page(
			__( 'Attach Orphaned Images', 'attach-images' ),
			__( 'Attach Images', 'attach-images' ),
			'upload_files',
			'attach-orphaned-images',
			array( $this, 'admin_page' )
		);
	}

	/**
	 * Enqueue admin scripts and styles.
	 *
	 * @param string $hook The current admin page hook.
	 */
	public function enqueue_admin_scripts( $hook ) {
		if ( 'media_page_attach-orphaned-images' !== $hook ) {
			return;
		}

	wp_enqueue_style(
		'attach-images-admin',
		plugin_dir_url( __FILE__ ) . 'css/admin.css',
		array(),
		self::VERSION
	);	wp_enqueue_script(
		'attach-images-admin',
		plugin_dir_url( __FILE__ ) . 'js/admin.js',
		array( 'jquery' ),
		self::VERSION,
		true
	);		wp_localize_script(
			'attach-images-admin',
			'attachImagesData',
			array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'attach_orphaned_images_nonce' ),
			)
		);
	}

	/**
	 * Render admin page HTML.
	 */
	public function admin_page() {
		// Check user capabilities.
		if ( ! current_user_can( 'upload_files' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'attach-images' ) );
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<div class="attach-images-container">
			<div class="attach-images-header">
				<p><?php esc_html_e( 'This tool will scan for attachments that have no parent post and attempt to attach them to posts that reference them.', 'attach-images' ); ?></p>

			<div class="attach-images-actions">
				<button type="button" id="scan-button" class="button button-primary" aria-describedby="scan-description">
					<?php esc_html_e( 'Scan and Attach Images', 'attach-images' ); ?>
				</button>
				<button type="button" id="preview-button" class="button" aria-describedby="scan-description">
					<?php esc_html_e( 'Preview Only (Dry Run)', 'attach-images' ); ?>
				</button>
				<button type="button" id="stop-button" class="button hidden" aria-label="<?php esc_attr_e( 'Stop processing', 'attach-images' ); ?>">
					<?php esc_html_e( 'Stop', 'attach-images' ); ?>
				</button>
				<button type="button" id="clear-cache-button" class="button" aria-describedby="clear-cache-description">
					<?php esc_html_e( 'Clear Scan Cache', 'attach-images' ); ?>
				</button>
				<span id="scan-description" class="screen-reader-text">
					<?php esc_html_e( 'Scans orphaned attachments and attempts to attach them to posts that reference them. Preview mode shows what would happen without making changes.', 'attach-images' ); ?>
				</span>
				<span id="clear-cache-description" class="screen-reader-text">
					<?php esc_html_e( 'Clears cached scan results. Use this if post content has changed since the last scan.', 'attach-images' ); ?>
				</span>
			</div>
			</div>			
			<div id="attach-images-progress" class="hidden" aria-hidden="true">
				<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="<?php esc_attr_e( 'Scan progress', 'attach-images' ); ?>">
					<div class="progress-fill"></div>
				</div>
				<p class="progress-text" aria-live="polite" aria-atomic="true"></p>
			</div>			<div id="attach-images-results" class="hidden" aria-hidden="true" aria-live="polite">
				<h2><?php esc_html_e( 'Results', 'attach-images' ); ?></h2>
				<div class="results-content"></div>
			</div>
			</div>
		</div>
		<?php
	}

	/**
	 * AJAX handler for attaching images.
	 */
	public function ajax_attach_images() {
		check_ajax_referer( 'attach_orphaned_images_nonce', 'nonce' );

		if ( ! current_user_can( 'upload_files' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Insufficient permissions', 'attach-images' ),
				)
			);
		}

		// Sanitize input.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce checked above.
		$dry_run = isset( $_POST['dry_run'] ) && 'true' === sanitize_text_field( wp_unslash( $_POST['dry_run'] ) );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce checked above.
		$offset = isset( $_POST['offset'] ) ? absint( $_POST['offset'] ) : 0;
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce checked above.
		$limit = isset( $_POST['limit'] ) ? absint( $_POST['limit'] ) : 50;
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- Nonce checked above.
		$processed_ids = isset( $_POST['processed_ids'] ) && is_array( $_POST['processed_ids'] ) ? array_map( 'absint', $_POST['processed_ids'] ) : array();

		// Increase execution time for batch processing.
		@set_time_limit( 300 );

		$results = $this->scan_and_attach_images( $dry_run, $offset, $limit, $processed_ids );

		wp_send_json_success( $results );
	}

	/**
	 * Main function to scan and attach images.
	 *
	 * @param bool $dry_run Whether to perform a dry run without making changes.
	 * @param int  $offset  The offset for batch processing.
	 * @param int  $limit   The limit for batch processing.
	 * @return array Results of the scan operation.
	 */
	public function scan_and_attach_images( $dry_run = false, $offset = 0, $limit = 50, $processed_ids = array() ) {
		$results = array(
			'total_orphaned' => 0,
			'attached'       => 0,
			'not_found'      => 0,
			'details'        => array(),
			'dry_run'        => $dry_run,
			'offset'         => $offset,
			'limit'          => $limit,
			'has_more'       => false,
			'total_processed' => 0,
			'processed_ids'  => array(),
		);

		// First get total count of orphaned attachments.
		$total_count = wp_count_posts( 'attachment' );
		global $wpdb;
		$orphaned_count = (int) $wpdb->get_var(
			"SELECT COUNT(*) FROM {$wpdb->posts}
			WHERE post_type = 'attachment'
			AND post_parent = 0
			AND post_status = 'inherit'"
		);

		$results['total_orphaned'] = $orphaned_count;

		// Get attachments with no parent in batches.
		// In attach mode: use offset 0 but exclude already processed IDs
		// In dry_run mode: use normal offset
		$query_args = array(
			'post_type'      => 'attachment',
			'post_parent'    => 0,
			'posts_per_page' => $limit,
			'offset'         => $dry_run ? $offset : 0,
			'post_status'    => 'inherit',
			'orderby'        => 'ID',
			'order'          => 'ASC',
		);
		
		// In attach mode, exclude IDs we've already processed to prevent infinite loop
		if ( ! $dry_run && ! empty( $processed_ids ) ) {
			$query_args['post__not_in'] = $processed_ids;
		}
		
		$orphaned_attachments = get_posts( $query_args );

		$batch_count             = count( $orphaned_attachments );
		$results['batch_count']  = $batch_count;
		$results['next_offset']  = $dry_run ? ( $offset + $limit ) : 0;
		
		// Calculate total processed including previous batches
		$total_already_processed = count( $processed_ids );
		$results['total_processed'] = $total_already_processed + $batch_count;
		
		// Determine has_more
		// Stop if: no items returned, OR we've processed >= total orphaned count
		if ( $batch_count === 0 || $results['total_processed'] >= $orphaned_count ) {
			$results['has_more'] = false;
		} else {
			$results['has_more'] = true;
		}

		foreach ( $orphaned_attachments as $attachment ) {
			// Track this ID as processed
			$results['processed_ids'][] = $attachment->ID;
			
			$attachment_url      = wp_get_attachment_url( $attachment->ID );
			$attachment_filename = basename( $attachment_url );

			// Try to find a post containing this attachment.
			$parent_post = $this->find_post_with_attachment( $attachment->ID, $attachment_url, $attachment_filename );

			if ( $parent_post ) {
				$detail = array(
					'attachment_id'    => $attachment->ID,
					'attachment_title' => $attachment->post_title,
					'attachment_url'   => $attachment_url,
					'post_id'          => $parent_post->ID,
					'post_title'       => $parent_post->post_title,
					'post_url'         => get_permalink( $parent_post->ID ),
				);

				if ( ! $dry_run ) {
					// Attach the image to the post.
					wp_update_post(
						array(
							'ID'          => $attachment->ID,
							'post_parent' => $parent_post->ID,
						)
					);
					$detail['status'] = 'attached';
				} else {
					$detail['status'] = 'would_attach';
				}

				$results['attached']++;
				$results['details'][] = $detail;
			} else {
				$results['not_found']++;
				$results['details'][] = array(
					'attachment_id'    => $attachment->ID,
					'attachment_title' => $attachment->post_title,
					'attachment_url'   => $attachment_url,
					'status'          => 'not_found',
				);
			}
		}

		return $results;
	}

	/**
	 * Find a post that contains reference to this attachment.
	 *
	 * @param int    $attachment_id   The attachment ID.
	 * @param string $attachment_url  The attachment URL.
	 * @param string $filename        The attachment filename.
	 * @return object|null Post object if found, null otherwise.
	 */
	private function find_post_with_attachment( $attachment_id, $attachment_url, $filename ) {
		global $wpdb;

		// Check cache first.
		$cache_key = 'attach_img_' . $attachment_id;
		$cached    = get_transient( $cache_key );
		if ( false !== $cached ) {
			return $cached ? (object) $cached : null;
		}

		// Get various URL formats to search for.
		$search_patterns = array();

		// Full URL.
		$search_patterns[] = $attachment_url;

		// URL without protocol.
		$search_patterns[] = preg_replace( '#^https?://#', '', $attachment_url );

		// Relative URL (from uploads directory).
		$upload_dir   = wp_upload_dir();
		$relative_url = str_replace( $upload_dir['baseurl'], '', $attachment_url );
		if ( $relative_url !== $attachment_url ) {
			$search_patterns[] = $relative_url;
		}

		// Filename only.
		$search_patterns[] = $filename;

		// Limit image size checks to the most common ones.
		$attachment_metadata = wp_get_attachment_metadata( $attachment_id );
		if ( isset( $attachment_metadata['sizes'] ) && is_array( $attachment_metadata['sizes'] ) ) {
			$priority_sizes = array( 'large', 'medium', 'thumbnail' );
			foreach ( $priority_sizes as $size_name ) {
				if ( isset( $attachment_metadata['sizes'][ $size_name ]['file'] ) ) {
					$search_patterns[] = $attachment_metadata['sizes'][ $size_name ]['file'];
				}
			}
		}

		// Combine patterns into a single OR query for better performance.
		$like_conditions = array();
		foreach ( array_slice( $search_patterns, 0, 5 ) as $pattern ) {
			$like_conditions[] = $wpdb->prepare( 'post_content LIKE %s', '%' . $wpdb->esc_like( $pattern ) . '%' );
		}

		$where_clause = implode( ' OR ', $like_conditions );

		// Search in post content with combined query.
		$query = "SELECT ID, post_title FROM {$wpdb->posts}
				WHERE post_type IN ('post', 'page')
				AND ({$where_clause})
				LIMIT 1";

		$post = $wpdb->get_row( $query ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( $post ) {
			// Cache for 1 hour.
			set_transient( $cache_key, $post, HOUR_IN_SECONDS );
			return $post;
		}

		// Search in post meta with combined query.
		$like_conditions = array();
		foreach ( array_slice( $search_patterns, 0, 5 ) as $pattern ) {
			$like_conditions[] = $wpdb->prepare( 'pm.meta_value LIKE %s', '%' . $wpdb->esc_like( $pattern ) . '%' );
		}

		$where_clause = implode( ' OR ', $like_conditions );

		$query = "SELECT p.ID, p.post_title
				FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
				WHERE p.post_type IN ('post', 'page')
				AND ({$where_clause})
				LIMIT 1";

		$post = $wpdb->get_row( $query ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		if ( $post ) {
			// Cache for 1 hour.
			set_transient( $cache_key, $post, HOUR_IN_SECONDS );
			return $post;
		}

		// Cache negative result for 30 minutes.
		set_transient( $cache_key, '', 30 * MINUTE_IN_SECONDS );

		return null;
	}

	/**
	 * AJAX handler for clearing cache.
	 */
	public function ajax_clear_cache() {
		check_ajax_referer( 'attach_orphaned_images_nonce', 'nonce' );

		if ( ! current_user_can( 'upload_files' ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Insufficient permissions', 'attach-images' ),
				)
			);
		}

		global $wpdb;
		
		// Delete all transients starting with 'attach_img_'.
		$deleted = $wpdb->query(
			"DELETE FROM {$wpdb->options}
			WHERE option_name LIKE '\_transient\_attach\_img\_%'
			OR option_name LIKE '\_transient\_timeout\_attach\_img\_%'"
		);

		wp_send_json_success(
			array(
				'message' => sprintf(
					/* translators: %d: number of cache entries cleared */
					__( 'Cache cleared successfully. %d entries removed.', 'attach-images' ),
					$deleted
				),
			)
		);
	}
}

// Initialize the plugin.
function attach_orphaned_images_init() {
	return new Attach_Orphaned_Images();
}
add_action( 'plugins_loaded', 'attach_orphaned_images_init' );

/**
 * Plugin deactivation hook.
 *
 * Note: For complete uninstall cleanup, create an uninstall.php file.
 */
function attach_orphaned_images_deactivate() {
	global $wpdb;
	
	// Clean up all attachment search cache transients.
	$wpdb->query(
		"DELETE FROM {$wpdb->options}
		WHERE option_name LIKE '\_transient\_attach\_img\_%'
		OR option_name LIKE '\_transient\_timeout\_attach\_img\_%'"
	);
}
register_deactivation_hook( __FILE__, 'attach_orphaned_images_deactivate' );
