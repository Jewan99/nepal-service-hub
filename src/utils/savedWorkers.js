function storageKey(scope) {
    return `nepal-servicehub-saved-${scope || 'guest'}`;
}

export function readSavedWorkers(scope) {
    try {
        return JSON.parse(localStorage.getItem(storageKey(scope)) || '[]');
    } catch {
        return [];
    }
}

export function toggleSavedWorker(scope, workerId) {
    const current = readSavedWorkers(scope);
    const next = current.includes(workerId)
        ? current.filter((id) => id !== workerId)
        : [...current, workerId];
    localStorage.setItem(storageKey(scope), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('saved-workers-changed', { detail: { scope: scope || 'guest' } }));
    return next;
}