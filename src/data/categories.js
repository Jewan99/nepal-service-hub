export const categories = [
  { id: 'electrician', name: 'Electricians', icon: '⚡', portrait: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Wiring, switchboards, fittings' },
  { id: 'plumber', name: 'Plumbers', icon: '🔧', portrait: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Leaks, pipes, tank installs' },
  { id: 'appliance', name: 'AC / Fridge Repair', icon: '❄️', portrait: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Cooling & appliance repair' },
  { id: 'mechanic', name: 'Mechanics', icon: '🛵', portrait: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Bike & car servicing' },
  { id: 'painter', name: 'Painters', icon: '🎨', portrait: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Interior & exterior painting' },
  { id: 'cleaner', name: 'Cleaners', icon: '🧹', portrait: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Home & office cleaning' },
  { id: 'tutor', name: 'Tutors', icon: '📘', portrait: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'School, +2 & language tuition' },
  { id: 'technician', name: 'Computer/Mobile Techs', icon: '💻', portrait: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Repairs & setup' },
  { id: 'photographer', name: 'Photographers', icon: '📷', portrait: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Events, portraits, product shoots' },
  { id: 'beautician', name: 'Beauticians', icon: '💄', portrait: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Makeup, salon, spa at home' },
  { id: 'construction', name: 'Construction Workers', icon: '🧱', portrait: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=160&h=160&q=80', blurb: 'Masonry, labour, renovation' },
];

export function getCategory(id) {
  return categories.find((c) => c.id === id);
}
