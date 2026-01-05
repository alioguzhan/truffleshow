document.addEventListener("alpine:init", () => {
  Alpine.data("TruffleShowApp", () => ({
    truffleHogData: [],
    displayedData: [],
    isFileUploaded: false,
    isLoading: false,
    error: null,
    expandedItems: {},
    isGeneratingReport: false,
    sortBy: "verification", // Default sort
    sortDirection: "desc", // Default direction
    supportedSources: ["Git", "Github"],
    source: undefined,
    sampleDataURL: "https://static.truffleshow.dev/github-sample.json",
    fileName: null,
    loadedFiles: [], // Track multiple loaded files

    init() { },

    uploadFile(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      this.isLoading = true;
      this.error = null;

      // Process each selected file
      let filesProcessed = 0;
      const totalFiles = files.length;

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.loadFile(e.target.result, file.name);
          filesProcessed++;
          if (filesProcessed === totalFiles) {
            this.isLoading = false;
          }
        };
        reader.onerror = () => {
          this.error = `Error reading file ${file.name}. Please try again.`;
          this.isLoading = false;
        };
        reader.readAsText(file);
      });
    },

    loadFile(data, fileName) {
      try {
        const newData = JSON.parse(data);

        // Add the file to loadedFiles tracking
        this.loadedFiles.push({
          name: fileName,
          count: newData.length,
          data: newData,
        });

        // Append new data to existing data
        this.truffleHogData = [...this.truffleHogData, ...newData];

        // Initialize all items as collapsed
        this.expandedItems = Object.fromEntries(
          this.truffleHogData.map((_, index) => [index, false]),
        );

        // Set source from first finding if not already set
        if (!this.source && this.truffleHogData.length > 0) {
          const sourceNames = this.truffleHogData.map(
            (finding) => Object.keys(finding.SourceMetadata.Data)[0],
          );
          this.source = sourceNames.length > 0 ? sourceNames[0] : undefined;
          console.log("Source is: ", this.source);
        }

        this.applySorting();
        this.isFileUploaded = true;
      } catch (error) {
        console.error(error);
        this.error =
          `Invalid JSON file: ${fileName}. Please upload a valid TruffleHog JSON output.`;
        this.isLoading = false;
      }
    },

    loadSampleData() {
      this.isLoading = true;
      fetch(this.sampleDataURL)
        .then((response) => response.text())
        .then((data) => {
          this.loadFile(data, "github-sample.json");
        })
        .catch((error) => {
          console.error(error);
          this.error = "Error loading sample data. Please try again.";
          this.isLoading = false;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    resetApp() {
      this.truffleHogData = [];
      this.displayedData = [];
      this.isFileUploaded = false;
      this.error = null;
      this.expandedItems = {};
      this.loadedFiles = [];
      this.source = undefined;
      document.getElementById("fileInput").value = "";
    },

    removeFile(fileIndex) {
      // Remove the file from loadedFiles
      const removedFile = this.loadedFiles.splice(fileIndex, 1)[0];

      // Rebuild truffleHogData from remaining files
      this.truffleHogData = [];
      this.loadedFiles.forEach((file) => {
        this.truffleHogData = [...this.truffleHogData, ...file.data];
      });

      // If no files remain, reset the app
      if (this.loadedFiles.length === 0) {
        this.resetApp();
        return;
      }

      // Re-initialize expanded items and apply sorting
      this.expandedItems = Object.fromEntries(
        this.truffleHogData.map((_, index) => [index, false]),
      );
      this.applySorting();
    },

    toggleItem(index) {
      this.expandedItems[index] = !this.expandedItems[index];
    },

    expandAll() {
      this.expandedItems = Object.fromEntries(
        this.displayedData.map((_, index) => [index, true]),
      );
    },

    collapseAll() {
      this.expandedItems = Object.fromEntries(
        this.displayedData.map((_, index) => [index, false]),
      );
    },

    // Sorting functions
    setSorting(sortType) {
      if (this.sortBy === sortType) {
        // Toggle direction if clicking the same sort type
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortBy = sortType;
        // Set default direction based on sort type
        this.sortDirection = sortType === "date" ? "desc" : "desc";
      }
      this.applySorting();
    },

    applySorting() {
      // Clone the array to avoid mutating the original
      let sortedData = [...this.truffleHogData];

      // Sort based on current sort settings
      if (this.sortBy === "verification") {
        sortedData.sort((a, b) => {
          // Priority: Verified (highest), Not Verified, Failed (lowest)
          const scoreA = a.Verified ? 3 : a.VerificationError ? 1 : 2;
          const scoreB = b.Verified ? 3 : b.VerificationError ? 1 : 2;

          return this.sortDirection === "asc"
            ? scoreA - scoreB
            : scoreB - scoreA;
        });
      } else if (this.sortBy === "date") {
        sortedData.sort((a, b) => {
          const dateA = a.SourceMetadata?.Data?.[this.source]?.timestamp
            ? new Date(a.SourceMetadata.Data[this.source].timestamp)
            : new Date(0);
          const dateB = b.SourceMetadata?.Data?.[this.source]?.timestamp
            ? new Date(b.SourceMetadata.Data[this.source].timestamp)
            : new Date(0);

          return this.sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        });
      }

      // Update the displayed data
      this.displayedData = sortedData;

      // Reset expanded states when sorting
      this.expandedItems = Object.fromEntries(
        this.displayedData.map((_, index) => [index, false]),
      );
    },

    getSortIcon(sortType) {
      if (this.sortBy !== sortType) return "fa-sort";
      return this.sortDirection === "asc" ? "fa-sort-up" : "fa-sort-down";
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return "N/A";
      return new Date(timestamp).toLocaleString();
    },

    getVerificationStatus(finding) {
      if (finding.Verified) return "Verified";
      return finding.VerificationError ? "Failed" : "Not Verified";
    },

    getStatusColor(finding) {
      if (finding.Verified)
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      return finding.VerificationError
        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    },

    getStatusIcon(finding) {
      if (finding.Verified) return "fa-check-circle";
      return finding.VerificationError
        ? "fa-circle-exclamation"
        : "fa-circle-question";
    },

    getDetectorIcon(finding) {
      const detector = finding.DetectorName?.toLowerCase() || "";

      if (detector.includes("password") || detector.includes("secret")) {
        return "fa-key";
      } else if (detector.includes("token") || detector.includes("api")) {
        return "fa-key";
      } else if (detector.includes("aws")) {
        return "fab fa-aws";
      } else if (detector.includes("postgres") || detector.includes("sql")) {
        return "fa-database";
      } else if (detector.includes("github")) {
        return "fab fa-github";
      } else if (detector.includes("email") || detector.includes("mail")) {
        return "fa-envelope";
      } else {
        return "fa-shield-halved";
      }
    },

    truncate(str, max = 30) {
      if (!str) return "N/A";
      return str.length > max ? str.substring(0, max) + "..." : str;
    },

    // Summary statistics
    getTotalFindings() {
      return this.truffleHogData.length;
    },

    getVerifiedCount() {
      return this.truffleHogData.filter((finding) => finding.Verified).length;
    },

    getFailedCount() {
      return this.truffleHogData.filter((finding) => finding.VerificationError)
        .length;
    },

    getNotVerifiedCount() {
      return this.truffleHogData.filter(
        (finding) => !finding.Verified && !finding.VerificationError,
      ).length;
    },

    getUniqueDetectors() {
      const detectors = this.truffleHogData.map(
        (finding) => finding.DetectorName,
      );
      return [...new Set(detectors)].length;
    },

    getUniqueRepositories() {
      const repos = this.truffleHogData
        .filter(
          (finding) => finding.SourceMetadata?.Data?.[this.source]?.repository,
        )
        .map((finding) => finding.SourceMetadata.Data[this.source].repository);
      return [...new Set(repos)].length;
    },

    renderTimestamp(timestamp) {
      return new Date(timestamp).toDateString();
    },
    generateReport() {
      // Show loading indicator
      this.isGeneratingReport = true;

      // Prepare the data needed for the report
      const reportData = {
        stats: {
          totalFindings: this.getTotalFindings(),
          verifiedCount: this.getVerifiedCount(),
          failedCount: this.getFailedCount(),
          notVerifiedCount: this.getNotVerifiedCount(),
          uniqueDetectors: this.getUniqueDetectors(),
          uniqueRepositories: this.getUniqueRepositories(),
        },
        findings: this.displayedData,
      };

      // Use the report service to generate the report
      ReportService.generatePDFReport(reportData, this.source);
      this.isGeneratingReport = false;
    },
    generateCSVReport() {
      // Prepare the data needed for the report
      const reportData = {
        stats: {
          totalFindings: this.getTotalFindings(),
          verifiedCount: this.getVerifiedCount(),
          failedCount: this.getFailedCount(),
          notVerifiedCount: this.getNotVerifiedCount(),
          uniqueDetectors: this.getUniqueDetectors(),
          uniqueRepositories: this.getUniqueRepositories(),
        },
        findings: this.displayedData,
      };

      // Use the report service to generate the CSV report
      ReportService.generateCSVReport(reportData, this.source);
    },
  }));
});
