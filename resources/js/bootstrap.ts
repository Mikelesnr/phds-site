import axios from 'axios';

/**
 * Configure Axios Global Headers
 * This ensures all AJAX/Inertia requests carry the secure
 * XMLHttpRequest header that Laravel expects by default.
 */
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/**
 * Extend the global Window interface for TypeScript
 * This prevents compilation errors when referencing window.axios across your app.
 */
declare global {
    interface Window {
        axios: typeof axios;
    }
}
