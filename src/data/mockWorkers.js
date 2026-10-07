export const mockWorkers = [
  { id: 'w1', name: 'Suresh Tamang', category: 'electrician', city: 'Kathmandu, Baneshwor', rate: 600, unit: 'visit', rating: 4.8, reviews: 132, verified: true, bio: '12 years wiring & panel work for homes and shops.' },
  { id: 'w2', name: 'Ramesh Shrestha', category: 'plumber', city: 'Lalitpur, Kupondole', rate: 500, unit: 'visit', rating: 4.6, reviews: 98, verified: true, bio: 'Leak repair, tank fitting, bathroom renovation.' },
  { id: 'w3', name: 'Bikash Magar', category: 'appliance', city: 'Kathmandu, Kalanki', rate: 800, unit: 'visit', rating: 4.7, reviews: 76, verified: true, bio: 'AC gas refill, fridge compressor & thermostat repair.' },
  { id: 'w4', name: 'Dipesh Gurung', category: 'mechanic', city: 'Bhaktapur', rate: 450, unit: 'visit', rating: 4.5, reviews: 54, verified: false, bio: 'Bike servicing, brake and chain work, doorstep pickup.' },
  { id: 'w5', name: 'Anita Rai', category: 'painter', city: 'Kathmandu, Baluwatar', rate: 350, unit: 'day', rating: 4.9, reviews: 61, verified: true, bio: 'Interior painting with texture and waterproofing finish.' },
  { id: 'w6', name: 'Sabina Lama', category: 'cleaner', city: 'Lalitpur, Jawalakhel', rate: 300, unit: 'visit', rating: 4.6, reviews: 143, verified: true, bio: 'Deep home cleaning, move-in/move-out cleaning.' },
  { id: 'w7', name: 'Nabin Poudel', category: 'tutor', city: 'Kathmandu, New Baneshwor', rate: 700, unit: 'month', rating: 4.9, reviews: 40, verified: true, bio: 'Grade 8–12 Math & Science, board exam focused.' },
  { id: 'w8', name: 'Sunita Basnet', category: 'technician', city: 'Kathmandu, Putalisadak', rate: 400, unit: 'visit', rating: 4.4, reviews: 29, verified: false, bio: 'Laptop & phone screen, battery, software repair.' },
  { id: 'w9', name: 'Kiran Karki', category: 'photographer', city: 'Kathmandu, Thamel', rate: 8000, unit: 'event', rating: 5.0, reviews: 22, verified: true, bio: 'Weddings, portraits, and product photography.' },
  { id: 'w10', name: 'Puja Adhikari', category: 'beautician', city: 'Lalitpur, Pulchowk', rate: 1200, unit: 'session', rating: 4.8, reviews: 88, verified: true, bio: 'Bridal & party makeup, at-home appointments.' },
  { id: 'w11', name: 'Hari Bahadur Thapa', category: 'construction', city: 'Bhaktapur, Suryabinayak', rate: 900, unit: 'day', rating: 4.5, reviews: 37, verified: false, bio: 'Masonry, plastering, small renovation crews.' },
  { id: 'w12', name: 'Mina Chaudhary', category: 'electrician', city: 'Kathmandu, Balaju', rate: 550, unit: 'visit', rating: 4.7, reviews: 65, verified: true, bio: 'Residential rewiring and inverter installation.' },
];

export function getWorkersByCategory(categoryId, workerList = mockWorkers) {
  return workerList.filter((w) => w.category === categoryId);
}

export function getWorker(id) {
  return mockWorkers.find((w) => w.id === id);
}

export function searchWorkers(query, workerList = mockWorkers) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return workerList.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q) ||
      w.city.toLowerCase().includes(q)
  );
}
