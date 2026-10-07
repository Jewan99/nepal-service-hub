const LOCAL_WORKERS_KEY = 'nepal-servicehub-demo-worker-listings';

export function readLocalWorkerListings() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_WORKERS_KEY) || '{}');
    } catch {
        return {};
    }
}

export function saveLocalWorkerListing(uid, listing) {
    const listings = readLocalWorkerListings();
    listings[uid] = listing;
    localStorage.setItem(LOCAL_WORKERS_KEY, JSON.stringify(listings));
    window.dispatchEvent(new Event('worker-listings-changed'));
}