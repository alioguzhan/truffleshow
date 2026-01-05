// reportService.js
const ReportService = {
  /**
   * Generate and download a PDF report for TruffleHog findings
   * @param {Object} data - The data needed to generate the report
   */
  generatePDFReport(data, source) {
    try {
      // Check if jsPDF is loaded
      if (typeof jspdf === "undefined") {
        console.error("jsPDF is not loaded");
        alert("Could not generate PDF. Required libraries are not loaded.");
        return;
      }

      // Create a new jsPDF instance
      const { jsPDF } = jspdf;
      const doc = new jsPDF();

      // Set document properties
      doc.setProperties({
        title: "TruffleHog Security Findings Report",
        subject: "Security Findings",
        author: "TruffleShow",
        creator: "TruffleShow App",
      });

      // Document dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Add report title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const title = "TruffleHog Security Findings Report";
      doc.text(title, pageWidth / 2, y, { align: "center" });

      // Add generation date
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const reportDate = `Generated on ${new Date().toLocaleString()} with TruffleShow App`;
      doc.text(reportDate, pageWidth / 2, y, { align: "center" });

      // Add horizontal line
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // Add summary section title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", margin, y);
      y += 10;

      // Create summary cards using tables
      const summaryData = [
        [
          {
            title: "Total Findings",
            value: data.stats.totalFindings,
            color: null,
          },
          {
            title: "Verified Credentials",
            value: data.stats.verifiedCount,
            color: [0, 128, 0],
          }, // Green
        ],
        [
          {
            title: "Failed Verification",
            value: data.stats.failedCount,
            color: [220, 0, 0],
          }, // Red
          {
            title: "Not Verified",
            value: data.stats.notVerifiedCount,
            color: [240, 165, 0],
          }, // Orange
        ],
        [
          {
            title: "Unique Detectors",
            value: data.stats.uniqueDetectors,
            color: null,
          },
          {
            title: "Unique Repositories",
            value: data.stats.uniqueRepositories,
            color: null,
          },
        ],
      ];

      // Generate summary cards
      for (const row of summaryData) {
        const cardWidth = contentWidth / 2 - 5;

        // Draw two cards per row
        for (let i = 0; i < row.length; i++) {
          const card = row[i];
          const x = margin + i * (cardWidth + 10);

          // Draw card background
          doc.setFillColor(249, 249, 249);
          doc.setDrawColor(238, 238, 238);
          doc.roundedRect(x, y, cardWidth, 25, 2, 2, "FD");

          // Card title
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "normal");
          doc.text(card.title, x + 5, y + 8);

          // Card value
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          if (card.color) {
            doc.setTextColor(card.color[0], card.color[1], card.color[2]);
          } else {
            doc.setTextColor(0, 0, 0);
          }
          doc.text(card.value.toString(), x + 5, y + 20);
        }

        y += 30;
      }

      // Add findings section
      y += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Detailed Findings", margin, y);
      y += 10;

      // Process each finding
      for (const finding of data.findings) {
        // Check if we need a new page
        if (y > doc.internal.pageSize.getHeight() - 50) {
          doc.addPage();
          y = margin;
        }

        // Get status colors
        let statusColor = [0, 0, 0];
        let statusBgColor = [249, 249, 249];
        let statusText = "Not Verified";

        if (finding.Verified) {
          statusColor = [0, 128, 0]; // Green
          statusBgColor = [220, 242, 231]; // Light green
          statusText = "Verified";
        } else if (finding.VerificationError) {
          statusColor = [220, 0, 0]; // Red
          statusBgColor = [254, 226, 226]; // Light red
          statusText = "Failed";
        } else {
          statusColor = [240, 165, 0]; // Orange
          statusBgColor = [254, 243, 199]; // Light orange
          statusText = "Not Verified";
        }

        // Draw finding card
        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(margin, y, contentWidth, 15, 2, 2, "FD");

        // Draw header with finding detector name
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          this.truncateText(finding.DetectorName || "Unknown Detector", 30),
          margin + 5,
          y + 10,
        );

        // Draw status badge
        const statusWidth = doc.getTextWidth(statusText) + 10;
        const statusX = pageWidth - margin - statusWidth - 5;

        doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
        doc.roundedRect(statusX, y + 4, statusWidth, 8, 4, 4, "F");

        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFontSize(8);
        doc.text(statusText, statusX + 5, y + 9);

        // Draw finding details
        y += 20;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        // Repository
        const repo = finding.SourceMetadata?.Data?.[source]?.repository
          ? this.truncateText(
              finding.SourceMetadata.Data[source].repository
                .replace("https://github.com/", "")
                .replace(".git", ""),
              40,
            )
          : "N/A";

        doc.setFont("helvetica", "bold");
        doc.text("Repository:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(repo, margin + 60, y);
        y += 8;

        // File
        const file = finding.SourceMetadata?.Data?.[source]?.file
          ? this.truncateText(finding.SourceMetadata.Data[source].file, 40)
          : "N/A";

        doc.setFont("helvetica", "bold");
        doc.text("File:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(file, margin + 60, y);
        y += 8;

        // // Link
        // const link = finding.SourceMetadata?.Data?.[source]?.link
        //   ? this.truncateText(finding.SourceMetadata.Data[source].link, 50)
        //   : "N/A";
        //
        // doc.setFont("helvetica", "bold");
        // doc.text("Link:", margin, y);
        // doc.setFont("helvetica", "normal");
        // doc.text(link, margin + 60, y);
        // y += 8;

        // Credential
        const credential = finding.Raw
          ? this.truncateText(finding.Raw, 50)
          : "N/A";

        doc.setFont("helvetica", "bold");
        doc.text("Credential:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(credential, margin + 60, y);
        y += 8;

        // Description
        const description = finding.DetectorDescription
          ? this.truncateText(finding.DetectorDescription, 50)
          : "N/A";

        doc.setFont("helvetica", "bold");
        doc.text("Description:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(description, margin + 60, y);

        // Add spacing between findings
        y += 15;
      }

      // Save the PDF
      doc.save("truffleshow-report.pdf");

      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while generating the PDF. Please try again.");
      return false;
    }
  },
  truncateText(text, maxLength = 30) {
    if (!text) return "N/A";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  },

  /**
   * Generate and download a CSV report for TruffleHog findings
   * @param {Object} data - The data needed to generate the report
   * @param {string} source - The source type (e.g., 'Git', 'Github')
   */
  generateCSVReport(data, source) {
    try {
      // Define CSV headers
      const headers = [
        "Detector Name",
        "Verification Status",
        "Repository",
        "File",
        "Line",
        "Commit",
        "Timestamp",
        "Email",
        "Visibility",
        "Credential (Raw)",
        "Verification Error",
        "Decoder Name",
        "Description",
        "Link",
      ];

      // Start CSV with headers
      let csvContent = headers.map((h) => this.escapeCSVField(h)).join(",") + "\n";

      // Process each finding
      for (const finding of data.findings) {
        const sourceData = finding.SourceMetadata?.Data?.[source];

        // Determine verification status
        let verificationStatus = "Not Verified";
        if (finding.Verified) {
          verificationStatus = "Verified";
        } else if (finding.VerificationError) {
          verificationStatus = "Failed";
        }

        const row = [
          finding.DetectorName || "",
          verificationStatus,
          sourceData?.repository?.replace("https://github.com/", "").replace(".git", "") || "",
          sourceData?.file || "",
          sourceData?.line || "",
          sourceData?.commit || "",
          sourceData?.timestamp || "",
          sourceData?.email || "",
          sourceData?.visibility === 1 ? "Public" : sourceData?.visibility === 0 ? "Private" : "",
          finding.Raw || "",
          finding.VerificationError || "",
          finding.DecoderName || "",
          finding.DetectorDescription || "",
          sourceData?.link || "",
        ];

        csvContent += row.map((field) => this.escapeCSVField(field)).join(",") + "\n";
      }

      // Create a blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", "truffleshow-report.csv");
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert("An error occurred while generating the CSV. Please try again.");
      return false;
    }
  },

  /**
   * Escape CSV field to handle commas, quotes, and newlines
   * @param {string|number} field - The field to escape
   * @returns {string} - The escaped field
   */
  escapeCSVField(field) {
    if (field === null || field === undefined) {
      return '""';
    }

    const stringField = String(field);

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringField.includes(",") || stringField.includes('"') || stringField.includes("\n")) {
      return '"' + stringField.replace(/"/g, '""') + '"';
    }

    return stringField;
  },
};

// Export the service
window.ReportService = ReportService;
