// Debug and logging utility
window.DebugLogger = {
    logs: [],
    errors: [],
    
    log: function(message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            message: message,
            data: data || null,
            type: 'log'
        };
        this.logs.push(entry);
        console.log('[DEBUG]', message, data || '');
        
        // Also show on page if debug panel exists
        this.updateDebugPanel();
    },
    
    error: function(message, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            message: message,
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : null,
            type: 'error'
        };
        this.errors.push(entry);
        console.error('[DEBUG ERROR]', message, error || '');
        
        // Show error on page
        this.showErrorOnPage(message, error);
        this.updateDebugPanel();
    },
    
    showErrorOnPage: function(message, error) {
        // Create or update error display
        let errorDiv = document.getElementById('debug-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'debug-error';
            errorDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #fee; border: 2px solid #e74c3c; padding: 15px; border-radius: 5px; max-width: 400px; z-index: 10000; font-family: monospace; font-size: 12px;';
            document.body.appendChild(errorDiv);
        }
        
        const errorText = error ? `${message}\n${error.message}\n${error.stack}` : message;
        errorDiv.innerHTML = `
            <strong style="color: #e74c3c;">Грешка:</strong><br>
            <pre style="white-space: pre-wrap; word-wrap: break-word;">${errorText}</pre>
            <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">Затвори</button>
        `;
    },
    
    updateDebugPanel: function() {
        // Update debug panel if it exists
        const panel = document.getElementById('debug-panel');
        if (panel) {
            const recentLogs = this.logs.slice(-10).reverse();
            const recentErrors = this.errors.slice(-5).reverse();
            
            panel.innerHTML = `
                <h3>Debug Logs (последни 10)</h3>
                <div style="max-height: 200px; overflow-y: auto; font-size: 11px;">
                    ${recentLogs.map(log => `
                        <div style="margin: 2px 0; padding: 2px; background: #f0f0f0;">
                            [${log.timestamp.split('T')[1].split('.')[0]}] ${log.message}
                        </div>
                    `).join('')}
                </div>
                ${recentErrors.length > 0 ? `
                    <h3>Errors (последни 5)</h3>
                    <div style="max-height: 150px; overflow-y: auto; font-size: 11px; color: #e74c3c;">
                        ${recentErrors.map(err => `
                            <div style="margin: 2px 0; padding: 2px; background: #fee;">
                                [${err.timestamp.split('T')[1].split('.')[0]}] ${err.message}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
        }
    },
    
    getReport: function() {
        return {
            logs: this.logs,
            errors: this.errors,
            userAgent: navigator.userAgent,
            url: window.location.href,
            sessionStorage: {
                hasToken: !!sessionStorage.getItem('authToken'),
                hasUser: !!sessionStorage.getItem('currentUser')
            },
            globals: {
                hasLoadMainApp: typeof loadMainApp !== 'undefined',
                hasLoadEngineerView: typeof loadEngineerView !== 'undefined',
                hasLoadManagerView: typeof loadManagerView !== 'undefined'
            }
        };
    },
    
    exportReport: function() {
        const report = this.getReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// Auto-log errors
window.addEventListener('error', function(event) {
    window.DebugLogger.error('Uncaught Error', event.error || new Error(event.message));
});

window.addEventListener('unhandledrejection', function(event) {
    window.DebugLogger.error('Unhandled Promise Rejection', event.reason);
});

// Log page load
window.DebugLogger.log('Page loaded', {
    url: window.location.href,
    readyState: document.readyState
});

