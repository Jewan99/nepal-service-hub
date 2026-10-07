


import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';
import { mockWorkers } from '../data/mockWorkers';
import { readLocalWorkerListings } from '../utils/workerDirectory';

function localListings() {
    return Object.entries(readLocalWorkerListings()).map(([uid, listing]) => ({
        ...listing,
        id: uid,
        ownerUid: uid,
    }));
}

export default function useWorkerDirectory() {
    const [workers, setWorkers] = useState(() => [...mockWorkers, ...localListings()]);
    const [loading, setLoading] = useState(firebaseReady);

    useEffect(() => {
        if (firebaseReady) {
            return onSnapshot(collection(db, 'workers'), (snapshot) => {
                const listings = snapshot.docs.map((entry) => ({
                    ...entry.data(),
                    id: entry.id,
                    ownerUid: entry.id,
                }));
                setWorkers([...mockWorkers, ...listings]);
                setLoading(false);
            }, () => setLoading(false));
        }

        const refreshLocalListings = () => setWorkers([...mockWorkers, ...localListings()]);
        window.addEventListener('worker-listings-changed', refreshLocalListings);
        return () => window.removeEventListener('worker-listings-changed', refreshLocalListings);
    }, []);

    return { workers, loading };
}