jQuery(document).ready(function ($) {
  "use strict";

  var $scanButton = $("#scan-button");
  var $previewButton = $("#preview-button");
  var $progress = $("#attach-images-progress");
  var $progressFill = $(".progress-fill");
  var $progressText = $(".progress-text");
  var $results = $("#attach-images-results");
  var $resultsContent = $(".results-content");

  // Scan and attach handler
  $scanButton.on("click", function () {
    runScan(false);
  });

  // Preview only handler
  $previewButton.on("click", function () {
    runScan(true);
  });

  function runScan(dryRun) {
    // Disable buttons
    $scanButton.prop("disabled", true);
    $previewButton.prop("disabled", true);

    // Show progress
    $progress.removeClass("hidden");
    $results.addClass("hidden");
    $progressFill.css("width", "0%");
    $progressText.text(
      dryRun
        ? "Scanning attachments (preview mode)..."
        : "Scanning and attaching images..."
    );

    // Animate progress bar
    var progressInterval = setInterval(function () {
      var currentWidth =
        (parseFloat($progressFill.css("width")) /
          parseFloat($progressFill.parent().css("width"))) *
        100;
      if (currentWidth < 90) {
        $progressFill.css("width", currentWidth + 10 + "%");
      }
    }, 200);

    // Make AJAX request
    $.ajax({
      url: attachImagesData.ajax_url,
      type: "POST",
      data: {
        action: "attach_orphaned_images",
        nonce: attachImagesData.nonce,
        dry_run: dryRun ? "true" : "false",
      },
      success: function (response) {
        clearInterval(progressInterval);
        $progressFill.css("width", "100%");

        setTimeout(function () {
          $progress.addClass("hidden");

          if (response.success) {
            displayResults(response.data);
          } else {
            alert(
              "Error: " + (response.data.message || "Unknown error occurred")
            );
          }

          // Re-enable buttons
          $scanButton.prop("disabled", false);
          $previewButton.prop("disabled", false);
        }, 500);
      },
      error: function (xhr, status, error) {
        clearInterval(progressInterval);
        $progress.addClass("hidden");
        alert("Error: " + error);

        // Re-enable buttons
        $scanButton.prop("disabled", false);
        $previewButton.prop("disabled", false);
      },
    });
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

    if (data.dry_run) {
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
      html += '<table class="results-table">';
      html += "<thead>";
      html += "<tr>";
      html += "<th>Attachment</th>";
      html += "<th>Post</th>";
      html += "<th>Status</th>";
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
          '" target="_blank" class="attachment-link">';
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
            '" target="_blank" class="post-link">';
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
    $results.removeClass("hidden");
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
