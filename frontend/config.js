// Set API_BASE_URL on window object to avoid const redeclaration errors
if (typeof window !== "undefined") {
    window.API_BASE_URL = "http://localhost:8000";
}
