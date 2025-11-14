jQuery(document).ready(function ($) {
  "use strict";

  var $scanButton = $("#scan-button");
  var $previewButton = $("#preview-button");
  var $stopButton = $("#stop-button");
  var $clearCacheButton = $("#clear-cache-button");
  var $progress = $("#attach-images-progress");
  var $progressFill = $(".progress-fill");
  var $progressText = $(".progress-text");
  var $results = $("#attach-images-results");
  var $resultsContent = $(".results-content");

  var isCancelled = false;

  // Scan and attach handler
  $scanButton.on("click", function () {
    runScan(false);
  });

  // Preview only handler
  $previewButton.on("click", function () {
    runScan(true);
  });

  // Stop button handler
  $stopButton.on("click", function () {
    isCancelled = true;
    $stopButton.prop("disabled", true);
    $progressText.text("Stopping... Please wait.");
  });

  // Clear cache button handler
  $clearCacheButton.on("click", function () {
    if (!confirm("Are you sure you want to clear all scan caches?")) {
      return;
    }

    $clearCacheButton.prop("disabled", true);

    $.ajax({
      url: attachImagesData.ajax_url,
      type: "POST",
      data: {
        action: "clear_attachment_cache",
        nonce: attachImagesData.nonce,
      },
      success: function (response) {
        if (response.success) {
          showAccessibleNotice(response.data.message, "success");
        } else {
          showAccessibleError(response.data.message || "Failed to clear cache");
        }
        $clearCacheButton.prop("disabled", false);
      },
      error: function () {
        showAccessibleError("Error clearing cache");
        $clearCacheButton.prop("disabled", false);
      },
    });
  });

  var aggregateResults = {
    total_orphaned: 0,
    attached: 0,
    not_found: 0,
    details: [],
    dry_run: false,
  };

  function runScan(dryRun) {
    // Reset cancellation flag
    isCancelled = false;

    // Disable buttons
    $scanButton.prop("disabled", true).attr("aria-busy", "true");
    $previewButton.prop("disabled", true).attr("aria-busy", "true");

    // Show stop button
    $stopButton.removeClass("hidden").prop("disabled", false);

    // Reset aggregate results
    aggregateResults = {
      total_orphaned: 0,
      attached: 0,
      not_found: 0,
      details: [],
      dry_run: dryRun,
    };

    // Show progress
    $progress.removeClass("hidden").attr("aria-hidden", "false");
    $results.addClass("hidden").attr("aria-hidden", "true");
    $progressFill.css("width", "0%");
    $(".progress-bar").attr("aria-valuenow", "0");
    $progressText.text(
      dryRun
        ? "Scanning attachments (preview mode)..."
        : "Scanning and attaching images..."
    );

    // Start batch processing from offset 0
    processBatch(dryRun, 0);
  }

  function processBatch(dryRun, offset) {
    // Check if cancelled before making request
    if (isCancelled) {
      finishProcessing(true);
      return;
    }

    $.ajax({
      url: attachImagesData.ajax_url,
      type: "POST",
      data: {
        action: "attach_orphaned_images",
        nonce: attachImagesData.nonce,
        dry_run: dryRun ? "true" : "false",
        offset: offset,
        limit: 50,
      },
      success: function (response) {
        if (response.success) {
          var data = response.data;

          // Update total count (only set once)
          if (aggregateResults.total_orphaned === 0) {
            aggregateResults.total_orphaned = data.total_orphaned;
          }

          // Aggregate results
          aggregateResults.attached += data.attached;
          aggregateResults.not_found += data.not_found;
          aggregateResults.details = aggregateResults.details.concat(
            data.details
          );

          // Update progress bar
          // For attach mode, calculate based on cumulative processed vs initial total
          // For dry run mode, use offset
          var totalProcessed =
            aggregateResults.attached + aggregateResults.not_found;
          var processed = dryRun ? offset + data.batch_count : totalProcessed;
          var progress = Math.min(
            100,
            (processed / aggregateResults.total_orphaned) * 100
          );
          $progressFill.css("width", progress + "%");
          $(".progress-bar").attr("aria-valuenow", Math.round(progress));
          $progressText.text(
            (dryRun ? "Scanning: " : "Processing: ") +
              processed +
              " of " +
              aggregateResults.total_orphaned +
              " attachments..."
          );

          // Check if there are more batches to process
          if (data.has_more && !isCancelled) {
            // Process next batch
            processBatch(dryRun, data.next_offset);
          } else {
            // All batches complete or cancelled
            finishProcessing(isCancelled);
          }
        } else {
          $progress.addClass("hidden").attr("aria-hidden", "true");
          $stopButton.addClass("hidden");
          showAccessibleError(
            response.data.message || "Unknown error occurred"
          );

          // Re-enable buttons and remove busy state
          $scanButton.prop("disabled", false).removeAttr("aria-busy");
          $previewButton.prop("disabled", false).removeAttr("aria-busy");
        }
      },
      error: function (xhr, status, error) {
        $progress.addClass("hidden").attr("aria-hidden", "true");
        $stopButton.addClass("hidden");
        showAccessibleError("Error: " + error);

        // Re-enable buttons and remove busy state
        $scanButton.prop("disabled", false).removeAttr("aria-busy");
        $previewButton.prop("disabled", false).removeAttr("aria-busy");
      },
    });
  }

  function finishProcessing(wasCancelled) {
    $progressFill.css("width", "100%");
    $(".progress-bar").attr("aria-valuenow", "100");

    if (wasCancelled) {
      $progressText.text("Processing stopped by user.");
    }

    setTimeout(function () {
      $progress.addClass("hidden").attr("aria-hidden", "true");
      $stopButton.addClass("hidden");

      if (wasCancelled) {
        // Show partial results with cancellation notice
        aggregateResults.cancelled = true;
      }

      displayResults(aggregateResults);

      // Re-enable buttons and remove busy state
      $scanButton.prop("disabled", false).removeAttr("aria-busy").focus();
      $previewButton.prop("disabled", false).removeAttr("aria-busy");
    }, 500);
  }

  function displayResults(data) {
    var html = "";

    // Display summary
    html += '<div class="results-summary">';
    html += '<div class="result-stat">';
    html += '<span class="number">' + data.total_orphaned + "</span>";
    html += '<span class="label">Total Orphaned</span>';
    html += "</div>";
    html += '<div class="result-stat">';
    html += '<span class="number">' + data.attached + "</span>";
    html +=
      '<span class="label">' +
      (data.dry_run ? "Would Attach" : "Attached") +
      "</span>";
    html += "</div>";
    html += '<div class="result-stat">';
    html += '<span class="number">' + data.not_found + "</span>";
    html += '<span class="label">Not Found</span>';
    html += "</div>";
    html += "</div>";

    if (data.cancelled) {
      html +=
        '<div class="notice notice-warning"><p><strong>Stopped:</strong> Processing was stopped by user. Showing partial results.</p></div>';
    } else if (data.dry_run) {
      html +=
        '<div class="notice notice-info"><p><strong>Preview Mode:</strong> No changes were made. Click "Scan and Attach Images" to perform the actual attachment.</p></div>';
    } else if (data.attached > 0) {
      html +=
        '<div class="notice notice-success"><p><strong>Success!</strong> ' +
        data.attached +
        " attachment(s) have been attached to their parent posts.</p></div>";
    }

    // Display details table
    if (data.details && data.details.length > 0) {
      html += '<table class="results-table" role="table">';
      html += "<thead>";
      html += "<tr>";
      html += '<th scope="col">Attachment</th>';
      html += '<th scope="col">Post</th>';
      html += '<th scope="col">Status</th>';
      html += "</tr>";
      html += "</thead>";
      html += "<tbody>";

      data.details.forEach(function (item) {
        html += "<tr>";

        // Attachment column
        html += "<td>";
        html +=
          '<a href="' +
          item.attachment_url +
          '" target="_blank" rel="noopener noreferrer" class="attachment-link">';
        html += escapeHtml(item.attachment_title || "Untitled");
        html += "</a>";
        html += "<br><small>ID: " + item.attachment_id + "</small>";
        html += "</td>";

        // Post column
        html += "<td>";
        if (item.post_id) {
          html +=
            '<a href="' +
            item.post_url +
            '" target="_blank" rel="noopener noreferrer" class="post-link">';
          html += escapeHtml(item.post_title);
          html += "</a>";
          html += "<br><small>ID: " + item.post_id + "</small>";
        } else {
          html += "<em>No matching post found</em>";
        }
        html += "</td>";

        // Status column
        html += "<td>";
        var statusClass = "status-" + item.status;
        var statusText = "";
        switch (item.status) {
          case "attached":
            statusText = "Attached";
            break;
          case "would_attach":
            statusText = "Would Attach";
            break;
          case "not_found":
            statusText = "Not Found";
            break;
        }
        html +=
          '<span class="status-badge ' +
          statusClass +
          '">' +
          statusText +
          "</span>";
        html += "</td>";

        html += "</tr>";
      });

      html += "</tbody>";
      html += "</table>";
    } else {
      html += '<div class="no-results">';
      html += "<p>No orphaned attachments found.</p>";
      html += "</div>";
    }

    $resultsContent.html(html);
    $results.removeClass("hidden").attr("aria-hidden", "false");

    // Set focus to results heading for screen readers
    $results.find("h2").attr("tabindex", "-1").focus();
  }

  function showAccessibleError(message) {
    showAccessibleNotice(message, "error");
  }

  function showAccessibleNotice(message, type) {
    type = type || "error";
    var noticeClass = "notice-" + type;
    var prefix = type === "error" ? "Error" : "Success";

    // Create accessible notice
    var $notice = $(
      '<div class="notice ' +
        noticeClass +
        ' is-dismissible" role="alert"><p><strong>' +
        prefix +
        ":</strong> " +
        escapeHtml(message) +
        "</p></div>"
    );

    // Insert after header and focus
    $(".attach-images-header").after($notice);
    $notice.attr("tabindex", "-1").focus();

    // Auto-dismiss after 10 seconds
    setTimeout(function () {
      $notice.fadeOut(function () {
        $(this).remove();
      });
    }, 10000);
  }

  function escapeHtml(text) {
    var map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, function (m) {
      return map[m];
    });
  }
});
